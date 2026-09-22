
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Plus, Trash2, Edit, FlaskConical, RefreshCw, Layers } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { CustomNode } from '@/lib/custom-nodes-types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getNodeIcon } from '@/lib/nodes';
import { nodeGroups } from '@/lib/nodes';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { SubGroupsModal } from '@/components/node-labs/subgroups-modal';

const allBuiltInNodes: CustomNode[] = nodeGroups.flatMap(g => g.nodes);

function NodeLabsContent() {
  const { toast } = useToast();
  const { hasAnyRole, isLoading: permLoading } = usePermissions() as any;
  const router = useRouter();
  const [allNodes, setAllNodes] = useState<CustomNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subGroupsModalOpen, setSubGroupsModalOpen] = useState(false);

  // Guard: Only allow developer/admin/super_admin
  useEffect(() => {
    if (permLoading) return;
    const allowed = hasAnyRole(["developer", "admin", "super_admin"]);
    if (!allowed) {
      router.replace('/workflows');
    }
  }, [hasAnyRole, permLoading, router]);

  // Load all nodes from the filesystem via API
  const loadNodes = useCallback(async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await fetch('/api/node-definitions/list', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch nodes');
      }
      const customNodesFromFile = await response.json();

      // Combine built-in nodes with nodes from the filesystem
      // This ensures that even if a built-in node is being edited, we see it.
      // We can filter out duplicates, giving preference to the file-based one.
      const combined = [...allBuiltInNodes, ...customNodesFromFile];
      const uniqueNodes = Array.from(new Map(combined.map(node => [node.id, node])).values());

      setAllNodes(uniqueNodes);
    } catch (error) {
      console.error('[NodeLabs] Error loading nodes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load nodes from the filesystem.',
        variant: 'destructive'
      });
      // Fallback to just built-in nodes
      setAllNodes(allBuiltInNodes);
    } finally {
      if (showRefreshingState) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  // Auto-refresh every 5 seconds when the tab is visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadNodes(true);
      }
    };

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        loadNodes(true);
      }
    }, 5000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadNodes]);

  const categories = useMemo(() => {
    const allCategories = new Set(allNodes.map(n => n.group));
    return ['all', ...Array.from(allCategories).sort()];
  }, [allNodes]);

  const groupedAndSortedNodes = useMemo(() => {
    // 1. Filter nodes based on search term and selected category
    const filtered = allNodes.filter(node => {
        const matchesCategory = selectedCategory === 'all' || node.group === selectedCategory;
        const matchesSearch = searchTerm === '' ||
          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (node.subGroup && node.subGroup.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // 2. Group the filtered nodes by category
    const grouped = filtered.reduce((acc, node) => {
        const group = node.group;
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(node);
        return acc;
    }, {} as Record<string, CustomNode[]>);

    // 3. Sort nodes within each group and organize by sub-groups
    const sortedGroupNames = Object.keys(grouped).sort();

    return sortedGroupNames.map(groupName => {
        const nodesInGroup = grouped[groupName];

        // Separate nodes with and without sub-groups
        const withSubGroups: Record<string, CustomNode[]> = {};
        const withoutSubGroups: CustomNode[] = [];

        nodesInGroup.forEach(node => {
            if (node.subGroup) {
                if (!withSubGroups[node.subGroup]) {
                    withSubGroups[node.subGroup] = [];
                }
                withSubGroups[node.subGroup].push(node);
            } else {
                withoutSubGroups.push(node);
            }
        });

        // Sort sub-groups alphabetically and nodes within them
        const sortedSubGroups = Object.keys(withSubGroups).sort();
        const sortedNodes: CustomNode[] = [];

        // Add nodes from sub-groups first
        sortedSubGroups.forEach(subGroup => {
            sortedNodes.push(...withSubGroups[subGroup].sort((a, b) => a.name.localeCompare(b.name)));
        });

        // Add standalone nodes at the end
        sortedNodes.push(...withoutSubGroups.sort((a, b) => a.name.localeCompare(b.name)));

        return {
            name: groupName,
            nodes: sortedNodes,
            subGroups: sortedSubGroups.map(sg => ({
                name: sg,
                nodes: withSubGroups[sg]
            }))
        };
    });
  }, [allNodes, searchTerm, selectedCategory]);

  const handleAddNode = () => {
    router.push(`/node-labs/new`);
  };

  const handleDeleteNode = async (nodeId: string) => {
    // Prevent deleting non-custom nodes based on ID convention
    const isCustomNode = nodeId.startsWith('cnode-');
    if (!isCustomNode) {
      toast({
        title: 'Cannot Delete',
        description: 'Built-in nodes cannot be deleted. Only nodes with IDs starting with "cnode-" can be removed.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Delete from filesystem via API
      const response = await fetch(`/api/node-definitions/list?id=${nodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete node');
      }

      // Update local state
      setAllNodes(prev => prev.filter(n => n.id !== nodeId));

      toast({
        title: 'Success',
        description: 'Node deleted successfully',
      });
    } catch (error) {
      console.error('[NodeLabs] Error deleting node:', error);
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const hasResults = groupedAndSortedNodes.some(g => g.nodes.length > 0);

  return (
    <div className="flex flex-col h-full">
       <header className="sticky top-0 z-10 flex flex-col md:flex-row items-center justify-between gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
        <div className="flex items-center w-full max-w-md h-10 px-3 rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
           <Input
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
           />
           <Separator orientation="vertical" className="h-5" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-auto border-0 bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setSubGroupsModalOpen(true)}
            className="h-10"
          >
            <Layers className="h-4 w-4 mr-2" />
            Sub-Groups
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadNodes(true)}
            disabled={isRefreshing}
            className="h-10 w-10"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading nodes...</p>
          </div>
        ) : hasResults ? (
          <div className="space-y-8">
            {groupedAndSortedNodes.map((group) => (
              <div key={group.name}>
                <h2 className="text-xl font-semibold mb-4 capitalize px-1">{group.name}</h2>

                {/* Render sub-groups */}
                {group.subGroups && group.subGroups.length > 0 ? (
                  <div className="space-y-6">
                    {group.subGroups.map((subGroup) => (
                      <div key={subGroup.name}>
                        <h3 className="text-lg font-medium mb-3 px-1 text-muted-foreground flex items-center gap-2">
                          <span className="w-1 h-5 rounded-full" style={{ backgroundColor: subGroup.nodes[0]?.color || '#6366f1' }}></span>
                          {subGroup.name}
                          <span className="text-sm text-muted-foreground/60">({subGroup.nodes.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                          {subGroup.nodes.map((node) => {
                      const Icon = getNodeIcon(node);
                      const isCustomNode = node.id.startsWith('cnode-');
                      const isBuiltIn = allBuiltInNodes.some(n => n.id === node.id);
                      return (
                        <Card key={node.id} className="bg-card/50 backdrop-blur-sm border border-border/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 relative flex flex-col transition-all duration-300 ease-out group h-full">
                          <Link href={`/node-labs/${node.id}`} className="block flex-grow p-4">
                              <CardHeader className="p-0">
                              <div className="flex items-start justify-between gap-4">
                                  <CardTitle className="font-semibold text-base flex items-center gap-2 text-foreground/90">
                                      <Icon className="h-5 w-5" style={{ color: node.color }} />
                                      {node.name}
                                      {isCustomNode && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-normal">
                                          CUSTOM
                                        </span>
                                      )}
                                      {!isBuiltIn && !isCustomNode && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground font-normal">
                                          LOCAL
                                        </span>
                                      )}
                                  </CardTitle>
                              </div>
                              <CardDescription className="line-clamp-2 text-xs pt-1 h-8 text-foreground/70">{node.description}</CardDescription>
                              </CardHeader>
                              <CardContent className="p-0 pt-4 flex-grow flex items-end justify-between text-xs text-muted-foreground">
                                  <p>v{node.version}</p>
                                  <p>{node.group}</p>
                              </CardContent>
                          </Link>
                          <div className="absolute top-2 right-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/node-labs/${node.id}`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>{isCustomNode || !isBuiltIn ? 'Edit Node' : 'View Node'}</span>
                                  </Link>
                                </DropdownMenuItem>
                                {(isCustomNode || !isBuiltIn) && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                    onClick={() => handleDeleteNode(node.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete Node</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      );
                    })}
                        </div>
                      </div>
                    ))}

                    {/* Render nodes without sub-groups */}
                    {group.nodes.filter(n => !n.subGroup).length > 0 && (
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {group.nodes.filter(n => !n.subGroup).map((node) => {
                            const Icon = getNodeIcon(node);
                            const isCustomNode = node.id.startsWith('cnode-');
                            const isBuiltIn = allBuiltInNodes.some(n => n.id === node.id);
                            return (
                              <Card key={node.id} className="bg-card/50 backdrop-blur-sm border border-border/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 relative flex flex-col transition-all duration-300 ease-out group h-full">
                                <Link href={`/node-labs/${node.id}`} className="block flex-grow p-4">
                                  <CardHeader className="p-0">
                                    <div className="flex items-start justify-between gap-4">
                                      <CardTitle className="font-semibold text-base flex items-center gap-2 text-foreground/90">
                                        <Icon className="h-5 w-5" style={{ color: node.color }} />
                                        {node.name}
                                        {isCustomNode && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-normal">
                                            CUSTOM
                                          </span>
                                        )}
                                        {!isBuiltIn && !isCustomNode && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground font-normal">
                                            LOCAL
                                          </span>
                                        )}
                                      </CardTitle>
                                    </div>
                                    <CardDescription className="line-clamp-2 text-xs pt-1 h-8 text-foreground/70">{node.description}</CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-0 pt-4 flex-grow flex items-end justify-between text-xs text-muted-foreground">
                                    <p>v{node.version}</p>
                                    <p>{node.group}</p>
                                  </CardContent>
                                </Link>
                                <div className="absolute top-2 right-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link href={`/node-labs/${node.id}`}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          <span>{isCustomNode || !isBuiltIn ? 'Edit Node' : 'View Node'}</span>
                                        </Link>
                                      </DropdownMenuItem>
                                      {(isCustomNode || !isBuiltIn) && (
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                          onClick={() => handleDeleteNode(node.id)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          <span>Delete Node</span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.nodes.map((node) => {
                      const Icon = getNodeIcon(node);
                      const isCustomNode = node.id.startsWith('cnode-');
                      const isBuiltIn = allBuiltInNodes.some(n => n.id === node.id);
                      return (
                        <Card key={node.id} className="bg-card/50 backdrop-blur-sm border border-border/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 relative flex flex-col transition-all duration-300 ease-out group h-full">
                          <Link href={`/node-labs/${node.id}`} className="block flex-grow p-4">
                            <CardHeader className="p-0">
                              <div className="flex items-start justify-between gap-4">
                                <CardTitle className="font-semibold text-base flex items-center gap-2 text-foreground/90">
                                  <Icon className="h-5 w-5" style={{ color: node.color }} />
                                  {node.name}
                                  {isCustomNode && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-normal">
                                      CUSTOM
                                    </span>
                                  )}
                                  {!isBuiltIn && !isCustomNode && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground font-normal">
                                      LOCAL
                                    </span>
                                  )}
                                </CardTitle>
                              </div>
                              <CardDescription className="line-clamp-2 text-xs pt-1 h-8 text-foreground/70">{node.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 pt-4 flex-grow flex items-end justify-between text-xs text-muted-foreground">
                              <p>v{node.version}</p>
                              <p>{node.group}</p>
                            </CardContent>
                          </Link>
                          <div className="absolute top-2 right-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/node-labs/${node.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>{isCustomNode || !isBuiltIn ? 'Edit Node' : 'View Node'}</span>
                                  </Link>
                                </DropdownMenuItem>
                                {(isCustomNode || !isBuiltIn) && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                    onClick={() => handleDeleteNode(node.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete Node</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
            <FlaskConical className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Nodes Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? `No results for "${searchTerm}".` : 'Create your first custom node to use in your workflows.'}
            </p>
            <Button className="mt-4" onClick={handleAddNode}>
              <Plus className="mr-2 h-4 w-4" /> Create Node
            </Button>
          </div>
        )}
      </main>
      <div className="fixed bottom-20 right-6 z-30 md:bottom-6">
        <Button className="rounded-full h-14 w-14 shadow-lg" onClick={handleAddNode}>
            <Plus className="h-6 w-6"/>
        </Button>
      </div>

      <SubGroupsModal
        isOpen={subGroupsModalOpen}
        onClose={() => setSubGroupsModalOpen(false)}
      />
    </div>
  );
}

export default function NodeLabsPage() {
    return <NodeLabsContent />;
}
