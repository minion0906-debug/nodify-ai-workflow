
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


export function AiSettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState({
        aiModel: 'googleai/gemini-2.5-flash',
    });

    const handleSelectChange = (name: string, value: string) => {
        setSettings(prev => ({ ...prev, [name]: value }));
    };

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
            <CardTitle>AI Settings</CardTitle>
            <CardDescription>Configure the language model for AI-powered features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="aiModel">Language Model</Label>
                <Select
                value={settings.aiModel}
                onValueChange={(value) => handleSelectChange('aiModel', value)}
                >
                <SelectTrigger id="aiModel">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="googleai/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="googleai/gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                Select the model to use for features like AI-powered node description generation.
                </p>
            </div>
            <div className="flex justify-end">
                <Button onClick={() => handleSave('AI')}>Save AI Settings</Button>
            </div>
            </CardContent>
        </Card>
    );
}
