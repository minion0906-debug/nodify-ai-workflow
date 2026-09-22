/**
 * Node Hooks Executor
 *
 * Executes lifecycle hooks for custom nodes
 * Hooks are defined in the node's lifecycleHooks property and are optional
 */

import { NodeDefinition } from './types';
import type { NodeLifecycleHook, CustomNode } from './custom-nodes-types';

interface HookContext {
  node: any;
  workflow?: any;
  oldProperties?: any;
  newProperties?: any;
  sourceNode?: any;
  targetNode?: any;
  connection?: any;
  originalNode?: any;
  newNode?: any;
  context?: any;
  helpers: {
    log: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
}

export class NodeHooksExecutor {
  /**
   * Execute a lifecycle hook if it exists in the node definition
   */
  static async executeHook(
    hookName: NodeLifecycleHook,
    nodeDefinition: NodeDefinition | CustomNode,
    hookContext: Partial<HookContext>
  ): Promise<void> {
    try {
      // Check if the node has lifecycle hooks
      const customNode = nodeDefinition as CustomNode;
      if (!customNode.lifecycleHooks || !customNode.lifecycleHooks[hookName]) {
        // Hook doesn't exist, silently skip
        return;
      }

      const hookCode = customNode.lifecycleHooks[hookName];

      if (!hookCode || typeof hookCode !== 'string') {
        return;
      }

      // Create helpers
      const helpers = {
        log: (message: string, ...args: any[]) => {
          console.log(`[NodeHook:${hookName}:${nodeDefinition.id}]`, message, ...args);
        },
        warn: (message: string, ...args: any[]) => {
          console.warn(`[NodeHook:${hookName}:${nodeDefinition.id}]`, message, ...args);
        },
        error: (message: string, ...args: any[]) => {
          console.error(`[NodeHook:${hookName}:${nodeDefinition.id}]`, message, ...args);
        },
      };

      // Create the function from the hook code with all possible context variables
      const hookFunction = new Function(
        'node',
        'workflow',
        'oldProperties',
        'newProperties',
        'sourceNode',
        'targetNode',
        'connection',
        'originalNode',
        'newNode',
        'context',
        'helpers',
        hookCode
      );

      // Execute the hook with the provided context
      await hookFunction(
        hookContext.node,
        hookContext.workflow,
        hookContext.oldProperties,
        hookContext.newProperties,
        hookContext.sourceNode,
        hookContext.targetNode,
        hookContext.connection,
        hookContext.originalNode,
        hookContext.newNode,
        hookContext.context,
        helpers
      );

      console.log(`[NodeHooksExecutor] Successfully executed ${hookName} hook for ${nodeDefinition.id}`);
    } catch (error) {
      console.error(`[NodeHooksExecutor] Error executing ${hookName} hook for ${nodeDefinition.id}:`, error);
      // Don't throw - hooks should not break the workflow
    }
  }

  /**
   * Execute onCreate hook when a node is added to the canvas
   */
  static async onCreate(
    nodeDefinition: NodeDefinition | CustomNode,
    node: any,
    workflow?: any
  ): Promise<void> {
    return this.executeHook('onCreate', nodeDefinition, { node, workflow });
  }

  /**
   * Execute onDelete hook when a node is deleted from the canvas
   */
  static async onDelete(
    nodeDefinition: NodeDefinition | CustomNode,
    node: any,
    workflow?: any
  ): Promise<void> {
    return this.executeHook('onDelete', nodeDefinition, { node, workflow });
  }

  /**
   * Execute onUpdate hook when a node's properties are updated
   */
  static async onUpdate(
    nodeDefinition: NodeDefinition | CustomNode,
    node: any,
    oldProperties: any,
    newProperties: any
  ): Promise<void> {
    return this.executeHook('onUpdate', nodeDefinition, { node, oldProperties, newProperties });
  }

  /**
   * Execute onConnect hook when an edge is connected to this node
   */
  static async onConnect(
    nodeDefinition: NodeDefinition | CustomNode,
    node: any,
    sourceNode: any,
    targetNode: any,
    connection: any
  ): Promise<void> {
    return this.executeHook('onConnect', nodeDefinition, { node, sourceNode, targetNode, connection });
  }

  /**
   * Execute onDisconnect hook when an edge is disconnected from this node
   */
  static async onDisconnect(
    nodeDefinition: NodeDefinition | CustomNode,
    node: any,
    connection: any
  ): Promise<void> {
    return this.executeHook('onDisconnect', nodeDefinition, { node, connection });
  }

  /**
   * Execute onDuplicate hook when a node is duplicated
   */
  static async onDuplicate(
    nodeDefinition: NodeDefinition | CustomNode,
    originalNode: any,
    newNode: any
  ): Promise<void> {
    return this.executeHook('onDuplicate', nodeDefinition, { originalNode, newNode });
  }

  /**
   * Execute onExecute hook before node execution (validation, pre-processing)
   */
  static async onExecute(
    nodeDefinition: NodeDefinition | CustomNode,
    context: any
  ): Promise<void> {
    return this.executeHook('onExecute', nodeDefinition, { context });
  }
}
