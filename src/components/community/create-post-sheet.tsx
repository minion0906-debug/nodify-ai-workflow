

"use client";

import React, { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import type { PostCategory } from "@/lib/community-types";
import { categoryIcons, categoryLabels } from "@/lib/community-ui";
import {
  Sparkles,
  HelpCircle,
  Bug,
  Lightbulb,
  MessageSquare,
  Award,
  TrendingUp,
  X,
  Plus,
  Send,
  Bold,
  Italic,
  Heading,
  Link,
  Image,
  Code,
  List,
  ListOrdered,
  Quote,
  Paperclip,
  File,
  Minus,
  CheckSquare,
  Table,
  Square,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Switch } from "../ui/switch";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
const MarkdownComponents = {
  code({ node, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    return match ? (
      <pre className="bg-muted/50 p-3 rounded-md overflow-x-auto">
        <code className={`language-${match[1]}`}>{String(children).replace(/\n$/, '')}</code>
      </pre>
    ) : (
      <code className="bg-muted/50 px-1 py-0.5 rounded-sm" {...props}>
        {children}
      </code>
    );
  },
};

type MarkdownToolbarProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onContentChange: (value: string) => void;
};

function MarkdownToolbar({ textareaRef, onContentChange }: MarkdownToolbarProps) {
  const insert = (prefix: string, suffix = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const value = ta.value;
    const selected = value.slice(start, end);
    const replacement = `${prefix}${selected || ''}${suffix}`;
    const next = value.slice(0, start) + replacement + value.slice(end);
    onContentChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + replacement.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const insertAtLineStart = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const value = ta.value;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onContentChange(next);
    requestAnimationFrame(() => {
      const pos = start + prefix.length;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    });
  };

  return (
    <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
      <Button type="button" variant="ghost" size="icon" onClick={() => insert("**", "**")} title="Bold">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => insert("*", "*")} title="Italic">
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => insert("`", "`")} title="Inline code">
        <Code className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => insert("```\n", "\n```")} title="Code block">
        <Code className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => insert("[text](url)")} title="Link">
        <Link className="h-4 w-4" />
      </Button>
      <div className="mx-1 h-4 w-px bg-border" />
      <Button type="button" variant="ghost" size="icon" onClick={() => insertAtLineStart("## ")} title="Heading">
        <Heading className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => insertAtLineStart("> ")} title="Quote">
        <Quote className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => insertAtLineStart("- ")} title="Bulleted list">
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => insertAtLineStart("1. ")} title="Numbered list">
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );
}


export function CreatePostSheet({ isOpen, onClose, onPostCreated }: CreatePostSheetProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('discussion');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const handleRemoveAttachment = (fileToRemove: File) => {
    setAttachments(prev => prev.filter(f => f !== fileToRemove));
  };


  const handleSubmit = async () => {
    if (!user || !firestore) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a post',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
        const postData: any = {
            authorId: user.uid,
            authorUsername: user.email?.split('@')[0] || `user_${user.uid.substring(0,5)}`,
            authorDisplayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            authorRole: 'member', // In a real app this would be read from a profile
            title: title.trim(),
            content: content.trim(),
            category,
            tags,
            attachments: attachments.map(f => ({ name: f.name, type: f.type, size: f.size })), // In a real app, you'd upload and store URLs
            status: 'published',
            viewsCount: 0,
            likesCount: 0,
            commentsCount: 0,
            isResolved: false,
            isPinned: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        if (user.photoURL) {
            postData.authorAvatar = user.photoURL;
        }

        await addDoc(collection(firestore, 'community_posts'), postData);

      toast({
        title: 'Success!',
        description: 'Your post has been published',
      });

      // Reset form
      setTitle('');
      setContent('');
      setCategory('discussion');
      setTags([]);
      setTagInput('');
      setAttachments([]);
      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0" side="right">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-xl">Create Post</SheetTitle>
          <SheetDescription>
            Share your workflow, ask for help, or start a discussion
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(val) => setCategory(val as PostCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoryLabels) as PostCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        {categoryIcons[cat]}
                        {categoryLabels[cat]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Give your post a descriptive title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 characters
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content</Label>
                <div className="flex items-center gap-2">
                    <Switch
                        id="preview-switch"
                        checked={previewMode === 'preview'}
                        onCheckedChange={(checked) => setPreviewMode(checked ? 'preview' : 'edit')}
                    />
                    <Label htmlFor="preview-switch" className="text-xs">
                        Preview
                    </Label>
                </div>
              </div>
              
              {previewMode === 'edit' ? (
                <>
                  <MarkdownToolbar textareaRef={textareaRef} onContentChange={setContent} />
                  <Textarea
                    id="content"
                    ref={textareaRef}
                    placeholder="Write your post content... (Markdown supported)"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={12}
                    className="resize-none rounded-t-none"
                  />
                </>
              ) : (
                <div className="min-h-[288px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm prose dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {content || "Nothing to preview..."}
                    </ReactMarkdown>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Supports Markdown formatting
              </p>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <Badge key={index} variant="secondary" className="gap-2">
                    <File className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => handleRemoveAttachment(file)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                Attach files
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileChange}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (up to 5)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  disabled={tags.length >= 5}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={tags.length >= 5 || !tagInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>Publishing...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish Post
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
