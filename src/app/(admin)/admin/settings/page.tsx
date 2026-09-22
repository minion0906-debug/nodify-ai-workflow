"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Database, Mail, Shield, Globe } from "lucide-react";
import { initializeFirebase } from "@/firebase";
import { getDoc, doc } from "firebase/firestore";

export default function AdminSettingsPage() {
  const [dbStatus, setDbStatus] = useState("Checking...");

  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        const { firestore } = initializeFirebase();
        // Try to get a document to check the connection
        await getDoc(doc(firestore, "_check/status"));
        setDbStatus("Connected");
      } catch (error) {
        // This will catch permission errors if the _check/status doc doesn't exist
        // or if the rules don't allow access, which still means the connection is alive.
        if (error.code === 'permission-denied' || error.code === 'not-found') {
          setDbStatus("Connected");
        } else {
          console.error("Error connecting to database:", error);
          setDbStatus("Disconnected");
        }
      }
    };

    checkDbStatus();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure platform-wide settings and preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Settings
            </CardTitle>
            <CardDescription>
              Configure database connections and backups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Connection Status</span>
                <span className={`text-sm ${dbStatus === "Connected" ? "text-green-600" : "text-red-600"}`}>{dbStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Last Backup</span>
                <span className="text-sm text-muted-foreground">2 hours ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </CardTitle>
            <CardDescription>
              Configure SMTP and email notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">SMTP Status</span>
                <span className="text-sm text-green-600">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Daily Limit</span>
                <span className="text-sm text-muted-foreground">10,000 emails</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Manage authentication and security policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">2FA Enforcement</span>
                <span className="text-sm text-muted-foreground">Enabled</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Session Timeout</span>
                <span className="text-sm text-muted-foreground">30 minutes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              API Settings
            </CardTitle>
            <CardDescription>
              Configure API rate limits and webhooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Rate Limit</span>
                <span className="text-sm text-muted-foreground">1000/hour</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active Webhooks</span>
                <span className="text-sm text-muted-foreground">24</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Configuration
          </CardTitle>
          <CardDescription>
            Additional system settings and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Advanced Settings Coming Soon</p>
              <p className="text-sm">Additional configuration options are under development</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
