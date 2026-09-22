
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import type { Column, ColumnType } from '@/lib/tables-types';

const columnTypes: ColumnType[] = ['string', 'number', 'boolean', 'datetime', 'json'];

type ColumnFormProps = {
  formData: Partial<Column>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Column>>>;
};

export function ColumnForm({ formData, setFormData }: ColumnFormProps) {
  const handleValueChange = (name: keyof Column, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <ScrollArea className="flex-1 px-4 py-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="column-name">Column Name</Label>
          <Input
            id="column-name"
            placeholder="e.g., user_id, first_name"
            value={formData.name ?? ''}
            onChange={e => handleValueChange('name', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="column-type">Column Type</Label>
          <Select
            value={formData.type ?? 'string'}
            onValueChange={(value: ColumnType) => handleValueChange('type', value)}
          >
            <SelectTrigger id="column-type">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {columnTypes.map(type => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2 pt-2">
            <Switch
                id="is-primary"
                checked={formData.isPrimary ?? false}
                onCheckedChange={(checked) => handleValueChange('isPrimary', checked)}
            />
            <Label htmlFor="is-primary" className="cursor-pointer">
                Primary Key
            </Label>
        </div>

      </div>
    </ScrollArea>
  );
}
