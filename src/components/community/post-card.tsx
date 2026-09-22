
"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  ThumbsUp,
  Eye,
  CheckCircle2,
  Pin,
  Sparkles,
  HelpCircle,
  Bug,
  Lightbulb,
  Award,
  TrendingUp,
} from "lucide-react";
import type { Post, PostCategory } from "@/lib/community-types";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const categoryIcons: Record<PostCategory, React.ReactNode> = {
  showcase: <Sparkles className="h-3.5 w-3.5" />,
  help: <HelpCircle className="h-3.5 w-3.5" />,
  'bug-report': <Bug className="h-3.5 w-3.5" />,
  feature: <Lightbulb className="h-3.5 w-3.5" />,
  discussion: <MessageSquare className="h-3.5 w-3.5" />,
  tutorial: <Award className="h-3.5 w-3.5" />,
  announcement: <TrendingUp className="h-3.5 w-3.5" />,
};

const categoryLabels: Record<PostCategory, string> = {
  showcase: 'Showcase',
  help: 'Help',
  'bug-report': 'Bug Report',
  feature: 'Feature Request',
  discussion: 'Discussion',
  tutorial: 'Tutorial',
  announcement: 'Announcement',
};

const categoryColors: Record<PostCategory, string> = {
  showcase: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  help: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'bug-report': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  feature: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  discussion: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  tutorial: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  announcement: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
};

interface PostCardProps {
  post: Post;
  isPinned?: boolean;
}

export function PostCard({ post, isPinned }: PostCardProps) {
  const createdAt = !post.createdAt
    ? new Date()
    : post.createdAt instanceof Date
    ? post.createdAt
    : typeof post.createdAt === 'string'
    ? new Date(post.createdAt)
    : (post.createdAt as any).toDate();

  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  return (
    <Link href={`/community/post/${post.id}`}>
      <Card className={`p-4 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer group ${isPinned ? 'border-primary/50 bg-primary/5' : 'bg-card border'} rounded-2xl`}>
        {isPinned && (
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="gap-1 border-primary/50 text-xs rounded-full">
              <Pin className="h-3 w-3" />
              Pinned
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-background">
                <AvatarImage src={post.authorAvatar} />
                <AvatarFallback className="text-xs">
                    {post.authorDisplayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm line-clamp-1 block">
                    {post.authorDisplayName}
                    </span>
                    <p className="text-xs text-muted-foreground truncate">
                        @{post.authorUsername}
                    </p>
                </div>
            </div>
            <div className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</div>
        </div>

        <h3 className="text-base font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {post.title}
        </h3>
        
        <div className="prose prose-sm dark:prose-invert max-w-none mb-4 line-clamp-2 text-muted-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className={`gap-1.5 text-xs rounded-full ${categoryColors[post.category]}`}>
                {categoryIcons[post.category]}
                {categoryLabels[post.category]}
            </Badge>
            {post.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs rounded-full">
                #{tag}
              </Badge>
            ))}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <ThumbsUp className="h-4 w-4" />
            <span className="text-xs font-medium">{post.likesCount}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium">{post.commentsCount}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-medium">{post.viewsCount}</span>
          </div>
          {post.isResolved && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 ml-auto">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium text-xs">Solved</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
