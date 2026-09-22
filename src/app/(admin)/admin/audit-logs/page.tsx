"use client";

import { useState } from "react";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Shield, AlertTriangle, Info, Activity } from "lucide-react";
import type { AuditLogEntry, AuditAction } from "@/lib/types";

export default function AuditLogsPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Fetch audit logs (limited to last 1000 for performance)
  const logsRef = collection(firestore, "audit_logs");
  const logsQuery = query(logsRef, orderBy("timestamp", "desc"), limit(1000));
  const { data: logs, isLoading } = useCollection<AuditLogEntry>(logsQuery);

  // Filter logs
  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action.startsWith(actionFilter);
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;

    return matchesSearch && matchesAction && matchesSeverity;
  });

  // Group logs by severity
  const criticalLogs = logs?.filter((l) => l.severity === "critical").length || 0;
  const highLogs = logs?.filter((l) => l.severity === "high").length || 0;
  const mediumLogs = logs?.filter((l) => l.severity === "medium").length || 0;
  const lowLogs = logs?.filter((l) => l.severity === "low").length || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all system actions and administrative changes
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Critical"
          value={criticalLogs.toString()}
          description="Requires immediate attention"
          icon={AlertTriangle}
          variant="critical"
        />
        <StatsCard
          title="High"
          value={highLogs.toString()}
          description="Important events"
          icon={Shield}
          variant="high"
        />
        <StatsCard
          title="Medium"
          value={mediumLogs.toString()}
          description="Standard operations"
          icon={Info}
          variant="medium"
        />
        <StatsCard
          title="Low"
          value={lowLogs.toString()}
          description="Routine activities"
          icon={Activity}
          variant="low"
        />
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Recent system and administrative actions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user">User Actions</SelectItem>
                <SelectItem value="workflow">Workflow Actions</SelectItem>
                <SelectItem value="node">Node Actions</SelectItem>
                <SelectItem value="settings">Settings Changes</SelectItem>
                <SelectItem value="billing">Billing Actions</SelectItem>
                <SelectItem value="support">Support Actions</SelectItem>
                <SelectItem value="content">Content Moderation</SelectItem>
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredLogs || filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="text-sm">
                            {log.timestamp
                              ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                              : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{log.performedBy}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={log.performedByRole} />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {log.targetUserId || log.targetResourceId ? (
                              <>
                                <div className="font-medium">
                                  {log.targetResourceType || "User"}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {log.targetUserId?.slice(0, 8) || log.targetResourceId?.slice(0, 8)}
                                  ...
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">System</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={log.severity} />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground font-mono">
                            {log.ipAddress || "N/A"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
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
  variant?: "default" | "critical" | "high" | "medium" | "low";
}) {
  const colors = {
    default: "text-gray-600",
    critical: "text-red-600",
    high: "text-orange-600",
    medium: "text-yellow-600",
    low: "text-blue-600",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colors[variant]}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActionBadge({ action }: { action: AuditAction }) {
  const getActionColor = (action: string) => {
    if (action.includes("deleted") || action.includes("banned")) return "destructive";
    if (action.includes("created")) return "success";
    if (action.includes("updated")) return "default";
    return "outline";
  };

  return (
    <Badge variant={getActionColor(action) as any} className="font-mono text-xs">
      {action}
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, any> = {
    user: "outline",
    support: "secondary",
    moderator: "secondary",
    developer: "default",
    admin: "default",
    super_admin: "destructive",
  };

  return (
    <Badge variant={variants[role] || "outline"} className="text-xs capitalize">
      {role.replace("_", " ")}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, any> = {
    low: "outline",
    medium: "secondary",
    high: "default",
    critical: "destructive",
  };

  return (
    <Badge variant={variants[severity] || "outline"} className="capitalize">
      {severity}
    </Badge>
  );
}
