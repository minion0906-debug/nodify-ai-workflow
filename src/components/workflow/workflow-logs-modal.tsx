'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Terminal,
  X,
  Copy,
  Trash2,
  Filter,
  Search,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { NodeData } from '@/lib/types';
import { getNodeIcon } from '@/lib/nodes';
import * as LucideIcons from 'lucide-react';

export type LogEntry = {
  timestamp: Date;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  args?: any[];
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  nodeIcon?: string;
  nodeColor?: string;
};

type WorkflowLogsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  executionData: Record<string, any>;
  nodes: NodeData[];
};

export function WorkflowLogsModal({
  isOpen,
  onClose,
  executionData,
  nodes,
}: WorkflowLogsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Collect all logs from execution data
  const allLogs = useMemo(() => {
    const logs: LogEntry[] = [];

    Object.entries(executionData).forEach(([nodeId, data]) => {
      if (data.logs && Array.isArray(data.logs)) {
        const node = nodes.find(n => n.id === nodeId);
        const iconName = node?.icon || getNodeIcon(node?.type || '');
        data.logs.forEach((log: any) => {
          logs.push({
            ...log,
            timestamp: log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp),
            nodeId,
            nodeName: node?.config?.name || node?.type || nodeId,
            nodeType: node?.type,
            nodeIcon: iconName,
            nodeColor: node?.color || '#8B5CF6',
          });
        });
      }
    });

    // Sort by timestamp
    return logs.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }, [executionData, nodes]);

  // Get unique nodes that have logs
  const nodesWithLogs = useMemo(() => {
    const nodeIds = new Set<string>();
    allLogs.forEach(log => {
      if (log.nodeId) nodeIds.add(log.nodeId);
    });
    return Array.from(nodeIds).map(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return {
        id: nodeId,
        name: node?.config?.name || node?.type || nodeId,
      };
    });
  }, [allLogs, nodes]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      // Filter by node
      if (selectedNodeFilter !== 'all' && log.nodeId !== selectedNodeFilter) {
        return false;
      }

      // Filter by type
      if (selectedTypeFilter !== 'all' && log.type !== selectedTypeFilter) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const message = log.message.toLowerCase();
        const argsString = log.args ? JSON.stringify(log.args).toLowerCase() : '';
        return message.includes(query) || argsString.includes(query);
      }

      return true;
    });
  }, [allLogs, selectedNodeFilter, selectedTypeFilter, searchQuery]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [filteredLogs, autoScroll]);

  // Format timestamp
  const formatTimestamp = (timestamp: Date | string | number) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  // Get log type color
  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get log type badge variant
  const getLogTypeBadgeVariant = (type: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Copy logs to clipboard
  const handleCopyLogs = async () => {
    const logsText = filteredLogs
      .map(log => {
        const timestamp = formatTimestamp(log.timestamp);
        const nodeInfo = log.nodeName ? `[${log.nodeName}] ` : '';
        const argsText = log.args && log.args.length > 0 ? ' ' + log.args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ') : '';
        return `${timestamp} ${nodeInfo}[${log.type.toUpperCase()}] ${log.message}${argsText}`;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(logsText);
      toast({
        title: 'Logs Copied',
        description: `${filteredLogs.length} log entries copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy logs to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Download logs as file
  const handleDownloadLogs = () => {
    const logsText = filteredLogs
      .map(log => {
        const timestamp = formatTimestamp(log.timestamp);
        const nodeInfo = log.nodeName ? `[${log.nodeName}] ` : '';
        const argsText = log.args && log.args.length > 0 ? ' ' + log.args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ') : '';
        return `${timestamp} ${nodeInfo}[${log.type.toUpperCase()}] ${log.message}${argsText}`;
      })
      .join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Logs Downloaded',
      description: `${filteredLogs.length} log entries downloaded`,
    });
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedNodeFilter('all');
    setSelectedTypeFilter('all');
  };

  // Count logs by type
  const logCounts = useMemo(() => {
    return {
      all: allLogs.length,
      log: allLogs.filter(l => l.type === 'log').length,
      info: allLogs.filter(l => l.type === 'info').length,
      warn: allLogs.filter(l => l.type === 'warn').length,
      error: allLogs.filter(l => l.type === 'error').length,
    };
  }, [allLogs]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <Terminal className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <DialogTitle>Workflow Execution Logs</DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  View and filter all logs from workflow execution
                </DialogDescription>
              </div>
            </div>
            {/*<Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>*/}
          </div>
        </DialogHeader>

        {/* Filters and Controls */}
        <div className="px-6 py-4 border-b space-y-4 bg-muted/30">
          {/* Stats Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <span className="font-normal text-xs">Total:</span>
              <span className="font-semibold">{logCounts.all}</span>
            </Badge>
            {logCounts.log > 0 && (
              <Badge variant="outline" className="gap-1">
                <span className="font-normal text-xs text-gray-500">LOG:</span>
                <span className="font-semibold">{logCounts.log}</span>
              </Badge>
            )}
            {logCounts.info > 0 && (
              <Badge variant="default" className="gap-1">
                <span className="font-normal text-xs">INFO:</span>
                <span className="font-semibold">{logCounts.info}</span>
              </Badge>
            )}
            {logCounts.warn > 0 && (
              <Badge variant="secondary" className="gap-1">
                <span className="font-normal text-xs">WARN:</span>
                <span className="font-semibold">{logCounts.warn}</span>
              </Badge>
            )}
            {logCounts.error > 0 && (
              <Badge variant="destructive" className="gap-1">
                <span className="font-normal text-xs">ERROR:</span>
                <span className="font-semibold">{logCounts.error}</span>
              </Badge>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-end gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search-logs" className="text-xs mb-1">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-logs"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Node Filter */}
            <div className="w-[200px]">
              <Label htmlFor="node-filter" className="text-xs mb-1">
                Node
              </Label>
              <Select value={selectedNodeFilter} onValueChange={setSelectedNodeFilter}>
                <SelectTrigger id="node-filter" className="h-9">
                  <SelectValue placeholder="All nodes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All nodes ({allLogs.length})</SelectItem>
                  {nodesWithLogs.map(node => {
                    const count = allLogs.filter(l => l.nodeId === node.id).length;
                    return (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="w-[160px]">
              <Label htmlFor="type-filter" className="text-xs mb-1">
                Type
              </Label>
              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger id="type-filter" className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="log">LOG</SelectItem>
                  <SelectItem value="info">INFO</SelectItem>
                  <SelectItem value="warn">WARN</SelectItem>
                  <SelectItem value="error">ERROR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-9"
                disabled={searchQuery === '' && selectedNodeFilter === 'all' && selectedTypeFilter === 'all'}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLogs}
                className="h-9"
                disabled={filteredLogs.length === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadLogs}
                className="h-9"
                disabled={filteredLogs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Logs Display */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="px-6 py-4">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Terminal className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Logs Found</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {allLogs.length === 0
                    ? 'No logs have been generated yet. Execute your workflow to see logs here.'
                    : 'No logs match your current filters. Try adjusting your search criteria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 font-mono text-xs">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    {/* Timestamp */}
                    <span className="text-muted-foreground shrink-0 select-none">
                      {formatTimestamp(log.timestamp)}
                    </span>

                    {/* Node Icon & Name */}
                    {log.nodeName && (
                      <Badge variant="outline" className="shrink-0 text-xs font-normal flex items-center gap-1.5 px-2 py-0.5">
                        {(() => {
                          const IconComponent = log.nodeIcon ? (LucideIcons as any)[log.nodeIcon] : null;
                          return IconComponent ? (
                            <IconComponent
                              className="h-3 w-3 shrink-0"
                              style={{ color: log.nodeColor }}
                            />
                          ) : (
                            <Terminal className="h-3 w-3 shrink-0 text-muted-foreground" />
                          );
                        })()}
                        <span className="truncate max-w-[120px]">{log.nodeName}</span>
                      </Badge>
                    )}

                    {/* Log Type */}
                    <Badge
                      variant={getLogTypeBadgeVariant(log.type)}
                      className="shrink-0 text-xs w-14 justify-center"
                    >
                      {log.type.toUpperCase()}
                    </Badge>

                    {/* Message */}
                    <div className="flex-1 break-all">
                      <span className={getLogTypeColor(log.type)}>{log.message}</span>
                      {log.args && log.args.length > 0 && (
                        <div className="mt-1 text-muted-foreground">
                          {log.args.map((arg, i) => (
                            <div key={i}>
                              {typeof arg === 'object'
                                ? JSON.stringify(arg, null, 2)
                                : String(arg)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            <span>
              Showing {filteredLogs.length} of {allLogs.length} log entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300"
              />
              Auto-scroll
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
