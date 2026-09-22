"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Radio, RefreshCw, Check, Clock, Copy } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit as firestoreLimit, onSnapshot, Unsubscribe } from 'firebase/firestore';
import CodeEditor from '../code-editor';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface WebhookTestDataProps {
  workflowId: string;
  webhookId?: string;
  onUseTestData?: (testData: any) => void;
}

export function WebhookTestData({ workflowId, webhookId, onUseTestData }: WebhookTestDataProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Generate webhook URLs (Test and Production)
  const testUrl = useMemo(() => {
    if (typeof window === 'undefined' || !webhookId) return '';
    return `${window.location.origin}/api/webhook/test/${webhookId}`;
  }, [webhookId]);

  const prodUrl = useMemo(() => {
    if (typeof window === 'undefined' || !webhookId) return '';
    return `${window.location.origin}/api/webhook/prod/${webhookId}`;
  }, [webhookId]);

  // Query webhook calls
  const webhookCallsQuery = useMemo(() => {
    if (!user || !firestore || !workflowId) return null;

    const webhookCallsRef = collection(
      firestore,
      'users',
      user.uid,
      'workflows',
      workflowId,
      'webhook_calls'
    );

    return query(webhookCallsRef, orderBy('timestamp', 'desc'), firestoreLimit(10));
  }, [user, firestore, workflowId]);

  const { data: webhookCalls, isLoading } = useCollection<any>(webhookCallsQuery);

  const selectedCall = useMemo(() => {
    if (!selectedCallId || !webhookCalls) return null;
    return webhookCalls.find(call => call.id === selectedCallId);
  }, [selectedCallId, webhookCalls]);

  // Auto-select the latest call
  useEffect(() => {
    if (webhookCalls && webhookCalls.length > 0 && !selectedCallId) {
      setSelectedCallId(webhookCalls[0].id);
    }
  }, [webhookCalls, selectedCallId]);

  // Real-time listener when "Listen for Webhook" is active
  useEffect(() => {
    if (!isListening || !user || !firestore || !workflowId) return;

    const webhookCallsRef = collection(
      firestore,
      'users',
      user.uid,
      'workflows',
      workflowId,
      'webhook_calls'
    );

    const q = query(webhookCallsRef, orderBy('timestamp', 'desc'), firestoreLimit(1));

    let previousCount = webhookCalls?.length || 0;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.docs.length > 0 && snapshot.docs.length > previousCount) {
        const latestCall = snapshot.docs[0];
        toast({
          title: 'Webhook Received!',
          description: 'New webhook call captured',
        });

        // Auto-select the latest call
        setSelectedCallId(latestCall.id);

        // Stop listening after receiving a call
        setIsListening(false);
      }
      previousCount = snapshot.docs.length;
    });

    // Stop listening after 60 seconds
    const timeout = setTimeout(() => {
      setIsListening(false);
      toast({
        title: 'Listening stopped',
        description: 'Timeout reached (60 seconds)',
        variant: 'default',
      });
    }, 60000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [isListening, user, firestore, workflowId, webhookCalls, toast]);

  const handleUseTestData = () => {
    if (selectedCall && onUseTestData) {
      onUseTestData(selectedCall.data);
    }
  };

  const handleCopyUrl = (url: string, label: string) => {
    if (url) {
      navigator.clipboard.writeText(url)
        .then(() => toast({ title: 'Copied!', description: `${label} URL copied to clipboard` }))
        .catch(() => toast({ title: 'Error', description: 'Failed to copy URL', variant: 'destructive' }));
    }
  };

  const testCurlCommand = useMemo(() => {
    if (!testUrl) return '';
    return `curl -X POST "${testUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello from webhook!", "test": true}'`;
  }, [testUrl]);

  const prodCurlCommand = useMemo(() => {
    if (!prodUrl) return '';
    return `curl -X POST "${prodUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"cliente": "Brian", "monto": 1500}'`;
  }, [prodUrl]);

  const handleCopyCurl = (command: string) => {
    if (command) {
      navigator.clipboard.writeText(command)
        .then(() => toast({ title: 'Copied!', description: 'cURL command copied to clipboard' }))
        .catch(() => toast({ title: 'Error', description: 'Failed to copy command', variant: 'destructive' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Test URL Section */}
      {webhookId && (
        <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900">Test URL</Badge>
            <span className="text-xs text-muted-foreground">For development & testing only</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Test Webhook URL</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={testUrl}
                className="font-mono text-xs bg-white dark:bg-gray-950"
              />
              <Button
                onClick={() => handleCopyUrl(testUrl, 'Test')}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Test cURL Example */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Test cURL Command</label>
            <div className="relative">
              <pre className="p-3 rounded-lg bg-white dark:bg-gray-950 border text-xs font-mono overflow-x-auto">
                <code>{testCurlCommand}</code>
              </pre>
              <Button
                onClick={() => handleCopyCurl(testCurlCommand)}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              🧪 Test mode captures data WITHOUT executing the workflow
            </p>
          </div>
        </div>
      )}

      {/* Production URL Section */}
      {webhookId && (
        <div className="space-y-3 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 dark:bg-green-900">Production URL</Badge>
            <span className="text-xs text-muted-foreground">For live workflows only</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Production Webhook URL</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={prodUrl}
                className="font-mono text-xs bg-white dark:bg-gray-950"
              />
              <Button
                onClick={() => handleCopyUrl(prodUrl, 'Production')}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Production cURL Example */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Production cURL Command</label>
            <div className="relative">
              <pre className="p-3 rounded-lg bg-white dark:bg-gray-950 border text-xs font-mono overflow-x-auto">
                <code>{prodCurlCommand}</code>
              </pre>
              <Button
                onClick={() => handleCopyCurl(prodCurlCommand)}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              🚀 Production mode executes the workflow if status is ACTIVE
            </p>
          </div>
        </div>
      )}

      {/* Header with Listen Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Test Webhook</h3>
          <p className="text-xs text-muted-foreground">
            Capture incoming webhook data for testing
          </p>
        </div>

        <Button
          onClick={() => setIsListening(!isListening)}
          variant={isListening ? "default" : "outline"}
          size="sm"
          className={isListening ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {isListening ? (
            <>
              <Radio className="h-4 w-4 mr-2 animate-pulse" />
              Listening...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Listen for Webhook
            </>
          )}
        </Button>
      </div>

      {/* Listening Alert */}
      {isListening && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <Radio className="h-4 w-4 text-green-600 animate-pulse" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Listening for webhook calls...</strong>
            <br />
            Send a POST request to the URL above. The call will be captured automatically.
            <br />
            <span className="text-xs opacity-75">Auto-stops after 60 seconds or when a call is received.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Calls */}
      {webhookCalls && webhookCalls.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Recent Webhook Calls</Label>

          <div className="space-y-2">
            {webhookCalls.map((call) => (
              <div
                key={call.id}
                onClick={() => setSelectedCallId(call.id)}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${selectedCallId === call.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-2 h-2 rounded-full
                      ${call.workflowStatus === 'active' ? 'bg-green-500' : 'bg-yellow-500'}
                    `} />
                    <span className="text-xs font-mono text-muted-foreground">
                      {new Date(call.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {selectedCallId === call.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Call Data */}
      {selectedCall && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Captured Data</Label>
            {onUseTestData && (
              <Button
                onClick={handleUseTestData}
                size="sm"
                variant="outline"
              >
                Use for Testing
              </Button>
            )}
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-2 bg-muted/50 border-b">
              <span className="text-xs font-semibold text-muted-foreground">
                Request Body
              </span>
            </div>
            <div className="h-48 bg-muted/20">
              <CodeEditor
                value={JSON.stringify(selectedCall.data.body, null, 2)}
                onChange={() => {}}
                allNodes={[]}
                node={null}
                readOnly={true}
              />
            </div>
          </div>

          {/* Headers (collapsible) */}
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <span className="text-sm font-medium">Request Headers</span>
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(selectedCall.data.headers || {}).length} headers
                </Badge>
              </div>
            </summary>
            <div className="mt-2 rounded-lg border bg-card overflow-hidden">
              <div className="h-32 bg-muted/20">
                <CodeEditor
                  value={JSON.stringify(selectedCall.data.headers, null, 2)}
                  onChange={() => {}}
                  allNodes={[]}
                  node={null}
                  readOnly={true}
                  language="json"
                />
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Empty State */}
      {(!webhookCalls || webhookCalls.length === 0) && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border border-dashed">
          <Radio className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold mb-1">No webhook calls yet</h3>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Click "Listen for Webhook" and send a POST request to capture test data
          </p>
        </div>
      )}
    </div>
  );
}

// Label component (if not imported)
const Label = ({ className, children, ...props }: any) => (
  <label className={className} {...props}>{children}</label>
);
