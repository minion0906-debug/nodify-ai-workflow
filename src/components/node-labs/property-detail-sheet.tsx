
'use client';

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import {
  Plus,
  Trash2,
  ArrowLeft,
  CaseSensitive,
  ToyBrick,
  CheckSquare,
  List,
  Code2,
  KeyRound,
  FileCode,
  Save,
  Ban,
  Minus,
  MousePointerClick,
  Check,
  CircleDotDashed,
  AlertCircle,
} from 'lucide-react';
import { Separator } from '../ui/separator';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import type { CustomNodeProperty } from '@/lib/custom-nodes-types';
import { credentialDefinitions } from '@/lib/credentials-definitions';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';

/* ---------------------------------------------
   PROPERTY TYPES (visual cards)
----------------------------------------------*/
const propertyTypes = [
  {
    id: 'string',
    label: 'Text Field',
    icon: CaseSensitive,
    description: 'Single-line text input',
    color: '#4F46E5',
  },
  {
    id: 'number',
    label: 'Number Field',
    icon: ToyBrick,
    description: 'Numeric input with min/max',
    color: '#10B981',
  },
  {
    id: 'boolean',
    label: 'Switch',
    icon: CheckSquare,
    description: 'True/False toggle',
    color: '#F59E0B',
  },
  {
    id: 'options',
    label: 'Dropdown',
    icon: List,
    description: 'Selectable list of choices',
    color: '#EF4444',
  },
  {
    id: 'json',
    label: 'JSON Editor',
    icon: Code2,
    description: 'For structured data',
    color: '#9333EA',
  },
  {
    id: 'credentials',
    label: 'Credential',
    icon: KeyRound,
    description: 'Select a credential type',
    color: '#64748B',
  },
  {
    id: 'javascript',
    label: 'JS Code Editor',
    icon: FileCode,
    description: 'For custom JS scripts',
    color: '#f0db4f',
  },
  {
    id: 'notice',
    label: 'Static Text',
    icon: AlertCircle,
    description: 'Display an info/warning block',
    color: '#0ea5e9'
  },
  {
    id: 'separator',
    label: 'Separator',
    icon: Minus,
    description: 'A visual divider with a label',
    color: '#64748b'
  },
  {
    id: 'button',
    label: 'Button',
    icon: MousePointerClick,
    description: 'Perform a client-side action',
    color: '#14b8a6'
  },
  {
    id: 'checkbox',
    label: 'Checkboxes',
    icon: Check,
    description: 'Multiple selection group',
    color: '#ec4899'
  },
  {
    id: 'radio',
    label: 'Radio Buttons',
    icon: CircleDotDashed,
    description: 'Single selection group',
    color: '#f97316'
  },
] as const;

/* ---------------------------------------------
   DEFAULT PROPERTY STRUCTURE
----------------------------------------------*/
const defaultProperty: Partial<CustomNodeProperty> = {
  name: '',
  displayName: '',
  type: 'string',
  default: '',
  description: '',
  placeholder: '',
  required: false,
  options: [],
  ui: {},
  validation: {},
  behavior: {},
  typeOptions: {},
};

/* ---------------------------------------------
   TYPE SELECTOR COMPONENT
----------------------------------------------*/
const TypeSelector = ({
  onSelect,
  currentType,
}: {
  onSelect: (type: CustomNodeProperty['type']) => void;
  currentType?: CustomNodeProperty['type'];
}) => (
  <div className="grid grid-cols-2 gap-4 p-4">
    {propertyTypes.map((type) => (
      <button
        key={type.id}
        onClick={() => onSelect(type.id as CustomNodeProperty['type'])}
        className={`p-5 rounded-2xl border-2 flex flex-col items-center justify-center text-center shadow-sm transition-all
          ${currentType === type.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/30'}`}
      >
        <type.icon className="h-8 w-8 mb-2" style={{ color: type.color }} />
        <span className="text-sm font-semibold">{type.label}</span>
        <span className="text-xs text-muted-foreground mt-1">{type.description}</span>
      </button>
    ))}
  </div>
);


