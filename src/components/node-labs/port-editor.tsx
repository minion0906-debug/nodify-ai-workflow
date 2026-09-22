
'use client';

import React, { useState, useMemo } from 'react';
import type { CustomNodePort } from '@/lib/custom-nodes-types';
import type { NodeShape } from '@/lib/types';
import { Button } from '../ui/button';
import { Plus, Trash2, ChevronDown, AlertCircle, Grid3x3 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  getAllowedPositions,
  isValidPosition,
  isValidSlot,
  getMaxSlotsForPosition,
  autoAssignSlots,
  validatePorts,
} from '@/lib/slot-system';
import { SlotGridSelector } from './slot-grid-selector';

type PortEditorProps = {
  title: string;
  ports: CustomNodePort[];
  onChange: (ports: CustomNodePort[]) => void;
  shape: NodeShape;
  portType: 'inputs' | 'outputs';
};

const portPositions: CustomNodePort['position'][] = ['top', 'bottom', 'left', 'right'];

export function PortEditor({ title, ports, onChange, shape, portType }: PortEditorProps) {
  const [selectedPortIndex, setSelectedPortIndex] = useState<number | null>(null);
  const allowedPositions = getAllowedPositions(portType);

  const handlePortChange = (index: number, field: keyof CustomNodePort, value: any) => {
    const newPorts = [...ports];
    newPorts[index] = { ...newPorts[index], [field]: value };
    onChange(newPorts);
  };

  const addPort = () => {
    const newPortId = `port-${Date.now()}`;
    const defaultPosition = allowedPositions[0]; // First allowed position
    const maxSlots = getMaxSlotsForPosition(shape, defaultPosition);

    // Find first available slot
    const usedSlots = new Set(
      ports.filter(p => p.position === defaultPosition).map(p => p.slot)
    );
    let defaultSlot = 1;
    for (let i = 1; i <= maxSlots; i++) {
      if (!usedSlots.has(i)) {
        defaultSlot = i;
        break;
      }
    }

    onChange([
      ...ports,
      {
        id: newPortId,
        label: 'New Port',
        position: defaultPosition,
        slot: defaultSlot,
      },
    ]);
  };

  const deletePort = (index: number) => {
    if (selectedPortIndex === index) {
      setSelectedPortIndex(null);
    }
    onChange(ports.filter((_, i) => i !== index));
  };

  // Validate ports
  const validationErrors = validatePorts(ports, shape, portType);

  // Build map of used slots for the grid selector
  const usedSlots = useMemo(() => {
    const map = new Map<string, string>();
    ports.forEach(port => {
      const key = `${port.position}:${port.slot}`;
      map.set(key, port.id);
    });
    return map;
  }, [ports]);

  const handleSlotSelect = (position: 'top' | 'bottom' | 'left' | 'right', slot: number) => {
    if (selectedPortIndex === null) return;

    handlePortChange(selectedPortIndex, 'position', position);
    handlePortChange(selectedPortIndex, 'slot', slot);
  };

  return (
    <div>
      <div className="flex flex-row items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button size="sm" variant="outline" onClick={addPort}>
          <Plus className="h-4 w-4 mr-2" /> Add Port
        </Button>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">Validation Errors:</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Port List</TabsTrigger>
          <TabsTrigger value="visual">
            <Grid3x3 className="h-4 w-4 mr-2" />
            Visual Grid
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="space-y-3">
            {ports.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No ports defined.</p>}
        {ports.map((port, index) => (
          <Collapsible key={index} className="space-y-2 p-3 rounded-lg bg-muted/50 border group" defaultOpen={false}>
            <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer flex-1">
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        <span className="font-semibold text-sm">{port.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">({port.id})</span>
                    </div>
                </CollapsibleTrigger>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => deletePort(index)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            
            <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-2 gap-y-3 pt-2">
                    <div className="space-y-1">
                        <Label htmlFor={`port-id-${index}`} className="text-xs">ID</Label>
                        <Input id={`port-id-${index}`} value={port.id} onChange={(e) => handlePortChange(index, 'id', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`port-label-${index}`} className="text-xs">Label</Label>
                        <Input id={`port-label-${index}`} value={port.label} onChange={(e) => handlePortChange(index, 'label', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`port-position-${index}`} className="text-xs">
                          Position
                          {!isValidPosition(portType, port.position) && (
                            <span className="ml-1 text-destructive text-xs">⚠ Invalid</span>
                          )}
                        </Label>
                        <Select value={port.position} onValueChange={(val: CustomNodePort['position']) => handlePortChange(index, 'position', val)}>
                            <SelectTrigger
                              id={`port-position-${index}`}
                              className={!isValidPosition(portType, port.position) ? 'border-destructive' : ''}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {portPositions.map(pos => {
                                  const isAllowed = allowedPositions.includes(pos);
                                  return (
                                    <SelectItem
                                      key={pos}
                                      value={pos}
                                      className="capitalize"
                                      disabled={!isAllowed}
                                    >
                                      {pos} {!isAllowed && '(not allowed)'}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`port-slot-${index}`} className="text-xs">
                          Slot
                          {!isValidSlot(shape, port.position, port.slot) && (
                            <span className="ml-1 text-destructive text-xs">⚠ Invalid</span>
                          )}
                        </Label>
                        <Select value={port.slot?.toString() || '1'} onValueChange={(val) => handlePortChange(index, 'slot', parseInt(val))}>
                            <SelectTrigger
                              id={`port-slot-${index}`}
                              className={!isValidSlot(shape, port.position, port.slot) ? 'border-destructive' : ''}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: getMaxSlotsForPosition(shape, port.position) }, (_, i) => i + 1).map(slotNum => {
                                  const slotKey = `${port.position}:${slotNum}`;
                                  const isOccupied = usedSlots.has(slotKey) && usedSlots.get(slotKey) !== port.id;
                                  return (
                                    <SelectItem
                                      key={slotNum}
                                      value={slotNum.toString()}
                                      disabled={isOccupied}
                                    >
                                      Slot {slotNum} {isOccupied && '(occupied)'}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-y-3 pt-3">
                    <div className="space-y-1">
                        <Label htmlFor={`port-description-${index}`} className="text-xs">Description (Optional)</Label>
                        <Textarea
                          id={`port-description-${index}`}
                          value={port.description || ''}
                          onChange={(e) => handlePortChange(index, 'description', e.target.value)}
                          placeholder="Describe what this port is for..."
                          className="resize-none h-16"
                        />
                    </div>
                </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
          </div>
        </TabsContent>

        <TabsContent value="visual" className="mt-4">
          <div className="space-y-4">
            {ports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No ports defined. Add a port to start configuring it visually.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Select Port to Configure</Label>
                  <Select
                    value={selectedPortIndex?.toString() || ''}
                    onValueChange={(val) => setSelectedPortIndex(val ? parseInt(val) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a port to configure..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ports.map((port, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {port.label} ({port.position} - Slot {port.slot})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPortIndex !== null && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="text-sm font-medium mb-4">
                      Configuring: <span className="text-primary">{ports[selectedPortIndex].label}</span>
                    </div>
                    <SlotGridSelector
                      shape={shape}
                      portType={portType}
                      selectedPort={ports[selectedPortIndex]}
                      onSlotSelect={handleSlotSelect}
                      usedSlots={usedSlots}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
