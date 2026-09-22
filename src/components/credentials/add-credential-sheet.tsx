'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { credentialDefinitions } from '@/lib/credentials-definitions';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { KeyRound } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { Credential, CredentialDefinition } from '@/lib/credentials-types';
import { CredentialForm } from './credential-form';

type AddCredentialSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddCredential: (credential: Omit<Credential, 'id' | 'createdAt'>) => void;
  onEditCredential: (credential: Credential) => void;
  credentialToEdit: Credential | null;
};

export function AddCredentialSheet({ 
  isOpen, 
  setIsOpen, 
  onAddCredential, 
  onEditCredential,
  credentialToEdit
}: AddCredentialSheetProps) {
  const [step, setStep] = useState<'select_type' | 'fill_form' | 'loading'>('select_type');
  const [selectedCredential, setSelectedCredential] = useState<CredentialDefinition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isEditing = !!credentialToEdit;

  // Helper to get Lucide icon component by name
  const getCredentialIcon = (iconName?: string) => {
    if (!iconName) return KeyRound;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || KeyRound;
  };

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setStep('loading');
        const definition = credentialDefinitions.find(
          d => d.name === credentialToEdit.type || d.id === credentialToEdit.type
        );
        if (definition) {
          setSelectedCredential(definition);
          setStep('fill_form');
        }
      } else {
        setStep('select_type');
        setSelectedCredential(null);
        setSearchTerm('');
      }
    }
  }, [isOpen, isEditing, credentialToEdit]);


  const filteredDefinitions = credentialDefinitions.filter(def =>
    def.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCredential = (credential: CredentialDefinition) => {
    setSelectedCredential(credential);
    setStep('fill_form');
  };

  const handleBack = () => {
    setStep('select_type');
    setSelectedCredential(null);
  };

  const handleSave = (data: { name: string; [key: string]: any }) => {
    if (!selectedCredential) return;

    if (isEditing) {
        const updatedCredential = {
            ...credentialToEdit,
            name: data.name,
            data: Object.keys(data)
                .filter(key => key !== 'name')
                .reduce((obj, key) => {
                    obj[key] = data[key];
                    return obj;
                }, {} as Record<string, any>),
        };
        onEditCredential(updatedCredential);
    } else {
        const newCredential = {
            name: data.name,
            // Store the credential type by ID to match filters (e.g., 'openAi')
            type: selectedCredential.id,
            data: Object.keys(data)
              .filter(key => key !== 'name')
              .reduce((obj, key) => {
                obj[key] = data[key];
                return obj;
              }, {} as Record<string, any>),
          };
      
          onAddCredential(newCredential);
    }
    
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setTimeout(() => {
            setStep('select_type');
            setSelectedCredential(null);
            setSearchTerm('');
        }, 300);
    }
    setIsOpen(open);
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:w-[420px] flex flex-col p-0" side="right">
        {step === 'loading' && (
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Loading...</SheetTitle>
            </SheetHeader>
        )}
        {!isEditing && step === 'select_type' && (
          <>
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Add Credential</SheetTitle>
              <SheetDescription>Select the type of credential you want to create.</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <Input
                placeholder="Search credentials..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-2 pb-4">
                {filteredDefinitions.map(def => (
                  <button
                    key={def.id}
                    onClick={() => handleSelectCredential(def)}
                    className="w-full text-left"
                  >
                    <div className="p-3 rounded-lg bg-card hover:bg-secondary transition-all flex gap-4 items-center">
                      <div className="p-2 rounded-md bg-muted">
                        <KeyRound className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{def.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{def.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {step === 'fill_form' && selectedCredential && (
          <>
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  {(() => {
                    const Icon = getCredentialIcon(selectedCredential.icon);
                    return <Icon className="h-5 w-5 text-muted-foreground" />;
                  })()}
                </div>
                <div>
                  <SheetTitle>
                    {isEditing ? 'Edit' : 'Add'} {selectedCredential.name}
                  </SheetTitle>
                  <SheetDescription>
                    {isEditing
                      ? `Editing: ${credentialToEdit?.name || selectedCredential.name}`
                      : `Fill in the details for your new ${selectedCredential.name} credential.`}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <CredentialForm 
                credentialDefinition={selectedCredential}
                onSave={handleSave}
                onBack={!isEditing ? handleBack : undefined}
                onCancel={() => setIsOpen(false)}
                isEditing={isEditing}
                initialData={credentialToEdit}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
