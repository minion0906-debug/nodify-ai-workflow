
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';

export function WorkspaceSettings() {
    const { toast } = useToast();

    const [settings, setSettings] = useState({
        instanceName: 'My Nodify Instance',
        pruningEnabled: true,
        pruneMaxAge: 30, // days
      });
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSwitchChange = (name: string, checked: boolean) => {
        setSettings(prev => ({ ...prev, [name]: checked }));
    }
    
    const handleSave = (section: string) => {
        console.log(`Saving ${section} settings:`, settings);
        toast({
            title: 'Settings Saved',
            description: `Your ${section.toLowerCase()} settings have been updated.`,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Workspace</CardTitle>
                <CardDescription>Manage general workspace settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="instanceName">Workspace Name</Label>
                  <Input
                    id="instanceName"
                    name="instanceName"
                    value={settings.instanceName}
                    onChange={handleInputChange}
                  />
                   <p className="text-xs text-muted-foreground">
                    This is your personal workspace, where all your workflows, credentials, and data are stored securely.
                  </p>
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="pruning-enabled">Data Pruning</Label>
                            <p className="text-xs text-muted-foreground">Automatically delete old execution data.</p>
                        </div>
                        <Switch
                            id="pruning-enabled"
                            checked={settings.pruningEnabled}
                            onCheckedChange={(checked) => handleSwitchChange('pruningEnabled', checked)}
                        />
                    </div>

                    {settings.pruningEnabled && (
                    <div className="space-y-2">
                        <Label htmlFor="prune-max-age">Max Execution Age (days)</Label>
                        <Input
                            id="prune-max-age"
                            type="number"
                            value={settings.pruneMaxAge}
                            onChange={(e) => setSettings(prev => ({ ...prev, pruneMaxAge: parseInt(e.target.value, 10) }))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Executions older than this will be deleted.
                        </p>
                    </div>
                    )}
                </div>
                <div className="flex justify-end">
                    <Button onClick={() => handleSave('Workspace')}>Save Workspace Settings</Button>
                </div>
            </CardContent>
        </Card>
    );
}
