"use client";

import { useUserData } from "@/hooks/use-user-data";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { useMemo } from "react";
import type { Workflow as WorkflowType, UserCredential, UserTable } from "@/lib/types";
import {
  LoaderCircle,
  Workflow,
  GaugeCircle,
  Globe,
  CheckCircle2,
  XCircle,
  Play,
  Database,
  Key,
  Boxes,
  HardDrive
} from "lucide-react";

export function UserMetricsCards() {
  const { user: userData, isLoading: userDataLoading } = useUserData();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  // Get collections data
  const workflowsQuery = useMemo(() => {
    if (!authUser) return null;
    return collection(firestore, 'users', authUser.uid, 'workflows');
  }, [authUser, firestore]);

  const credentialsQuery = useMemo(() => {
    if (!authUser) return null;
    return collection(firestore, 'users', authUser.uid, 'credentials');
  }, [authUser, firestore]);

  const tablesQuery = useMemo(() => {
    if (!authUser) return null;
    return collection(firestore, 'users', authUser.uid, 'tables');
  }, [authUser, firestore]);

  const { data: workflows, isLoading: workflowsLoading } = useCollection<WorkflowType>(workflowsQuery);
  const { data: credentials, isLoading: credentialsLoading } = useCollection<UserCredential>(credentialsQuery);
  const { data: tables, isLoading: tablesLoading } = useCollection<UserTable>(tablesQuery);

  const isLoading = userDataLoading || workflowsLoading || credentialsLoading || tablesLoading;

  // Calculate real-time stats from collections
  const totalWorkflows = workflows?.length ?? 0;
  const activeWorkflows = workflows?.filter(w => w.status === 'active').length ?? 0;
  const totalCredentials = credentials?.length ?? 0;
  const totalTables = tables?.length ?? 0;

  // Usage stats from userData
  const executions = userData?.usage?.executionsThisMonth ?? 0;
  const apiCalls = userData?.usage?.apiCallsThisMonth ?? 0;
  const successfulExecutions = userData?.stats?.successfulExecutions ?? 0;
  const failedExecutions = userData?.stats?.failedExecutions ?? 0;
  const totalExecutions = userData?.stats?.totalExecutions ?? 0;
  const customNodes = userData?.stats?.totalCustomNodes ?? 0;
  const storageUsed = userData?.usage?.storageUsed ?? 0;

  // Subscription limits
  const maxWorkflows = userData?.subscription?.limits?.maxWorkflows ?? 0;
  const maxExecutions = userData?.subscription?.limits?.maxExecutionsPerMonth ?? 0;
  const maxApiCalls = userData?.subscription?.limits?.maxApiCalls ?? 0;
  const maxStorage = userData?.subscription?.limits?.maxStorage ?? 0;
  const maxCustomNodes = userData?.subscription?.limits?.maxCustomNodes ?? 0;

  // Calculate percentages for quota-based metrics
  const executionsPercentage = maxExecutions > 0 ? (executions / maxExecutions) * 100 : 0;
  const apiCallsPercentage = maxApiCalls > 0 ? (apiCalls / maxApiCalls) * 100 : 0;
  const storagePercentage = maxStorage > 0 ? (storageUsed / maxStorage) * 100 : 0;

  // Helper to format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Helper to format storage
  const formatStorage = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  // Helper to get color based on percentage
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 75) return "text-yellow-500";
    return "text-green-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-6 py-3 px-4 bg-muted/30 rounded-lg border">
        <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading metrics...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-3 px-4 bg-muted/30 rounded-lg border flex-wrap">
      {/* Total Workflows */}
      <div className="flex items-center gap-2">
        <Workflow className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{totalWorkflows}</span>
          {maxWorkflows > 0 && (
            <span className="text-xs text-muted-foreground">/ {maxWorkflows}</span>
          )}
          <span className="text-xs text-muted-foreground">workflows</span>
        </div>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* Active Workflows */}
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-green-500" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{activeWorkflows}</span>
          <span className="text-xs text-muted-foreground">active</span>
        </div>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* Executions this month with quota */}
      <div className="flex items-center gap-2">
        <GaugeCircle className={`h-4 w-4 ${maxExecutions > 0 ? getPercentageColor(executionsPercentage) : 'text-muted-foreground'}`} />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{formatNumber(executions)}</span>
          {maxExecutions > 0 && (
            <span className="text-xs text-muted-foreground">/ {formatNumber(maxExecutions)}</span>
          )}
          <span className="text-xs text-muted-foreground">exec</span>
        </div>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* API Calls with quota */}
      <div className="flex items-center gap-2">
        <Globe className={`h-4 w-4 ${maxApiCalls > 0 ? getPercentageColor(apiCallsPercentage) : 'text-muted-foreground'}`} />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{formatNumber(apiCalls)}</span>
          {maxApiCalls > 0 && (
            <span className="text-xs text-muted-foreground">/ {formatNumber(maxApiCalls)}</span>
          )}
          <span className="text-xs text-muted-foreground">API calls</span>
        </div>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* Success/Fail Ratio */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">{formatNumber(successfulExecutions)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium">{formatNumber(failedExecutions)}</span>
        </div>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* Custom Nodes */}
      <div className="flex items-center gap-2">
        <Boxes className="h-4 w-4 text-purple-500" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{customNodes}</span>
          {maxCustomNodes > 0 && (
            <span className="text-xs text-muted-foreground">/ {maxCustomNodes}</span>
          )}
          <span className="text-xs text-muted-foreground">nodes</span>
        </div>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* Credentials */}
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-blue-500" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{totalCredentials}</span>
          <span className="text-xs text-muted-foreground">creds</span>
        </div>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* Tables */}
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-orange-500" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold">{totalTables}</span>
          <span className="text-xs text-muted-foreground">tables</span>
        </div>
      </div>

      {/* Storage with quota */}
      {maxStorage > 0 && (
        <>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <HardDrive className={`h-4 w-4 ${getPercentageColor(storagePercentage)}`} />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold">{formatStorage(storageUsed)}</span>
              <span className="text-xs text-muted-foreground">/ {formatStorage(maxStorage)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

