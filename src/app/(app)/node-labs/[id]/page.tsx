
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Plus, Palette, CircleDot, Zap, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getNodeDefinition, nodeGroups, getNodeIcon } from '@/lib/nodes';
import { Textarea } from '@/components/ui/textarea';
import type { CustomNode, CustomNodePort, CustomNodeProperty, NodeLifecycleHook } from '@/lib/custom-nodes-types';
import { useToast } from '@/hooks/use-toast';
import { IconSelectorSheet } from '@/components/node-labs/icon-selector-sheet';
import { PortEditor } from '@/components/node-labs/port-editor';
import { PropertyEditor } from '@/components/node-labs/property-editor';
import { useFirestore, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { SubGroup } from '@/lib/subgroup-types';
import { getSocialMediaIcon } from '@/components/icons/social-media-icons';
import {
  getAllShapes,
  detectShapeChangeConflicts,
  resolveShapeChangeConflicts,
  autoAssignPortSlots,
  validatePorts,
  getMaxSlotsForPosition,
} from '@/lib/slot-system';
import * as LucideIcons from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { NodeShape } from '@/lib/types';
import CodeEditor from '@/components/code-editor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNodeComponent from '@/components/workflow/react-flow-node';
import type { NodeData } from '@/lib/types';

const defaultNode: Omit<CustomNode, 'id'> = {
    name: 'New Node',
    description: 'A new custom node.',
    version: '1.0',
    group: 'Custom',
    category: 'action',
    shape: '2x2',
    color: '#9E9E9E',
    icon: 'CircleDot',
    inputs: [{ id: 'main', label: 'Input', position: 'left', slot: 1 }],
    outputs: [{ id: 'main', label: 'Output', position: 'right', slot: 1 }],
    properties: [],
    executionCode: 'return { success: true, data: context.data };'
};

const nodeShapes: NodeShape[] = getAllShapes();

export default function NodeLabEditorPage() {
  const router = useRouter();
  const params = useParams();
  const nodeId = params.id as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [nodeData, setNodeData] = useState<CustomNode | null>(null);
  const [isIconSheetOpen, setIsIconSheetOpen] = useState(false);
  const [isNewNode, setIsNewNode] = useState(false);
  const [selectedHook, setSelectedHook] = useState<NodeLifecycleHook>('onCreate');
  const [isSaving, setIsSaving] = useState(false);
  const [shapeConflictDialog, setShapeConflictDialog] = useState<{
    open: boolean;
    newShape: NodeShape | null;
    conflicts: string[];
  }>({
    open: false,
    newShape: null,
    conflicts: [],
  });

  // Load subGroups from Firestore
  const subGroupsRef = useMemo(
    () => (user ? collection(firestore, "users", user.uid, "subGroups") : null),
    [firestore, user]
  );
  const { data: subGroups } = useCollection<SubGroup>(subGroupsRef as any);

  useEffect(() => {
    const loadNode = async () => {
      if (nodeId === 'new') {
        setIsNewNode(true);
        setNodeData({ id: `cnode-${Date.now()}`, ...defaultNode });
        return;
      }

      // Try to get built-in node first
      const builtInNode = getNodeDefinition(nodeId);
      if (builtInNode) {
        setIsNewNode(false);
        setNodeData({ ...builtInNode }); // Create a copy to allow editing
        return;
      }

      // If not built-in, try to load from local API
      try {
        const response = await fetch(`/api/node-definitions?id=${nodeId}`);
        if (response.ok) {
          const data = await response.json();
          setIsNewNode(false);
          setNodeData(data);
        } else {
          // Node not found, create new
          setIsNewNode(true);
          setNodeData({ id: nodeId, ...defaultNode });
        }
      } catch (error) {
        console.error('[NodeLabs] Error loading node:', error);
        toast({
          title: 'Error',
          description: 'Failed to load node from the server.',
          variant: 'destructive'
        });
      }
    };

    loadNode();
  }, [nodeId, toast]);

  // Temporarily inject node definition for preview
  useEffect(() => {
    if (nodeData) {
      // Store in window for the preview component to access
      (window as any).__NODELABS_PREVIEW_NODE__ = nodeData;
    }
    return () => {
      delete (window as any).__NODELABS_PREVIEW_NODE__;
    };
  }, [nodeData]);

  const pageTitle = useMemo(() => {
    if (isNewNode) return 'Create New Node';
    return nodeData ? `Edit: ${nodeData.name}` : 'Loading...';
  }, [isNewNode, nodeData]);

  const Icon = useMemo(() => (nodeData?.icon || nodeData?.customIcon) ? getNodeIcon(nodeData as any) : CircleDot, [nodeData?.icon, nodeData?.customIcon]);
  const nodeGroupsList = useMemo(() => [...new Set(nodeGroups.map(g => g.name)), 'Custom'], []);
  
  const handleInputChange = (field: keyof CustomNode, value: any) => {
    setNodeData(prev => {
      if (!prev) return null;

      // If shape changes, detect conflicts
      if (field === 'shape' && value !== prev.shape) {
        const { conflictingPorts, warnings } = detectShapeChangeConflicts(
          [...prev.inputs, ...prev.outputs],
          prev.shape,
          value
        );

        if (conflictingPorts.length > 0) {
          // Show conflict dialog
          setShapeConflictDialog({
            open: true,
            newShape: value,
            conflicts: warnings,
          });
          return prev; // Don't change yet, wait for user decision
        }

        // No conflicts, auto-assign slots
        return {
          ...prev,
          shape: value,
          inputs: autoAssignPortSlots(prev.inputs, value, 'inputs'),
          outputs: autoAssignPortSlots(prev.outputs, value, 'outputs'),
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const handleShapeConflictResolve = (strategy: 'auto-adjust' | 'remove-invalid' | 'cancel') => {
    if (!shapeConflictDialog.newShape || !nodeData) {
      setShapeConflictDialog({ open: false, newShape: null, conflicts: [] });
      return;
    }

    if (strategy === 'cancel') {
      setShapeConflictDialog({ open: false, newShape: null, conflicts: [] });
      return;
    }

    const newShape = shapeConflictDialog.newShape;

    setNodeData(prev => {
      if (!prev) return null;

      return {
        ...prev,
        shape: newShape,
        inputs: resolveShapeChangeConflicts(prev.inputs, newShape, 'inputs', strategy),
        outputs: resolveShapeChangeConflicts(prev.outputs, newShape, 'outputs', strategy),
      };
    });

    setShapeConflictDialog({ open: false, newShape: null, conflicts: [] });
  };
  
  const handlePortsChange = (type: 'inputs' | 'outputs', ports: CustomNodePort[]) => {
      handleInputChange(type, ports);
  }

  const handlePropertiesChange = (properties: CustomNodeProperty[]) => {
      handleInputChange('properties', properties);
  }

  const handleSave = async () => {
    if (!nodeData) return;

    // Validate ports before saving
    const inputErrors = validatePorts(nodeData.inputs, nodeData.shape, 'inputs');
    const outputErrors = validatePorts(nodeData.outputs, nodeData.shape, 'outputs');
    const allErrors = [...inputErrors, ...outputErrors];

    if (allErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Please fix the following errors:\n${allErrors.join('\n')}`,
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare node data for saving
      const dataToSave: any = { ...nodeData };

      // Clean up empty lifecycle hooks
      if (dataToSave.lifecycleHooks) {
        const cleanedHooks: any = {};
        Object.entries(dataToSave.lifecycleHooks).forEach(([hook, code]) => {
          if (code && code.trim() && code.trim() !== '// Write your hook code here') {
            cleanedHooks[hook] = code;
          }
        });

        if (Object.keys(cleanedHooks).length > 0) {
          dataToSave.lifecycleHooks = cleanedHooks;
        } else {
          delete dataToSave.lifecycleHooks;
        }
      }

      // Remove executionFile property if it exists but is false
      if (dataToSave.executionFile === false) {
        delete dataToSave.executionFile;
      }

      // Save to local filesystem via API
      const response = await fetch('/api/node-definitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save node.');
      }

      console.log('[NodeLabs] Node saved successfully:', dataToSave.id);

      toast({
        title: 'Success',
        description: `Node "${dataToSave.name}" saved successfully!`,
      });

      router.push('/node-labs');
    } catch (error) {
      console.error('[NodeLabs] Error saving node:', error);
      toast({
        title: 'Error',
        description: `Failed to save node: ${(error as Error).message}`,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Prepare node data for preview (compatible with workflow node component)
  const previewNodeData: NodeData | null = useMemo(() => {
    if (!nodeData) return null;
    return {
      id: 'preview-node',
      type: nodeData.id,
      label: nodeData.name,
      isExecuting: false,
      isCompleted: false,
      isError: false,
      showPortLabels: true,
    };
  }, [nodeData]);

  if (!nodeData) {
    return <p>Loading...</p>;
  }

  const { name, description, group, color, icon, customIcon, category, inputs, outputs, shape, executionCode, properties } = nodeData;


  return (
    <>
      <div className="flex flex-col h-full">
          <header className="sticky top-0 z-10 flex items-center justify-between p-2 md:p-4 border-b bg-background">
              <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => router.push('/node-labs')}>
                      <ArrowLeft />
                  </Button>
                  <div>
                      <h1 className="text-lg font-semibold">{pageTitle}</h1>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <Button onClick={handleSave} variant="default" size="default" disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Node'}
                  </Button>
              </div>
          </header>

          <main className="flex-1 flex flex-col gap-2 p-2 overflow-auto">
              <div>
                   <Card>
                      <CardHeader className="p-4">
                          <CardTitle className="text-base">Node Preview</CardTitle>
                          <CardDescription className="text-xs">This is how your node will appear in the workflow editor.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 p-4">
                          <div className="flex items-center justify-center p-2 bg-muted/50 rounded-lg min-h-[300px]">
                              {previewNodeData && (
                                <ReactFlowProvider>
                                    <div className="scale-125 transform">
                                        <CustomNodeComponent
                                          id="preview-node"
                                          type="custom"
                                          data={previewNodeData}
                                          isConnectable={false}
                                          selected={false}
                                          dragging={false}
                                          xPos={0}
                                          yPos={0}
                                          zIndex={1}
                                        />
                                    </div>
                                </ReactFlowProvider>
                              )}
                          </div>
                      </CardContent>
                   </Card>
              </div>
              
              <div className="flex-1">
                  <Tabs defaultValue="general" className="h-full flex flex-col">
                    <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
                      <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                      <TabsTrigger value="ports" className="flex-1">Ports</TabsTrigger>
                      <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
                      <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
                    </TabsList>
                      <Card className="mt-4 flex-1">
                          <CardContent className="p-6">
                              <TabsContent value="general">
                                  <div className="space-y-6">
                                      {/* Sección General */}
                                      <div className="space-y-4">
                                          <div className="space-y-2">
                                              <Label htmlFor="node-name">Node Name</Label>
                                              <Input id="node-name" placeholder="My Custom Node" value={name} onChange={e => handleInputChange('name', e.target.value)} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="node-description">Description</Label>
                                              <Textarea id="node-description" placeholder="A brief description of what this node does." value={description} onChange={e => handleInputChange('description', e.target.value)} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="node-group">Group</Label>
                                              <Select value={group} onValueChange={(val: string) => handleInputChange('group', val)}>
                                                <SelectTrigger id="node-group">
                                                    <SelectValue placeholder="Select a group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {nodeGroupsList.map(g => (
                                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                              </Select>
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="node-subgroup">Sub-Group (Optional)</Label>
                                              <Select
                                                value={nodeData?.subGroup || 'none'}
                                                onValueChange={(value) => handleInputChange('subGroup', value === 'none' ? undefined : value)}
                                              >
                                                <SelectTrigger id="node-subgroup">
                                                  <SelectValue placeholder="Select a sub-group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="none">
                                                    <span className="text-muted-foreground">No sub-group</span>
                                                  </SelectItem>
                                                  {subGroups && subGroups.length > 0 ? (
                                                    subGroups.map((subGroup) => {
                                                      const SocialIcon = getSocialMediaIcon(subGroup.icon);
                                                      const LucideIcon = SocialIcon || getNodeIcon({ icon: subGroup.icon } as any);
                                                      return (
                                                        <SelectItem key={subGroup.id} value={subGroup.name}>
                                                          <div className="flex items-center gap-2">
                                                            <div
                                                              className="p-1 rounded"
                                                              style={{ backgroundColor: `${subGroup.color}15` }}
                                                            >
                                                              <LucideIcon className="h-3.5 w-3.5" style={{ color: subGroup.color }} />
                                                            </div>
                                                            <span>{subGroup.name}</span>
                                                          </div>
                                                        </SelectItem>
                                                      );
                                                    })
                                                  ) : (
                                                    <SelectItem value="create-new" disabled>
                                                      <span className="text-muted-foreground text-xs">No sub-groups created yet</span>
                                                    </SelectItem>
                                                  )}
                                                </SelectContent>
                                              </Select>
                                              <p className="text-xs text-muted-foreground">
                                                Nodes with the same sub-group will be grouped together in the Node Palette
                                              </p>
                                          </div>
                                      </div>

                                      {/* Separador */}
                                      <div className="border-t pt-4">
                                          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                              <Palette className="h-4 w-4" />
                                              Appearance
                                          </h3>
                                      </div>

                                      {/* Sección Appearance */}
                                      <div className="space-y-4">
                                          <div className="space-y-2">
                                              <Label>Color</Label>
                                              <Input type="color" className="p-1 h-10" value={color} onChange={e => handleInputChange('color', e.target.value)} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label>Shape</Label>
                                              <Select value={shape} onValueChange={(val: NodeShape) => handleInputChange('shape', val)}>
                                                  <SelectTrigger>
                                                      <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      {nodeShapes.map(s => {
                                                        // Format shape label: "2x2" -> "2x2 (W2 x H2)"
                                                        let label = s;
                                                        if (s !== 'circle' && s.includes('x')) {
                                                          const [w, h] = s.split('x');
                                                          label = `${s} (W${w} × H${h})`;
                                                        }
                                                        return (
                                                          <SelectItem key={s} value={s} className="capitalize">{label}</SelectItem>
                                                        );
                                                      })}
                                                  </SelectContent>
                                              </Select>
                                          </div>
                                          <div className="space-y-2">
                                              <Label>Icon</Label>
                                              <div className="flex items-center gap-2">
                                                <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted">
                                                    <Icon className="h-8 w-8" style={{color: color}}/>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-mono text-xs break-all">{customIcon ? customIcon : icon}</p>
                                                    <Button variant="outline" size="sm" className="mt-1" onClick={() => setIsIconSheetOpen(true)}>
                                                        <Palette className="h-4 w-4 mr-2" />
                                                        Change Icon / Upload
                                                    </Button>
                                                </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </TabsContent>
                              <TabsContent value="ports">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                      <PortEditor
                                          title="Input Ports"
                                          ports={nodeData.inputs || []}
                                          onChange={(ports) => handlePortsChange('inputs', ports)}
                                          shape={nodeData.shape}
                                          portType="inputs"
                                      />
                                    </div>
                                    <div className="border-b"></div>
                                    <div className="space-y-4">
                                      <PortEditor
                                          title="Output Ports"
                                          ports={nodeData.outputs || []}
                                          onChange={(ports) => handlePortsChange('outputs', ports)}
                                          shape={nodeData.shape}
                                          portType="outputs"
                                      />
                                    </div>
                                </div>
                              </TabsContent>
                              <TabsContent value="properties">
                                <PropertyEditor
                                    properties={nodeData.properties || []}
                                    onChange={handlePropertiesChange}
                                />
                              </TabsContent>
                              <TabsContent value="code">
                                <Tabs defaultValue="main-code" className="space-y-4">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="main-code">Main Code</TabsTrigger>
                                    <TabsTrigger value="hooks">Lifecycle Hooks</TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="main-code" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="node-code" className="flex items-center gap-2"><Code className="h-4 w-4" /> Execution Code</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Write the JavaScript code to execute when the workflow runs this node. The `context` object is available, containing `data` and `node` properties.
                                            Example: `context.node.properties.yourPropertyName.value`
                                        </p>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="executionFile"
                                            checked={nodeData.executionFile || false}
                                            onCheckedChange={(checked) => handleInputChange('executionFile', checked)}
                                        />
                                        <Label
                                            htmlFor="executionFile"
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            Generate separated JS file
                                        </Label>
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-muted-foreground text-xs cursor-help">ⓘ</div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-xs">
                                                    <p className="text-xs">
                                                        When enabled, the execution code will be saved in a separate .js file instead of inline in the JSON.
                                                        This is useful for complex nodes with extensive JavaScript code.
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    <div className="h-96 w-full rounded-md border border-input bg-background text-sm overflow-hidden">
                                        <CodeEditor
                                            value={executionCode || ''}
                                            onChange={(value) => handleInputChange('executionCode', value)}
                                            node={nodeData}
                                        />
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="hooks" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                          <Code className="h-4 w-4" /> Lifecycle Hooks
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Define custom code to run at specific moments in the node's lifecycle.
                                            Select a hook below and write the corresponding JavaScript code.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="hook-select">Hook Event</Label>
                                        <Select value={selectedHook} onValueChange={(val: NodeLifecycleHook) => setSelectedHook(val)}>
                                            <SelectTrigger id="hook-select">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="onCreate">onCreate - When node is added to canvas</SelectItem>
                                                <SelectItem value="onDelete">onDelete - When node is deleted</SelectItem>
                                                <SelectItem value="onUpdate">onUpdate - When properties change</SelectItem>
                                                <SelectItem value="onConnect">onConnect - When edge connects</SelectItem>
                                                <SelectItem value="onDisconnect">onDisconnect - When edge disconnects</SelectItem>
                                                <SelectItem value="onDuplicate">onDuplicate - When node is duplicated</SelectItem>
                                                <SelectItem value="onExecute">onExecute - Before execution (validation)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs text-muted-foreground">
                                                Context: {selectedHook === 'onCreate' && 'node, workflow'}
                                                {selectedHook === 'onDelete' && 'node, workflow'}
                                                {selectedHook === 'onUpdate' && 'node, oldProperties, newProperties'}
                                                {selectedHook === 'onConnect' && 'node, sourceNode, targetNode, connection'}
                                                {selectedHook === 'onDisconnect' && 'node, connection'}
                                                {selectedHook === 'onDuplicate' && 'originalNode, newNode'}
                                                {selectedHook === 'onExecute' && 'context (data, node)'}
                                            </Label>
                                            {nodeData.lifecycleHooks?.[selectedHook] && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const newHooks = { ...nodeData.lifecycleHooks };
                                                        delete newHooks[selectedHook];
                                                        handleInputChange('lifecycleHooks', newHooks);
                                                    }}
                                                    className="h-7 text-xs text-destructive hover:text-destructive"
                                                >
                                                    Clear Hook
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="h-96 w-full rounded-md border border-input bg-background text-sm overflow-hidden">
                                        <CodeEditor
                                            value={nodeData.lifecycleHooks?.[selectedHook] || '// Write your hook code here\n'}
                                            onChange={(value) => {
                                                const newHooks = {
                                                    ...nodeData.lifecycleHooks,
                                                    [selectedHook]: value,
                                                };
                                                handleInputChange('lifecycleHooks', newHooks);
                                            }}
                                            node={nodeData}
                                        />
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </TabsContent>
                          </CardContent>
                      </Card>
                  </Tabs>
              </div>
          </main>
      </div>
      <IconSelectorSheet
        isOpen={isIconSheetOpen}
        setIsOpen={setIsIconSheetOpen}
        onSelectIcon={(iconName) => { handleInputChange('icon', iconName); handleInputChange('customIcon', undefined as any); }}
        onUploadIcon={(publicPath) => handleInputChange('customIcon', publicPath)}
      />

      {/* Shape Conflict Dialog */}
      <AlertDialog open={shapeConflictDialog.open} onOpenChange={(open) => {
        if (!open) {
          setShapeConflictDialog({ open: false, newShape: null, conflicts: [] });
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shape Change Conflicts Detected</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Changing the shape to <strong>{shapeConflictDialog.newShape}</strong> will cause
                some ports to exceed the available slot limits.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-sm font-semibold text-destructive mb-2">Affected Ports:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {shapeConflictDialog.conflicts.map((conflict, idx) => (
                    <li key={idx} className="text-destructive">{conflict}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm">How would you like to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => handleShapeConflictResolve('cancel')}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => handleShapeConflictResolve('remove-invalid')}
            >
              Remove Invalid Ports
            </Button>
            <AlertDialogAction onClick={() => handleShapeConflictResolve('auto-adjust')}>
              Auto-Adjust Positions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    

    

    
