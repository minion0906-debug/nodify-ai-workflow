
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Workflow, WorkflowExecution } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, Clock, LoaderCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const executionId = params.executionId as string;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Load workflow
  const workflowRef = useMemo(() => {
    if (!user || !workflowId) return null;
    return doc(firestore, 'users', user.uid, 'workflows', workflowId);
  }, [user, workflowId, firestore]);

  const { data: workflow } = useDoc<Workflow>(workflowRef);

  // Load execution from the subcollection
  const executionRef = useMemo(() => {
    if (!user || !workflowId || !executionId) return null;
    return doc(firestore, 'users', user.uid, 'workflows', workflowId, 'executions', executionId);
  }, [user, workflowId, executionId, firestore]);

  const { data: execution, isLoading } = useDoc<WorkflowExecution>(executionRef);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'running':
        return <LoaderCircle className="h-6 w-6 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-6 w-6 text-yellow-500" />;
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/workflows/${workflowId}/executions`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Execution Details</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/workflows/${workflowId}/executions`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Execution Not Found</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-lg font-semibold">Execution Not Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The execution you're looking for doesn't exist.
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/workflows/${workflowId}/executions`}>
                Back to Executions
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const nodeExecutionsArray = Object.values(execution.nodeExecutions || {});

  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/workflows/${workflowId}/executions`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Execution Details</h1>
            <p className="text-sm text-muted-foreground">{workflow?.name}</p>
          </div>
        </div>
        {getStatusIcon(execution.status)}
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Execution Summary</CardTitle>
            <CardDescription>Overview of this workflow execution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(execution.status)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <div className="mt-1">{getStatusBadge(execution.mode)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="mt-1 font-medium">{formatDuration(execution.duration)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="mt-1 font-medium">{formatDate(execution.startedAt)}</p>
                <p className="text-xs text-muted-foreground">{formatTimestamp(execution.startedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Nodes</p>
                <p className="mt-1 font-medium">{execution.totalNodes}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Results</p>
                <p className="mt-1 font-medium">
                  <span className="text-green-500">{execution.successfulNodes} success</span>
                  {execution.failedNodes > 0 && (
                    <>
                      {' / '}
                      <span className="text-red-500">{execution.failedNodes} failed</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {execution.error && (
              <>
                <Separator />
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-red-500">Error</p>
                      <p className="text-sm mt-1">{execution.error}</p>
                      {execution.errorNodeId && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Failed at node: {execution.nodeExecutions[execution.errorNodeId]?.nodeName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Node Executions */}
        <Card>
          <CardHeader>
            <CardTitle>Node Executions</CardTitle>
            <CardDescription>Detailed results for each node</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nodeExecutionsArray.map((nodeExec) => (
                <div
                  key={nodeExec.nodeId}
                  className={cn(
                    "border rounded-lg p-4",
                    nodeExec.status === 'success' && "border-green-500/20 bg-green-500/5",
                    nodeExec.status === 'failed' && "border-red-500/20 bg-red-500/5"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{nodeExec.nodeName}</h4>
                        {getStatusBadge(nodeExec.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {nodeExec.nodeType} • {formatDuration(nodeExec.duration)}
                      </p>
                    </div>
                  </div>

                  {nodeExec.error && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded p-3">
                      <p className="text-sm font-medium text-red-500">Error Message:</p>
                      <p className="text-sm mt-1">{nodeExec.error}</p>
                      {nodeExec.errorStack && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Stack Trace
                          </summary>
                          <pre className="text-xs mt-2 overflow-auto">{nodeExec.errorStack}</pre>
                        </details>
                      )}
                    </div>
                  )}

                  <details className="mt-3">
                    <summary className="text-sm font-medium cursor-pointer">
                      Input Data
                    </summary>
                    <pre className="text-xs mt-2 p-3 bg-muted rounded overflow-auto max-h-60">
                      {JSON.stringify(nodeExec.input, null, 2)}
                    </pre>
                  </details>

                  <details className="mt-2">
                    <summary className="text-sm font-medium cursor-pointer">
                      Output Data
                    </summary>
                    <pre className="text-xs mt-2 p-3 bg-muted rounded overflow-auto max-h-60">
                      {JSON.stringify(nodeExec.output, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
