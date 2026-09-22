

import type { NodeCategory, NodeShape, NodeTypeId } from "./types";

export type CustomNodePort = {
    id: string;
    label: string;
    type?: string;
    position: 'left' | 'right' | 'top' | 'bottom';
    slot: number; // 1-based slot number within the position
    description?: string; // Optional description for the port
    required?: boolean; // Whether the port must be connected
    metadata?: Record<string, any>; // Additional custom metadata
    accepts?: {
        nodeIds?: string[];      // allow only nodes with these ids
        categories?: string[];   // allow only nodes in these categories
        groups?: string[];       // allow only nodes in these groups
        tags?: string[];         // allow only nodes containing any of these tags
    };
};

// This is the property definition for the custom node's settings panel
export type CustomNodeProperty = {
    name: string;
    displayName: string;
    type: 'string' | 'number' | 'boolean' | 'options' | 'json' | 'collection' | 'credentials' | 'javascript' | 'notice' | 'separator' | 'button' | 'checkbox' | 'radio' | 'nodeSelector' | 'inputButton' | 'color';
    default?: any;
    description?: string;
    required?: boolean;
    placeholder?: string;
    options?: { id: string; value: string; label: string }[];

    // Future-proofing for advanced properties
    displayOptions?: {
        show?: Record<string, any[]>;
    };
    typeOptions?: Record<string, any>;
    ui?: Record<string, any>;
    validation?: Record<string, any>;
    behavior?: Record<string, any>;
};


// Lifecycle hook types
export type NodeLifecycleHook =
    | 'onCreate'      // When node is added to canvas
    | 'onDelete'      // When node is deleted
    | 'onUpdate'      // When node properties are updated
    | 'onConnect'     // When an edge is connected to this node
    | 'onDisconnect'  // When an edge is disconnected from this node
    | 'onDuplicate'   // When node is duplicated
    | 'onExecute';    // Before node execution (validation, pre-processing)

export type NodeLifecycleHooks = Partial<Record<NodeLifecycleHook, string>>;

export type CustomNode = {
    id: string;
    version: string;
    name:string;
    description: string;
    group: string;
    subGroup?: string; // Optional sub-group for hierarchical organization in Node Palette
    category: NodeCategory;
    shape: NodeShape;
    color: string;
    icon?: NodeTypeId | keyof typeof import('lucide-react'); // Lucide icon name
    customIcon?: string; // URL to custom uploaded icon
    tags?: string[]; // optional semantic tags (e.g., 'model', 'ai-model')
    inputs: CustomNodePort[];
    outputs: CustomNodePort[];
    properties: CustomNodeProperty[];
    executionCode?: string;
    executionFile?: boolean; // If true, execution code is loaded from a separate .js file
    executionEnvironment?: 'client' | 'server'; // Where the node should execute
    lifecycleHooks?: NodeLifecycleHooks; // Lifecycle hooks for this node
    meta?: Record<string, any>;
}
