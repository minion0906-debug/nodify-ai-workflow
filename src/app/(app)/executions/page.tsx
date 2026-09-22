'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collectionGroup, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { WorkflowExecution } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, LoaderCircle, Workflow as WorkflowIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ExecutionsPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadExecutions = async () => {
      try {
        setIsLoading(true);
        // Use collectionGroup to get all executions from all workflows
        const executionsQuery = query(
          collectionGroup(firestore, 'executions'),
          where('ownerId', '==', user.uid),
          orderBy('startedAt', 'desc'),
          limit(100) // Limit to last 100 executions
        );

        const snapshot = await getDocs(executionsQuery);
        const executionData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as WorkflowExecution[];

        setExecutions(executionData);
      } catch (error) {
        console.error('[ExecutionsPage] Error loading executions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExecutions();
  }, [user, firestore]);

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
          <h1 className="text-lg font-semibold">All Executions</h1>
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
          <div>
            <h1 className="text-lg font-semibold">All Executions</h1>
            <p className="text-sm text-muted-foreground">View execution history across all workflows</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/workflows">
            <WorkflowIcon className="h-4 w-4 mr-2" />
            Go to Workflows
          </Link>
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg h-full">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Executions Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run a workflow to see execution history here.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/workflows">
                <WorkflowIcon className="mr-2 h-4 w-4" />
                Go to Workflows
              </Link>
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium">
                <div className="col-span-1">Status</div>
                <div className="col-span-3">Workflow</div>
                <div className="col-span-2">Mode</div>
                <div className="col-span-2">Duration</div>
                <div className="col-span-2">Nodes</div>
                <div className="col-span-2">Started</div>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {executions.map((execution) => (
                <li
                  key={execution.id}
                  className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/workflows/${execution.workflowId}/executions/${execution.id}`)}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <WorkflowIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate">{execution.workflowName}</span>
                      </div>
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
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {formatTimestamp(execution.startedAt)}
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
