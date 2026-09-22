
'use client';

import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { NodeData } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

const GroupSticker = ({ data, selected, id }: NodeProps<NodeData & { onUpdate: (id: string, config: any) => void; }>) => {
  const [note, setNote] = useState(data.config.note || '');
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    backgroundColor = 'rgba(139, 131, 226, 0.1)',
    borderColor = 'rgba(139, 131, 226, 0.5)',
    borderRadius = 16,
    textColor = '#ffffff',
    fontSize = 14,
    textAlign = 'center'
  } = data.config;

  useEffect(() => {
    if (data.onUpdate && note !== data.config.note) {
        data.onUpdate(id, { ...data.config, note });
    }
  }, [note, data.config, id, data.onUpdate]);


  useEffect(() => {
    setNote(data.config.note || '');
  }, [data.config.note]);

  useEffect(() => {
    if (isEditing) {
      textAreaRef.current?.focus();
      textAreaRef.current?.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    if (!selected) {
      setIsEditing(false);
    }
  }, [selected]);


  const style: CSSProperties = {
    backgroundColor: backgroundColor,
    borderColor: borderColor,
    borderRadius: `${borderRadius}px`,
    borderWidth: 2,
    borderStyle: 'solid',
    color: textColor,
    fontSize: `${fontSize}px`,
    textAlign: textAlign as any,
  };
  
  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  
  return (
    <div 
        className={cn(
            "w-full h-full relative rounded-lg shadow-lg p-4 flex items-center justify-center group"
        )}
        onDoubleClick={handleDoubleClick}
        style={style}
    >
        <NodeResizer 
            isVisible={selected} 
            minWidth={100} 
            minHeight={100} 
            lineClassName="border-transparent"
            handleClassName="react-flow__resize-handle"
        />

        <div className="drag-handle absolute top-2 left-2 cursor-move opacity-0 transition-opacity group-hover:opacity-100 p-2" style={{ zIndex: 10 }}>
            <GripVertical className="h-5 w-5 text-white/50"/>
        </div>

       {isEditing ? (
            <textarea
                ref={textAreaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="sticky-note-textarea"
                style={{
                    backgroundColor: 'transparent',
                    color: 'inherit',
                    fontSize: 'inherit',
                    textAlign: 'inherit',
                    lineHeight: '1.5'
                }}
            />
        ) : (
            <div className="prose prose-invert prose-sm w-full h-full overflow-auto flex flex-col justify-center items-center">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note || '### Group Title\n\nDouble-click to edit...'}</ReactMarkdown>
            </div>
        )}
    </div>
  );
};

export default React.memo(GroupSticker);
