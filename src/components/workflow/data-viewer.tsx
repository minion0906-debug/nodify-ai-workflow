"use client";

import React, { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table as TableIcon, Code2, GitBranch, Copy, Check, ChevronRight, ChevronDown } from "lucide-react";
import CodeEditor from "../code-editor";
import { Node } from "reactflow";
import { NodeData } from "@/lib/types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";

type ExecutionContextByName = {
  [nodeName: string]: {
    input: any;
    output: any;
  };
};

interface DataViewerProps {
  data: any;
  label: string;
  color: string;
  allNodes?: Node<NodeData>[];
  executionContext?: ExecutionContextByName;
  nodeName?: string; // Name of the node for path generation
  dataType?: 'input' | 'output'; // Type of data (input or output)
}

// Helper to get data type with icon (similar to n8n)
const getDataType = (value: any): { type: string; icon: string } => {
  if (value === null) return { type: "null", icon: "○" };
  if (value === undefined) return { type: "undefined", icon: "?" };
  if (Array.isArray(value)) return { type: "Array", icon: "[ ]" };
  if (typeof value === "object") return { type: "Object", icon: "{ }" };
  if (typeof value === "string") return { type: "String", icon: "T" };
  if (typeof value === "number") return { type: "Number", icon: "#" };
  if (typeof value === "boolean") return { type: "Boolean", icon: "◑" };
  return { type: typeof value, icon: "•" };
};

