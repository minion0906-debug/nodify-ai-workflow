
'use client';

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { Column, TableRowData } from '@/lib/tables-types';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

type AddRowSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  columns: Column[];
  onSave: (rowData: TableRowData | Omit<TableRowData, 'id'>) => void;
  rowToEdit: TableRowData | null;
};

export function AddRowSheet({ isOpen, setIsOpen, columns, onSave, rowToEdit }: AddRowSheetProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { toast } = useToast();
  const { user } = useUser();
  const isEditing = !!rowToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && rowToEdit) {
        setFormData(rowToEdit);
      } else {
        const initialData: Record<string, any> = {};
        columns.forEach(col => {
          initialData[col.name] = col.defaultValue ?? (col.type === 'boolean' ? false : '');
        });
        if (user) {
          initialData['ownerId'] = user.uid;
        }
        setFormData(initialData);
      }
    }
  }, [isOpen, columns, rowToEdit, isEditing, user]);

  const handleValueChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = () => {
    const requiredColumns = columns;
    const missingField = requiredColumns.find(c => formData[c.name] === '' || formData[c.name] === undefined);
    
    if (missingField && missingField.name !== 'id') { // Don't check for ID, it's auto-generated
      toast({
        title: "Missing Field",
        description: `Please fill out the '${missingField.name}' field.`,
        variant: "destructive",
      });
      return;
    }

    onSave(formData);
  };
  
  const title = isEditing ? 'Edit Row' : 'Add New Row';
  const description = isEditing 
    ? 'Update the data for this row.'
    : 'Fill in the data for the new row.';
    
  const visibleColumns = columns.filter(c => !c.isPrimary);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-4">
            {visibleColumns.map(col => (
              <div key={col.id} className="space-y-2">
                <Label htmlFor={col.name} className="capitalize">{col.name}</Label>
                {col.type === 'string' && (
                  <Input
                    id={col.name}
                    value={formData[col.name] || ''}
                    onChange={e => handleValueChange(col.name, e.target.value)}
                    disabled={col.isPrimary && !isEditing}
                  />
                )}
                {col.type === 'number' && (
                  <Input
                    id={col.name}
                    type="number"
                    value={formData[col.name] || ''}
                    onChange={e => handleValueChange(col.name, parseFloat(e.target.value))}
                    disabled={col.isPrimary && !isEditing}
                  />
                )}
                {col.type === 'boolean' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                        id={col.name}
                        checked={formData[col.name] || false}
                        onCheckedChange={checked => handleValueChange(col.name, checked)}
                    />
                    <label htmlFor={col.name} className="text-sm">
                        {formData[col.name] ? 'True' : 'False'}
                    </label>
                  </div>
                )}
                {col.type === 'datetime' && (
                    <Input
                        id={col.name}
                        type="datetime-local"
                        value={formData[col.name] || ''}
                        onChange={e => handleValueChange(col.name, e.target.value)}
                        disabled={col.isPrimary && !isEditing}
                    />
                )}
                 {col.type === 'json' && (
                    <Textarea
                        id={col.name}
                        rows={4}
                        value={formData[col.name] || ''}
                        onChange={e => handleValueChange(col.name, e.target.value)}
                        placeholder={`{ "key": "value" }`}
                        disabled={col.isPrimary && !isEditing}
                    />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="p-4 border-t bg-card">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick}>Save Row</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
