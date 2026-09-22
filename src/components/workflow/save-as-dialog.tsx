
'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SaveAsDialog({
  isOpen,
  onClose,
  onSave,
  currentName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  currentName: string;
}) {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(`${currentName} (Copy)`);
    }
  }, [isOpen, currentName]);

  const handleSave = () => {
    if (newName.trim()) {
      onSave(newName.trim());
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Workflow As</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a new name for this copy of the workflow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="new-workflow-name" className="sr-only">
            New Workflow Name
          </Label>
          <Input
            id="new-workflow-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={!newName.trim()}>
            Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
