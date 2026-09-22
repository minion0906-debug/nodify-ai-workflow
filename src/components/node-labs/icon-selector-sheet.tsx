'use client';

import React, { useState, useMemo, ComponentType } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, icons as lucideIcons, CircleDot } from 'lucide-react';
import iconTags from 'lucide-static/tags.json';

const iconNames = Object.keys(iconTags);

const ICONS_PER_PAGE = 100;

type IconSelectorSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSelectIcon: (iconName: string) => void;
  onUploadIcon?: (publicPath: string) => void;
};

// Utility to convert kebab-case to PascalCase
// e.g. "arrow-left" -> "ArrowLeft"
const toPascalCase = (str: string) => {
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

const Icon = ({ name }: { name: string }) => {
    const PascalCaseName = toPascalCase(name);
    const LucideIcon = (lucideIcons as Record<string, ComponentType<any>>)[PascalCaseName] || CircleDot;
    return <LucideIcon className="h-6 w-6" />;
};

export function IconSelectorSheet({ isOpen, setIsOpen, onSelectIcon, onUploadIcon }: IconSelectorSheetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filteredIcons = useMemo(() => {
    if (!searchTerm) {
      return iconNames;
    }
    return iconNames.filter((name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);
  
  // Reset page to 1 when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredIcons.length / ICONS_PER_PAGE);
  
  const currentIcons = useMemo(() => {
      const startIndex = (currentPage - 1) * ICONS_PER_PAGE;
      const endIndex = startIndex + ICONS_PER_PAGE;
      return filteredIcons.slice(startIndex, endIndex);
  }, [filteredIcons, currentPage]);


  const handleSelect = (iconName: string) => {
    onSelectIcon(iconName);
    setIsOpen(false);
  };
  
  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state on close
      setSearchTerm('');
      setCurrentPage(1);
      setUploadError(null);
    }
    setIsOpen(open);
  }

  const handleFileUpload = async (file: File) => {
    if (!file || !onUploadIcon) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('filename', file.name.replace(/\s+/g, '-').toLowerCase());
      const res = await fetch('/api/assets/upload-node-icon', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const json = await res.json();
      onUploadIcon(json.path);
      setIsOpen(false);
    } catch (e: any) {
      setUploadError(e?.message || 'Failed to upload icon');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:w-[500px] flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Select an Icon</SheetTitle>
          <SheetDescription>Browse and choose an icon for your node.</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <Input
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="flex-1 px-4">
          {currentIcons.length === 0 ? (
             <div className="text-center p-8 text-muted-foreground">
                No icons found for '{searchTerm}'
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 pb-4">
              {currentIcons.map((name) => (
                <button
                  key={name}
                  onClick={() => handleSelect(name)}
                  className="flex flex-col items-center justify-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors aspect-square"
                  title={name}
                >
                  <Icon name={name} />
                  <span className="text-xs truncate w-full">{name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium mb-2">Or upload a custom image</p>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                disabled={isUploading}
              />
              {isUploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
            </div>
            {uploadError && <p className="text-xs text-destructive mt-2">{uploadError}</p>}
            <p className="text-xs text-muted-foreground mt-1">PNG/SVG/JPG. Stored under /assets/images/nodes/</p>
          </div>
        </ScrollArea>
        {totalPages > 1 && (
            <SheetFooter className="p-2 border-t flex-row justify-between items-center">
                <Button variant="outline" onClick={goToPreviousPage} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </span>
                <Button variant="outline" onClick={goToNextPage} disabled={currentPage === totalPages}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
            </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
