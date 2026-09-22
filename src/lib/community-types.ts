import { Timestamp } from "firebase/firestore";

/**
 * User roles in the community
 */
export type UserRole = 'member' | 'moderator' | 'admin';

/**
 * Post categories/tags
 */
export type PostCategory =
  | 'showcase'      // Users sharing their workflows
  | 'help'          // Asking for help
  | 'bug-report'    // Reporting bugs
  | 'feature'       // Feature requests
  | 'discussion'    // General discussion
  | 'tutorial'      // Tutorials and guides
  | 'announcement'; // Official announcements

/**
 * Post status
 */
export type PostStatus = 'published' | 'draft' | 'archived' | 'deleted';

/**
 * User profile in community
 */
export type CommunityProfile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  badges: string[];
  reputation: number;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  stats: {
    postsCount: number;
    commentsCount: number;
    helpfulCount: number; // How many times marked as helpful
    solutionsCount: number; // How many solutions provided
  };
};

/**
 * Community post
 */
export type Post = {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  authorRole: UserRole;

  title: string;
  content: string; // Markdown content
  category: PostCategory;
  tags: string[];
  attachments?: {
    name: string;
    type: string;
    size: number;
    url?: string;
  }[];

  status: PostStatus;

  // Engagement
  viewsCount: number;
  likesCount: number;
  commentsCount: number;

  // Resolution (for help/bug posts)
  isResolved: boolean;
  acceptedAnswerId?: string;

  // Pinned posts (by moderators/admins)
  isPinned: boolean;

  // Attached workflow (optional)
  workflowId?: string;
  workflowData?: any; // Workflow JSON for preview

  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  editedAt?: Timestamp | string;
};

/**
 * Comment on a post
 */
export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string;
  authorRole: UserRole;

  content: string; // Markdown content

  // Parent comment for nested replies
  parentCommentId?: string;

  // Engagement
  likesCount: number;

  // Mark as solution/helpful
  isAcceptedAnswer: boolean;
  isHelpful: boolean;
  helpfulCount: number;

  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  editedAt?: Timestamp | string;
};

/**
 * Like/vote on post or comment
 */
export type Like = {
  id: string;
  userId: string;
  targetId: string; // postId or commentId
  targetType: 'post' | 'comment';
  createdAt: Timestamp | string;
};

/**
 * User activity/notification
 */
export type Activity = {
  id: string;
  userId: string; // User who will receive this notification
  actorId: string; // User who performed the action
  actorUsername: string;
  actorDisplayName: string;
  actorAvatar?: string;

  type: 'comment' | 'reply' | 'like' | 'mention' | 'accepted-answer' | 'badge';
  targetId: string; // postId or commentId
  targetType: 'post' | 'comment';

  message: string;
  isRead: boolean;

  createdAt: Timestamp | string;
};

/**
 * Badge/achievement
 */
export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: string; // Description of how to earn it
};

/**
 * Feed filter options
 */
export type FeedFilter = {
  category?: PostCategory;
  tags?: string[];
  sortBy: 'recent' | 'popular' | 'trending' | 'unanswered';
  status?: PostStatus;
};
