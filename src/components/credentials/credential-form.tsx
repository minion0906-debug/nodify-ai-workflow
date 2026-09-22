'use client';

import React, { useState, useEffect } from 'react';
import type { Credential, CredentialDefinition, CredentialProperty } from '@/lib/credentials-types';
import { SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type CredentialFormProps = {
  credentialDefinition: CredentialDefinition;
  onSave: (data: Record<string, any>) => void;
  onBack?: () => void;
  onCancel: () => void;
  isEditing: boolean;
  initialData: Credential | null;
};

const renderProperty = (
  property: CredentialProperty,
  value: any,
  handleValueChange: (name: string, value: any) => void
) => {
  const { name, displayName, type, placeholder } = property;

  return (
    <div key={name} className="space-y-2">
      <Label htmlFor={name}>{displayName}</Label>
      {type === 'string' && (
        <Input
          id={name}
          name={name}
          type="text"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={e => handleValueChange(name, e.target.value)}
        />
      )}
      {type === 'password' && (
        <Input
            id={name}
            name={name}
            type="password"
            value={value ?? ''}
            placeholder={placeholder}
            onChange={e => handleValueChange(name, e.target.value)}
        />
      )}
    </div>
  );
};

export function CredentialForm({ credentialDefinition, onSave, onBack, onCancel, isEditing, initialData }: CredentialFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({ name: initialData.name, ...initialData.data });
    } else {
      const initialFormState: Record<string, any> = { name: '' };
      credentialDefinition.properties.forEach(prop => {
        initialFormState[prop.name] = prop.default ?? '';
      });
      setFormData(initialFormState);
    }
  }, [isEditing, initialData, credentialDefinition]);

  const handleValueChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = () => {
    if (!formData.name) {
        toast({
            title: "Name is required",
            description: "Please provide a name for this credential.",
            variant: "destructive",
        });
        return;
    }
    onSave(formData);
  };

  return (
    <>
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="credential-name">Name</Label>
            <Input
              id="credential-name"
              name="credential-name"
              placeholder="My awesome credential"
              value={formData.name ?? ''}
              onChange={e => handleValueChange('name', e.target.value)}
            />
          </div>
          {credentialDefinition.properties.map(prop =>
            renderProperty(prop, formData[prop.name], handleValueChange)
          )}
        </div>
      </ScrollArea>
      <SheetFooter className="p-4 border-t bg-card">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSaveClick}>Save</Button>
      </SheetFooter>
    </>
  );
}
