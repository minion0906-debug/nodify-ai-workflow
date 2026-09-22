/**
 * Server-side Workflow Executor
 * Executes workflows in the backend without browser dependencies
 */

import { getNodeDefinition } from './nodes';

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  description?: string;
  parentId?: string | null;
}

interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
}

interface ServerWorkflow {
  id: string;
  name: string;
  status: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

interface ExecutionContext {
  [nodeId: string]: {
    input: any;
    output: any;
    startedAt: Date;
    finishedAt: Date;
    status: 'success' | 'failed' | 'running';
    error?: string;
  };
}

export class ServerWorkflowExecutor {
  private workflow: ServerWorkflow;
  private context: ExecutionContext = {};
  private onEvent?: (event: any) => void;
  private services?: any;

  constructor(workflow: ServerWorkflow, options?: { onEvent?: (event: any) => void; services?: any }) {
    this.workflow = workflow;
    this.onEvent = options?.onEvent;
    this.services = options?.services;
  }

  private findNodeById(nodeId: string): WorkflowNode | undefined {
    return this.workflow.nodes.find((n) => n.id === nodeId);
  }

  private findConnectionsFrom(nodeId: string, handleId: string = 'main'): WorkflowConnection[] {
    return this.workflow.connections.filter(
      (c) => c.sourceNodeId === nodeId && c.sourceHandle === handleId
    );
  }

  private findConnectionsTo(nodeId: string): WorkflowConnection[] {
    return this.workflow.connections.filter(
      (c) => c.targetNodeId === nodeId
    );
  }

