

"use client";

import React, { useEffect, useState, Fragment, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomNodeProperty } from "@/lib/custom-nodes-types";
import { getNodeDefinition, getNodeIcon } from "@/lib/nodes";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Node } from "reactflow";
import { useToast } from "@/hooks/use-toast";
import type { NodeData, Workflow } from "@/lib/types";
import { Slider } from "../ui/slider";
import CodeEditor from "../code-editor";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { Settings2, Database, Info, Sparkles, AlertCircle, Copy, Terminal, ExternalLink, Clipboard } from "lucide-react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Table } from "@/lib/tables-types";
import type { Credential } from "@/lib/credentials-types";
import { credentialDefinitions } from "@/lib/credentials-definitions";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import FormBuilderEditor from "../form-builder-editor";
import { DataViewer } from "./data-viewer";
import type { LogEntry } from "@/lib/workflow-engine";
import { CredentialModal } from "@/components/credentials/credential-modal";
import { Plus } from "lucide-react";

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type ExecutionContextByName = {
  [nodeName: string]: {
    input: any;
    output: any;
  };
};

// Fallback function to copy text to clipboard
function fallbackCopyTextToClipboard(text: string, onCopy: () => void, onError: () => void) {
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      onCopy();
    } else {
      onError();
    }
  } catch (err) {
    onError();
  }

  document.body.removeChild(textArea);
}

// Basic template resolver for inputButton/URL-like templates
function resolveTemplate(template: string, config: Record<string, any>): string {
  if (!template) return '';
  let result = template;
  try {
    if (typeof window !== 'undefined') {
      result = result.replaceAll('{{window.location.origin}}', window.location.origin);
    }
    // Replace {{node.config.key}} occurrences
    result = result.replace(/{{\s*node\.config\.([a-zA-Z0-9_\-]+)\s*}}/g, (_m, key) => {
      const v = config?.[key];
      return v != null ? String(v) : '';
    });
  } catch {
    // noop
  }
  return result;
}


