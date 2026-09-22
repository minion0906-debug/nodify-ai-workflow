import type { PostCategory } from "@/lib/community-types";
import type { ReactNode } from "react";
import { Sparkles, HelpCircle, Bug, Lightbulb, MessageSquare, Award, TrendingUp } from "lucide-react";

export const categoryIcons: Record<PostCategory, ReactNode> = {
  showcase: <Sparkles className="h-3.5 w-3.5" />,
  help: <HelpCircle className="h-3.5 w-3.5" />,
  'bug-report': <Bug className="h-3.5 w-3.5" />,
  feature: <Lightbulb className="h-3.5 w-3.5" />,
  discussion: <MessageSquare className="h-3.5 w-3.5" />,
  tutorial: <Award className="h-3.5 w-3.5" />,
  announcement: <TrendingUp className="h-3.5 w-3.5" />,
};

export const categoryLabels: Record<PostCategory, string> = {
  showcase: 'Showcase',
  help: 'Help',
  'bug-report': 'Bug Report',
  feature: 'Feature Request',
  discussion: 'Discussion',
  tutorial: 'Tutorial',
  announcement: 'Announcement',
};

export const categoryColors: Record<PostCategory, string> = {
  showcase: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  help: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'bug-report': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  feature: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  discussion: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  tutorial: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  announcement: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
};

