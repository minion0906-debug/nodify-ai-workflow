"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function AdminNodesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Custom Nodes</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve custom nodes submitted by users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Node Submissions
          </CardTitle>
          <CardDescription>
            Manage custom node approvals, reviews, and marketplace submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Custom Nodes Management Coming Soon</p>
              <p className="text-sm">This feature is under development</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
