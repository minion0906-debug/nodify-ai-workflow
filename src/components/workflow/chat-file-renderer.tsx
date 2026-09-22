"use client";

import React from 'react';
import { FileIcon, Download, FileText, FileImage, FileVideo, FileAudio, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ChatFile {
  id?: string;
  name: string;
  type: string;
  size?: number;
  url: string;
}

interface ChatFileRendererProps {
  files: ChatFile[];
  primaryColor?: string;
}

export function ChatFileRenderer({ files, primaryColor = '#8B5CF6' }: ChatFileRendererProps) {
  if (!files || files.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImage;
    if (type.startsWith('video/')) return FileVideo;
    if (type.startsWith('audio/')) return FileAudio;
    if (type.includes('pdf')) return FileText;
    if (type.includes('text/')) return FileText;
    return File;
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isVideo = (type: string) => type.startsWith('video/');
  const isAudio = (type: string) => type.startsWith('audio/');

  return (
    <div className="mt-2 space-y-2">
      {files.map((file, index) => {
        const Icon = getFileIcon(file.type);

        // Render image inline
        if (isImage(file.type)) {
          return (
            <div key={index} className="rounded-lg overflow-hidden border max-w-sm">
              <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="p-2 bg-background/50 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                  <span className="text-xs truncate">{file.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  asChild
                >
                  <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          );
        }

        // Render video inline
        if (isVideo(file.type)) {
          return (
            <div key={index} className="rounded-lg overflow-hidden border max-w-sm">
              <video controls className="w-full bg-black">
                <source src={file.url} type={file.type} />
                Your browser does not support the video tag.
              </video>
              <div className="p-2 bg-background/50 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                  <span className="text-xs truncate">{file.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  asChild
                >
                  <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          );
        }

        // Render audio inline
        if (isAudio(file.type)) {
          return (
            <div key={index} className="rounded-lg border p-2 max-w-sm">
              <audio controls className="w-full mb-2">
                <source src={file.url} type={file.type} />
                Your browser does not support the audio tag.
              </audio>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                  <span className="text-xs truncate">{file.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  asChild
                >
                  <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          );
        }

        // Render other files as download buttons
        return (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors max-w-sm"
          >
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Icon className="h-5 w-5" style={{ color: primaryColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              {file.size && (
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0"
              asChild
            >
              <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
