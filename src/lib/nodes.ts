import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleDot } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { CustomNode } from './custom-nodes-types';
import { NODE_GROUP_ICONS, NODE_TYPE_ICONS as BUILT_IN_ICONS } from './icons';

const toPascalCase = (str: string): string => {
  if (!str) return '';
  return str.split(/[-_\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
};

const validateNode = (node: any, source: string): node is CustomNode => {
  // If source isn't a JSON file (Turbopack can leak .js/.ts here), silently skip
  if (typeof source === 'string' && !source.endsWith('.json')) {
    return false;
  }
  const required = ['id','name','version'];
  const missing = required.filter(f => !node[f]);
  if (missing.length) {
    console.error(`[NodeLoader] Invalid node from ${source}: missing fields:`, missing);
    return false;
  }
  if (node.executionCode && typeof node.executionCode !== 'string') {
    console.error(`[NodeLoader] Invalid node ${node.id}: executionCode must be a string`);
    return false;
  }
  if (!Array.isArray(node.inputs)) node.inputs = [{ id: 'main', label: 'Input', position: 'left', type: 'any' }];
  if (!Array.isArray(node.outputs)) node.outputs = [{ id: 'main', label: 'Output', position: 'right', type: 'any' }];
  if (!Array.isArray(node.properties)) node.properties = [];
  return true;
};

const prepareExecutionCode = (code: string): string => {
  if (!code) return '';
  let c = code.trim();
  if ((c.startsWith('"') && c.endsWith('"')) || (c.startsWith("'") && c.endsWith("'"))) c = c.slice(1,-1);
  return c
    .replace(/\\n/g,'\n')
    .replace(/\\t/g,'\t')
    .replace(/\\r/g,'\r')
    .replace(/\\"/g,'"')
    .replace(/\\'/g,"'")
    .replace(/\\\\/g,'\\');
};

const allNodes: CustomNode[] = [];
const loadErrors: Array<{ file: string; error: string }> = [];
// Static registry map for execution files (used in fallback under Turbopack)
const CODE_EXEC_FILES = new Map<string, any>();
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const reg = require('./node-execution-files');
  const obj = reg && (reg.executionFiles || reg.default) ? (reg.executionFiles || reg.default) : {};
  for (const [k, v] of Object.entries(obj)) {
    CODE_EXEC_FILES.set(k, v as any);
  }
} catch {
  // No static registry available; leave empty map
}

try {
  // Use Webpack-style require.context to discover node JSONs at build time
  // Invoke require.context directly so the bundler can statically include matches
  const nodeContext = (require as any).context('../nodes', true, /\.json$/);
  const codeMap = CODE_EXEC_FILES;

  if (nodeContext) {
    try {
      const nKeys = nodeContext.keys();
      const cKeys = Array.from(codeMap.keys());
      console.log(`[NodeLoader] JSON modules (${nKeys.length}): ${nKeys.slice(0,10).join(', ')}${nKeys.length > 10 ? ' …' : ''}`);
      console.log(`[NodeLoader] Registered code (${cKeys.length}): ${cKeys.slice(0,10).join(', ')}${cKeys.length > 10 ? ' …' : ''}`);
    } catch {}

    const ensureDefaultNodeProps = (nodeData: any) => {
      try {
        nodeData.properties = Array.isArray(nodeData.properties) ? nodeData.properties : [];
        const existing = new Set<string>((nodeData.properties || []).map((p: any) => p?.name));
        if (!existing.has('appendData')) {
          nodeData.properties.push({
            name: 'appendData',
            displayName: 'Append Data',
            type: 'boolean',
            default: true,
            description: 'Merge input data into node output before passing to the next node.',
            ui: { group: 'Advanced' }
          });
        }
        if (!existing.has('stopOnError')) {
          nodeData.properties.push({
            name: 'stopOnError',
            displayName: 'Stop On Error',
            type: 'boolean',
            default: true,
            description: 'If disabled, the flow will continue and optionally follow the error path when the node fails.',
            ui: { group: 'Advanced' }
          });
        }
        if (!existing.has('forwardInputOnEmpty')) {
          nodeData.properties.push({
            name: 'forwardInputOnEmpty',
            displayName: 'Forward Input On Empty',
            type: 'boolean',
            default: true,
            description: 'If the node does not produce output (empty/null), forward the input payload to keep data flowing.',
            ui: { group: 'Advanced' }
          });
        }
      } catch {}
    };

    nodeContext.keys().forEach((key: string) => {
      try {
        if (!key.endsWith('.json')) return;
        const mod = nodeContext(key);
        const nodeData: any = mod.default || mod;
        if (typeof nodeData !== 'object' || nodeData === null || Array.isArray(nodeData)) return;
        if (!validateNode(nodeData, key)) { loadErrors.push({ file: key, error: 'Validation failed' }); return; }

        if (nodeData.executionFile === true) {
          const jsKey = key.replace('.json', '.js');
          const tsKey = key.replace('.json', '.ts');
          const keys = Array.from(codeMap.keys());
          const sample = keys.slice(0, 8).join(', ');
          console.log(
            `[NodeLoader] Searching execution file for ${nodeData.id} (${key}). Candidates: ${jsKey}, ${tsKey}. Registered (${keys.length}): ${sample}${keys.length > 8 ? ' …' : ''}`
          );
          const foundKey = codeMap.has(jsKey) ? jsKey : (codeMap.has(tsKey) ? tsKey : null);
          if (foundKey) {
            const execVal = codeMap.get(foundKey);
            if (typeof execVal === 'function') nodeData.executionCode = execVal.toString();
            else if (typeof execVal === 'string') nodeData.executionCode = execVal;
            else { console.error(`[NodeLoader] Invalid executionFile for ${nodeData.id}: must export default string or function`); nodeData.executionCode = ''; }
            console.log(`[NodeLoader] V Loaded execution file: ${foundKey}`);
          } else {
            console.error(`[NodeLoader] executionFile not found for ${nodeData.id}: tried ${jsKey}, ${tsKey}`);
            loadErrors.push({ file: key, error: `executionFile specified but none of ${jsKey}, ${tsKey} found` });
            return;
          }
        } else if (nodeData.executionCode) {
          nodeData.executionCode = prepareExecutionCode(nodeData.executionCode);
        }

        nodeData.group = nodeData.group || 'Other';
        nodeData.category = nodeData.category || 'other';
        nodeData.shape = nodeData.shape || 'rectangle';
        nodeData.color = nodeData.color || '#6B7280';
        nodeData.icon = nodeData.icon || 'Box';
        // Inject default properties for all nodes (n8n-style common options)
        ensureDefaultNodeProps(nodeData);

        allNodes.push(nodeData as CustomNode);
      } catch (e) {
        if (key.endsWith('.json')) {
          console.error(`[NodeLoader] ? Failed to load node from ${key}:`, e);
          loadErrors.push({ file: key, error: e instanceof Error ? e.message : 'Unknown error' });
        }
      }
    });
  }
} catch (e) {
  console.error('[NodeLoader] Fatal loader error:', e);
}

console.log(`[NodeLoader] Loaded ${allNodes.length} nodes successfully`);
if (loadErrors.length > 0) console.warn(`[NodeLoader] Failed to load ${loadErrors.length} nodes:`, loadErrors);

const nodesById = allNodes.reduce((acc, n) => { if (!acc[n.id]) acc[n.id] = n; return acc; }, {} as Record<string, CustomNode>);

export const getNodeDefinition = (type: string): CustomNode | undefined => nodesById[type];
export const getAllNodes = (): CustomNode[] => [...allNodes];

export const getNodeIcon = (nodeOrId: string | CustomNode): any => {
  const node = typeof nodeOrId === 'string' ? nodesById[nodeOrId] : nodeOrId;
  if (node && (node as any).customIcon) {
    const src = (node as any).customIcon as string;
    const CustomIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = (props) =>
      React.createElement('img', {
        src,
        alt: node.name || 'icon',
        className: props.className,
        style: props.style,
      });
    CustomIcon.displayName = 'CustomIcon';
    return CustomIcon as unknown as LucideIcon;
  }
  if (!node || !node.icon) return CircleDot;
  const name = node.icon as string;
  const vars = [name, toPascalCase(name), name.charAt(0).toUpperCase()+name.slice(1)];
  for (const v of vars) {
    const Icon = (LucideIcons as any)[v] as LucideIcon;
    if (Icon) return Icon;
  }
  const BuiltIn = (BUILT_IN_ICONS as any)[name] as LucideIcon;
  return BuiltIn || CircleDot;
};

export const nodeGroups = allNodes.reduce((acc: any[], node) => {
  let g = acc.find(x => x.name === node.group);
  if (!g) { g = { name: node.group, icon: NODE_GROUP_ICONS[node.group] || CircleDot, nodes: [] }; acc.push(g); }
  g.nodes.push(node);
  return acc;
}, [] as Array<{ name: string; icon: LucideIcon; nodes: CustomNode[] }>);

/**
 * Get the outputs for a node, including dynamic outputs if enabled
 * @param nodeDefinition The node definition
 * @param nodeConfig The node's configuration (properties values)
 * @returns Array of output ports
 */
export const getNodeOutputs = (
  nodeDefinition: CustomNode,
  nodeConfig?: Record<string, any>
): any[] => {
  // If dynamic outputs are not enabled, return static outputs
  if (!nodeDefinition.dynamicOutputs?.enabled) {
    return nodeDefinition.outputs || [];
  }

  // If no config provided, return default output or empty array
  if (!nodeConfig) {
    return nodeDefinition.dynamicOutputs.defaultOutput
      ? [nodeDefinition.dynamicOutputs.defaultOutput]
      : [];
  }

  // Get the property that defines the dynamic outputs
  const sourceProperty = nodeDefinition.dynamicOutputs.sourceProperty;
  const outputsConfig = nodeConfig[sourceProperty];

  // If no outputs configured, return default
  if (!outputsConfig || (Array.isArray(outputsConfig) && outputsConfig.length === 0)) {
    return nodeDefinition.dynamicOutputs.defaultOutput
      ? [nodeDefinition.dynamicOutputs.defaultOutput]
      : [];
  }

  // Generate outputs from configuration
  const dynamicOutputs: any[] = [];

  if (Array.isArray(outputsConfig)) {
    outputsConfig.forEach((item, index) => {
      const outputName = item.output || `output_${index}`;
      dynamicOutputs.push({
        id: outputName,
        label: outputName,
        position: 'right',
        type: 'any',
        slot: index + 1
      });
    });
  }

  // Always add a default output at the end
  if (nodeDefinition.dynamicOutputs.defaultOutput) {
    dynamicOutputs.push({
      ...nodeDefinition.dynamicOutputs.defaultOutput,
      slot: dynamicOutputs.length + 1
    });
  }

  return dynamicOutputs;
};
