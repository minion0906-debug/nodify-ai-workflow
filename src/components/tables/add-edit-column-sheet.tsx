
'use client';

import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ColumnForm } from './column-form';
import type { Column } from '@/lib/tables-types';

type AddEditColumnSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (columnData: Omit<Column, 'id'> | Column) => void;
  columnToEdit: Column | null;
};

export function AddEditColumnSheet({ isOpen, setIsOpen, onSave, columnToEdit }: AddEditColumnSheetProps) {
  const [formData, setFormData] = useState<Partial<Column>>({});
  
  const isEditing = !!columnToEdit;
  
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setFormData(columnToEdit);
      } else {
        setFormData({ name: '', type: 'string', isPrimary: false });
      }
    }
  }, [isOpen, columnToEdit, isEditing]);

  const handleSaveClick = () => {
    onSave(formData as Column);
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{isEditing ? 'Edit Column' : 'Add New Column'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the properties for this column.' : 'Define the properties for the new column.'}
          </SheetDescription>
        </SheetHeader>
        <ColumnForm formData={formData} setFormData={setFormData} />
        <SheetFooter className="p-4 border-t bg-card">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick}>Save Column</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
