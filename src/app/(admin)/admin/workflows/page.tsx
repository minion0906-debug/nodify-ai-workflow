"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow } from "lucide-react";

export default function AdminWorkflowsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflows Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all workflows across the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            All Workflows
          </CardTitle>
          <CardDescription>
            Monitor workflow executions, permissions, and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Workflows Management Coming Soon</p>
              <p className="text-sm">This feature is under development</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
