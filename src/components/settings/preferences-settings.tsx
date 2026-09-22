'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserData } from '@/hooks/use-user-data';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Save } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';

export function PreferencesSettings() {
  const { user: authUser } = useUser();
  const { user: userData, isLoading } = useUserData();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [workflowNotifications, setWorkflowNotifications] = useState(true);
  const [errorNotifications, setErrorNotifications] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Workflow preferences
  const [defaultWorkflowStatus, setDefaultWorkflowStatus] = useState<'draft' | 'active'>('draft');
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);

  // UI preferences
  const [showTutorials, setShowTutorials] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Load preferences from Firestore
  useEffect(() => {
    if (userData?.preferences) {
      const prefs = userData.preferences;
      setEmailNotifications(prefs.emailNotifications ?? true);
      setWorkflowNotifications(prefs.workflowNotifications ?? true);
      setErrorNotifications(prefs.errorNotifications ?? true);
      setWeeklyReport(prefs.weeklyReport ?? false);
      setMarketingEmails(prefs.marketingEmails ?? false);
      setDefaultWorkflowStatus(prefs.defaultWorkflowStatus || 'draft');
      setAutoSaveInterval(prefs.autoSaveInterval || 30);
      setShowTutorials(prefs.showTutorials ?? true);
      setCompactMode(prefs.compactMode ?? false);
    }
  }, [userData]);

  const handleSave = async () => {
    if (!authUser || !firestore) return;

    setIsSaving(true);

    try {
      const userRef = doc(firestore, 'users', authUser.uid);
      await updateDoc(userRef, {
        'preferences.emailNotifications': emailNotifications,
        'preferences.workflowNotifications': workflowNotifications,
        'preferences.errorNotifications': errorNotifications,
        'preferences.weeklyReport': weeklyReport,
        'preferences.marketingEmails': marketingEmails,
        'preferences.defaultWorkflowStatus': defaultWorkflowStatus,
        'preferences.autoSaveInterval': autoSaveInterval,
        'preferences.showTutorials': showTutorials,
        'preferences.compactMode': compactMode,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Preferences Saved',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose what email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="workflow-notifications">Workflow Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when workflows complete
              </p>
            </div>
            <Switch
              id="workflow-notifications"
              checked={workflowNotifications}
              onCheckedChange={setWorkflowNotifications}
              disabled={!emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="error-notifications">Error Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when workflows fail
              </p>
            </div>
            <Switch
              id="error-notifications"
              checked={errorNotifications}
              onCheckedChange={setErrorNotifications}
              disabled={!emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-report">Weekly Reports</Label>
              <p className="text-xs text-muted-foreground">
                Receive weekly usage reports
              </p>
            </div>
            <Switch
              id="weekly-report"
              checked={weeklyReport}
              onCheckedChange={setWeeklyReport}
              disabled={!emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails">Marketing Emails</Label>
              <p className="text-xs text-muted-foreground">
                Receive updates about new features
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={marketingEmails}
              onCheckedChange={setMarketingEmails}
              disabled={!emailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Workflow Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Preferences</CardTitle>
          <CardDescription>
            Customize your workflow editor experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-status">Default Workflow Status</Label>
            <Select
              value={defaultWorkflowStatus}
              onValueChange={(value: 'draft' | 'active') => setDefaultWorkflowStatus(value)}
            >
              <SelectTrigger id="default-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              New workflows will be created with this status
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto-save">Auto-Save Interval (seconds)</Label>
            <Select
              value={autoSaveInterval.toString()}
              onValueChange={(value) => setAutoSaveInterval(parseInt(value))}
            >
              <SelectTrigger id="auto-save">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often to auto-save your workflows
            </p>
          </div>
        </CardContent>
      </Card>

      {/* UI Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Interface Preferences</CardTitle>
          <CardDescription>
            Customize your user interface experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-tutorials">Show Tutorials</Label>
              <p className="text-xs text-muted-foreground">
                Display helpful tutorials and tips
              </p>
            </div>
            <Switch
              id="show-tutorials"
              checked={showTutorials}
              onCheckedChange={setShowTutorials}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-xs text-muted-foreground">
                Use a more compact interface layout
              </p>
            </div>
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
