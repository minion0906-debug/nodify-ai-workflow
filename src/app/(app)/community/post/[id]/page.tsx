
"use client";

import React, { useState, useEffect, useMemo, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  Eye,
  CheckCircle2,
  Award,
  Send,
  MoreHorizontal,
  LoaderCircle,
  Sparkles,
  HelpCircle,
  Bug,
  Lightbulb,
  TrendingUp,
  Paperclip,
} from "lucide-react";
import { useUser, useDoc, useFirestore, useCollection } from "@/firebase";
import type { Post, Comment, PostCategory } from "@/lib/community-types";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CommentCard } from "@/components/community/comment-card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { doc, collection, query, where, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
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


export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const viewCountedRef = useRef(false);

  const postRef = useMemo(() => {
    if (!firestore || !resolvedParams.id) return null;
    return doc(firestore, 'community_posts', resolvedParams.id);
  }, [firestore, resolvedParams.id]);

  const { data: post, isLoading: isPostLoading } = useDoc<Post>(postRef);
  
  const commentsQuery = useMemo(() => {
      if (!firestore || !resolvedParams.id) return null;
      return query(
          collection(firestore, "community_comments"),
          where("postId", "==", resolvedParams.id)
      )
  }, [firestore, resolvedParams.id]);

  const { data: comments, isLoading: areCommentsLoading } = useCollection<Comment>(commentsQuery);

  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!isPostLoading && post && firestore && post.id && !viewCountedRef.current) {
        viewCountedRef.current = true;
        const postDocRef = doc(firestore, 'community_posts', post.id);
        const newViewsCount = (post.viewsCount || 0) + 1;
        updateDoc(postDocRef, { viewsCount: newViewsCount }).catch(console.error);
    }
  }, [isPostLoading, post, firestore]);


  const handleSubmitComment = async () => {
    if (!user || !firestore) {
      toast({
        title: 'Error',
        description: 'You must be logged in to comment',
        variant: 'destructive',
      });
      return;
    }

    if (!commentContent.trim()) {
      toast({
        title: 'Error',
        description: 'Comment content is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
        const commentData = {
            postId: resolvedParams.id,
            content: commentContent.trim(),
            authorId: user.uid,
            authorUsername: user.email?.split('@')[0] || `user_${user.uid.substring(0,5)}`,
            authorDisplayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            authorAvatar: user.photoURL || undefined,
            authorRole: 'member', // this would be dynamic in a real app
            likesCount: 0,
            isAcceptedAnswer: false,
            isHelpful: false,
            helpfulCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await addDoc(collection(firestore, 'community_comments'), commentData);
        
        toast({
            title: 'Success!',
            description: 'Your comment has been posted',
        });
        setCommentContent('');

    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const sortedComments = useMemo(() => {
    if (!comments) return [];
    return [...comments].sort((a,b) => new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime());
  }, [comments])

  if (isPostLoading || areCommentsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Post not found</h2>
          <p className="text-muted-foreground mb-4">This post may have been deleted or the URL is incorrect.</p>
          <Button onClick={() => router.push('/community')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Button>
        </div>
      </div>
    );
  }

  const createdAt = !post.createdAt
    ? new Date()
    : post.createdAt instanceof Date
    ? post.createdAt
    : typeof post.createdAt === 'string'
    ? new Date(post.createdAt)
    : (post.createdAt as any).toDate();

  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-4 sm:py-8">
        {/* Post Content */}
        <div className="bg-card sm:rounded-xl sm:border mb-6">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Category & Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="outline" className={cn("gap-1.5 text-xs", categoryColors[post.category])}>
                  {categoryIcons[post.category]}
                  {categoryLabels[post.category]}
              </Badge>
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {post.isResolved && (
                <Badge variant="default" className="gap-1 bg-green-600 text-white text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  Solved
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{post.title}</h1>
            
            {/* Author Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.authorAvatar} />
                  <AvatarFallback>
                    {post.authorDisplayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{post.authorDisplayName}</span>
                    {post.authorRole === 'admin' && (
                      <Badge variant="default" className="text-xs gap-1">
                        <Award className="h-3 w-3" />
                        Admin
                      </Badge>
                    )}
                    {post.authorRole === 'moderator' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Award className="h-3 w-3" />
                        Mod
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    @{post.authorUsername} · {timeAgo}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            
            <Separator className="sm:hidden mb-6"/>

            {/* Content */}
            <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base mb-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{post.content}</ReactMarkdown>
            </div>

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </h3>
                <div className="flex flex-wrap gap-2">
                  {post.attachments.map((file, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {file.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <Separator className="my-6" />
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <Button variant="outline" size="sm" className="gap-2">
                <ThumbsUp className="h-4 w-4" />
                <span>{post.likesCount}</span>
              </Button>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                <span>{sortedComments?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{post.viewsCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-card sm:rounded-xl sm:border">
          <div className="p-4 sm:p-6 lg:p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({sortedComments?.length || 0})
            </h2>

            {/* Add Comment */}
            {user && (
              <div className="mb-8">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  rows={4}
                  className="mb-3"
                />
                <div className="flex justify-end">
                  <Button onClick={handleSubmitComment} disabled={isSubmitting || !commentContent.trim()} className="gap-2">
                    <Send className="h-4 w-4" />
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            )}

            {!user && (
              <div className="mb-8 p-4 bg-muted/50 rounded-lg text-center border">
                <p className="text-sm text-muted-foreground">
                  Please log in to post a comment.
                </p>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
              {sortedComments && sortedComments.length > 0 ? (
                sortedComments
                  .filter(c => !c.parentCommentId) // Only top-level comments
                  .map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      postAuthorId={post.authorId}
                      allComments={sortedComments}
                    />
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