// Helper to format value for display (like n8n)
const formatValuePreview = (value: any): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    if (value.length > 60) return `"${value.substring(0, 60)}..."`;
    return `"${value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `Object(${keys.length})`;
  }
  return String(value);
};

// Schema Tree Component
interface SchemaTreeProps {
  data: any;
  depth?: number;
  nodeName?: string;
  dataType?: 'input' | 'output';
  path?: string[];
}

const SchemaTree = ({
  data,
  depth = 0,
  nodeName,
  dataType,
  path = []
}: SchemaTreeProps) => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const buildPath = (propertyPath: string[]): string => {
    if (!nodeName || !dataType) return '';

    // Start with $['NodeName'].output or input
    let fullPath = `$['${nodeName}'].${dataType}`;

    // Add each property in the path
    propertyPath.forEach(prop => {
      // Check if property needs bracket notation
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop)) {
        // Valid identifier, use dot notation
        fullPath += `.${prop}`;
      } else {
        // Invalid identifier or has special chars, use bracket notation
        fullPath += `['${prop}']`;
      }
    });

    return fullPath;
  };

  const handleCopyPath = async (propertyPath: string[]) => {
    const fullPath = buildPath(propertyPath);
    try {
      await navigator.clipboard.writeText(fullPath);
      setCopiedPath(fullPath);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error("Failed to copy path:", err);
    }
  };

  if (Array.isArray(data)) {
    const pathKey = path.join('.');
    const isExpanded = expandedPaths.has(pathKey);

    return (
      <div className="space-y-1 group max-w-full overflow-hidden">
        <div className="flex items-center gap-2 py-2 sm:py-1 active:bg-muted/70 sm:hover:bg-muted/50 rounded px-2 -mx-2 transition-colors min-w-0 max-w-full">
          {/* Expand/Collapse Button - Touch friendly */}
          {data.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newExpanded = new Set(expandedPaths);
                if (isExpanded) {
                  newExpanded.delete(pathKey);
                } else {
                  newExpanded.add(pathKey);
                }
                setExpandedPaths(newExpanded);
              }}
              className="h-7 w-7 sm:h-5 sm:w-5 p-0 hover:bg-accent active:scale-95 transition-transform"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              ) : (
                <ChevronRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              )}
            </Button>
          )}

          <Badge variant="outline" className="text-[11px] sm:text-xs font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
            Array[{data.length}]
          </Badge>

          {nodeName && path.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyPath(path)}
              className="h-8 w-8 sm:h-6 sm:w-6 p-0 opacity-100 sm:opacity-0 group-hover:opacity-100 active:scale-95 transition-all"
              title={buildPath(path)}
            >
              {copiedPath === buildPath(path) ? (
                <Check className="h-4 w-4 sm:h-3 sm:w-3 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 sm:h-3 sm:w-3" />
              )}
            </Button>
          )}
        </div>

        {/* Show array contents when expanded */}
        {isExpanded && data.length > 0 && (
          <div className="border-l-2 border-dashed border-muted-foreground/20 ml-2 pl-3 max-w-full overflow-hidden">
            {data.map((item, index) => (
              <div key={index} className="space-y-1 max-w-full overflow-hidden">
                <div className="text-xs text-muted-foreground font-mono mb-1">[{index}]</div>
                <SchemaTree
                  data={item}
                  depth={depth + 1}
                  nodeName={nodeName}
                  dataType={dataType}
                  path={[...path, String(index)]}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === "object" && data !== null) {
    return (
      <div className="space-y-1.5 max-w-full overflow-hidden">
        {Object.entries(data).map(([key, value]) => {
          const { type, icon } = getDataType(value);
          const isComplex = type === "Array" || type === "Object";
          const currentPath = [...path, key];
          const pathKey = currentPath.join('.');
          const isExpanded = expandedPaths.has(pathKey);

          return (
            <div key={key} className="group max-w-full overflow-hidden">
              <div className="grid grid-cols-[28px_28px_70px_1fr_auto_auto] sm:grid-cols-[20px_24px_80px_1fr_auto_auto] gap-1.5 sm:gap-2 py-2 sm:py-1.5 active:bg-muted/70 sm:hover:bg-muted/50 rounded px-2 -mx-2 transition-colors items-center">
                {/* Expand/Collapse Button for complex types - Touch friendly */}
                {isComplex ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newExpanded = new Set(expandedPaths);
                      if (isExpanded) {
                        newExpanded.delete(pathKey);
                      } else {
                        newExpanded.add(pathKey);
                      }
                      setExpandedPaths(newExpanded);
                    }}
                    className="h-7 w-7 sm:h-5 sm:w-5 p-0 hover:bg-accent active:scale-95 transition-transform"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    ) : (
                      <ChevronRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    )}
                  </Button>
                ) : (
                  <div /> // Spacer for alignment
                )}

                {/* Icon Badge - Slightly larger on mobile */}
                <div className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center rounded bg-muted/50 border">
                  <span className="text-xs sm:text-[11px] font-semibold text-muted-foreground">{icon}</span>
                </div>

                {/* Key Name - Responsive sizing */}
                <span className="font-mono text-[13px] sm:text-sm font-semibold text-foreground truncate" title={key}>
                  {key}
                </span>

                {/* Value Preview - Responsive sizing */}
                {!isComplex ? (
                  <span className="text-[13px] sm:text-sm text-muted-foreground font-mono truncate overflow-hidden" title={String(value)}>
                    {formatValuePreview(value)}
                  </span>
                ) : (
                  <div /> // Empty space when complex
                )}

                {/* Type Badge - Touch friendly */}
                <Badge
                  variant="outline"
                  className={`text-[11px] sm:text-xs font-mono whitespace-nowrap ${
                    type === "String" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" :
                    type === "Number" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" :
                    type === "Boolean" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" :
                    type === "Array" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" :
                    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                  }`}
                >
                  {type}
                  {type === "Array" && Array.isArray(value) && `(${value.length})`}
                  {type === "Object" && typeof value === "object" && value !== null && `(${Object.keys(value).length})`}
                </Badge>

                {/* Copy Button - Touch friendly */}
                {nodeName ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyPath(currentPath)}
                    className="h-8 w-8 sm:h-6 sm:w-6 p-0 opacity-100 sm:opacity-0 group-hover:opacity-100 active:scale-95 transition-all"
                    title={buildPath(currentPath)}
                  >
                    {copiedPath === buildPath(currentPath) ? (
                      <Check className="h-4 w-4 sm:h-3 sm:w-3 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 sm:h-3 sm:w-3" />
                    )}
                  </Button>
                ) : (
                  <div /> // Empty space
                )}
              </div>

              {/* Show nested content when expanded */}
              {isComplex && isExpanded && (
                <div className="border-l-2 border-dashed border-muted-foreground/20 ml-5 pl-2 max-w-full overflow-hidden">
                  <SchemaTree
                    data={value}
                    depth={depth + 1}
                    nodeName={nodeName}
                    dataType={dataType}
                    path={currentPath}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const { type, icon } = getDataType(data);
  return (
    <div className="max-w-full overflow-hidden">
      <Badge
        variant="outline"
        className={`text-xs font-mono ${
          type === "string" ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" :
          type === "number" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" :
          type === "boolean" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" :
          "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
        }`}
      >
        <span className="mr-1">{icon}</span>
        {type}
      </Badge>
    </div>
  );
};

// Table View Component
const TableView = ({ data }: { data: any }) => {
  // Handle array of objects (most common case)
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Empty array</p>
        </div>
      );
    }

    // If array of primitives
    if (typeof data[0] !== "object") {
      return (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full border-collapse min-w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider border-b">
                  Index
                </th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider border-b">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item, idx) => (
                <tr key={idx} className="active:bg-muted/50 sm:hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-mono text-[13px] sm:text-sm text-muted-foreground">{idx}</td>
                  <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-mono text-[13px] sm:text-sm">{String(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Array of objects - create table with columns
    const columns = Array.from(
      new Set(data.flatMap(obj => (typeof obj === "object" && obj !== null ? Object.keys(obj) : [])))
    );

    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto touch-pan-x">
          <table className="w-full border-collapse">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-3 py-3 sm:px-4 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider border-b border-r bg-muted/70 sticky left-0 z-10">
                  #
                </th>
                {columns.map(col => (
                  <th
                    key={col}
                    className="px-3 py-3 sm:px-4 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider border-b whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row, idx) => (
                <tr key={idx} className="active:bg-muted/50 sm:hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-3 sm:px-4 font-mono text-[13px] sm:text-sm text-muted-foreground border-r bg-muted/20 sticky left-0 z-10">
                    {idx}
                  </td>
                  {columns.map(col => {
                    const value = row[col];
                    let displayValue = "";
                    let cellClass = "px-3 py-3 sm:px-4 text-[13px] sm:text-sm";

                    if (value === null || value === undefined) {
                      displayValue = String(value);
                      cellClass += " text-muted-foreground italic";
                    } else if (typeof value === "object") {
                      displayValue = Array.isArray(value) ? `[Array(${value.length})]` : "[Object]";
                      cellClass += " font-mono text-purple-600 dark:text-purple-400";
                    } else if (typeof value === "boolean") {
                      displayValue = value ? "true" : "false";
                      cellClass += " font-mono text-orange-600 dark:text-orange-400";
                    } else if (typeof value === "number") {
                      displayValue = String(value);
                      cellClass += " font-mono text-yellow-600 dark:text-yellow-400";
                    } else {
                      displayValue = String(value);
                      cellClass += " font-mono";
                    }

                    return (
                      <td key={col} className={cellClass}>
                        <div className="max-w-[200px] sm:max-w-xs truncate" title={displayValue}>
                          {displayValue}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Handle single object - show keys as columns, data as single row
  if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data);
    const keys = entries.map(([key]) => key);

    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto touch-pan-x">
          <table className="w-full border-collapse">
            <thead className="bg-muted/50">
              <tr>
                {keys.map(key => (
                  <th
                    key={key}
                    className="px-3 py-3 sm:px-4 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider border-b whitespace-nowrap"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="active:bg-muted/50 sm:hover:bg-muted/30 transition-colors">
                {entries.map(([key, value]) => {
                  let displayValue = "";
                  let cellClass = "px-3 py-3 sm:px-4 text-[13px] sm:text-sm align-top";

                  if (value === null || value === undefined) {
                    displayValue = String(value);
                    cellClass += " text-muted-foreground italic";
                  } else if (typeof value === "object") {
                    // Show JSON for objects instead of just [Object(n)]
                    displayValue = JSON.stringify(value, null, 2);
                    cellClass += " font-mono text-[11px] sm:text-xs text-purple-600 dark:text-purple-400 whitespace-pre-wrap";
                  } else if (typeof value === "boolean") {
                    displayValue = value ? "true" : "false";
                    cellClass += " font-mono text-orange-600 dark:text-orange-400";
                  } else if (typeof value === "number") {
                    displayValue = String(value);
                    cellClass += " font-mono text-yellow-600 dark:text-yellow-400";
                  } else {
                    displayValue = String(value);
                    cellClass += " font-mono";
                  }

                  return (
                    <td key={key} className={cellClass}>
                      <div className="max-w-[250px] sm:max-w-md max-h-32 sm:max-h-40 overflow-auto" title={String(value)}>
                        {displayValue}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Primitive value
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <Badge variant="outline" className="text-sm font-mono">
          {typeof data}
        </Badge>
        <p className="font-mono text-lg">{String(data)}</p>
      </div>
    </div>
  );
};

export const DataViewer: React.FC<DataViewerProps> = ({
  data,
  label,
  color,
  allNodes = [],
  executionContext = {},
  nodeName,
  dataType
}) => {
  const [activeTab, setActiveTab] = useState("schema"); // Default to schema like n8n
  const [copied, setCopied] = useState(false);

  const jsonString = useMemo(() => {
    if (data === undefined) return 'undefined';
    if (data === null) return 'null';
    return JSON.stringify(data, null, 2);
  }, [data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between px-0.5 sm:px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <span className="text-sm sm:text-base font-semibold" style={{ color }}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono hidden sm:flex">
            {jsonString.length} bytes
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-9 w-9 sm:h-8 sm:w-8 p-0 active:scale-95 transition-transform"
          >
            {copied ? (
              <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Tabs - Touch friendly for mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 sm:h-11 p-1 gap-1">
          <TabsTrigger value="schema" className="gap-1 sm:gap-2 text-[11px] sm:text-sm font-medium">
            <GitBranch className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span>Schema</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1 sm:gap-2 text-[11px] sm:text-sm font-medium">
            <TableIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span>Table</span>
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-1 sm:gap-2 text-[11px] sm:text-sm font-medium">
            <Code2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span>JSON</span>
          </TabsTrigger>
        </TabsList>

        {/* Schema View - Optimized for mobile */}
        <TabsContent value="schema" className="mt-2 sm:mt-3">
          <ScrollArea className="h-[350px] sm:h-[400px] rounded-lg border bg-muted/20 overflow-x-hidden touch-pan-y">
            <div className="p-3 sm:p-5 max-w-full overflow-hidden">
              <SchemaTree
                data={data}
                nodeName={nodeName}
                dataType={dataType}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Table View - Optimized for mobile with horizontal scroll */}
        <TabsContent value="table" className="mt-2 sm:mt-3">
          <ScrollArea className="h-[350px] sm:h-[400px] rounded-lg border bg-muted/20">
            <div className="p-2 sm:p-3">
              <TableView data={data} />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* JSON View - Optimized for mobile */}
        <TabsContent value="json" className="mt-2 sm:mt-3">
          <div className="h-[350px] sm:h-[400px] rounded-lg border bg-muted/20 overflow-hidden">
            <CodeEditor
              value={jsonString}
              onChange={() => {}}
              allNodes={allNodes}
              node={null}
              executionContext={executionContext}
              readOnly={true}
              language="json"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};