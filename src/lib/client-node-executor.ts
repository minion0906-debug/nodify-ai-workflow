/**
 * Client Node Executor
 * Executes nodes that need to run in the browser (alerts, toasts, UI effects, etc.)
 */

import type { NodeDefinition } from './types';

export interface ClientNodeContext {
  id: string;
  name: string;
  type: string;
  label: string;
  properties: Record<string, { value: any }>;
}

export interface ClientNodeHelpers {
  alert: (message: string) => void;
  toast: (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  executeFromNode?: (targetNodeId: string, inputData?: any) => Promise<any>;
}

/**
 * Execute a client-side node
 */
export async function executeClientNode(
  definition: NodeDefinition,
  nodeContext: ClientNodeContext,
  inputData: any,
  helpers: ClientNodeHelpers
): Promise<any> {
  // Use clientExecutionCode if available, otherwise fall back to executionCode
  const executionCode = definition.clientExecutionCode || definition.executionCode;

  if (!executionCode) {
    console.warn(
      `[ClientNodeExecutor] No clientExecutionCode or executionCode for node type '${definition.id}'. Passing data through.`
    );
    return inputData;
  }

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

    // Prepare items array (similar to backend execution)
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

    const dataParam = items.length > 0 ? items[0] : inputData;

    // Create executor function with client context
    const executor = new AsyncFunction(
      'node',
      'data',
      'items',
      '$input',
      '$json',
      '$node',
      'helpers',
      executionCode
    );

    // Execute the node with client-specific helpers
    const output = await executor(
      nodeContext,
      dataParam,
      items,
      $input,
      items[0] || {},
      items[0] || {},
      helpers
    );

    return output;
  } catch (error) {
    console.error(`[ClientNodeExecutor] Error executing client node ${definition.name}:`, error);
    throw error;
  }
}