  private emitEvent(event: any) {
    if (this.onEvent) {
      this.onEvent(event);
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(nodeId: string, inputData: any): Promise<any> {
    const node = this.findNodeById(nodeId);
    if (!node) {
      const error = `Node with ID '${nodeId}' not found.`;
      console.error(`[ServerWorkflowExecutor] ${error}`);
      return { error };
    }

    const definition = getNodeDefinition(node.type);
    if (!definition) {
      console.warn(`[ServerWorkflowExecutor] No definition for node type '${node.type}'. Passing data through.`);
      return inputData;
    }

    console.log(`[ServerWorkflowExecutor] > Executing node: ${definition.name} (${node.id})`);
    console.log(`[ServerWorkflowExecutor] Input data keys:`, Object.keys(inputData || {}));
    if (inputData?.__ports) {
      console.log(`[ServerWorkflowExecutor] __ports keys:`, Object.keys(inputData.__ports));
    }
    this.emitEvent({ type: 'node_start', nodeId });

    const startedAt = new Date();

    // Mark node as running
    this.context[node.id] = {
      input: inputData,
      output: null,
      startedAt,
      finishedAt: startedAt,
      status: 'running',
    };

    // Skip client-side nodes in production
    const executionEnvironment = (definition as any).executionEnvironment || 'backend';
    if (executionEnvironment === 'client') {
      console.log(`[ServerWorkflowExecutor] Skipping client-side node: ${definition.name}`);
      const output = { skipped: true, reason: 'Client-side execution not supported in production' };

      const finishedAt = new Date();
      this.context[node.id] = {
        input: inputData,
        output,
        startedAt,
        finishedAt,
        status: 'success',
      };

      this.emitEvent({ type: 'node_end', nodeId, output });
      return output;
    }

    if (!definition.executionCode) {
      console.warn(`[ServerWorkflowExecutor] No execution code for node type '${node.type}'. Passing data through.`);
      const finishedAt = new Date();
      this.context[node.id].status = 'success';
      this.context[node.id].output = inputData;
      this.context[node.id].finishedAt = finishedAt;
      this.emitEvent({ type: 'node_end', nodeId, output: inputData });
      console.log(`[ServerWorkflowExecutor] Output for ${node.type}:`, inputData);
      return inputData;
    }

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

      // Prepare node context
      const nodeContext = {
        id: node.id,
        name: definition.name,
        type: node.type,
        label: node.label,
        properties: {} as Record<string, { value: any }>,
      };

      // Resolve properties
      for (const propDef of definition.properties || []) {
        const configuredValue = node.config[propDef.name];
        nodeContext.properties[propDef.name] = { value: configuredValue };
      }

      // Create executor function
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
        'require',
        'modules',
        definition.executionCode
      );

      const items = Array.isArray(inputData) ? inputData : inputData ? [inputData] : [];
      const $input = {
        first: () => items[0] || {},
        last: () => items[items.length - 1] || {},
        all: () => items,
        item: (index: number) => items[index] || {},
      };

    const helpers: any = {
      json: (obj: any) => JSON.stringify(obj, null, 2),
      parse: (str: string) => JSON.parse(str),
      log: (...args: any[]) => console.log(`[${definition.name}]`, ...args),
      error: (...args: any[]) => console.error(`[${definition.name}]`, ...args),
      warn: (...args: any[]) => console.warn(`[${definition.name}]`, ...args),
    };

    // Provide credential helpers when services are available (Firestore client)
    console.log('[ServerWorkflowExecutor] Checking services availability:', {
      hasServices: !!this.services,
      hasDb: !!this.services?.db,
      hasDoc: !!this.services?.doc,
      hasGetDoc: !!this.services?.getDoc,
      hasUser: !!this.services?.user,
      userId: this.services?.user?.uid
    });

    if (this.services && this.services.db && this.services.doc && this.services.getDoc && this.services.user) {
      console.log('[ServerWorkflowExecutor] Services available - enabling credential helpers');
      helpers.getCredential = async (credentialId: string) => {
        try {
          console.log(`[ServerWorkflowExecutor] getCredential called for: ${credentialId}`);
          const ref = this.services.doc(this.services.db, 'users', this.services.user.uid, 'credentials', credentialId);
          console.log('[ServerWorkflowExecutor] Firestore ref created, fetching document...');
          const snap = await this.services.getDoc(ref);
          const exists = typeof (snap as any)?.exists === 'function' ? (snap as any).exists() : !!(snap as any)?.exists;
          console.log(`[ServerWorkflowExecutor] Document exists: ${exists}`);
          if (!exists) return null;
          const data = snap.data();
          console.log('[ServerWorkflowExecutor] Credential data loaded successfully');
          return { id: snap.id, ...data };
        } catch (e: any) {
          console.error('[ServerWorkflowExecutor] getCredential failed:', e?.message || e);
          console.error('[ServerWorkflowExecutor] Error stack:', e?.stack);
          return null;
        }
      };
      helpers.getCredentialData = async (credentialId: string) => {
        console.log(`[ServerWorkflowExecutor] getCredentialData called for: ${credentialId}`);
        const cred = await helpers.getCredential(credentialId);
        const credData = cred?.data || null;
        console.log(`[ServerWorkflowExecutor] Credential data result: ${credData ? 'found' : 'not found'}`);
        if (credData) {
          console.log('[ServerWorkflowExecutor] Credential data keys:', Object.keys(credData));
        }
        return credData;
      };
    } else {
      console.warn('[ServerWorkflowExecutor] Services not fully available - credential helpers disabled');
    }

      // Provide Node.js modules for server-side execution
      const dynamicRequire = eval('require');
      const extraModules: Record<string, any> = {};
      try {
        // Expose SQLite helpers to nodes (for memory_sqlite, etc.)
        const sqlite = dynamicRequire('@/lib/db/sqlite');
        if (sqlite?.chatMessages) extraModules.chatMessages = sqlite.chatMessages;
      } catch {}

      const nodeModules = {
        fs: dynamicRequire('fs'),
        path: dynamicRequire('path'),
        crypto: dynamicRequire('crypto'),
        buffer: dynamicRequire('buffer'),
        stream: dynamicRequire('stream'),
        ...extraModules,
      };

      // Execute the node
      console.log(`[ServerWorkflowExecutor] Calling executor for ${definition.name}...`);
      const output = await executor(
        nodeContext,
        items[0] || inputData,
        items,
        this.context,
        this.context,
        $input,
        items[0] || {},
        items[0] || {},
        helpers,
        this.services || null, // expose services when provided (for credentials, etc.)
        process.env,
        dynamicRequire, // Use the dynamic require
        nodeModules // Add preloaded modules
      );

      const finishedAt = new Date();
      const duration = finishedAt.getTime() - startedAt.getTime();

      console.log(`[ServerWorkflowExecutor] < Finished node: ${definition.name} (${node.id}). Duration: ${duration}ms`);
      console.log(`[ServerWorkflowExecutor] Output keys:`, Object.keys(output || {}));

      // Update context with success
      this.context[node.id] = {
        input: inputData,
        output: {
          ...(output || {}),
          ...(inputData?.files ? { files: inputData.files } : {}),
        },
        startedAt,
        finishedAt,
        status: output?.error ? 'failed' : 'success',
        error: output?.error,
      };


      this.emitEvent({ type: 'node_end', nodeId, output });

      return output;
    } catch (error) {
      const finishedAt = new Date();
      const errorMessage = (error as Error).message;

      console.error(`[ServerWorkflowExecutor] Error executing node ${nodeId}:`, error);

      const errorOutput = {
        error: errorMessage,
        nodeId,
        nodeType: node.type,
      };

      // Update context with error
      this.context[node.id] = {
        input: inputData,
        output: errorOutput,
        startedAt,
        finishedAt,
        status: 'failed',
        error: errorMessage,
      };

      this.emitEvent({ type: 'node_end', nodeId, output: errorOutput });

      return errorOutput;
    }
  }