/* ---------------------------------------------
   MAIN COMPONENT
----------------------------------------------*/
export function PropertyDetailSheet({
  isOpen,
  setIsOpen,
  onSave,
  propertyToEdit,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSave: (data: CustomNodeProperty) => void;
  propertyToEdit: CustomNodeProperty | null;
}) {
  const [formData, setFormData] = useState<Partial<CustomNodeProperty>>(
    defaultProperty
  );
  const [step, setStep] = useState<'select_type' | 'configure'>('select_type');
  const isEditing = !!propertyToEdit;
  const { toast } = useToast();

  /* Load initial data */
  useEffect(() => {
    if (isOpen) {
      if (isEditing && propertyToEdit) {
        setFormData(propertyToEdit);
        setStep('configure');
      } else {
        setFormData(defaultProperty);
        setStep('select_type');
      }
    }
  }, [isOpen, propertyToEdit, isEditing]);

  /* Handlers */
  const handleTypeSelect = (type: CustomNodeProperty['type']) => {
    setFormData((p) => ({
      ...p,
      type,
      options: ['options', 'checkbox', 'radio'].includes(type) ? [] : undefined,
    }));
    setTimeout(() => setStep('configure'), 150);
  };
  

  const handleChange = (k: keyof CustomNodeProperty, v: any) =>
    setFormData((p) => ({ ...p, [k]: v }));

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayName = e.target.value;
    const newName = newDisplayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    
    setFormData(p => ({
        ...p,
        displayName: newDisplayName,
        name: isEditing ? p.name : newName, // Only auto-update name on create
    }));
  };
  
  const addOption = () =>
    handleChange('options', [
      ...(formData.options || []),
      { id: `opt-${Date.now()}`, label: 'Option', value: 'value' },
    ]);
  const removeOption = (i: number) =>
    handleChange(
      'options',
      formData.options?.filter((_, idx) => idx !== i)
    );

  /* Type-specific configuration UI */
  const renderTypeFields = () => {
    switch (formData.type) {
      case 'string':
        return (
          <div className="space-y-2">
            <Label>Mask</Label>
            <Select
              value={formData.ui?.mask || 'none'}
              onValueChange={(v) =>
                setFormData((p) => ({
                  ...p,
                  ui: { ...p.ui, mask: v },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mask" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
            <Label>Placeholder</Label>
            <Input
              value={formData.placeholder ?? ''}
              onChange={(e) => handleChange('placeholder', e.target.value)}
            />
          </div>
        );

      case 'number':
        return (
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Min</Label>
              <Input
                type="number"
                value={formData.validation?.min ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    validation: { ...p.validation, min: e.target.value },
                  }))
                }
              />
            </div>
            <div className="flex-1">
              <Label>Max</Label>
              <Input
                type="number"
                value={formData.validation?.max ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    validation: { ...p.validation, max: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>True Label</Label>
              <Input
                value={formData.ui?.trueLabel ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    ui: { ...p.ui, trueLabel: e.target.value },
                  }))
                }
              />
            </div>
            <div className="flex-1">
              <Label>False Label</Label>
              <Input
                value={formData.ui?.falseLabel ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    ui: { ...p.ui, falseLabel: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        );

      case 'options':
      case 'checkbox':
      case 'radio':
        return (
          <div className="space-y-3 border rounded-lg p-3">
            <div className="flex justify-between items-center">
              <Label>Options</Label>
              <Button size="sm" variant="outline" onClick={addOption}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {(formData.options || []).map((opt, i) => (
              <div key={opt.id || i} className="flex gap-2 items-center">
                <Input
                  value={opt.label}
                  onChange={(e) => {
                    const updated = [...(formData.options || [])];
                    updated[i].label = e.target.value;
                    handleChange('options', updated);
                  }}
                  placeholder="Label"
                />
                <Input
                  value={opt.value}
                  onChange={(e) => {
                    const updated = [...(formData.options || [])];
                    updated[i].value = e.target.value;
                    handleChange('options', updated);
                  }}
                  placeholder="Value"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        );

      case 'json':
        return (
          <div>
            <Label>Default JSON</Label>
            <Textarea
              rows={5}
              value={formData.default?.toString() ?? ''}
              onChange={(e) => handleChange('default', e.target.value)}
              placeholder='{"example":"value"}'
            />
          </div>
        );
      
      case 'credentials':
        return (
            <div className="space-y-2">
                <Label>Credential Type</Label>
                <Select
                    value={formData.default}
                    onValueChange={(val) => handleChange('default', val)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select credential type" />
                    </SelectTrigger>
                    <SelectContent>
                        {credentialDefinitions.map(def => (
                            <SelectItem key={def.id} value={def.id}>
                                {def.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );

        case 'javascript':
          return (
            <div className="space-y-3 border rounded-lg p-3">
               <Label className="flex items-center gap-2 font-semibold">
                  <FileCode className="h-4 w-4" />
                  JavaScript Settings
                </Label>
              <Label>Injected Libraries</Label>
              <Textarea
                rows={3}
                value={formData.typeOptions?.injectedLibraries ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    typeOptions: {
                      ...p.typeOptions,
                      injectedLibraries: e.target.value,
                    },
                  }))
                }
                placeholder="Enter library URLs, one per line (e.g., https://unpkg.com/lodash)"
              />
            </div>
          );
      case 'notice':
        return (
          <div className="space-y-2">
            <Label>Notice Variant</Label>
            <Select
              value={formData.ui?.variant || 'default'}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, ui: { ...p.ui, variant: v } }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="destructive">Destructive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'button':
        return (
          <div className="space-y-2">
             <Label>Button Action</Label>
            <Select
              value={formData.behavior?.action || 'none'}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, behavior: { ...p.behavior, action: v } }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="none">None</SelectItem>
                 <SelectItem value="copyToClipboard">Copy to Clipboard</SelectItem>
              </SelectContent>
            </Select>
            {formData.behavior?.action === 'copyToClipboard' && (
              <>
                <Label>Value to Copy</Label>
                <Input
                  value={formData.behavior?.value ?? ''}
                  onChange={(e) => setFormData((p) => ({ ...p, behavior: { ...p.behavior, value: e.target.value } }))}
                />
              </>
            )}
          </div>
        );
    }
  };

  /* Save */
  const handleSave = () => {
    if (!formData.displayName || !formData.displayName.trim()) {
      toast({ title: 'Validation Error', description: 'Display Name is required.', variant: 'destructive'});
      return;
    }
    if (!formData.name || !formData.name.trim()) {
        toast({ title: 'Validation Error', description: 'Internal Name (ID) is required.', variant: 'destructive'});
        return;
    }
    onSave(formData as CustomNodeProperty);
  };

  /* ---------------------------------------------
     RENDER
  ----------------------------------------------*/
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="p-0 flex flex-col w-full sm:w-[500px]">
        {/* HEADER */}
        <SheetHeader className="p-4 border-b relative">
          {step === 'configure' && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-3"
              onClick={() => setStep('select_type')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <SheetTitle className={step === 'configure' ? 'text-center' : ''}>
            {step === 'select_type'
              ? 'Select Field Type'
              : 'Configure Property'}
          </SheetTitle>
          <SheetDescription className={step === 'configure' ? 'text-center' : ''}>
            {step === 'select_type'
              ? 'Choose the type of field you want to create.'
              : 'Set up field behavior and appearance.'}
          </SheetDescription>
        </SheetHeader>

        {/* BODY */}
        <ScrollArea className="flex-1 p-4">
          <AnimatePresence mode="wait">
            {step === 'select_type' && !isEditing ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
              >
                <TypeSelector
                  onSelect={handleTypeSelect}
                  currentType={formData.type}
                />
              </motion.div>
            ) : (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="space-y-3">
                  <Label>Display Name</Label>
                  <Input
                    value={formData.displayName ?? ''}
                    onChange={handleDisplayNameChange}
                  />

                  <Label>Internal Name (ID)</Label>
                  <Input
                    value={formData.name ?? ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled={isEditing}
                    className={isEditing ? 'disabled:opacity-100 disabled:cursor-not-allowed bg-muted/50' : ''}
                  />

                  {renderTypeFields()}

                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={formData.description ?? ''}
                    onChange={(e) =>
                      handleChange('description', e.target.value)
                    }
                    placeholder="Help text for user"
                  />

                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={!!formData.required}
                      onCheckedChange={(v) => handleChange('required', v)}
                    />
                    <Label>Required</Label>
                  </div>
                </div>

                {/* Preview */}
                <Separator className="my-4" />
                <div>
                  <Label>Live Preview</Label>
                  <div className="border rounded-lg p-3 mt-2 bg-muted/30">
                    {formData.type === 'string' && (
                      <Input
                        placeholder={formData.placeholder || 'Sample text'}
                      />
                    )}
                    {formData.type === 'number' && (
                      <Input type="number" placeholder="0" />
                    )}
                    {formData.type === 'boolean' && (
                      <div className="flex items-center gap-2">
                        <Switch /> <span>Toggle</span>
                      </div>
                    )}
                    {['options', 'radio', 'checkbox'].includes(formData.type || '') && (
                      <div className="space-y-2">
                        {(formData.options || []).map((o, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {formData.type === 'checkbox' && <Checkbox />}
                            {formData.type === 'radio' && <RadioGroup><RadioGroupItem value={o.value} /></RadioGroup>}
                            <Label>{o.label}</Label>
                          </div>
                        ))}
                         {formData.type === 'options' && (
                            <Select>
                                <SelectTrigger>
                                <SelectValue placeholder="Select option" />
                                </SelectTrigger>
                                <SelectContent>
                                {(formData.options || []).map((o, i) => (
                                    <SelectItem key={o.id || i} value={o.value}>
                                    {o.label}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                         )}
                      </div>
                    )}
                    {formData.type === 'json' && (
                      <Textarea
                        rows={3}
                        value={formData.default?.toString() ?? ''}
                        readOnly
                      />
                    )}
                     {formData.type === 'notice' && (
                        <div className={`p-3 rounded-md border ${formData.ui?.variant === 'destructive' ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-border bg-card'}`}>
                          {formData.displayName}
                        </div>
                     )}
                     {formData.type === 'separator' && (
                       <div className="relative py-2">
                          <Separator />
                          {formData.displayName && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-muted/30 text-xs text-muted-foreground">{formData.displayName}</div>}
                       </div>
                     )}
                     {formData.type === 'button' && (
                        <Button variant="secondary" className="w-full">{formData.displayName}</Button>
                     )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* FOOTER */}
        {step === 'configure' && (
          <SheetFooter className="p-4 border-t bg-card sticky bottom-0 flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              <Ban className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

    