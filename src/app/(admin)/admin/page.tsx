"use client";

import { usePermissions, useAdminStats } from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Workflow, Activity, AlertCircle, Ticket, FileText, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { user, role } = usePermissions();
  const { stats, isLoading, error } = useAdminStats();

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user?.profile?.displayName || "Admin"}! You are logged in as{" "}
          <span className="font-semibold capitalize">{role}</span>.
        </p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/10">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">Unable to load statistics</p>
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-300 space-y-2">
                <p>The Firestore security rules need to be deployed to enable admin statistics.</p>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-yellow-300 dark:border-yellow-700">
                  <p className="font-mono text-xs mb-2">Run these commands to deploy the updated rules:</p>
                  <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs">
                    firebase login<br />
                    firebase deploy --only firestore:rules
                  </code>
                </div>
                <p className="text-xs">After deploying, refresh this page to see the statistics.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            description={calculatePercentageChange(stats.totalUsers, stats.previousMonthUsers, "from last month")}
            icon={Users}
          />
          <StatsCard
            title="Active Workflows"
            value={stats.activeWorkflows.toLocaleString()}
            description={calculatePercentageChange(stats.totalWorkflows, stats.previousMonthWorkflows, "from last month")}
            icon={Workflow}
          />
          <StatsCard
            title="Executions Today"
            value={stats.executionsToday.toLocaleString()}
            description={calculatePercentageChange(stats.executionsToday, stats.previousDayExecutions, "from yesterday")}
            icon={Activity}
          />
          <StatsCard
            title="Total Workflows"
            value={stats.totalWorkflows.toLocaleString()}
            description={`${stats.activeWorkflows} active`}
            icon={Workflow}
          />
        </div>
      ) : null}

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Issues</CardTitle>
            <CardDescription>Latest reported problems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ActivityItem
                title="Workflow execution failed"
                description="User john@example.com"
                time="2 minutes ago"
                type="error"
              />
              <ActivityItem
                title="API rate limit exceeded"
                description="User sarah@example.com"
                time="15 minutes ago"
                type="warning"
              />
              <ActivityItem
                title="New support ticket"
                description="Payment issue - Priority: High"
                time="1 hour ago"
                type="info"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <StatusItem label="API Status" status="operational" />
              <StatusItem label="Database" status="operational" />
              <StatusItem label="Workflow Engine" status="operational" />
              <StatusItem label="Email Service" status="degraded" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string;
  description: string;
  icon: any;
  variant?: "default" | "warning";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variant === "warning" ? "text-yellow-600" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({
  title,
  description,
  time,
  type,
}: {
  title: string;
  description: string;
  time: string;
  type: "error" | "warning" | "info";
}) {
  const colors = {
    error: "text-red-600 bg-red-100 dark:bg-red-900/20",
    warning: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20",
    info: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
  };

  return (
    <div className="flex items-start space-x-3">
      <div className={`rounded-full p-1 ${colors[type]}`}>
        <AlertCircle className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

function StatusItem({
  label,
  status,
}: {
  label: string;
  status: "operational" | "degraded" | "down";
}) {
  const statusConfig = {
    operational: { color: "bg-green-500", text: "Operational" },
    degraded: { color: "bg-yellow-500", text: "Degraded" },
    down: { color: "bg-red-500", text: "Down" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center space-x-2">
        <div className={`h-2 w-2 rounded-full ${config.color}`} />
        <span className="text-sm text-muted-foreground">{config.text}</span>
      </div>
    </div>
  );
}

function calculatePercentageChange(current: number, previous: number, suffix: string): string {
  if (previous === 0) {
    return current > 0 ? `+100% ${suffix}` : `No change ${suffix}`;
  }

  const percentage = ((current - previous) / previous) * 100;
  const sign = percentage > 0 ? '+' : '';

  return `${sign}${percentage.toFixed(1)}% ${suffix}`;
}
