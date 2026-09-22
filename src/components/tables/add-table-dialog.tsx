
'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Column, ColumnType } from '@/lib/tables-types';
import { Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

const columnTypes: ColumnType[] = ['string', 'number', 'boolean', 'datetime', 'json'];

type AddTableDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, columns: Column[]) => void;
};

export function AddTableDialog({ isOpen, onClose, onConfirm }: AddTableDialogProps) {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Column[]>([
    { id: 'id', name: 'id', type: 'string', isPrimary: true },
  ]);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<ColumnType>('string');

  useEffect(() => {
    if (isOpen) {
      setTableName('');
      setColumns([{ id: 'id', name: 'id', type: 'string', isPrimary: true }]);
      setNewColumnName('');
      setNewColumnType('string');
    }
  }, [isOpen]);

  const handleAddColumn = () => {
    if (newColumnName.trim() === '') return;
    if (columns.some(c => c.name === newColumnName.trim())) {
        // In a real app, you'd use a toast here
        alert('Column name already exists.');
        return;
    }
    const newColumn: Column = {
      id: `col-${Date.now()}`,
      name: newColumnName.trim(),
      type: newColumnType,
    };
    setColumns(prev => [...prev, newColumn]);
    setNewColumnName('');
    setNewColumnType('string');
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumns(prev => prev.filter(c => c.id !== columnId));
  }

  const handleConfirm = () => {
    if (tableName.trim()) {
      onConfirm(tableName.trim(), columns);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>Create New Table</SheetTitle>
          <SheetDescription>
            Give your new table a name and define its columns.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
                {/* Table Name */}
                <div className="space-y-2">
                    <Label htmlFor="table-name" className="text-base font-semibold">
                        Table Name
                    </Label>
                    <Input
                        id="table-name"
                        placeholder="e.g., Customer List"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        autoFocus
                    />
                </div>

                <Separator />

                {/* Columns */}
                <div className="space-y-4">
                    <h3 className="text-base font-semibold">Columns</h3>
                    {/* Existing Columns */}
                    <div className="space-y-2 rounded-md border p-2">
                        {columns.map(col => (
                            <div key={col.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                <span className="font-mono text-sm flex-1">{col.name}</span>
                                <span className="text-xs uppercase text-muted-foreground px-2 py-1 bg-background rounded-md border">{col.type}</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteColumn(col.id)}
                                    disabled={col.isPrimary}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Add New Column Form */}
                    <div className="p-4 rounded-lg border border-dashed space-y-3">
                         <p className="text-sm font-medium">Add new column</p>
                         <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-1.5">
                                <Label htmlFor="new-col-name" className="text-xs">Name</Label>
                                <Input
                                    id="new-col-name"
                                    placeholder="e.g., first_name"
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="new-col-type" className="text-xs">Type</Label>
                                <Select value={newColumnType} onValueChange={(val: ColumnType) => setNewColumnType(val)}>
                                    <SelectTrigger id="new-col-type" className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {columnTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="outline" size="icon" onClick={handleAddColumn}>
                                <Plus className="h-4 w-4" />
                            </Button>
                         </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
        
        <SheetFooter className="p-4 border-t bg-card">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!tableName.trim() || columns.length === 0}>
            Create Table
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
