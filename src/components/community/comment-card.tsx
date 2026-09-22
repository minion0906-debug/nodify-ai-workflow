
"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  Award,
  Send,
  MoreHorizontal,
} from "lucide-react";
import type { Comment } from "@/lib/community-types";
import { formatDistanceToNow } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import type { CommunityProfile } from "@/lib/community-types";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";

interface CommentCardProps {
  comment: Comment;
  postAuthorId: string;
  allComments: Comment[];
  isReply?: boolean;
}

export function CommentCard({ comment, postAuthorId, allComments, isReply }: CommentCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createdAt = !comment.createdAt
    ? new Date()
    : comment.createdAt instanceof Date
    ? comment.createdAt
    : typeof comment.createdAt === 'string'
    ? new Date(comment.createdAt)
    : (comment.createdAt as any).toDate();

  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  // Get replies to this comment
  const replies = allComments.filter(c => c.parentCommentId === comment.id);

  const handleSubmitReply = async () => {
    if (!user || !firestore) {
      toast({
        title: 'Error',
        description: 'You must be logged in to reply',
        variant: 'destructive',
      });
      return;
    }

    if (!replyContent.trim()) {
      toast({
        title: 'Error',
        description: 'Reply content is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const profileRef = doc(firestore, 'community_profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      const profile = profileSnap.exists()
        ? profileSnap.data() as CommunityProfile
        : {
            username: user.email?.split('@')[0] || 'user',
            displayName: user.displayName || 'Anonymous',
            avatar: user.photoURL,
            role: 'member' as const,
          };

      const replyData: Omit<Comment, 'id'> = {
        postId: comment.postId,
        parentCommentId: comment.id,
        authorId: user.uid,
        authorUsername: profile.username,
        authorDisplayName: profile.displayName,
        authorAvatar: profile.avatar,
        authorRole: profile.role,
        content: replyContent.trim(),
        likesCount: 0,
        isAcceptedAnswer: false,
        isHelpful: false,
        helpfulCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'community_comments'), replyData);

      toast({
        title: 'Success!',
        description: 'Your reply has been posted',
      });

      setReplyContent('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error creating reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to post reply. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn(isReply && "pl-4 sm:pl-8")}>
      <div className="flex gap-3 sm:gap-4">
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
          <AvatarImage src={comment.authorAvatar} />
          <AvatarFallback>
            {comment.authorDisplayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-semibold text-sm">{comment.authorDisplayName}</span>
            {comment.authorId === postAuthorId && (
              <Badge variant="outline" className="text-xs">
                Author
              </Badge>
            )}
            {comment.isAcceptedAnswer && (
              <Badge variant="default" className="text-xs gap-1 bg-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Solution
              </Badge>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              · {timeAgo}
            </span>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none mb-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.content}</ReactMarkdown>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 text-muted-foreground hover:text-primary">
              <ThumbsUp className="h-3.5 w-3.5" />
              {comment.likesCount > 0 && <span className="text-xs">{comment.likesCount}</span>}
            </Button>
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 h-8 px-2 text-muted-foreground hover:text-primary"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs">Reply</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {showReplyForm && (
            <div className="mt-4">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={3}
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="gap-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmitting ? 'Posting...' : 'Post Reply'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <div className="mt-4 space-y-4 border-l-2 border-border/50">
              {replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  postAuthorId={postAuthorId}
                  allComments={allComments}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
