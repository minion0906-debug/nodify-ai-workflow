
'use client';

import { Button } from "@/components/ui/button";
import { Plus, Workflow as WorkflowIcon, MoreVertical, Copy, Trash2, Search, LoaderCircle, FolderPlus, Folder as FolderIcon, Move, FolderUp, ArrowLeft, FolderOpen, History, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { useState, useMemo, useEffect } from "react";
import type { Workflow, WorkflowExecution } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, increment, collectionGroup, query, where, getDocs } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserMetricsCards } from "@/components/metrics/user-metrics-cards";

type Folder = {
  id: string;
  name: string;
};

const getFolderNameFromId = (id: string | null) => {
    if (!id) return '';
    const parts = id.split('-');
    if (parts.length > 2) {
      return parts.slice(2).join(' ').replace(/-/g, ' ');
    }
    return id;
}

const CreateFolderDialog = ({ onConfirm }: { onConfirm: (name: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [folderName, setFolderName] = useState("");
  
    const handleConfirm = () => {
      if (folderName.trim()) {
        onConfirm(folderName.trim());
        setFolderName("");
        setOpen(false);
      }
    };
  
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline">
            <FolderPlus className="mr-2 h-4 w-4" />
            Crear Carpeta
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create a new folder</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for your new folder to help organize your workflows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name" className="sr-only">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g., 'Marketing Automations'"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={!folderName.trim()}>
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

const CreateWorkflowDialog = ({ 
    isOpen, 
    setIsOpen, 
    initialFolder,
    folders,
    onConfirm
}: { 
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    initialFolder: Folder | null,
    folders: Folder[],
    onConfirm: (name: string, folderId: string | null) => void 
}) => {
    const [workflowName, setWorkflowName] = useState("");
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setWorkflowName("");
            setSelectedFolderId(initialFolder?.id ?? null);
        }
    }, [isOpen, initialFolder]);

    const handleConfirm = () => {
      if (workflowName.trim()) {
        onConfirm(workflowName.trim(), selectedFolderId);
        setIsOpen(false);
      }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
    }
  
    return (
      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Give your new workflow a name to get started.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                id="workflow-name"
                placeholder="e.g., 'Sync Airtable to Google Sheets'"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                autoFocus
                />
            </div>
            {folders.length > 0 && (
                <div className="space-y-2">
                    <Label htmlFor="folder-select">Folder</Label>
                    <Select
                        value={selectedFolderId || 'root'}
                        onValueChange={(value) => setSelectedFolderId(value === 'root' ? null : value)}
                    >
                        <SelectTrigger id="folder-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="root">
                                <span className="flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4" />
                                    Main (No folder)
                                </span>
                            </SelectItem>
                            {folders.map(folder => (
                                <SelectItem key={folder.id} value={folder.id}>
                                    <span className="flex items-center gap-2 capitalize">
                                        <FolderIcon className="h-4 w-4" />
                                        {folder.name}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={!workflowName.trim()}>
              Create and Edit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
}

const WorkflowList = ({ workflows, folders, onMoveToFolder, onDuplicate, onDelete, onStatusChange, executionStats }: {
  workflows: Workflow[],
  folders: Folder[],
  onMoveToFolder: (wfId: string, fId: string | null) => void,
  onDuplicate: (wfId: string) => void,
  onDelete: (wfId: string) => void,
  onStatusChange: (wfId: string, newStatus: 'active' | 'inactive') => void,
  executionStats?: Record<string, { success: number; failed: number }>
}) => {

    if (workflows.length === 0) return null;

    return (
        <div className="border rounded-lg">
            <ul className="divide-y divide-border">
                {workflows.map((workflow) => {
                    const stats = executionStats?.[workflow.id] || { success: 0, failed: 0 };
                    const hasExecutions = stats.success > 0 || stats.failed > 0;

                    return (
                <li key={workflow.id} className="group hover:bg-secondary/50 transition-colors">
                    <Link href={`/workflows/${workflow.id}`} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <WorkflowIcon className="h-6 w-6 text-primary" />
                        <div>
                        <p className="font-semibold">{workflow.name}</p>
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                        {hasExecutions && (
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    <span className="text-xs text-green-500 font-medium">{stats.success}</span>
                                </div>
                                {stats.failed > 0 && (
                                    <div className="flex items-center gap-1">
                                        <XCircle className="h-3 w-3 text-red-500" />
                                        <span className="text-xs text-red-500 font-medium">{stats.failed}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
                            <Switch 
                                checked={workflow.status === 'active'}
                                onCheckedChange={(checked) => onStatusChange(workflow.id, checked ? 'active' : 'inactive')}
                                className={cn(
                                    'data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-500'
                                )}
                            />
                            <Label 
                                className={cn(
                                    'capitalize text-xs w-16 text-left',
                                    workflow.status === 'active' && 'text-green-400',
                                    workflow.status === 'inactive' && 'text-gray-400',
                                    workflow.status === 'draft' && 'text-yellow-400',
                                )}>
                                {workflow.status}
                            </Label>
                        </div>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
                            <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {folders.length > 0 && (
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Move className="mr-2 h-4 w-4" />
                                        <span>Move to...</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            {workflow.folderId && (
                                                <DropdownMenuItem onClick={(e) => {e.preventDefault(); e.stopPropagation(); onMoveToFolder(workflow.id, null)}}>
                                                    <FolderUp className="mr-2 h-4 w-4" />
                                                    <span>Remove from folder</span>
                                                </DropdownMenuItem>
                                            )}
                                            {folders.map(folder => (
                                                <DropdownMenuItem key={folder.id} disabled={workflow.folderId === folder.id} onClick={(e) => {e.preventDefault(); e.stopPropagation(); onMoveToFolder(workflow.id, folder.id)}}>
                                                    <FolderIcon className="mr-2 h-4 w-4" />
                                                    <span className="capitalize">{folder.name}</span>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            )}
                            <DropdownMenuItem onClick={(e) => {e.preventDefault(); e.stopPropagation(); onDuplicate(workflow.id)}}>
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Duplicate</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive-foreground focus:bg-destructive" 
                                onClick={(e) => {e.preventDefault(); e.stopPropagation(); onDelete(workflow.id)}}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    </Link>
                </li>
                );
                })}
            </ul>
        </div>
    )
}

export default function WorkflowsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const workflowsQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'workflows');
  }, [user, firestore]);
  const { data: workflows, isLoading } = useCollection<Workflow>(workflowsQuery);
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [executionStats, setExecutionStats] = useState<Record<string, { success: number; failed: number }>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateWorkflowOpen, setIsCreateWorkflowOpen] = useState(false);
  const [folderForNewWorkflow, setFolderForNewWorkflow] = useState<Folder | null>(null);

  const statuses = ['all', 'active', 'inactive', 'draft'];

  // Load execution stats for all workflows
  useEffect(() => {
    if (!user || !workflows) return;

    const loadExecutionStats = async () => {
      try {
        const stats: Record<string, { success: number; failed: number }> = {};

        // Load executions using collectionGroup
        const executionsQuery = query(
          collectionGroup(firestore, 'executions'),
          where('ownerId', '==', user.uid)
        );

        const snapshot = await getDocs(executionsQuery);
        snapshot.docs.forEach(doc => {
          const execution = doc.data() as WorkflowExecution;
          if (!stats[execution.workflowId]) {
            stats[execution.workflowId] = { success: 0, failed: 0 };
          }
          if (execution.status === 'success') {
            stats[execution.workflowId].success++;
          } else if (execution.status === 'error') {
            stats[execution.workflowId].failed++;
          }
        });

        setExecutionStats(stats);
      } catch (error) {
        console.error('[WorkflowsPage] Error loading execution stats:', error);
      }
    };

    loadExecutionStats();
  }, [user, workflows, firestore]);

  useEffect(() => {
    if (workflows) {
      const folderIds = new Set<string>();
      workflows.forEach(wf => {
        if (wf.folderId) {
          folderIds.add(wf.folderId);
        }
      });
      const derivedFolders: Folder[] = Array.from(folderIds).map(id => ({ id, name: getFolderNameFromId(id) }));
      setFolders(derivedFolders.sort((a,b) => a.name.localeCompare(b.name)));
    }
  }, [workflows]);


  const filteredAndGroupedData = useMemo(() => {
    if (!workflows) return { grouped: [], ungrouped: [] };

    const lowerCaseSearch = searchTerm.toLowerCase();

    const filteredWorkflows = workflows.filter(workflow => {
      const matchesStatus = selectedStatus === 'all' || workflow.status === selectedStatus;
      const matchesSearch = searchTerm === '' ||
        workflow.name.toLowerCase().includes(lowerCaseSearch) ||
        (workflow.description && workflow.description.toLowerCase().includes(lowerCaseSearch));
      return matchesStatus && matchesSearch;
    });
    
    const workflowMap = filteredWorkflows.reduce((acc, wf) => {
        const key = wf.folderId || 'ungrouped';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(wf);
        return acc;
    }, {} as Record<string, Workflow[]>);


    const grouped = folders.map(folder => ({
        folder,
        workflows: workflowMap[folder.id] || []
    })).filter(group => {
        return searchTerm === '' || group.folder.name.toLowerCase().includes(lowerCaseSearch) || group.workflows.length > 0;
    });

    const ungrouped = workflowMap['ungrouped'] || [];

    return { grouped, ungrouped };

  }, [workflows, folders, searchTerm, selectedStatus]);


  const handleDeleteWorkflow = (workflowId: string) => {
    if (!user) return;
    const workflowDocRef = doc(firestore, 'users', user.uid, 'workflows', workflowId);
    deleteDoc(workflowDocRef);
    // Decrement usage and stats
    const userRef = doc(firestore, 'users', user.uid);
    updateDoc(userRef, {
      'usage.workflowCount': increment(-1),
      'stats.totalWorkflows': increment(-1),
    }).catch(() => {});
  }

  const handleDuplicateWorkflow = async (workflowId: string) => {
    if (!user) return;
    const workflowsCollection = collection(firestore, 'users', user.uid, 'workflows');
    const workflowToDuplicate = workflows?.find(wf => wf.id === workflowId);
      if (workflowToDuplicate) {
        const newWorkflowData = {
          ...workflowToDuplicate,
          name: `${workflowToDuplicate.name} (Copy)`,
          status: 'draft',
          folderId: workflowToDuplicate.folderId, 
        };
        delete newWorkflowData.id; 
        await addDoc(workflowsCollection, newWorkflowData);
        try {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            'usage.workflowCount': increment(1),
            'stats.totalWorkflows': increment(1),
          });
        } catch {}
      }
    };

  const handleCreateWorkflow = async (name: string, folderId: string | null = null) => {
    if (!user) return;
    
    let finalFolderId = folderId;

    if (!folders.some(f => f.name.toLowerCase() === 'personal') && workflows?.length === 0) {
        const personalFolderId = `folder-${Date.now()}-personal`;
        const newFolder = { id: personalFolderId, name: 'personal' };
        setFolders(prev => [...prev, newFolder]);
        finalFolderId = personalFolderId;
    }

    const workflowsCollection = collection(firestore, 'users', user.uid, 'workflows');
    const newWorkflowData = {
      name: name,
      description: 'A brand new workflow to automate your tasks.',
      status: 'draft' as const,
      nodes: [],
      connections: [],
      createdAt: serverTimestamp(),
      folderId: finalFolderId,
    };

    try {
      const newWorkflow = await addDoc(workflowsCollection, newWorkflowData);
      // Increment usage and stats
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
          'usage.workflowCount': increment(1),
          'stats.totalWorkflows': increment(1),
        });
      } catch {}
      router.push(`/workflows/${newWorkflow.id}`);
    } catch (error) {
      console.error('[WorkflowsPage] Error creating workflow:', error);
    }
  }
  
  const handleOpenCreateWorkflowModal = (folder: Folder | null) => {
    setFolderForNewWorkflow(folder);
    setIsCreateWorkflowOpen(true);
  }

  const handleCreateFolder = (name: string) => {
      const newFolderId = `folder-${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}`;
      const newFolder = { id: newFolderId, name: name };
      setFolders(prev => [...prev, newFolder].sort((a,b) => a.name.localeCompare(b.name)));
  }
  
  const handleMoveToFolder = async (workflowId: string, folderId: string | null) => {
    if (!user) return;
    const workflowDocRef = doc(firestore, 'users', user.uid, 'workflows', workflowId);
    await updateDoc(workflowDocRef, { folderId });
  }

  const handleStatusChange = async (workflowId: string, newStatus: 'active' | 'inactive') => {
    if (!user) return;
    const workflowDocRef = doc(firestore, 'users', user.uid, 'workflows', workflowId);
    await updateDoc(workflowDocRef, { status: newStatus });
  }

  const noResults = filteredAndGroupedData.grouped.length === 0 && filteredAndGroupedData.ungrouped.length === 0;

  return (
    <>
    <div className="flex flex-col h-full">
       <header className="sticky top-0 z-10 flex flex-col md:flex-row items-center justify-between gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center w-full max-w-md h-10 px-3 rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
              />
              <Separator orientation="vertical" className="h-5" />
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-auto border-0 bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none">
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  {statuses.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">
                      {status === 'all' ? 'All Statuses' : status}
                      </SelectItem>
                  ))}
                  </SelectContent>
              </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/executions">
                <History className="h-4 w-4 mr-2" />
                Executions
              </Link>
            </Button>
            <CreateFolderDialog onConfirm={handleCreateFolder} />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-8">
        <UserMetricsCards />
        {isLoading || isUserLoading ? (
            <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
                <LoaderCircle className="h-12 w-12 text-muted-foreground animate-spin" />
                <h3 className="mt-4 text-lg font-semibold">Loading Workflows...</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Just a moment while we fetch your data.
                </p>
            </div>
        ) : (
          <>
            {filteredAndGroupedData.grouped.map(({ folder, workflows: folderWorkflows }) => (
                <div key={folder.id}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 capitalize">
                            <FolderIcon className="h-6 w-6 text-primary"/>
                            {folder.name}
                        </h2>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenCreateWorkflowModal(folder)}>
                            <Plus className="h-4 w-4 mr-1 text-muted-foreground" />
                            Add
                        </Button>
                    </div>
                    <WorkflowList workflows={folderWorkflows} folders={folders} onMoveToFolder={handleMoveToFolder} onDuplicate={handleDuplicateWorkflow} onDelete={handleDeleteWorkflow} onStatusChange={handleStatusChange} executionStats={executionStats} />
                </div>
            ))}
            
            {filteredAndGroupedData.ungrouped.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                        Workflows
                    </h2>
                    <WorkflowList workflows={filteredAndGroupedData.ungrouped} folders={folders} onMoveToFolder={handleMoveToFolder} onDuplicate={handleDuplicateWorkflow} onDelete={handleDeleteWorkflow} onStatusChange={handleStatusChange} executionStats={executionStats} />
                </div>
            )}
            
            {noResults && (
                <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
                    <Search className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">
                        No Workflows Found
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm || selectedStatus !== 'all' ? 'No items match your criteria.' : 'Create your first workflow to get started.'}
                    </p>
                    <Button className="mt-4" onClick={() => handleOpenCreateWorkflowModal(null)}>
                      <Plus className="mr-2 h-4 w-4" /> Create Workflow
                    </Button>
                </div>
            )}
            </>
        )}
      </main>
      <div className="fixed bottom-20 right-6 z-30 md:bottom-6">
        <Button className="rounded-full h-14 w-14 shadow-lg" onClick={() => handleOpenCreateWorkflowModal(null)}>
            <Plus className="h-6 w-6"/>
        </Button>
      </div>
    </div>
    <CreateWorkflowDialog 
      isOpen={isCreateWorkflowOpen} 
      setIsOpen={setIsCreateWorkflowOpen}
      initialFolder={folderForNewWorkflow}
      folders={folders}
      onConfirm={handleCreateWorkflow}
    />
    </>
  );
}
