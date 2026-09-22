'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { Credential, CredentialDefinition, CredentialProperty } from '@/lib/credentials-types';
import { credentialDefinitions } from '@/lib/credentials-definitions';

type CredentialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (credentialId: string) => void;
  credentialType?: string; // If specified, shows form directly for this type
  editingCredential?: Credential | null; // If editing an existing credential
};

// Helper to get Lucide icon component by name
const getCredentialIcon = (iconName?: string) => {
  if (!iconName) return KeyRound;
  const Icon = (LucideIcons as any)[iconName];
  return Icon || KeyRound;
};

const renderProperty = (
  property: CredentialProperty,
  value: any,
  handleValueChange: (name: string, value: any) => void
) => {
  const { name, displayName, type, placeholder, options } = property;

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
      {type === 'number' && (
        <Input
          id={name}
          name={name}
          type="number"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={e => handleValueChange(name, parseFloat(e.target.value))}
        />
      )}
      {type === 'options' && options && (
        <select
          id={name}
          name={name}
          value={value ?? ''}
          onChange={e => handleValueChange(name, e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export function CredentialModal({
  isOpen,
  onClose,
  onSuccess,
  credentialType,
  editingCredential,
}: CredentialModalProps) {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [selectedType, setSelectedType] = useState<CredentialDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // If credentialType is specified, go directly to form
  useEffect(() => {
    if (credentialType && isOpen) {
      const def = credentialDefinitions.find(d => d.id === credentialType);
      if (def) {
        setSelectedType(def);
        setStep('form');
      }
    }
  }, [credentialType, isOpen]);

  // If editing, load the credential data
  useEffect(() => {
    if (editingCredential && isOpen) {
      const def = credentialDefinitions.find(d => d.id === editingCredential.type);
      if (def) {
        setSelectedType(def);
        setStep('form');
        setFormData({ name: editingCredential.name, ...editingCredential.data });
      }
    }
  }, [editingCredential, isOpen]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setSelectedType(null);
      setFormData({});
    }
  }, [isOpen]);

  // Initialize form data when type is selected
  useEffect(() => {
    if (selectedType && !editingCredential) {
      const initialFormState: Record<string, any> = { name: '' };
      selectedType.properties.forEach(prop => {
        initialFormState[prop.name] = prop.default ?? '';
      });
      setFormData(initialFormState);
    }
  }, [selectedType, editingCredential]);

  const handleValueChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectType = (def: CredentialDefinition) => {
    setSelectedType(def);
    setStep('form');
  };

  const handleBack = () => {
    if (credentialType || editingCredential) {
      // If we came from a specific type or editing, just close
      onClose();
    } else {
      // Otherwise, go back to type selection
      setStep('select');
      setSelectedType(null);
      setFormData({});
    }
  };

  const handleTest = async () => {
    if (!selectedType || !selectedType.testable) {
      toast({
        title: 'Error',
        description: 'This credential type cannot be tested',
        variant: 'destructive',
      });
      return;
    }

    // Check if required fields are filled
    const missingFields = selectedType.properties
      .filter(prop => prop.required && !formData[prop.name])
      .map(prop => prop.displayName);

    if (missingFields.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);

    try {
      const { name, ...credentialData } = formData;

      const response = await fetch('/api/credentials/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType.id,
          data: credentialData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: result.message || 'Credentials are valid and working.',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.message || 'Unable to verify credentials.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing credential:', error);
      toast({
        title: 'Test Failed',
        description: 'Unable to test credentials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !selectedType || !user || !firestore) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const { name, ...credentialData } = formData;

      if (editingCredential) {
        // Update existing credential
        const credRef = doc(firestore, 'users', user.uid, 'credentials', editingCredential.id);
        await updateDoc(credRef, {
          name,
          data: credentialData,
        });

        toast({
          title: 'Credential Updated',
          description: `${name} has been updated successfully.`,
        });
      } else {
        // Create new credential
        const credRef = await addDoc(collection(firestore, 'users', user.uid, 'credentials'), {
          name,
          type: selectedType.id,
          data: credentialData,
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Credential Created',
          description: `${name} has been created successfully.`,
        });

        if (onSuccess) {
          onSuccess(credRef.id);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving credential:', error);
      toast({
        title: 'Error',
        description: 'Failed to save credential. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col p-0">
        {step === 'select' ? (
          <>
            {/* Type Selection */}
            <DialogHeader className="px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <KeyRound className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <DialogTitle>Select Credential Type</DialogTitle>
                  <DialogDescription className="text-xs mt-1">
                    Choose the type of credential you want to create
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="grid gap-2">
                {credentialDefinitions.map(def => {
                  const Icon = getCredentialIcon(def.icon);
                  return (
                    <button
                      key={def.id}
                      onClick={() => handleSelectType(def)}
                      className="flex items-start gap-3 p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="p-2 rounded-md bg-primary/10 flex-shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{def.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {def.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Credential Form */}
            <DialogHeader className="px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="p-2 rounded-md bg-muted">
                  {(() => {
                    const Icon = getCredentialIcon(selectedType?.icon);
                    return <Icon className="h-5 w-5 text-muted-foreground" />;
                  })()}
                </div>
                <div>
                  <DialogTitle>
                    {editingCredential ? 'Edit' : 'Add'} {selectedType?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-1">
                    {editingCredential
                      ? `Editing: ${editingCredential.name || selectedType?.name}`
                      : `Fill in the details for your new ${selectedType?.name} credential.`}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {/* Name field */}
                <div className="space-y-2">
                  <Label htmlFor="credential-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="credential-name"
                    placeholder="My awesome credential"
                    value={formData.name ?? ''}
                    onChange={e => handleValueChange('name', e.target.value)}
                  />
                </div>

                {/* Dynamic properties */}
                {selectedType?.properties.map(prop =>
                  renderProperty(prop, formData[prop.name], handleValueChange)
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t">
              <div className="flex gap-2 w-full justify-between">
                <Button variant="outline" onClick={handleBack} disabled={isSaving || isTesting}>
                  Cancel
                </Button>
                <div className="flex gap-2">
                  {selectedType?.testable && (
                    <Button
                      variant="secondary"
                      onClick={handleTest}
                      disabled={isSaving || isTesting}
                    >
                      {isTesting ? (
                        'Testing...'
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Test
                        </>
                      )}
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={isSaving || isTesting}>
                    {isSaving ? 'Saving...' : editingCredential ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
