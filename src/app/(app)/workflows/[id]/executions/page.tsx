
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Workflow, WorkflowExecution } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, Clock, LoaderCircle, Play } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ExecutionsPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Load workflow
  const workflowRef = useMemo(() => {
    if (!user || !workflowId) return null;
    return doc(firestore, 'users', user.uid, 'workflows', workflowId);
  }, [user, workflowId, firestore]);

  const { data: workflow } = useDoc<Workflow>(workflowRef);

  // Load executions from the subcollection
  const executionsQuery = useMemo(() => {
    if (!user || !workflowId) return null;
    // No need for where clause since executions are already in user's workflow subcollection
    return collection(firestore, 'users', user.uid, 'workflows', workflowId, 'executions');
  }, [user, workflowId, firestore]);

  const { data: executions, isLoading } = useCollection<WorkflowExecution>(executionsQuery);

  // Sort executions by date (newest first)
  const sortedExecutions = useMemo(() => {
    if (!executions) return [];
    return [...executions].sort((a, b) => {
      const aTime = a.startedAt?.toDate?.() || new Date(a.startedAt);
      const bTime = b.startedAt?.toDate?.() || new Date(b.startedAt);
      return bTime.getTime() - aTime.getTime();
    });
  }, [executions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <LoaderCircle className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      success: 'bg-green-500/10 text-green-500 border-green-500/20',
      error: 'bg-red-500/10 text-red-500 border-red-500/20',
      running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      waiting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };

    return (
      <Badge
        variant="outline"
        className={cn('capitalize', variants[status] || 'bg-gray-500/10 text-gray-500')}
      >
        {status}
      </Badge>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/workflows/${workflowId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Executions</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/workflows/${workflowId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Executions</h1>
            <p className="text-sm text-muted-foreground">{workflow?.name}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/workflows/${workflowId}`}>
            <Play className="h-4 w-4 mr-2" />
            Run Workflow
          </Link>
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {sortedExecutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Executions Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run your workflow to see execution history here.
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/workflows/${workflowId}`}>
                <Play className="mr-2 h-4 w-4" />
                Run Workflow
              </Link>
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium">
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Mode</div>
                <div className="col-span-2">Duration</div>
                <div className="col-span-2">Nodes</div>
                <div className="col-span-3">Started</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {sortedExecutions.map((execution) => (
                <li
                  key={execution.id}
                  className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/workflows/${workflowId}/executions/${execution.id}`)}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                    </div>
                    <div className="col-span-2">
                      {getStatusBadge(execution.mode)}
                    </div>
                    <div className="col-span-2 text-sm">
                      {formatDuration(execution.duration)}
                    </div>
                    <div className="col-span-2 text-sm">
                      <span className="text-green-500">{execution.successfulNodes}</span>
                      {execution.failedNodes > 0 && (
                        <>
                          {' / '}
                          <span className="text-red-500">{execution.failedNodes}</span>
                        </>
                      )}
                      {' / '}
                      <span className="text-muted-foreground">{execution.totalNodes}</span>
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {formatTimestamp(execution.startedAt)}
                    </div>
                    <div className="col-span-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/workflows/${workflowId}/executions/${execution.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