const CollectionSelect = ({
  value,
  placeholder,
  handleConfigChange,
  collectionName,
  name
}: {
  value: any,
  placeholder: string,
  handleConfigChange: (name: string, value: any) => void,
  collectionName: string,
  name: string
}) => {
    const { user } = useUser();
    const firestore = useFirestore();

    const query = useMemo(() => {
      if (!user || !firestore) return null;
      return collection(firestore, 'users', user.uid, collectionName);
    }, [user, firestore, collectionName]);

    const { data, isLoading } = useCollection<Table>(query);

    return (
        <Select name={name} value={value} onValueChange={(val) => handleConfigChange(name, val)}>
          <SelectTrigger className="h-11 transition-all duration-200">
            <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {data && data.map(table => (
              <SelectItem key={table.id} value={table.id} className="cursor-pointer">
                {table.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
    );
};

const CredentialsSelect = ({
  value,
  placeholder,
  handleConfigChange,
  credentialType,
  name
}: {
  value: any,
  placeholder: string,
  handleConfigChange: (name: string, value: any) => void,
  credentialType?: string,
  name: string
}) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const query = useMemo(() => {
      if (!user || !firestore) return null;
      return collection(firestore, 'users', user.uid, 'credentials');
    }, [user, firestore]);

    const { data: credentials, isLoading } = useCollection<Credential>(query);

    // Filter credentials by type if specified
    const filteredCredentials = useMemo(() => {
      if (!credentials) return [];
      if (!credentialType) return credentials;
      return credentials.filter(cred => cred.type === credentialType);
    }, [credentials, credentialType]);

    const handleCredentialCreated = (credentialId: string) => {
      // Auto-select the newly created credential
      handleConfigChange(name, credentialId);
      setIsModalOpen(false);
    };

    return (
      <>
        <div className="flex gap-2">
          <Select name={name} value={value} onValueChange={(val) => handleConfigChange(name, val)}>
            <SelectTrigger className="h-11 transition-all duration-200 flex-1">
              <SelectValue placeholder={isLoading ? "Loading credentials..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filteredCredentials && filteredCredentials.length > 0 ? (
                filteredCredentials.map(credential => {
                  const credDef = credentialDefinitions.find(def => def.id === credential.type);
                  return (
                    <SelectItem key={credential.id} value={credential.id} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span>{credential.name}</span>
                        {credDef && (
                          <span className="text-xs text-muted-foreground">({credDef.name})</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })
              ) : (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  <p>No credentials found</p>
                  <p className="text-xs mt-1">Click the + button to create one</p>
                </div>
              )}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 flex-shrink-0"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <CredentialModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCredentialCreated}
          credentialType={credentialType}
        />
      </>
    );
};

const renderProperty = (
    property: CustomNodeProperty,
    config: Record<string, any>,
    handleConfigChange: (name: string, value: any) => void,
    node: Node<NodeData> | null,
    allNodes: Node<NodeData>[],
    allEdges: any[],
    toast: (props: any) => void,
    executionContext?: ExecutionContextByName
  ): JSX.Element | null => {
  const { name, displayName, type, placeholder, options = [], ui = {}, validation = {} } = property;
  const value = config[name];

  const shouldShow = () => {
    if (!property.displayOptions?.show) return true;
    const conditions = property.displayOptions.show;
    return Object.entries(conditions).every(([key, values]) => {
      return values.includes(config[key]);
    });
  };
  
  if (!shouldShow()) return null;

    const renderField = () => {
      switch (type) {
        case 'separator':
          return (
            <div className="pt-2">
              <Separator className="my-3" />
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{displayName}</div>
            </div>
          );
        case 'notice':
          return (
            <Alert>
              <AlertDescription className="text-xs">
                {property.default || placeholder || description || displayName}
              </AlertDescription>
            </Alert>
          );
        case 'inputButton': {
          const behavior = (property as any).behavior || {} as { action?: string; value?: string };
          const computed = resolveTemplate(behavior.value || value || '', config);
          const onCopy = () => toast({ title: 'Copied', description: 'Value copied to clipboard' });
          const onError = () => toast({ title: 'Copy failed', description: 'Could not copy to clipboard', variant: 'destructive' });
          const copy = async () => {
            try {
              await navigator.clipboard.writeText(computed);
              onCopy();
            } catch {
              fallbackCopyTextToClipboard(computed, onCopy, onError);
            }
          };
          return (
            <div className="flex gap-2 items-center">
              <Input readOnly value={computed} placeholder={placeholder} className="h-11 font-mono text-xs" />
              {behavior.action === 'copyToClipboard' && (
                <Button type="button" variant="outline" onClick={copy} className="h-11">
                  <Clipboard className="h-4 w-4 mr-2" /> Copy
                </Button>
              )}
              {behavior.action === 'info' && (
                <Button type="button" variant="outline" onClick={() => toast({ title: displayName, description: behavior.value || description })} className="h-11">
                  <Info className="h-4 w-4 mr-2" /> Info
                </Button>
              )}
              {computed?.startsWith('http') && (
                <Button asChild variant="ghost" className="h-11">
                  <a href={computed} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Open
                  </a>
                </Button>
              )}
            </div>
          );
        }
        case 'string':
          if (ui?.component === 'code') {
          return (
            <div className="relative rounded-lg border border-border/50 bg-muted/30 overflow-hidden transition-all duration-200 hover:border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <CodeEditor
                value={value ?? ''}
                onChange={(val) => handleConfigChange(name, val)}
                node={node ? getNodeDefinition(node.data.type) : null}
                allNodes={allNodes}
                oneLine={true}
                executionContext={executionContext}
              />
            </div>
          );
        }
        if (ui?.component === 'textarea') {
          return (
            <div className="h-48 rounded-lg border border-border/50 bg-muted/30 overflow-hidden transition-all duration-200 hover:border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <CodeEditor
                value={value ?? ''}
                onChange={(val) => handleConfigChange(name, val)}
                node={node ? getNodeDefinition(node.data.type) : null}
                allNodes={allNodes}
                executionContext={executionContext}
                language="nodifyLang"
              />
            </div>
          );
        }
          if (ui?.component === 'color') {
            return (
              <div className="flex gap-2">
                <div className="relative">
                  <Input
                    id={name}
                  name={name}
                  type="color"
                  className="w-14 h-10 p-1 cursor-pointer rounded-lg border-2"
                  value={value ?? '#ffffff'}
                  onChange={(e) => handleConfigChange(name, e.target.value)}
                />
              </div>
              <Input
                type="text"
                value={value ?? '#ffffff'}
                onChange={(e) => handleConfigChange(name, e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          );
          }
          return (
            <Input
              id={name}
              name={name}
              type="text"
              value={value ?? ''}
              placeholder={placeholder}
              onChange={(e) => handleConfigChange(name, e.target.value)}
              className="transition-all duration-200 h-11"
            />
          );
        case 'color':
          return (
            <div className="flex gap-2">
              <div className="relative">
                <Input
                  id={name}
                  name={name}
                  type="color"
                  className="w-14 h-10 p-1 cursor-pointer rounded-lg border-2"
                  value={value ?? '#ffffff'}
                  onChange={(e) => handleConfigChange(name, e.target.value)}
                />
              </div>
              <Input
                type="text"
                value={value ?? '#ffffff'}
                onChange={(e) => handleConfigChange(name, e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          );
        case 'number':
        if (ui?.component === 'slider') {
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Slider
                  id={name}
                  min={validation?.min || 10}
                  max={validation?.max || 32}
                  step={validation?.step || 1}
                  value={[value || validation?.min || 10]}
                  onValueChange={(val) => handleConfigChange(name, val[0])}
                  className="flex-1"
                />
                <div className="min-w-[70px] text-center">
                  <div className="inline-flex items-center justify-center h-9 px-3 rounded-lg bg-primary/10 text-primary font-semibold text-sm border border-primary/20">
                    {value || validation?.min || 10}{validation?.unit || 'px'}
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                <span>{validation?.min || 10}</span>
                <span>{validation?.max || 32}</span>
              </div>
            </div>
          );
        }
        return (
          <Input
            id={name}
            name={name}
            type="number"
            value={isNaN(value) || value === null || value === undefined ? '' : value}
            placeholder={placeholder}
            onChange={(e) => handleConfigChange(name, e.target.value === '' ? null : parseFloat(e.target.value))}
            className="transition-all duration-200 h-11"
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-xs text-muted-foreground">
                {value ? '✓ Enabled' : '○ Disabled'}
              </div>
            </div>
            <Switch
              id={name}
              name={name}
              checked={value ?? false}
              onCheckedChange={(checked) => handleConfigChange(name, checked)}
            />
          </div>
        );
      case 'options':
        return (
          <Select name={name} value={value} onValueChange={(val) => handleConfigChange(name, val)}>
            <SelectTrigger className="h-11 transition-all duration-200">
              <SelectValue placeholder={placeholder || 'Select an option...'} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'collection':
        if (property.typeOptions?.collectionName) {
            return <CollectionSelect
                value={value}
                placeholder={placeholder || 'Select an item...'}
                handleConfigChange={handleConfigChange}
                collectionName={property.typeOptions.collectionName}
                name={name}
            />
        }
        return <p className='text-destructive text-xs'>Error: collectionName not defined in property.</p>;
      case 'credentials':
        return <CredentialsSelect
                value={value}
                placeholder={placeholder || 'Select credentials...'}
                handleConfigChange={handleConfigChange}
                credentialType={property.typeOptions?.credentialType}
                name={name}
            />;
      case 'nodeSelector': {
        // Enhanced filter system with multiple criteria
        const filters = property.typeOptions?.filters || {};

        // Helper function to check if node has input connections
        const hasInputConnections = (nodeId: string): boolean => {
          return allEdges.some(edge => edge.target === nodeId);
        };

        // Helper function to check if node has output connections
        const hasOutputConnections = (nodeId: string): boolean => {
          return allEdges.some(edge => edge.source === nodeId);
        };

          const filteredNodes = (allNodes || []).filter((n: Node<NodeData>) => {
            const nodeDef = getNodeDefinition(n.data.type);
            if (!nodeDef) return false;

          // Skip the current node to avoid self-reference
          if (node && n.id === node.id) return false;

          // Apply basic filters
          if (filters.nodeType && n.data.type !== filters.nodeType) return false;
          if (filters.category && nodeDef.category !== filters.category) return false;
            if (filters.group && nodeDef.group !== filters.group) return false;

            // Filter by tags (intersection with nodeDef.tags)
            if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
              const defTags: string[] = (nodeDef as any).tags || [];
              const hasAny = defTags.some(t => filters.tags.includes(t));
              if (!hasAny) return false;
            }

          // Filter by name (partial match, case-insensitive)
          if (filters.name) {
            const nodeLabel = (n.data.label || nodeDef.name || '').toLowerCase();
            const searchName = filters.name.toLowerCase();
            if (!nodeLabel.includes(searchName)) return false;
          }

          // Filter by ID (partial match)
          if (filters.id && !n.id.includes(filters.id)) return false;

          // Apply connection state conditions
          if (filters.hasInput !== undefined) {
            const hasInput = hasInputConnections(n.id);
            if (filters.hasInput !== hasInput) return false;
          }

          if (filters.hasOutput !== undefined) {
            const hasOutput = hasOutputConnections(n.id);
            if (filters.hasOutput !== hasOutput) return false;
          }

          // Combined conditions
          if (filters.isConnected !== undefined) {
            const isConnected = hasInputConnections(n.id) || hasOutputConnections(n.id);
            if (filters.isConnected !== isConnected) return false;
          }

          if (filters.isEmpty !== undefined) {
            const isEmpty = !hasInputConnections(n.id) && !hasOutputConnections(n.id);
            if (filters.isEmpty !== isEmpty) return false;
          }

          return true;
        });

        // Build options from filtered nodes
        const nodeOptions = filteredNodes.map((n: Node<NodeData>) => {
          const nodeDef = getNodeDefinition(n.data.type);
          const nodeLabel = n.data.label || nodeDef?.name || n.data.type;
          const hasInput = hasInputConnections(n.id);
          const hasOutput = hasOutputConnections(n.id);

          return {
            value: n.id,
            label: `${nodeLabel} (${n.id.substring(0, 8)}...)`,
            nodeType: n.data.type,
            category: nodeDef?.category,
            group: nodeDef?.group,
            hasInput,
            hasOutput
          };
        });

        if (nodeOptions.length === 0) {
          const filterDesc = filters.category
            ? filters.category + ' nodes'
            : filters.group
              ? filters.group + ' nodes'
              : 'matching nodes';

          return (
            <Alert variant="default" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No {filterDesc} found in this workflow.
                {filters.category === 'trigger' && ' Add a "Node Trigger" node first.'}
                {filters.isEmpty && ' All nodes are currently connected.'}
                {filters.hasInput === false && ' All nodes have input connections.'}
                {filters.hasOutput === false && ' All nodes have output connections.'}
              </AlertDescription>
            </Alert>
          );
        }

        return (
          <Select
            name={name}
            value={value}
            onValueChange={(val) => handleConfigChange(name, val)}
          >
            <SelectTrigger className="h-11 transition-all duration-200">
              <SelectValue placeholder={placeholder || 'Select a node...'} />
            </SelectTrigger>
            <SelectContent>
              {nodeOptions.map(option => {
                const Icon = getNodeIcon(option.nodeType);
                return (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-4 w-4 opacity-70 object-contain" />}
                      <span className="flex-1">{option.label}</span>
                      {option.hasInput && option.hasOutput && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">⇄</Badge>
                      )}
                      {option.hasInput && !option.hasOutput && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">←</Badge>
                      )}
                      {!option.hasInput && option.hasOutput && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">→</Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );
      }
      case 'json':
        // Use FormBuilderEditor for formFields in form_submit_trigger
        if (node?.data.type === 'form_submit_trigger' && name === 'formFields') {
          return (
            <FormBuilderEditor
              value={
                value === null || value === undefined
                  ? ''
                  : typeof value === 'string'
                  ? value
                  : JSON.stringify(value, null, 2)
              }
              onChange={(val) => handleConfigChange(name, val)}
              height="500px"
            />
          );
        }

        // Default JSON editor
        return (
          <div className="h-48 rounded-lg border border-border/50 bg-muted/30 overflow-hidden transition-all duration-200 hover:border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <CodeEditor
              value={
              value === null || value === undefined
                  ? ''
                  : typeof value === 'string'
                  ? value
                  : JSON.stringify(value, null, 2)
              }
              onChange={(val) => handleConfigChange(name, val)}
              node={node ? getNodeDefinition(node.data.type) : null}
              allNodes={allNodes}
              executionContext={executionContext}
              language="json"
            />
          </div>
        );
      case 'javascript':
        return (
          <div className="h-64 rounded-lg border border-border/50 bg-muted/30 overflow-hidden transition-all duration-200 hover:border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <CodeEditor
              value={value ?? ''}
              onChange={(val) => handleConfigChange(name, val)}
              node={node ? getNodeDefinition(node.data.type) : null}
              allNodes={allNodes}
              executionContext={executionContext}
            />
          </div>
        );
      case 'notice':
        return (
          <Alert variant={ui?.variant || 'default'} className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{displayName}</AlertDescription>
          </Alert>
        );
      case 'separator':
        return (
          <div className="relative py-3">
            <Separator />
            {displayName && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-background text-xs text-muted-foreground">
                {displayName}
              </div>
            )}
          </div>
        );
      case 'button': {
        // Button only (no input field)
        let buttonValue = property.behavior?.value || property.value || '';
        let buttonUrl = property.onClick?.url || '';

        if (typeof window !== 'undefined') {
          if (buttonValue.includes('{{')) {
            buttonValue = buttonValue
              .replace('{{window.location.origin}}', window.location.origin)
              .replace('{{node.config.path}}', config.path || '')
              .replace('{{node.config.webhookId}}', config.webhookId || '')
              .replace('{{node.config.formId}}', config.formId || '');
          }
          if (buttonUrl.includes('{{')) {
            buttonUrl = buttonUrl
              .replace('{{window.location.origin}}', window.location.origin)
              .replace('{{node.config.path}}', config.path || '')
              .replace('{{node.config.webhookId}}', config.webhookId || '')
              .replace('{{node.config.formId}}', config.formId || '');
          }
        }

        const handleButtonClick = () => {
          // Support behavior.action (legacy)
          if (property.behavior?.action === 'copyToClipboard' && buttonValue) {
            fallbackCopyTextToClipboard(
              buttonValue,
              () => toast({title: "Copied!", description: "Text copied to clipboard."}),
              () => toast({title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive"})
            );
          }
          // Support onClick.action (new)
          else if (property.onClick?.action === 'openUrl' && buttonUrl) {
            window.open(buttonUrl, '_blank');
          }
        };

        return (
          <Button
            onClick={handleButtonClick}
            variant="default"
            className="w-full h-11"
          >
            {property.label || displayName}
          </Button>
        );
      }
      case 'inputButton': {
        // Input + Button combo (for copy-to-clipboard with preview)
        let buttonValue = property.behavior?.value || property.value || '';
        if (typeof window !== 'undefined' && buttonValue.includes('{{')) {
            buttonValue = buttonValue
                .replace('{{window.location.origin}}', window.location.origin)
                .replace('{{node.config.path}}', config.path || '')
                .replace('{{node.config.webhookId}}', config.webhookId || '')
                .replace('{{node.config.formId}}', config.formId || '');
        }

        return (
          <div className="flex items-center gap-2">
            <Input
                readOnly
                value={buttonValue}
                className="font-mono text-xs h-10 bg-muted/50 border-dashed"
            />
            <Button
                onClick={() => {
                    if (buttonValue) {
                        fallbackCopyTextToClipboard(
                          buttonValue,
                          () => toast({title: "Copied!", description: "Text copied to clipboard."}),
                          () => toast({title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive"})
                        );
                    }
                }}
                variant="outline"
                size="icon"
                className="h-10 w-10 flex-shrink-0"
            >
                <Copy className="h-4 w-4"/>
            </Button>
          </div>
        );
      }
      case 'checkbox':
        return (
            <div className="space-y-2 rounded-lg border p-4">
                <Label className="font-semibold">{displayName}</Label>
                <div className="space-y-2 pt-2">
                    {options.map(option => (
                        <div key={option.id} className="flex items-center gap-2">
                            <Checkbox 
                                id={`${name}-${option.id}`}
                                checked={config[name]?.[option.value] || false}
                                onCheckedChange={(checked) => handleConfigChange(name, {...config[name], [option.value]: checked})}
                            />
                            <Label htmlFor={`${name}-${option.id}`} className="font-normal">{option.label}</Label>
                        </div>
                    ))}
                </div>
            </div>
        );
      case 'radio':
        return (
          <div className="space-y-2 rounded-lg border p-4">
            <Label className="font-semibold">{displayName}</Label>
            <RadioGroup value={value} onValueChange={(val) => handleConfigChange(name, val)} className="space-y-2 pt-2">
                {options.map(option => (
                    <div key={option.id} className="flex items-center gap-2">
                        <RadioGroupItem value={option.value} id={`${name}-${option.id}`} />
                        <Label htmlFor={`${name}-${option.id}`} className="font-normal">{option.label}</Label>
                    </div>
                ))}
            </RadioGroup>
          </div>
        );
      case 'fixedCollection': {
        // Dynamic fields that can be added/removed
        const fields = property.typeOptions?.fields || [];
        const currentValues = Array.isArray(value) ? value : [];

        const addNewItem = () => {
          const newItem: Record<string, any> = {};
          fields.forEach((field: NodeProperty) => {
            newItem[field.name] = field.default ?? '';
          });
          handleConfigChange(name, [...currentValues, newItem]);
        };

        const removeItem = (index: number) => {
          const newValues = currentValues.filter((_, i) => i !== index);
          handleConfigChange(name, newValues);
        };

        const updateItem = (index: number, fieldName: string, fieldValue: any) => {
          const newValues = [...currentValues];
          newValues[index] = { ...newValues[index], [fieldName]: fieldValue };
          handleConfigChange(name, newValues);
        };

        return (
          <div className="space-y-3">
            {currentValues.map((item, index) => (
              <div key={index} className="relative p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Item {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <span className="sr-only">Remove</span>
                    ✕
                  </Button>
                </div>

                {fields.map((field: NodeProperty) => {
                  const fieldValue = item[field.name];

                  return (
                    <div key={field.name} className="space-y-1.5">
                      <Label htmlFor={`${name}-${index}-${field.name}`} className="text-xs font-medium">
                        {field.displayName}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>

                      {field.type === 'string' && (
                        field.ui?.component === 'textarea' ? (
                          <Textarea
                            id={`${name}-${index}-${field.name}`}
                            value={fieldValue ?? ''}
                            placeholder={field.placeholder}
                            onChange={(e) => updateItem(index, field.name, e.target.value)}
                            className="min-h-[80px] text-sm"
                          />
                        ) : field.ui?.component === 'code' ? (
                          <div className="relative rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
                            <CodeEditor
                              value={fieldValue ?? ''}
                              onChange={(val) => updateItem(index, field.name, val)}
                              node={node ? getNodeDefinition(node.data.type) : null}
                              allNodes={allNodes}
                              oneLine={true}
                              executionContext={executionContext}
                            />
                          </div>
                        ) : (
                          <Input
                            id={`${name}-${index}-${field.name}`}
                            type="text"
                            value={fieldValue ?? ''}
                            placeholder={field.placeholder}
                            onChange={(e) => updateItem(index, field.name, e.target.value)}
                            className="h-9 text-sm"
                          />
                        )
                      )}

                      {field.type === 'number' && (
                        <Input
                          id={`${name}-${index}-${field.name}`}
                          type="number"
                          value={fieldValue ?? ''}
                          placeholder={field.placeholder}
                          onChange={(e) => updateItem(index, field.name, e.target.value === '' ? null : parseFloat(e.target.value))}
                          className="h-9 text-sm"
                        />
                      )}

                      {field.type === 'boolean' && (
                        <div className="flex items-center gap-2 p-2 rounded border bg-background">
                          <Switch
                            id={`${name}-${index}-${field.name}`}
                            checked={fieldValue ?? false}
                            onCheckedChange={(checked) => updateItem(index, field.name, checked)}
                          />
                          <Label htmlFor={`${name}-${index}-${field.name}`} className="text-xs cursor-pointer">
                            {fieldValue ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      )}

                      {field.type === 'options' && (
                        <Select
                          value={fieldValue}
                          onValueChange={(val) => updateItem(index, field.name, val)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder={field.placeholder || 'Select...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.description && (
                        <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addNewItem}
              className="w-full h-10 border-dashed hover:bg-primary/5 hover:border-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              {property.placeholder || 'Add Item'}
            </Button>

            {currentValues.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No items added yet. Click the button above to add one.
              </p>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  }

  return (
    <div key={name} className="group space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Label 
          htmlFor={name} 
          className="text-sm font-medium flex items-center gap-1.5"
        >
          {displayName}
          {property.required && (
            <span className="text-destructive text-xs">*</span>
          )}
        </Label>
        {property.description && (
          <div className="relative group/info">
            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
            <div className="absolute right-0 top-6 w-64 p-3 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50">
              <p className="text-xs text-muted-foreground leading-relaxed">{property.description}</p>
            </div>
          </div>
        )}
      </div>
      {renderField()}
    </div>
  );
};

type NodeSettingsProps = {
  node: Node<NodeData> | null;
  allNodes: Node<NodeData>[];
  allEdges?: any[]; // React Flow edges for connection state filtering
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, config: Record<string, any>, label?: string) => void;
  executionData: { [nodeId: string]: { input: any; output: any; logs?: LogEntry[] } };
  executionContext?: ExecutionContextByName;
  workflowId?: string;
};

const PropertySection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3 pb-4">
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
      <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
    </div>
    {children}
  </div>
);

export function NodeSettings({
  node,
  allNodes,
  allEdges = [],
  isOpen,
  onClose,
  onUpdate,
  executionData,
  executionContext,
  workflowId
}: NodeSettingsProps) {
  const [currentConfig, setCurrentConfig] = useState<Record<string, any>>({});
  const [label, setLabel] = useState('');
  const [selectedExecNodeId, setSelectedExecNodeId] = useState<string | null>(null);
  const definition = node ? getNodeDefinition(node.data.type) : null;
  const { toast } = useToast();
  
  const { user } = useUser();
  const firestore = useFirestore();
  const tablesQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'tables');
  }, [user, firestore]);
  const { data: tables } = useCollection<Table>(tablesQuery);

  useEffect(() => {
    if (node?.data) {
      setCurrentConfig(node.data.config);
      setLabel(node.data.label || '');

      if (executionData && executionData[node.id]) {
        setSelectedExecNodeId(node.id);
      } else {
        setSelectedExecNodeId(null);
      }
    } else {
      setSelectedExecNodeId(null);
    }
  }, [node, executionData]);

  // Effect to auto-populate JSON data for Table node
  useEffect(() => {
    if (node?.data.type === 'table_node' && tables) {
      const { table: tableId, operation } = currentConfig;

      // Auto-populate data field for insert/update operations
      if (tableId && (operation === 'insert' || operation === 'update')) {
        const selectedTable = tables.find(t => t.id === tableId);
        if (selectedTable) {
          const newJsonData = selectedTable.columns.reduce((acc, col) => {
            acc[col.name] = `{{data.${col.name}}}`;
            return acc;
          }, {} as Record<string, string>);

          setCurrentConfig(prev => ({
            ...prev,
            data: JSON.stringify(newJsonData, null, 2)
          }));
        }
      }

      // Auto-populate filters template for query operation
      if (tableId && operation === 'query') {
        const selectedTable = tables.find(t => t.id === tableId);
        if (selectedTable && selectedTable.columns.length > 0) {
          // Generate template with example filters based on column types
          const filterTemplates = selectedTable.columns.slice(0, 2).map(col => {
            let exampleValue;
            let exampleOperator = '==';

            switch (col.type) {
              case 'string':
                exampleValue = 'value';
                break;
              case 'number':
                exampleValue = 0;
                exampleOperator = '>=';
                break;
              case 'boolean':
                exampleValue = true;
                break;
              case 'datetime':
                exampleValue = '2025-01-01';
                exampleOperator = '>=';
                break;
              default:
                exampleValue = 'value';
            }

            return {
              field: col.name,
              operator: exampleOperator,
              value: exampleValue
            };
          });

          setCurrentConfig(prev => ({
            ...prev,
            filters: JSON.stringify(filterTemplates, null, 2)
          }));
        }
      }
    }
  }, [currentConfig.table, currentConfig.operation, node?.data.type, tables]);

  if (!node || !definition) return null;
  const Icon = getNodeIcon(definition);

  const handleSave = () => {
    console.log('[NodeSettings handleSave] Called');
    if (!node) {
      console.log('[NodeSettings handleSave] Aborted: no node');
      return;
    }

    const finalConfig = { ...currentConfig };
    console.log('[NodeSettings handleSave] finalConfig:', finalConfig, 'label:', label);

    if (definition.properties) {
      for (const prop of definition.properties) {
        if (prop.type === 'json' || (prop.type === 'string' && prop.ui?.component !== 'textarea')) {
          const value = finalConfig[prop.name];
          if (typeof value === 'string' && value.trim().startsWith('{')) {
            try {
              JSON.parse(value);
            } catch (e) {
              // Might be an expression
            }
          }
        }
      }
    }

    console.log('[NodeSettings handleSave] Calling onUpdate with:', { nodeId: node.id, finalConfig, label });
    onUpdate(node.id, finalConfig, label);
    onClose();

    toast({
      title: "✓ Changes saved",
      description: `${definition.name} has been updated successfully.`,
    });
  };

  const handleConfigChange = (name: string, value: any) => {
    let finalValue = value;
    if (name === 'backgroundColor' && typeof value === 'string' && value.startsWith('#')) {
      finalValue = hexToRgba(value, 0.1);
    }
    setCurrentConfig(prev => ({ ...prev, [name]: finalValue }));
  };

  const hasExecutionData = executionData && Object.keys(executionData).length > 0;
  const executedNodes = Object.keys(executionData);
  const selectedNodeExecutionData = selectedExecNodeId ? executionData[selectedExecNodeId] : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full sm:max-w-xl lg:max-w-2xl flex flex-col bg-background p-0 gap-0 border-l-2 sm:border-l-2"
        side="right"
      >
        {/* Header - Optimized for mobile */}
        <div className="relative overflow-hidden border-b">
          <div
            className="absolute inset-0 opacity-5"
            style={{
              background: `linear-gradient(135deg, ${definition.color}22 0%, transparent 100%)`
            }}
          />

          <SheetHeader className="relative px-4 py-4 sm:px-6 sm:py-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl shadow-lg backdrop-blur-sm border-2"
                style={{
                  backgroundColor: `${definition.color}15`,
                  borderColor: `${definition.color}30`
                }}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7 object-contain" style={{ color: definition.color }} />
                <div
                  className="absolute inset-0 rounded-xl opacity-20 blur-xl"
                  style={{ backgroundColor: definition.color }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg sm:text-xl font-bold tracking-tight mb-1">
                  {definition.name}
                </SheetTitle>
                <SheetDescription className="text-xs sm:text-sm line-clamp-2">
                  {definition.description}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Tabs - Optimized for mobile */}
        <Tabs defaultValue="settings" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-muted/30">
            <TabsList className="w-full h-14 sm:h-12 bg-transparent p-1 grid gap-1 grid-cols-3">
              <TabsTrigger
                value="settings"
                className="h-full gap-1.5 sm:gap-2 data-[state=inactive]:opacity-60 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg active:scale-95 transition-transform"
              >
                <Settings2 className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="font-medium text-xs sm:text-sm">Settings</span>
              </TabsTrigger>
              <TabsTrigger
                value="data"
                disabled={!hasExecutionData}
                className="h-full gap-1.5 sm:gap-2 relative data-[state=inactive]:opacity-60 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg active:scale-95 transition-transform"
              >
                <Database className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="font-medium text-xs sm:text-sm">Data</span>
                {hasExecutionData && (
                  <span className="absolute top-2 right-2 sm:top-1.5 sm:right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="debug"
                disabled={!hasExecutionData}
                className="h-full gap-1.5 sm:gap-2 relative data-[state=inactive]:opacity-60 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg active:scale-95 transition-transform"
              >
                <Terminal className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="font-medium text-xs sm:text-sm">Debug</span>
                {hasExecutionData && selectedNodeExecutionData?.logs && selectedNodeExecutionData.logs.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-5 px-1.5 text-[10px] sm:text-xs">
                    {selectedNodeExecutionData.logs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Settings Tab */}
          <TabsContent
            value="settings"
            className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
          >
            <ScrollArea className="h-full">
              <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* Node Identity */}
                <div className="relative p-5 rounded-xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-2 border-dashed border-primary/20">
                  <div className="absolute -top-3 left-4 px-2 bg-background">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                        Node Identity
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-2">
                    <Label htmlFor="node-label" className="text-sm font-medium">
                      Display Name
                    </Label>
                    <Input
                      id="node-label"
                      value={label}
                      placeholder={definition.name}
                      onChange={(e) => setLabel(e.target.value)}
                      className="h-11 bg-background"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-3 w-3" />
                      This name will appear on the canvas
                    </p>
                  </div>
                </div>

                {/* Properties */}
                {definition.properties && definition.properties.length > 0 && (
                  <PropertySection title="Configuration">
                    <div className="space-y-5">
                    {definition.properties.map(prop =>
                        renderProperty(prop, currentConfig, handleConfigChange, node, allNodes, allEdges, toast, executionContext)
                    )}
                    </div>
                  </PropertySection>
                )}

                {/* Empty State */}
                {(!definition.properties || definition.properties.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border-2 border-dashed border-border">
                        <Settings2 className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border-2 border-background">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-base font-semibold mb-2">Ready to use</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
                      This node doesn't require any additional configuration. It's ready to work!
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent
            value="data"
            className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
          >
            <ScrollArea className="h-full">
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Selector - Touch friendly */}
                <div className="space-y-2.5 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-medium">Select Node</Label>
                  <Select onValueChange={setSelectedExecNodeId} value={selectedExecNodeId || ""}>
                    <SelectTrigger className="h-12 sm:h-11 bg-muted/50 text-[15px] sm:text-sm">
                      <SelectValue placeholder="Choose a node to inspect..." />
                    </SelectTrigger>
                    <SelectContent>
                      {executedNodes.map(nodeId => {
                        const executedNode = allNodes.find(n => n.id === nodeId);
                        const nodeLabel = executedNode?.data.label || executedNode?.id || nodeId;
                        const nodeDef = executedNode ? getNodeDefinition(executedNode.data.type) : null;
                        const NodeIcon = nodeDef ? getNodeIcon(nodeDef) : null;

                        return (
                          <SelectItem key={nodeId} value={nodeId} className="py-3 sm:py-2">
                            <div className="flex items-center gap-2.5">
                              {NodeIcon && (
                                <div
                                  className="w-7 h-7 sm:w-6 sm:h-6 rounded flex items-center justify-center"
                                  style={{ backgroundColor: `${nodeDef?.color}20` }}
                                >
                                  <NodeIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" style={{ color: nodeDef?.color }} />
                                </div>
                              )}
                              <span className="font-medium text-[15px] sm:text-sm">{nodeLabel}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Cards */}
                {selectedNodeExecutionData ? (
                  <div className="space-y-5 sm:space-y-6">
                    {/* Input Data Viewer */}
                    <DataViewer
                      data={selectedNodeExecutionData.input}
                      label="Input"
                      color="#3b82f6"
                      allNodes={allNodes}
                      executionContext={executionContext}
                      nodeName={allNodes.find(n => n.id === selectedExecNodeId)?.data.label || allNodes.find(n => n.id === selectedExecNodeId)?.data.type}
                      dataType="input"
                    />

                    {/* Output Data Viewer */}
                    <DataViewer
                      data={selectedNodeExecutionData.output}
                      label="Output"
                      color="#22c55e"
                      allNodes={allNodes}
                      executionContext={executionContext}
                      nodeName={allNodes.find(n => n.id === selectedExecNodeId)?.data.label || allNodes.find(n => n.id === selectedExecNodeId)?.data.type}
                      dataType="output"
                    />
                  </div>
                ) : (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted via-muted/80 to-muted/50 flex items-center justify-center border-2 border-dashed border-border shadow-inner">
                        <Database className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/80 to-transparent" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">No data selected</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
                      Select a node from the dropdown above to view its execution data
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent
            value="debug"
            className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
          >
            <ScrollArea className="h-full">
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Selector - Touch friendly */}
                <div className="space-y-2.5 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-medium">Select Node</Label>
                  <Select onValueChange={setSelectedExecNodeId} value={selectedExecNodeId || ""}>
                    <SelectTrigger className="h-12 sm:h-11 bg-muted/50 text-[15px] sm:text-sm">
                      <SelectValue placeholder="Choose a node to inspect logs..." />
                    </SelectTrigger>
                    <SelectContent>
                      {executedNodes.map(nodeId => {
                        const executedNode = allNodes.find(n => n.id === nodeId);
                        const nodeLabel = executedNode?.data.label || executedNode?.id || nodeId;
                        const nodeDef = executedNode ? getNodeDefinition(executedNode.data.type) : null;
                        const NodeIcon = nodeDef ? getNodeIcon(nodeDef) : null;
                        const logCount = executionData[nodeId]?.logs?.length || 0;

                        return (
                          <SelectItem key={nodeId} value={nodeId} className="py-3 sm:py-2">
                            <div className="flex items-center gap-2.5">
                              {NodeIcon && (
                                <div
                                  className="w-7 h-7 sm:w-6 sm:h-6 rounded flex items-center justify-center"
                                  style={{ backgroundColor: `${nodeDef?.color}20` }}
                                >
                                  <NodeIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" style={{ color: nodeDef?.color }} />
                                </div>
                              )}
                              <span className="font-medium text-[15px] sm:text-sm">{nodeLabel}</span>
                              {logCount > 0 && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[11px] sm:text-xs ml-auto">
                                  {logCount}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Console Logs */}
                {selectedNodeExecutionData?.logs && selectedNodeExecutionData.logs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        Console Output
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {selectedNodeExecutionData.logs.length} {selectedNodeExecutionData.logs.length === 1 ? 'entry' : 'entries'}
                      </Badge>
                    </div>

                    <div className="rounded-lg border bg-black/95 p-4 font-mono text-xs overflow-y-auto overflow-x-hidden max-h-[600px]">
                      <div className="space-y-1">
                        {selectedNodeExecutionData.logs.map((log, index) => {
                          const timestamp = new Date(log.timestamp).toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            fractionalSecondDigits: 3
                          });

                          const typeColor = {
                            log: 'text-gray-300',
                            info: 'text-blue-400',
                            warn: 'text-yellow-400',
                            error: 'text-red-400'
                          }[log.type];

                          const typeLabel = {
                            log: 'LOG',
                            info: 'INFO',
                            warn: 'WARN',
                            error: 'ERROR'
                          }[log.type];

                          return (
                            <div key={index} className="flex gap-2 hover:bg-white/5 px-2 py-1 rounded transition-colors">
                              <span className="text-gray-500 flex-shrink-0 min-w-[90px]">{timestamp}</span>
                              <span className={`${typeColor} font-semibold flex-shrink-0 w-14`}>[{typeLabel}]</span>
                              <span className="text-gray-200 whitespace-pre-wrap break-words break-all flex-1 min-w-0">{log.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : selectedNodeExecutionData ? (
                  /* No logs but node is selected */
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted via-muted/80 to-muted/50 flex items-center justify-center border-2 border-dashed border-border shadow-inner">
                        <Terminal className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/80 to-transparent" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">No logs captured</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
                      This node executed without generating any log messages
                    </p>
                  </div>
                ) : (
                  /* Empty State - no node selected */
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted via-muted/80 to-muted/50 flex items-center justify-center border-2 border-dashed border-border shadow-inner">
                        <Terminal className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/80 to-transparent" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">No node selected</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
                      Select a node from the dropdown above to view its debug console
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer - Touch friendly */}
        <div className="border-t bg-muted/30 backdrop-blur-sm">
          <SheetFooter className="px-4 sm:px-6 py-3 sm:py-4 flex-row gap-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 sm:flex-none sm:min-w-[120px] h-12 sm:h-10 font-medium text-base sm:text-sm active:scale-95 transition-transform"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 sm:flex-none sm:min-w-[140px] h-12 sm:h-10 font-medium shadow-sm text-base sm:text-sm active:scale-95 transition-transform"
              style={{
                backgroundColor: definition.color,
                color: 'white'
              }}
            >
              <Sparkles className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
              Save Changes
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
