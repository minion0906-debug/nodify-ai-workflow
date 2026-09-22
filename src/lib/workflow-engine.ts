

import type { Workflow, NodeData, Connection, WorkflowExecution, NodeExecution, ExecutionMode } from './types';
import { getNodeDefinition } from './nodes';
import { Firestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { workflowLogger } from './workflow-logger';
import { NodeHooksExecutor } from './node-hooks-executor';

// Import new node system helpers
import {
  DataHelpers,
  StringHelpers,
  DateHelpers,
  HttpHelpers,
  DebugHelpers,
  SecretsManager,
  SchemaValidator,
  ConditionalRouter,
  RetryHandler,
  ItemProcessor,
  createNodeHelpers
} from './node-system';

export interface ExecutionContextByName {
  [nodeName: string]: {
    input: any;
    output: any;
    files?: any;
    context?: Record<string, any>;
  };
}

export interface LogEntry {
  timestamp: Date;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  args?: any[];
}

export interface ExecutionData {
  [nodeId: string]: {
    input: any;
    output: any;
    startedAt: Date;
    finishedAt: Date;
    status: 'success' | 'failed' | 'running';
    error?: string;
    logs?: LogEntry[];
  };
}

type WorkflowEngineServices = {
  db: Firestore;
  user: User;
  doc: typeof doc;
  getDoc: typeof getDoc;
  setDoc: typeof setDoc;
  updateDoc: typeof updateDoc;
  deleteDoc: typeof deleteDoc;
  errorEmitter: typeof errorEmitter;
  FirestorePermissionError: typeof FirestorePermissionError;
};

type WorkflowEngineOptions = {
  onNodeStart?: (nodeId: string) => void;
  onNodeEnd?: (nodeId: string, input: any, output: any, duration: number, logs?: LogEntry[]) => void;
  onEdgeTraverse?: (edgeId: string, executionTime: number, itemCount: number) => void;
  onWorkflowEnd?: () => void;
  onExecutionUpdate?: (executionByName: ExecutionContextByName) => void;
  onError?: (nodeId: string, error: Error) => void;
  onClientNodeExecution?: (nodeId: string, definition: any, nodeContext: any, inputData: any) => Promise<any>;
  // If true (default), halt workflow immediately on first node error
  haltOnError?: boolean;
};

/**
 * Enhanced Workflow Engine v2
 * Supports dynamic node execution with flexible data handling
 */
export class WorkflowEngine {
  private workflow: Workflow;
  private context: ExecutionData = {};
  private options: WorkflowEngineOptions;
  private services: WorkflowEngineServices;
  private targetNodeId?: string | null;
  private executionId?: string;
  private executionMode: ExecutionMode = 'manual';
  private executionStartTime?: Date;
  // Runtime state for n8n-style loop handshakes
  private loopRuntime: Record<string, { items: any[]; index: number; batchSize: number; waitForDone: boolean; mode: string; accumulated: any[]; totalScheduled: number; resetOnEachIteration: boolean; accumulateResults: boolean }> = {};
  // Track loop branch execution to emit 'done' only after all loop work finishes
  private loopPendingCounts: Record<string, number> = {};
  private loopDeferredDone: Record<string, { connections: Connection[]; payload: any } | undefined> = {};
  // Guard against stray re-entries after loop completion
  private loopCompleted: Set<string> = new Set();

  constructor(
    workflow: Workflow,
    services: WorkflowEngineServices,
    options: WorkflowEngineOptions = {},
    targetNodeId: string | null = null,
    executionMode: ExecutionMode = 'manual'
  ) {
    this.workflow = workflow;
    this.services = services;
    this.options = options;
    this.targetNodeId = targetNodeId;
    this.executionMode = executionMode;
  }

  private findNodeById(nodeId: string): NodeData | undefined {
    return this.workflow.nodes.find((n) => n.id === nodeId);
  }

  private findConnectionsFrom(nodeId: string, handleId: string = 'main'): Connection[] {
    return this.workflow.connections.filter(
      (c) => c.sourceNodeId === nodeId && c.sourceHandle === handleId
    );
  }

  private buildContextByName(): ExecutionContextByName {
    const executionByName: ExecutionContextByName = {};
    const nodeLabels = new Set<string>();

    for (const nodeId in this.context) {
      const node = this.findNodeById(nodeId);
      if (node && node.label) {
        if (nodeLabels.has(node.label)) {
          console.warn(
            `[WorkflowEngine] Duplicate node label '${node.label}' found. Context will use the latest execution for this name.`
          );
        }
        nodeLabels.add(node.label);
        // Attach loop context state for expressions like $node["Loop"].context["currentRunIndex"]
        let loopCtx: Record<string, any> | undefined;
        const def = node ? getNodeDefinition(node.type) : undefined;
        if (def?.id === 'loop_node' && this.loopRuntime[nodeId]) {
          const rt = this.loopRuntime[nodeId];
          loopCtx = {
            currentRunIndex: Math.max(0, rt.index - (rt.batchSize > 0 ? rt.batchSize : 1)),
            nextIndex: rt.index,
            batchSize: rt.batchSize,
            totalItems: rt.items.length,
            remainingItems: Math.max(0, rt.items.length - rt.index),
            noItemsLeft: rt.index >= rt.items.length,
            totalScheduled: rt.totalScheduled,
            accumulateResults: rt.accumulateResults,
            resetOnEachIteration: rt.resetOnEachIteration,
          };
        }

        executionByName[node.label] = {
          input: this.context[nodeId].input,
          output: this.context[nodeId].output,
          files: this.context[nodeId].input?.files || this.context[nodeId].output?.files || null,
          context: loopCtx
        } as any;
      }
    }
    return executionByName;
  }

  /**
   * Enhanced expression resolver with better error handling
   */
  private _resolveExpressions(
    value: any,
    context: { data: any; execution: ExecutionContextByName }
  ): any {
    if (typeof value !== 'string') {
      return value;
    }

    const evaluateExpression = (expression: string) => {
      try {
        const evaluator = new Function(
          'data',
          'execution',
          '$',
          '$json',
          '$node',
          '$input',
          'items',
          'node',
          `
          "use strict";
          try {
            return ${expression};
          } catch (e) {
            if (e instanceof TypeError && e.message.includes('undefined')) {
              return undefined;
            }
            return { error: e.message };
          }
        `
        );

        const items = Array.isArray(context.data)
          ? context.data
          : context.data
          ? [context.data]
          : [];
        const $input = {
          first: () => items[0] || {},
          last: () => items[items.length - 1] || {},
          all: () => items,
        };
        const dataShortcut = items[0] || {};

        return evaluator(
          dataShortcut,
          context.execution,
          context.execution,
          dataShortcut,
          dataShortcut,
          $input,
          items,
          {}
        );
      } catch (e: any) {
        workflowLogger.error(
          `Error creating evaluator for expression "${expression}":`,
          e.message
        );
        return `EXPRESSION_ERROR: ${e.message}`;
      }
    };

    const standaloneMatch = value.match(/^{{([\s\S]*)}}$/);
    if (standaloneMatch) {
      return evaluateExpression(standaloneMatch[1]);
    }

    return value.replace(/{{(.*?)}}/g, (_match, expression) => {
      const result = evaluateExpression(expression);
      if (result === undefined || result === null) {
        return '';
      }
      if (result && result.error) {
        console.warn(
          `[Expression Error] Failed to evaluate: ${expression}. Error: ${result.error}`
        );
        return '';
      }
      return typeof result === 'object' ? JSON.stringify(result) : String(result);
    });
  }

  /**
   * Prepare node context with resolved properties
   */
  private prepareNodeContext(
    node: NodeData,
    definition: any,
    executionByName: ExecutionContextByName,
    inputData: any
  ) {
    const items = Array.isArray(inputData)
      ? inputData
      : inputData
      ? [inputData]
      : [];

    const resolvedProperties: Record<string, { value: any }> = {};

    for (const propDef of definition.properties || []) {
      // Use configured value or fall back to default
      const configuredValue = node.config[propDef.name] !== undefined
        ? node.config[propDef.name]
        : propDef.default;

      // Resolve expressions. For nodes that process the full payload (like Loop),
      // 
      // use the entire inputData for {{data}} so that arrays are preserved.
      const resolveBaseData = (definition as any).processItemsIndividually === false
        ? (inputData ?? {})
        : (items[0] || {});
      const resolvedValue = this._resolveExpressions(configuredValue, {
        data: resolveBaseData,
        execution: executionByName,
      });
      resolvedProperties[propDef.name] = { value: resolvedValue };
    }

    return {
      id: node.id,
      name: definition.name,
      type: node.type,
      label: node.label,
      properties: resolvedProperties,
    };
  }

  /**
   * Build execution context for the node
   */
  private buildExecutionContext(
    nodeContext: any,
    inputData: any,
    executionByName: ExecutionContextByName,
    definition: any,
    nodeId: string
  ) {
    const items = Array.isArray(inputData)
      ? inputData
      : inputData
      ? [inputData]
      : [];

    const $input = {
      first: () => items[0] || {},
      last: () => items[items.length - 1] || {},
      all: () => items,
      item: (index: number) => items[index] || {},
    };

    // Initialize logs array if it doesn't exist
    if (!this.context[nodeId].logs) {
      this.context[nodeId].logs = [];
    }

    // Helper utilities available to all nodes with log capture
    const helpers = {
      // Legacy helpers (for backward compatibility)
      json: (obj: any) => JSON.stringify(obj, null, 2),
      parse: (str: string) => JSON.parse(str),
      log: (...args: any[]) => {
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        this.context[nodeId].logs!.push({
          timestamp: new Date(),
          type: 'log',
          message,
          args
        });

        console.log(`[${definition.name}]`, ...args);
        DebugHelpers.addBreadcrumb(message, 'info', { nodeId, nodeName: definition.name });
      },
      error: (...args: any[]) => {
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        this.context[nodeId].logs!.push({
          timestamp: new Date(),
          type: 'error',
          message,
          args
        });

        console.error(`[${definition.name}]`, ...args);
        DebugHelpers.addBreadcrumb(message, 'error', { nodeId, nodeName: definition.name });
      },
      warn: (...args: any[]) => {
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        this.context[nodeId].logs!.push({
          timestamp: new Date(),
          type: 'warn',
          message,
          args
        });

        console.warn(`[${definition.name}]`, ...args);
        DebugHelpers.addBreadcrumb(message, 'warn', { nodeId, nodeName: definition.name });
      },
      info: (...args: any[]) => {
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        this.context[nodeId].logs!.push({
          timestamp: new Date(),
          type: 'info',
          message,
          args
        });

        console.info(`[${definition.name}]`, ...args);
        DebugHelpers.addBreadcrumb(message, 'info', { nodeId, nodeName: definition.name });
      },

      // New helper system - organized by category
      data: DataHelpers,
      string: StringHelpers,
      date: DateHelpers,
      http: HttpHelpers,
      debug: DebugHelpers,
      secrets: SecretsManager,
      validate: SchemaValidator,
      router: ConditionalRouter,
      retry: RetryHandler,
      processor: ItemProcessor,

      // Quick access to common operations
      map: DataHelpers.map,
      filter: DataHelpers.filter,
      reduce: DataHelpers.reduce,
      groupBy: DataHelpers.groupBy,
      sortBy: DataHelpers.sortBy,
      unique: DataHelpers.unique,
      chunk: DataHelpers.chunk,
      flatten: DataHelpers.flatten,
      pick: DataHelpers.pick,
      omit: DataHelpers.omit,
      merge: DataHelpers.merge,
      get: DataHelpers.get,
      set: DataHelpers.set,

      slugify: StringHelpers.slugify,
      capitalize: StringHelpers.capitalize,
      camelCase: StringHelpers.camelCase,
      snakeCase: StringHelpers.snakeCase,
      kebabCase: StringHelpers.kebabCase,
      template: StringHelpers.template,

      formatDate: DateHelpers.formatDate,
      parseDate: DateHelpers.parseDate,
      addDays: DateHelpers.addDays,
      timeAgo: DateHelpers.timeAgo,

      httpGet: HttpHelpers.get,
      httpPost: HttpHelpers.post,
      httpPut: HttpHelpers.put,
      httpDelete: HttpHelpers.delete,
      httpRequest: HttpHelpers.request,

      getSecret: SecretsManager.getSecret,
      getEnv: SecretsManager.getEnv,
      resolveSecrets: SecretsManager.resolve,

      // File Storage Helpers with user isolation
      // Note: These use the NEW file-storage.ts system with Firebase Storage
      getFile: async (fileId: string) => {
        const { getFile } = await import('./file-storage');
        return getFile(fileId, this.services.user.uid);
      },
      getFileAsBlob: async (fileId: string) => {
        const { getFileAsBlob } = await import('./file-storage');
        return getFileAsBlob(fileId, this.services.user.uid);
      },
      getFileAsBase64: async (fileId: string) => {
        const { getFileAsBase64 } = await import('./file-storage');
        return getFileAsBase64(fileId, this.services.user.uid);
      },
      getFileAsDataUrl: async (fileId: string) => {
        const { getFileAsDataUrl } = await import('./file-storage');
        return getFileAsDataUrl(fileId, this.services.user.uid);
      },
      getFileDownloadUrl: async (fileId: string) => {
        const { getFileDownloadUrl } = await import('./file-storage');
        return getFileDownloadUrl(fileId, this.services.user.uid);
      },
      storeFile: async (buffer: ArrayBuffer, metadata: { name: string; mimeType: string }) => {
        const { storeFile } = await import('./file-storage');
        return storeFile(buffer, {
          ...metadata,
          userId: this.services.user.uid,
          executionId: this.executionId || `exec_${Date.now()}`,
          workflowId: this.workflow.id,
        });
      },
      storeFileFromBlob: async (blob: Blob, name: string) => {
        const { storeFileFromBlob } = await import('./file-storage');
        return storeFileFromBlob(blob, name, {
          userId: this.services.user.uid,
          executionId: this.executionId || `exec_${Date.now()}`,
          workflowId: this.workflow.id,
        });
      },
      deleteFile: async (fileId: string) => {
        const { deleteFile } = await import('./file-storage');
        return deleteFile(fileId, this.services.user.uid);
      },
      formatFileSize: async (bytes: number) => {
        const { formatFileSize } = await import('./file-storage');
        return formatFileSize(bytes);
      },

      // Legacy file-utils functions (for backward compatibility)
      // These are DEPRECATED and will be removed in future versions
      // TODO: Remove after all nodes are migrated to new system
      createFileDownloadUrl: (fileId: string) => {
        console.warn('[DEPRECATED] helpers.createFileDownloadUrl - Use helpers.getFileDownloadUrl instead');
        return helpers.getFileDownloadUrl(fileId);
      },

      // Execute workflow from a specific node (for Call Node Trigger functionality)
      executeFromNode: async (targetNodeId: string, inputData: any = {}) => {
        helpers.log(`[executeFromNode] Starting sub-workflow from node: ${targetNodeId}`);

        // Validate that the target node exists
        const targetNode = this.findNodeById(targetNodeId);
        if (!targetNode) {
          const error = `Target node with ID '${targetNodeId}' not found in workflow`;
          helpers.error(`[executeFromNode] ${error}`);
          throw new Error(error);
        }

        // Validate that the target node is a trigger
        const targetDefinition = getNodeDefinition(targetNode.type);
        if (!targetDefinition) {
          const error = `No definition found for target node type '${targetNode.type}'`;
          helpers.error(`[executeFromNode] ${error}`);
          throw new Error(error);
        }

        if (targetDefinition.category !== 'trigger') {
          const warning = `Target node '${targetNodeId}' is not a trigger (category: ${targetDefinition.category}). This may lead to unexpected behavior.`;
          helpers.warn(`[executeFromNode] ${warning}`);
        }

        // Create a new workflow engine instance for sub-workflow execution
        const subEngine = new WorkflowEngine(
          this.workflow,
          this.services,
          {
            ...this.options,
            // Pass through callbacks but mark as sub-execution
            onNodeStart: (subNodeId: string) => {
              helpers.log(`[Sub-workflow] Node started: ${subNodeId}`);
            },
            onNodeEnd: (subNodeId: string, input: any, output: any, duration: number, logs?: LogEntry[]) => {
              helpers.log(`[Sub-workflow] Node completed: ${subNodeId} (${duration}ms)`);
            },
          },
          null, // No specific target node for sub-execution
          'manual' // Execution mode
        );

        try {
          // Execute the sub-workflow starting from the target node
          const subContext = await subEngine.execute(targetNodeId, inputData);
          helpers.log(`[executeFromNode] Sub-workflow completed successfully`);

          // Return the output of the last executed node or the full context
          // Find the last node that was executed by looking for the target node's output
          if (subContext[targetNodeId]) {
            return subContext[targetNodeId].output;
          }

          // If target node wasn't in context, return the full context
          return subContext;
        } catch (error: any) {
          const errorMsg = `Sub-workflow execution failed: ${error.message}`;
          helpers.error(`[executeFromNode] ${errorMsg}`);
          throw new Error(errorMsg);
        }
      },

      // Credential helpers - get credential from Firestore
      getCredential: async (credentialId: string) => {
        try {
          helpers.log(`[getCredential] Fetching credential: ${credentialId}`);
          const credRef = this.services.doc(
            this.services.db,
            'users',
            this.services.user.uid,
            'credentials',
            credentialId
          );
          const snap = await this.services.getDoc(credRef);

          // Firestore v9 DocumentSnapshot uses .exists() method
          if (!snap || typeof (snap as any).exists !== 'function' ? true : !(snap as any).exists()) {
            helpers.warn(`[getCredential] Credential not found: ${credentialId}`);
            return null;
          }

          const data = snap.data();
          helpers.log(`[getCredential] Credential loaded: ${credentialId}`);
          return { id: (snap as any).id, ...(data || {}) };
        } catch (e: any) {
          helpers.error(`[getCredential] Failed to fetch credential: ${e?.message || e}`);
          return null;
        }
      },

      getCredentialData: async (credentialId: string) => {
        try {
          helpers.log(`[getCredentialData] Fetching credential data: ${credentialId}`);
          const cred = await helpers.getCredential(credentialId);
          if (!cred) {
            helpers.warn(`[getCredentialData] No credential found for ID: ${credentialId}`);
            return null;
          }
          helpers.log(`[getCredentialData] Credential data loaded: ${credentialId}`);
          return cred.data || null;
        } catch (e: any) {
          helpers.error(`[getCredentialData] Failed: ${e?.message || e}`);
          return null;
        }
      },
    };

    // For nodes that need to work with individual items vs all items
    const shouldProcessIndividually = definition.processItemsIndividually !== false;
    const dataParam = shouldProcessIndividually && items.length > 0 ? items[0] : inputData;

    // Lazy-load chatMessages only on server-side using dynamic import
    let chatMessagesModule = undefined;
    if (typeof window === 'undefined') {
      try {
        // Dynamic import to avoid bundling on client-side
        chatMessagesModule = {
          create: async (...args: any[]) => {
            const { chatMessages } = await import('./db/sqlite');
            return chatMessages.create(...args);
          },
          getBySession: async (...args: any[]) => {
            const { chatMessages } = await import('./db/sqlite');
            return chatMessages.getBySession(...args);
          },
          getByChatId: async (...args: any[]) => {
            const { chatMessages } = await import('./db/sqlite');
            return chatMessages.getByChatId(...args);
          },
          deleteSession: async (...args: any[]) => {
            const { chatMessages } = await import('./db/sqlite');
            return chatMessages.deleteSession(...args);
          },
          cleanup: async (...args: any[]) => {
            const { chatMessages } = await import('./db/sqlite');
            return chatMessages.cleanup(...args);
          },
        };
      } catch (e) {
        // SQLite not available (client-side or build time)
        console.warn('[WorkflowEngine] SQLite modules not available');
      }
    }

    return {
      node: nodeContext,
      data: dataParam,
      items,
      execution: executionByName,
      $: executionByName,
      $input,
      $json: items[0] || {},
      $node: items[0] || {},
      helpers,
      services: this.services,
      env: {},
      modules: {
        chatMessages: chatMessagesModule,
      },
    };
  }

  /**
   * Execute a single node with enhanced error handling and flexibility
   */
    private async executeNode(nodeId: string, inputData: any): Promise<any> {
    const node = this.findNodeById(nodeId);
    if (!node) {
      const errorOutput = { error: `Node with ID '${nodeId}' not found.` };
      workflowLogger.error(errorOutput.error);
      this.options.onNodeEnd?.(nodeId, inputData, errorOutput, 0, []);
      return errorOutput;
    }

    const definition = getNodeDefinition(node.type);
    if (!definition) {
      const errorMsg = `No definition for node type '${node.type}'. Passing data through.`;
      console.warn(`[WorkflowEngine] ${errorMsg}`);
      this.options.onNodeEnd?.(nodeId, inputData, inputData, 0, []);
      return inputData;
    }
  
    console.log(`[WorkflowEngine] > Executing node: ${definition.name} (${node.id})`);
    this.options.onNodeStart?.(nodeId);

    const executionByName = this.buildContextByName();
    const nodeContext = this.prepareNodeContext(
      node,
      definition,
      executionByName,
      inputData
    );

    // Execute onExecute hook before node execution (for validation/pre-processing)
    try {
      await NodeHooksExecutor.onExecute(definition, nodeContext);
    } catch (hookError) {
      console.warn(`[WorkflowEngine] onExecute hook error for ${definition.name}:`, hookError);
      // Don't stop execution if hook fails
    }

    const startedAt = new Date();

    // Mark node as running
    this.context[node.id] = {
      input: inputData,
      output: null,
      startedAt,
      finishedAt: startedAt,
      status: 'running',
      logs: [{
        timestamp: startedAt,
        type: 'info',
        message: `Starting execution of ${definition.name}`,
        args: []
      }]
    };

    const executionEnvironment = (definition as any).executionEnvironment || 'server';
  
    // ---------- Server-side ----------
    if (executionEnvironment === 'server') {
      console.log(`[WorkflowEngine] Node ${definition.name} requires server-side execution`);
      try {
        const token = await this.services.user.getIdToken();
        const response = await fetch('/api/workflow/execute-node', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            node: nodeContext,
            inputData: inputData,
            executionContext: executionByName,
          }),
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('[WorkflowEngine] Failed to parse error response:', parseError);
            throw new Error(`Server execution failed with status ${response.status}: ${response.statusText}`);
          }

          console.error('[WorkflowEngine] Server error response:', errorData);
          console.error('[WorkflowEngine] Response status:', response.status);
          console.error('[WorkflowEngine] Response statusText:', response.statusText);

          // Build error message safely
          let errorMsg = 'Server execution failed';

          try {
            if (errorData?.output?.details) {
              errorMsg = String(errorData.output.details);
            } else if (errorData?.output?.error) {
              errorMsg = String(errorData.output.error);
            } else if (errorData?.error) {
              errorMsg = typeof errorData.error === 'object'
                ? JSON.stringify(errorData.error)
                : String(errorData.error);
            } else if (errorData?.message) {
              errorMsg = String(errorData.message);
            } else {
              errorMsg = `Server execution failed with status ${response.status}: ${response.statusText}`;
            }
          } catch (stringifyError) {
            console.error('[WorkflowEngine] Error building error message:', stringifyError);
            errorMsg = 'Server execution failed - unable to parse error details';
          }

          console.error('[WorkflowEngine] Final error message:', errorMsg);
          console.error('[WorkflowEngine] Error message type:', typeof errorMsg);

          const error = new Error();
          error.message = errorMsg;
          throw error;
        }

        const responseData = await response.json();
        const output = responseData.output;
        const serverLogs = responseData.logs || [];

        const finishedAt = new Date();
        const duration = finishedAt.getTime() - startedAt.getTime();

        console.log(
          `[WorkflowEngine] < Finished server node: ${definition.name} (${node.id}). Duration: ${duration}ms`
        );

        // Merge server logs with existing logs
        const allLogs = [...(this.context[node.id].logs || []), ...serverLogs];

        const isError = Boolean(output?.error || output?.path === 'error');
        this.context[node.id] = {
          input: inputData,
          output,
          startedAt,
          finishedAt,
          status: isError ? 'failed' : 'success',
          error: isError ? (output?.error || output?.data?.error || 'Node returned error') : undefined,
          logs: allLogs
        };

        this.options.onNodeEnd?.(nodeId, inputData, output, duration, allLogs);

        const updatedExecutionByName = this.buildContextByName();
        this.options.onExecutionUpdate?.(updatedExecutionByName);

        return output;
      } catch (error) {
        const finishedAt = new Date();
        const duration = finishedAt.getTime() - startedAt.getTime();
        const errorMessage = (error as Error).message;
        const errorOutput = {
          error: errorMessage,
          nodeId,
          nodeType: node.type,
        };

        // Add error log
        this.context[node.id].logs!.push({
          timestamp: finishedAt,
          type: 'error',
          message: `Server execution failed: ${errorMessage}`,
          args: [error]
        });

        this.context[node.id] = {
          ...this.context[node.id],
          input: inputData,
          output: errorOutput,
          startedAt,
          finishedAt,
          status: 'failed',
          error: errorMessage,
        };

        this.options.onNodeEnd?.(nodeId, inputData, errorOutput, duration, this.context[node.id].logs);
        this.options.onError?.(nodeId, error as Error);

        return errorOutput;
      }
    }
  
    // ---------- Client-side ----------
    if (executionEnvironment === 'client' && this.options.onClientNodeExecution) {
      console.log(`[WorkflowEngine] Node ${definition.name} requires client-side execution`);
      try {
        const output = await this.options.onClientNodeExecution(
          nodeId,
          definition,
          nodeContext,
          inputData
        );

        const finishedAt = new Date();
        const duration = finishedAt.getTime() - startedAt.getTime();

        console.log(
          `[WorkflowEngine] < Finished client node: ${definition.name} (${node.id}). Duration: ${duration}ms`
        );

        // Add completion log
        this.context[node.id].logs!.push({
          timestamp: finishedAt,
          type: 'info',
          message: `Execution completed successfully in ${duration}ms`,
          args: []
        });

        const isError = Boolean(output?.error || output?.path === 'error');
        this.context[node.id] = {
          ...this.context[node.id],
          input: inputData,
          output,
          startedAt,
          finishedAt,
          status: isError ? 'failed' : 'success',
          error: isError ? (output?.error || output?.data?.error || 'Node returned error') : undefined,
        };

        this.options.onNodeEnd?.(nodeId, inputData, output, duration, this.context[node.id].logs);

        const updatedExecutionByName = this.buildContextByName();
        this.options.onExecutionUpdate?.(updatedExecutionByName);

        return output;
      } catch (error) {
        const finishedAt = new Date();
        const duration = finishedAt.getTime() - startedAt.getTime();
        const errorMessage = (error as Error).message;
        const errorOutput = {
          error: errorMessage,
          nodeId,
          nodeType: node.type,
        };

        // Add error log
        this.context[node.id].logs!.push({
          timestamp: finishedAt,
          type: 'error',
          message: `Client execution failed: ${errorMessage}`,
          args: [error]
        });

        this.context[node.id] = {
          ...this.context[node.id],
          input: inputData,
          output: errorOutput,
          startedAt,
          finishedAt,
          status: 'failed',
          error: errorMessage,
        };

        this.options.onNodeEnd?.(nodeId, inputData, errorOutput, duration, this.context[node.id].logs);
        this.options.onError?.(nodeId, error as Error);

        return errorOutput;
      }
    }
  
    // ---------- Local (AsyncFunction) ----------
    if (!definition.executionCode) {
      console.warn(
        `[WorkflowEngine] No execution code for node type '${node.type}'. Passing data through.`
      );
      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();

      // Add completion log
      this.context[node.id].logs!.push({
        timestamp: finishedAt,
        type: 'info',
        message: `Pass-through node completed in ${duration}ms`,
        args: []
      });

      // Update context - pass through input as output
      const processedData = {
        body: inputData?.body || {},
        files: inputData?.files || {},
        ...inputData,
      };

      this.context[node.id].input = processedData;
      this.context[node.id].output = processedData;
      this.context[node.id].status = 'success';
      this.context[node.id].finishedAt = finishedAt;

      this.options.onNodeEnd?.(nodeId, inputData, inputData, duration, this.context[node.id].logs);

      // Update execution context
      const updatedExecutionByName = this.buildContextByName();
      this.options.onExecutionUpdate?.(updatedExecutionByName);

      return inputData;
    }
  
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  
      const executor = new AsyncFunction(
        'node',
        'data',
        'items',
        'execution',
        '$',
        '$input',
        '$json',
        '$node',
        'helpers',
        'services',
        'env',
        'modules',
        'require',
        definition.executionCode
      );

    const execContext = this.buildExecutionContext(
      nodeContext,
      inputData,
      executionByName,
      definition,
      node.id
    );

    const output = await executor(
      execContext.node,
      execContext.data,
      execContext.items,
      execContext.execution,
      execContext.$,
      execContext.$input,
      execContext.$json,
      execContext.$node,
      execContext.helpers,
      execContext.services,
      execContext.env,
      execContext.modules,
      require
    );

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startedAt.getTime();

    console.log(
      `[WorkflowEngine] < Finished node: ${definition.name} (${node.id}). Duration: ${duration}ms`
    );

    // Add completion log
    this.context[node.id].logs!.push({
      timestamp: finishedAt,
      type: 'info',
      message: `Execution completed successfully in ${duration}ms`,
      args: []
    });

    const isError = Boolean(output?.error || output?.path === 'error');
    this.context[node.id] = {
      ...this.context[node.id],
      input: {
        body: inputData?.body || {},
        files: inputData?.files || {},
        ...inputData,
      },
      output: {
        body: (output?.body || inputData?.body || {}),
        files: (output?.files || inputData?.files || {}),
        ...output,
      },
      startedAt,
      finishedAt,
      status: isError ? 'failed' : 'success',
      error: isError ? (output?.error || output?.data?.error || 'Node returned error') : undefined,
    };

    this.options.onNodeEnd?.(nodeId, inputData, output, duration, this.context[node.id].logs);

    const updatedExecutionByName = this.buildContextByName();
    this.options.onExecutionUpdate?.(updatedExecutionByName);

    return output;
  } catch (error) {
    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startedAt.getTime();
    const errorMessage = (error as Error).message;
    const errorStack = (error as Error).stack;

    workflowLogger.error(`Critical error executing node ${nodeId}:`, error);

    // Add error log
    this.context[node.id].logs!.push({
      timestamp: finishedAt,
      type: 'error',
      message: `Execution failed: ${errorMessage}`,
      args: [error]
    });

    if (errorStack) {
      this.context[node.id].logs!.push({
        timestamp: finishedAt,
        type: 'error',
        message: `Stack trace:\n${errorStack}`,
        args: []
      });
    }

    const errorOutput = {
      error: errorMessage,
      stack: errorStack,
      nodeId,
      nodeType: node.type,
    };

    this.context[node.id] = {
      ...this.context[node.id],
      input: {
        body: inputData?.body || {},
        files: inputData?.files || {},
        ...inputData,
      },
      output: errorOutput,
      startedAt,
      finishedAt,
      status: 'failed',
      error: errorMessage,
    };

    this.options.onNodeEnd?.(nodeId, inputData, errorOutput, duration, this.context[node.id].logs);
    this.options.onError?.(nodeId, error as Error);

    const updatedExecutionByName = this.buildContextByName();
    this.options.onExecutionUpdate?.(updatedExecutionByName);

    return errorOutput;
  }
}


  /**
   * Save execution to Firestore
   */
  private async saveExecution(startNodeId: string) {
    try {
      const executionsCollection = collection(
        this.services.db,
        'users',
        this.services.user.uid,
        'workflows',
        this.workflow.id,
        'executions'
      );

      // Calculate stats
      let successfulNodes = 0;
      let failedNodes = 0;
      let waitingNodes = 0;
      let executionStatus: 'success' | 'error' | 'running' = 'success';
      let errorMessage: string | undefined;
      let errorNodeId: string | undefined;

      const nodeExecutions: Record<string, NodeExecution> = {};

      for (const nodeId in this.context) {
        const execution = this.context[nodeId];
        const node = this.findNodeById(nodeId);
        const definition = node ? getNodeDefinition(node.type) : null;

        const nodeExecution: any = {
          nodeId,
          nodeName: node?.label || definition?.name || 'Unknown',
          nodeType: node?.type || 'unknown',
          input: execution.input,
          output: execution.output,
          startedAt: execution.startedAt,
          finishedAt: execution.finishedAt,
          duration: execution.finishedAt.getTime() - execution.startedAt.getTime(),
          status: execution.status,
        };

        // Only include error fields if they have values (Firestore doesn't allow undefined)
        if (execution.error) {
          nodeExecution.error = execution.error;
        }
        if ((execution.output as any)?.stack) {
          nodeExecution.errorStack = (execution.output as any).stack;
        }

        nodeExecutions[nodeId] = nodeExecution;

        if (execution.status === 'success') successfulNodes++;
        else if (execution.status === 'failed') {
          failedNodes++;
          executionStatus = 'error';
          if (!errorMessage) {
            errorMessage = execution.error;
            errorNodeId = nodeId;
          }
        }
        else if (execution.status === 'running') waitingNodes++;
      }

      const finishedAt = new Date();
      const duration = this.executionStartTime
        ? finishedAt.getTime() - this.executionStartTime.getTime()
        : 0;

      const executionData: Omit<WorkflowExecution, 'id'> = {
        ownerId: this.services.user.uid,
        workflowId: this.workflow.id,
        workflowName: this.workflow.name,
        status: executionStatus,
        mode: this.executionMode,
        startedAt: this.executionStartTime || serverTimestamp(),
        finishedAt: serverTimestamp(),
        duration,
        nodeExecutions,
        totalNodes: Object.keys(this.context).length,
        successfulNodes,
        failedNodes,
        waitingNodes,
        startNodeId,
        error: errorMessage,
        errorNodeId,
      };

      const docRef = await addDoc(executionsCollection, executionData);
      this.executionId = docRef.id;
      // Also update the ID in the document itself
      await this.services.updateDoc(docRef, { id: docRef.id });


      workflowLogger.info(`Execution saved with ID: ${this.executionId}`);

      // Update user usage and stats counters
      try {
        const userRef = this.services.doc(this.services.db, 'users', this.services.user.uid);
        const statsUpdate: any = {
          'usage.executionsThisMonth': increment(1),
          'stats.totalExecutions': increment(1),
        };
        if (executionStatus === 'success') {
          statsUpdate['stats.successfulExecutions'] = increment(1);
        } else if (executionStatus === 'error') {
          statsUpdate['stats.failedExecutions'] = increment(1);
        }
        await this.services.updateDoc(userRef, statsUpdate);
      } catch (e) {
        workflowLogger.warn('Failed to update user usage/stats for execution:', e);
      }
    } catch (error) {
      workflowLogger.error('Failed to save execution:', error);
    }
  }

  /**
   * Main execution method with enhanced flow control
   */
  public async execute(startNodeId: string, initialInputData?: any) {
  this.executionStartTime = new Date();

  // Generate execution ID if not already set
  if (!this.executionId) {
    this.executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  console.log(
    `[WorkflowEngine] Starting execution for workflow '${this.workflow.name}' from node '${startNodeId}'. Execution ID: ${this.executionId}`
  );
  this.context = {};

  // queue carries context about where an item originated from
  const queue: { nodeId: string; inputData: any; sourceHandle?: string; loopOriginIds?: string[]; targetHandle?: string }[] = [
    {
      nodeId: startNodeId,
      inputData:
        this.executionMode === 'test' &&
        this.findNodeById(startNodeId)?.type === 'form_submit_trigger'
          ? { body: {}, files: {}, ...initialInputData }
          : initialInputData || {},
    },
  ];
  const processedNodes = new Set<string>();

  while (queue.length > 0) {
    const { nodeId, inputData, sourceHandle = 'main', loopOriginIds, targetHandle = 'main' } = queue.shift()!;

    const node = this.findNodeById(nodeId);
    const definition = node ? getNodeDefinition(node.type) : null;

    // Drop any stray entries targeting a loop node already completed
    if (definition?.id === 'loop_node' && this.loopCompleted.has(nodeId)) {
      console.log(`[WorkflowEngine] [LOOP GUARD] Ignoring re-entry to completed loop ${nodeId} via '${targetHandle}'`);
      continue;
    }

    const canReprocess =
      definition?.id === 'merge_node' ||
      definition?.id === 'loop_node' ||
      (definition as any)?.allowMultipleExecutions === true;

    // Do not skip if this execution comes from a loop path
    if (processedNodes.has(nodeId) && !canReprocess && sourceHandle !== 'loop') {
      console.log(`[WorkflowEngine] Node ${nodeId} already processed. Skipping.`);
      continue;
    }

    // For Loop nodes arriving via 'continue', skip executing client code to avoid
    // re-evaluating inputArray on a single-item payload. Handle purely with runtime.
    const isLoopNodeType = definition?.id === 'loop_node';
    const arrivedByContinueEarly = targetHandle === 'continue';
    const nodeOutput = (isLoopNodeType && arrivedByContinueEarly)
      ? {}
      : await this.executeNode(nodeId, inputData);

    // Don't mark as processed if it's in a loop path
    const isInLoopPath = sourceHandle === 'loop';
    if (!canReprocess && !isInLoopPath) processedNodes.add(nodeId);

    const isErrorOutput = Boolean(nodeOutput && (nodeOutput.error || nodeOutput.path === 'error'));
    // Read per-node stopOnError (default true)
    const parseBool = (v: any, d: boolean) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v !== 0;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (['true','1','yes','y','on'].includes(s)) return true;
        if (['false','0','no','n','off'].includes(s)) return false;
      }
      return d;
    };
    const stopOnErrorCfg = parseBool((node as any)?.config?.stopOnError, true);
    if (isErrorOutput) {
      console.warn(`[WorkflowEngine] Node ${nodeId} finished with an error.`);
      if (stopOnErrorCfg) {
        // Default behavior: halt unless engine explicitly allows continue globally
        if (this.options.haltOnError !== false) {
          this.options.onWorkflowEnd?.();
          return this.context;
        }
      }
      // Continue flow on error: prefer explicit error path; otherwise propagate error on main
      const errorConnections = this.findConnectionsFrom(nodeId, 'error');
      if (errorConnections.length > 0) {
        for (const errConn of errorConnections) {
          queue.push({ nodeId: errConn.targetNodeId, inputData: nodeOutput, sourceHandle: 'error', targetHandle: errConn.targetHandle });
        }
      } else {
        // No error path: continue through main with the error payload
        const mainConnections = this.findConnectionsFrom(nodeId, 'main');
        for (const conn of mainConnections) {
          queue.push({ nodeId: conn.targetNodeId, inputData: nodeOutput, sourceHandle: 'main', targetHandle: conn.targetHandle });
        }
      }
      continue;
    }

    if (this.targetNodeId && nodeId === this.targetNodeId) {
      console.log(`[WorkflowEngine] Reached target node '${this.targetNodeId}'.`);
      this.options.onWorkflowEnd?.();
      return this.context; // Explicitly return context on target node reached
    }

    const isConditionalNode =
      definition &&
      (definition.id === 'if_node' ||
        definition.id === 'switch_node' ||
        definition.id === 'router_node' ||
        (definition as any).isConditional === true);

    const isLoopNode = definition && definition.id === 'loop_node';

    // Read per-node forwardInputOnEmpty (default true) and appendData (default true)
    const forwardOnEmptyCfg = parseBool((node as any)?.config?.forwardInputOnEmpty, true);
    const appendDataCfg = parseBool((node as any)?.config?.appendData, true);

    // Step 1: Forward input when node output is empty/null (but preserve path if provided)
    const computeForwarded = (out: any) => {
      if (!forwardOnEmptyCfg) return out;
      if (out === null || out === undefined) return inputData;
      if (typeof out === 'object' && !Array.isArray(out)) {
        const keys = Object.keys(out);
        if (keys.length === 0) return inputData;
        if (keys.length === 1 && keys[0] === 'path') {
          // Preserve routing while forwarding payload
          return { ...(typeof inputData === 'object' && !Array.isArray(inputData) ? inputData : {}), path: (out as any).path };
        }
      }
      return out;
    };

    let forwardedOutput = computeForwarded(nodeOutput);

    // Step 2: Append input into output (output wins on conflicts)
    let effectiveOutput = forwardedOutput;
    if (appendDataCfg && forwardedOutput && inputData && typeof forwardedOutput === 'object' && typeof inputData === 'object' && !Array.isArray(forwardedOutput) && !Array.isArray(inputData)) {
      effectiveOutput = { ...inputData, ...forwardedOutput };
    }

    let nextHandle = 'main';
    if (isConditionalNode && (effectiveOutput as any)?.path) nextHandle = (effectiveOutput as any).path;

    // Special handling for Loop node (n8n-style handshake supported)
    if (isLoopNode) {
      const arrivedByContinue = targetHandle === 'continue';
      // Read config flag to control when to emit 'done'
      let shouldWaitForDone = true;
      try {
        const raw = (node as any)?.config?.waitForDone;
        if (typeof raw === 'boolean') shouldWaitForDone = raw;
        else if (typeof raw === 'string') {
          const v = raw.trim().toLowerCase();
          if (v === 'false' || v === '0' || v === 'no') shouldWaitForDone = false;
          else if (v === 'true' || v === '1' || v === 'yes') shouldWaitForDone = true;
        } else if (typeof raw === 'number') {
          shouldWaitForDone = raw !== 0;
        }
      } catch {}

      // n8n-style handshake: initial triggers set up runtime; feedback via 'continue' triggers next batch
      const loopConnections = this.findConnectionsFrom(nodeId, 'loop');
      const doneConnections = this.findConnectionsFrom(nodeId, 'done');
      const hasBackEdge = this.workflow.connections.some(
        (c) => c.targetNodeId === nodeId && c.targetHandle === 'continue'
      );

      const getBatchSize = () => {
        const raw = (node as any)?.config?.batchSize;
        const n = Number(raw);
        if (!isFinite(n) || n <= 0) return 1;
        return n;
      };

      // Initialize runtime only on first arrival (not via 'continue')
      if (!arrivedByContinue) {
        const loopItems = Array.isArray(nodeOutput?.loopItems) ? nodeOutput.loopItems : [];
        const mode = (nodeOutput?.mode || 'array');
        const accumulateResults = !!((node as any)?.config?.accumulateResults ?? false);
        const resetOnEachIteration = !!((node as any)?.config?.resetOnEachIteration ?? false);
        console.log(`[WorkflowEngine] [LOOP INIT] Items: ${loopItems.length}, mode: ${mode}, backEdge: ${hasBackEdge}, accumulate=${accumulateResults}, reset=${resetOnEachIteration}`);
        this.loopRuntime[nodeId] = {
          items: loopItems,
          index: 0,
          batchSize: getBatchSize(),
          waitForDone: shouldWaitForDone,
          mode,
          accumulated: [],
          totalScheduled: 0,
          resetOnEachIteration,
          accumulateResults,
        };
      }

      const runtime = this.loopRuntime[nodeId];
      if (!runtime) {
        console.warn(`[WorkflowEngine] [LOOP] No runtime found for node ${nodeId}. Treating as no-op.`);
        continue;
      }

      const total = runtime.items.length;
      const remainingBefore = Math.max(0, total - runtime.index);

      const enqueueBatch = (count: number) => {
        if (!count || count <= 0) return;
        const start = runtime.index;
        const end = Math.min(start + count, total);
        const batch = runtime.items.slice(start, end);
        console.log(`[WorkflowEngine] [LOOP ENQUEUE] ${count} item(s) from ${start} to ${end - 1} of ${total}`);
        if (batch.length > 0 && loopConnections.length > 0) {
          for (const loopItem of batch) {
            for (const conn of loopConnections) {
              // Ensure body/files propagate through loop iterations
              const payload = {
                body: (loopItem && (loopItem as any).body) || (inputData && (inputData as any).body) || {},
                files: (loopItem && (loopItem as any).files) || (inputData && (inputData as any).files) || {},
                ...loopItem,
              };
              // Emit edge traverse for visual feedback on loop branches
              try {
                const sourceNodeExecution = this.context[nodeId];
                const executionTime = sourceNodeExecution
                  ? sourceNodeExecution.finishedAt.getTime() - sourceNodeExecution.startedAt.getTime()
                  : 0;
                this.options.onEdgeTraverse?.(conn.id, executionTime, 1);
              } catch {}
              queue.push({ nodeId: conn.targetNodeId, inputData: payload, sourceHandle: 'loop', targetHandle: conn.targetHandle });
              runtime.totalScheduled += 1;
            }
          }
        }
        runtime.index = end;
      };

      if (hasBackEdge) {
        // If we arrived by continue, consider current branch payload as an iteration result
        if (arrivedByContinue && runtime.accumulateResults && inputData !== undefined) {
          try { runtime.accumulated.push(inputData); } catch {}
        }
        // Gate progress by 'continue' back-edge
        const toSchedule = Math.min(runtime.batchSize || 1, remainingBefore);
        enqueueBatch(toSchedule);

        const remainingAfter = Math.max(0, total - runtime.index);
        // Only emit 'done' when all items have been processed AND we're arriving via 'continue'
        if (remainingAfter === 0 && arrivedByContinue) {
          // If accumulateResults is enabled, push the last branch return payload
          if (runtime.accumulateResults && inputData !== undefined) {
            try { runtime.accumulated.push(inputData); } catch {}
          }

          // Reset-on-each-iteration: accept new items from branch and restart loop if provided
          if (runtime.resetOnEachIteration) {
            const nextItems = Array.isArray((inputData as any)?.loopItems)
              ? (inputData as any).loopItems
              : (Array.isArray((inputData as any)?.items) ? (inputData as any).items : undefined);
            if (nextItems && Array.isArray(nextItems) && nextItems.length > 0) {
              console.log(`[WorkflowEngine] [LOOP RESET] Received ${nextItems.length} new items from branch. Restarting loop.`);
              runtime.items = nextItems;
              runtime.index = 0;
              runtime.totalScheduled = 0;
              enqueueBatch(Math.min(runtime.batchSize || 1, runtime.items.length));
              // Do not emit done; continue iterations
              continue; // handled
            }
          }

          if (!shouldWaitForDone) {
            console.log('[WorkflowEngine] [LOOP DONE] waitForDone=false but using back-edge; emitting done now');
          } else {
            console.log('[WorkflowEngine] [LOOP DONE] All items processed. Emitting done.');
          }
          for (const conn of doneConnections) {
            queue.push({
              nodeId: conn.targetNodeId,
              inputData: { loopItems: runtime.items, totalCount: total, mode: runtime.mode, results: runtime.accumulated },
              sourceHandle: 'done',
              targetHandle: conn.targetHandle,
            });
          }
          this.loopCompleted.add(nodeId);
          delete this.loopRuntime[nodeId];
        }
      } else {
        // No back-edge: schedule all remaining items now
        enqueueBatch(remainingBefore);
        // Emit done immediately or after scheduling depending on waitForDone
        if (!shouldWaitForDone || remainingBefore === 0) {
          console.log('[WorkflowEngine] [LOOP DONE] Emitting done (no back-edge, immediate).');
          for (const conn of doneConnections) {
            queue.push({
              nodeId: conn.targetNodeId,
              inputData: { loopItems: runtime.items, totalCount: total, mode: runtime.mode, results: runtime.accumulated },
              sourceHandle: 'done',
              targetHandle: conn.targetHandle,
            });
          }
          this.loopCompleted.add(nodeId);
          delete this.loopRuntime[nodeId];
        } else {
          // Even without back-edge, user wants waitForDone=true: best effort—emit done after scheduling
          console.log('[WorkflowEngine] [LOOP DONE] waitForDone=true but no back-edge; emitting done after scheduling.');
          for (const conn of doneConnections) {
            queue.push({
              nodeId: conn.targetNodeId,
              inputData: { loopItems: runtime.items, totalCount: total, mode: runtime.mode, results: runtime.accumulated },
              sourceHandle: 'done',
              targetHandle: conn.targetHandle,
            });
          }
          this.loopCompleted.add(nodeId);
          delete this.loopRuntime[nodeId];
        }
      }

      continue; // handled loop; skip normal connection processing
    }

    const nextConnections = this.findConnectionsFrom(nodeId, nextHandle);

    for (const conn of nextConnections) {
      const sourceNodeExecution = this.context[nodeId];
      const executionTime = sourceNodeExecution
        ? sourceNodeExecution.finishedAt.getTime() -
          sourceNodeExecution.startedAt.getTime()
        : 0;
      const itemCount = Array.isArray(nodeOutput)
        ? nodeOutput.length
        : nodeOutput
        ? 1
        : 0;

      this.options.onEdgeTraverse?.(conn.id, executionTime, itemCount);

      // Reduce delay for loop iterations to speed up execution
      const delayMs = sourceHandle === 'loop' ? 50 : 300;
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const nextNode = this.findNodeById(conn.targetNodeId);
      if (nextNode) {
        const nextNodeDefinition = getNodeDefinition(nextNode.type);

        // Prevent re-enqueueing to a loop that has already completed
        if (nextNodeDefinition?.id === 'loop_node' && this.loopCompleted.has(conn.targetNodeId)) {
          if (conn.targetHandle === 'continue' || conn.targetHandle === 'main') {
            console.log(`[WorkflowEngine] [LOOP GUARD] Skipping enqueue to completed loop ${conn.targetNodeId} via '${conn.targetHandle}'`);
            continue;
          }
        }

        if (nextNodeDefinition?.id === 'merge_node') {
          (this.context as any)[`${conn.targetNodeId}_${conn.targetHandle}`] = effectiveOutput;

          const mergeNodeDef = getNodeDefinition('merge_node');
          const requiredInputs = mergeNodeDef?.inputs?.map((i) => i.id) || [];
          const allInputsReady = requiredInputs.every(
            (handleId) => (this.context as any)[`${conn.targetNodeId}_${handleId}`]
          );

          if (allInputsReady) {
            const mergedInputs = requiredInputs.reduce((acc, handleId) => {
              acc[handleId] = (this.context as any)[`${conn.targetNodeId}_${handleId}`];
              return acc;
            }, {} as Record<string, any>);
            // No increments here; only initial loop enqueues affect pending count
            queue.push({ nodeId: conn.targetNodeId, inputData: mergedInputs, sourceHandle, loopOriginIds, targetHandle: conn.targetHandle });
          }
        } else {
          // ✅ Asegura que todos los nodos propaguen body y files
          const safeOutput = {
            body: {},
            files: {},
            ...effectiveOutput,
          };

          if (!safeOutput.files || Object.keys(safeOutput.files).length === 0) {
            safeOutput.files = inputData?.files || {};
          }

          if (!safeOutput.body || Object.keys(safeOutput.body).length === 0) {
            safeOutput.body = inputData?.body || {};
          }

          // Propagate loop origins to downstream nodes, but DON'T increment counter here
          // The counter is only incremented when items are initially enqueued from the loop node
          queue.push({ nodeId: conn.targetNodeId, inputData: safeOutput, sourceHandle, loopOriginIds, targetHandle: conn.targetHandle });
        }
      }
    }

    // If this item belongs to a loop origin, mark it as completed and emit deferred 'done' when appropriate
    if (loopOriginIds && loopOriginIds.length) {
      console.log(`[WorkflowEngine] [LOOP DECREMENT] Node ${nodeId} finished. loopOriginIds:`, loopOriginIds);
      for (const origin of loopOriginIds) {
        const beforeCount = this.loopPendingCounts[origin] || 0;
        this.loopPendingCounts[origin] = Math.max(0, beforeCount - 1);
        const afterCount = this.loopPendingCounts[origin];
        console.log(`[WorkflowEngine] [LOOP DECREMENT] Loop ${origin} counter: ${beforeCount} -> ${afterCount}`);

        if (this.loopPendingCounts[origin] === 0 && this.loopDeferredDone[origin]) {
          console.log(`[WorkflowEngine] [LOOP DONE] Loop ${origin} counter reached 0! Emitting deferred 'done' output`);
          const deferred = this.loopDeferredDone[origin]!;
          delete this.loopDeferredDone[origin];

          for (const conn of deferred.connections) {
            queue.push({
              nodeId: conn.targetNodeId,
              inputData: deferred.payload,
              sourceHandle: 'done'
            });
          }
        } else if (this.loopPendingCounts[origin] === 0) {
          console.log(`[WorkflowEngine] [LOOP DONE] Loop ${origin} counter is 0, but no deferred done found`);
        }
      }
    } else {
      console.log(`[WorkflowEngine] [LOOP DECREMENT] Node ${nodeId} finished but has no loopOriginIds`);
    }
  }

  console.log(`[WorkflowEngine] Execution finished for workflow '${this.workflow.name}'.`);
  console.log('[WorkflowEngine] Final Context:', this.context);
  this.options.onWorkflowEnd?.();
  return this.context; // Explicitly return context at the end
}


  /**
   * Get execution results for a specific node
   */
  public getNodeExecution(nodeId: string) {
    return this.context[nodeId];
  }

  /**
   * Get all execution results
   */
  public getExecutionContext() {
    return this.context;
  }

  /**
   * Get execution results by node name
   */
  public getExecutionByName() {
    return this.buildContextByName();
  }
}