  /**
   * Execute the workflow
   */
  public async execute(startNodeId: string, initialInputData?: any): Promise<ExecutionContext> {
    console.log(`[ServerWorkflowExecutor] Starting execution for workflow '${this.workflow.name}' from node '${startNodeId}'.`);

    this.emitEvent({ type: 'workflow_start', workflowId: this.workflow.id });
    this.context = {};

    const queue: { nodeId: string; inputData: any }[] = [
      { nodeId: startNodeId, inputData: initialInputData || {} },
    ];
    const processedNodes = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, inputData } = queue.shift()!;

      const node = this.findNodeById(nodeId);
      const definition = node ? getNodeDefinition(node.type) : null;

      // Allow merge nodes to be processed multiple times
      const canReprocess = definition?.id === 'merge_node' || (definition as any)?.allowMultipleExecutions === true;

      if (processedNodes.has(nodeId) && !canReprocess) {
        console.log(`[ServerWorkflowExecutor] Node ${nodeId} already processed. Skipping.`);
        continue;
      }

      // Ensure auxiliary inputs (other handles) are available before executing
      const incoming = this.findConnectionsTo(nodeId);
      const unmetSources = incoming.filter(conn => !this.context[conn.sourceNodeId]);
      if (incoming.length > 0 && unmetSources.length > 0) {
        // Defer execution until sources have run
        queue.push({ nodeId, inputData });
        continue;
      }

      // Build __ports map with inputs from other handles (e.g., memory/tools)
      const ports: Record<string, any> = {};
      for (const conn of incoming) {
        const srcCtx = this.context[conn.sourceNodeId];
        if (srcCtx && srcCtx.output !== undefined) {
          ports[conn.targetHandle] = srcCtx.output;
        }
      }
      const mergedInput = ports && Object.keys(ports).length > 0
        ? { ...(inputData || {}), __ports: ports }
        : inputData;

      const nodeOutput = await this.executeNode(nodeId, mergedInput);

      if (!canReprocess) {
        processedNodes.add(nodeId);
      }

      // Handle error path
      if (nodeOutput && nodeOutput.error) {
        console.warn(`[ServerWorkflowExecutor] Node ${nodeId} finished with an error.`);
        const errorConnections = this.findConnectionsFrom(nodeId, 'error');
        if (errorConnections.length > 0) {
          for (const errConn of errorConnections) {
            queue.push({ nodeId: errConn.targetNodeId, inputData: nodeOutput });
          }
        } else {
          console.error(`[ServerWorkflowExecutor] Execution halted. No error path defined for failing node ${nodeId}.`);
          this.emitEvent({ type: 'workflow_end', workflowId: this.workflow.id, status: 'error' });
          return this.context;
        }
        continue;
      }

      // Determine next handle (for conditional nodes)
      const isConditionalNode = definition && (
        definition.id === 'if_node' ||
        definition.id === 'switch_node' ||
        definition.id === 'router_node' ||
        (definition as any).isConditional === true
      );

      let nextHandle = 'main';
      if (isConditionalNode && nodeOutput?.path) {
        nextHandle = nodeOutput.path;
      }

      const nextConnections = this.findConnectionsFrom(nodeId, nextHandle);

      // Emit edge traverse events
      for (const conn of nextConnections) {
        this.emitEvent({ type: 'edge_traverse', edgeId: conn.id });

        // Small delay for visualization
        await new Promise((resolve) => setTimeout(resolve, 100));

        queue.push({ nodeId: conn.targetNodeId, inputData: nodeOutput });
      }
    }

    console.log(`[ServerWorkflowExecutor] Execution finished for workflow '${this.workflow.name}'.`);
    console.log('[ServerWorkflowExecutor] Final Context:', Object.keys(this.context));

    this.emitEvent({ type: 'workflow_end', workflowId: this.workflow.id, status: 'success' });

    return this.context;
  }

  /**
   * Get execution context
   */
  public getContext(): ExecutionContext {
    return this.context;
  }
}
