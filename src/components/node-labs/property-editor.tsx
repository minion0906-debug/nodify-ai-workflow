'use client';

import React, { useState } from 'react';
import type { CustomNodeProperty } from '@/lib/custom-nodes-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react';
import { PropertyDetailSheet } from './property-detail-sheet';
import { Reorder } from 'framer-motion';

type PropertyEditorProps = {
  properties: CustomNodeProperty[];
  onChange: (properties: CustomNodeProperty[]) => void;
};

export function PropertyEditor({ properties, onChange }: PropertyEditorProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingPropertyIndex, setEditingPropertyIndex] = useState<number | null>(null);

  const handleAddProperty = () => {
    setEditingPropertyIndex(null);
    setIsSheetOpen(true);
  };

  const handleEditProperty = (index: number) => {
    setEditingPropertyIndex(index);
    setIsSheetOpen(true);
  };

  const deleteProperty = (index: number) => {
    onChange(properties.filter((_, i) => i !== index));
  };
  
  const handleSaveProperty = (propertyData: CustomNodeProperty) => {
    let newProperties: CustomNodeProperty[];
    if (editingPropertyIndex !== null) {
      newProperties = [...properties];
      newProperties[editingPropertyIndex] = propertyData;
    } else {
      newProperties = [...properties, propertyData];
    }
    onChange(newProperties);
    setIsSheetOpen(false);
    setEditingPropertyIndex(null);
  }

  const propertyToEdit = editingPropertyIndex !== null ? properties[editingPropertyIndex] : null;

  return (
    <>
      <Card className="border-none shadow-none">
        <CardHeader className="p-0 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Node Properties</CardTitle>
              <CardDescription>Define the settings fields for this node.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddProperty}>
              <Plus className="h-4 w-4 mr-2" /> Add Property
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No properties defined.</p>
          ) : (
            <div className="border rounded-lg">
                <Reorder.Group axis="y" values={properties} onReorder={onChange} className="divide-y divide-border">
                    {properties.map((prop, index) => (
                         <Reorder.Item key={prop.name} value={prop} className="flex items-center p-3 hover:bg-secondary/50">
                            <div className="cursor-grab text-muted-foreground pr-3">
                                <GripVertical className="h-5 w-5" />
                            </div>
                            <div className='flex-1'>
                                <p className="font-semibold text-sm">{prop.displayName}</p>
                                <p className="text-xs text-muted-foreground">{prop.name} <span className="text-primary/50 font-mono">({prop.type})</span></p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProperty(index)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteProperty(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                         </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>
          )}
        </CardContent>
      </Card>
      <PropertyDetailSheet
        isOpen={isSheetOpen}
        setIsOpen={setIsSheetOpen}
        onSave={handleSaveProperty}
        propertyToEdit={propertyToEdit}
      />
    </>
  );
}
