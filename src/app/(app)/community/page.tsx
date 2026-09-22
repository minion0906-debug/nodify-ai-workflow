
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  TrendingUp,
  Clock,
  HelpCircle,
  Lightbulb,
  Bug,
  Sparkles,
  Plus,
  Search,
  Filter,
  Flame,
  Award,
  DatabaseZap,
  LoaderCircle,
  SlidersHorizontal,
  X,
  ChevronDown,
} from "lucide-react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import type { Post, PostCategory } from "@/lib/community-types";
import { CreatePostSheet } from "@/components/community/create-post-sheet";
import { PostCard } from "@/components/community/post-card";
import { CommunityStats } from "@/components/community/community-stats";
import { collection, query, where, orderBy, setDoc, doc, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { mockProfiles, mockComments } from "@/lib/community-data";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const categoryIcons: Record<PostCategory, React.ReactNode> = {
  showcase: <Sparkles className="h-4 w-4" />,
  help: <HelpCircle className="h-4 w-4" />,
  'bug-report': <Bug className="h-4 w-4" />,
  feature: <Lightbulb className="h-4 w-4" />,
  discussion: <MessageSquare className="h-4 w-4" />,
  tutorial: <Award className="h-4 w-4" />,
  announcement: <TrendingUp className="h-4 w-4" />,
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

export default function CommunityPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const postsQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "community_posts");
  }, [firestore]);

  const { data: allPosts, isLoading } = useCollection<Post>(postsQuery);

  const posts = useMemo(() => {
    if (!allPosts) return [];
    return allPosts.filter(p => p.status === 'published');
  }, [allPosts]);

  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const filteredPosts = React.useMemo(() => {
    if (!posts) return [];

    let sortedPosts = [...posts];

    // Sort
    if (sortBy === 'popular') {
        sortedPosts.sort((a, b) => b.likesCount - a.likesCount);
    } else if (sortBy === 'recent') {
        sortedPosts.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
    }

    // Filter by category
    let categorizedPosts = sortedPosts;
    if (selectedCategory !== 'all') {
        categorizedPosts = sortedPosts.filter(p => p.category === selectedCategory);
    }

    // Filter by search
    if (!searchQuery.trim()) return categorizedPosts;
    const query = searchQuery.toLowerCase();
    return categorizedPosts.filter(post =>
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }, [posts, searchQuery, selectedCategory, sortBy]);

  if (!user && !isLoading) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-20 h-full px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-inner">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Join the Community</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
                Please sign in to view and create posts.
            </p>
        </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Mobile Header - Native Style */}
      <header className="flex-shrink-0 lg:hidden bg-background/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50 overflow-x-hidden">
        {/* Top Bar */}
        <div className="px-4 py-3 safe-top">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-md flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold tracking-tight truncate">Community</h1>
                <p className="text-xs text-muted-foreground leading-none">
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-xl hover:bg-accent/50 flex-shrink-0"
              onClick={() => setIsFilterSheetOpen(true)}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </div>
  
          {/* Search Bar & Actions */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchActive(true)}
                onBlur={() => setIsSearchActive(false)}
                className={cn(
                  "pl-10 pr-10 h-11 text-sm rounded-xl bg-muted/30 border-0 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all",
                  isSearchActive && "bg-card border shadow-sm"
                )}
              />
              {searchQuery && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg hover:bg-muted"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 rounded-xl bg-muted/30 hover:bg-accent/50 flex-shrink-0"
                    onClick={() => setIsCreatePostOpen(true)}
                    aria-label="Create new post"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create Post</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Category Selector - Grid Layout (No Scroll) */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-4 gap-2">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className={cn(
                "rounded-xl h-10 px-2 text-xs font-semibold transition-all w-full flex-shrink-0",
                selectedCategory === 'all' 
                  ? "shadow-md shadow-primary/20" 
                  : "border-border/40 hover:border-border hover:bg-accent/50"
              )}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === 'showcase' ? 'default' : 'outline'}
              className={cn(
                "rounded-xl h-10 px-1.5 text-xs font-semibold transition-all w-full flex flex-col items-center justify-center gap-0.5 flex-shrink-0",
                selectedCategory === 'showcase' 
                  ? "shadow-md shadow-primary/20" 
                  : "border-border/40 hover:border-border hover:bg-accent/50"
              )}
              onClick={() => setSelectedCategory('showcase')}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="truncate text-[10px]">Showcase</span>
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === 'help' ? 'default' : 'outline'}
              className={cn(
                "rounded-xl h-10 px-1.5 text-xs font-semibold transition-all w-full flex flex-col items-center justify-center gap-0.5 flex-shrink-0",
                selectedCategory === 'help' 
                  ? "shadow-md shadow-primary/20" 
                  : "border-border/40 hover:border-border hover:bg-accent/50"
              )}
              onClick={() => setSelectedCategory('help')}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="truncate text-[10px]">Help</span>
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === 'bug-report' ? 'default' : 'outline'}
              className={cn(
                "rounded-xl h-10 px-1.5 text-xs font-semibold transition-all w-full flex flex-col items-center justify-center gap-0.5 flex-shrink-0",
                selectedCategory === 'bug-report' 
                  ? "shadow-md shadow-primary/20" 
                  : "border-border/40 hover:border-border hover:bg-accent/50"
              )}
              onClick={() => setSelectedCategory('bug-report')}
            >
              <Bug className="h-3.5 w-3.5" />
              <span className="truncate text-[10px]">Bug</span>
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === 'feature' ? 'default' : 'outline'}
              className={cn(
                "rounded-xl h-10 px-1.5 text-xs font-semibold transition-all w-full flex flex-col items-center justify-center gap-0.5 flex-shrink-0",
                selectedCategory === 'feature' 
                  ? "shadow-md shadow-primary/20" 
                  : "border-border/40 hover:border-border hover:bg-accent/50"
              )}
              onClick={() => setSelectedCategory('feature')}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="truncate text-[10px]">Feature</span>
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === 'discussion' ? 'default' : 'outline'}
              className={cn(
                "rounded-xl h-10 px-1.5 text-xs font-semibold transition-all w-full flex flex-col items-center justify-center gap-0.5 flex-shrink-0",
                selectedCategory === 'discussion' 
                  ? "shadow-md shadow-primary/20" 
                  : "border-border/40 hover:border-border hover:bg-accent/50"
              )}
              onClick={() => setSelectedCategory('discussion')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="truncate text-[10px]">Talk</span>
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === 'tutorial' ? 'default' : 'outline'}
              className={cn(
                "rounded-xl h-10 px-1.5 text-xs font-semibold transition-all w-full flex flex-col items-center justify-center gap-0.5 flex-shrink-0",
                selectedCategory === 'tutorial' 
                  ? "shadow-md shadow-primary/20" 
                  : "border-border/40 hover:border-border hover:bg-accent/50"
              )}
              onClick={() => setSelectedCategory('tutorial')}
            >
              <Award className="h-3.5 w-3.5" />
              <span className="truncate text-[10px]">Tutorial</span>
            </Button>
            <Button
              size="sm"
              variant={selectedCategory === 'announcement' ? 'default' : 'outline'}
              className={cn(
                "rounded-xl h-10 px-1.5 text-xs font-semibold transition-all w-full flex flex-col items-center justify-center gap-0.5 flex-shrink-0",
                selectedCategory === 'announcement' 
                  ? "shadow-md shadow-primary/20" 
                  : "border-border/40 hover:border-border hover:bg-accent/50"
              )}
              onClick={() => setSelectedCategory('announcement')}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="truncate text-[10px]">News</span>
            </Button>
          </div>
        </div>
      </header>
  
      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="w-full gap-6 pr-6 pl-0 py-6 flex flex-1 overflow-hidden">
          {/* Sidebar Desktop */}
          <aside className="pl-4 w-80 space-y-4 flex-shrink-0 overflow-y-auto">
            {/* Header Card */}
            <div className="card-native">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
                    <MessageSquare className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">Community</h1>
                    <p className="text-xs text-muted-foreground">{filteredPosts.length} posts</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl shadow-md"
                  onClick={() => setIsCreatePostOpen(true)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
            </div>
    
            {/* Categories Card */}
            <div className="card-native">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4" />
                Categories
              </h3>
              <div className="space-y-1">
                <Button
                  size="sm"
                  variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                  className="w-full justify-start h-9 rounded-lg"
                  onClick={() => setSelectedCategory('all')}
                >
                  All Posts
                </Button>
                {(Object.keys(categoryLabels) as PostCategory[]).map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? 'secondary' : 'ghost'}
                    className="w-full justify-start h-9 gap-2 rounded-lg"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {categoryIcons[category]}
                    {categoryLabels[category]}
                  </Button>
                ))}
              </div>
            </div>
    
            {/* Sort Card */}
            <div className="card-native">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Sort By
              </h3>
              <div className="space-y-1">
                <Button
                  size="sm"
                  variant={sortBy === 'recent' ? 'secondary' : 'ghost'}
                  className="w-full justify-start h-9 rounded-lg"
                  onClick={() => setSortBy('recent')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Recent
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === 'popular' ? 'secondary' : 'ghost'}
                  className="w-full justify-start h-9 rounded-lg"
                  onClick={() => setSortBy('popular')}
                >
                  <Flame className="h-4 w-4 mr-2" />
                  Popular
                </Button>
              </div>
            </div>
    
            {/* Stats Card */}
            <CommunityStats />
          </aside>
    
          {/* Main Feed Desktop */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center text-center py-20 h-full">
                <LoaderCircle className="h-12 w-12 text-primary animate-spin mb-4" />
                <h3 className="text-base font-semibold">Loading Posts...</h3>
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                      {searchQuery
                        ? 'Try adjusting your search or filters'
                        : 'Be the first to create a post!'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setIsCreatePostOpen(true)} className="rounded-full shadow-lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Post
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredPosts
                    .filter((p) => !p.isPinned)
                    .map((post) => <PostCard key={post.id} post={post} />)
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Feed */}
      <main className="flex-1 overflow-y-auto lg:hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center py-16 h-full px-4">
            <LoaderCircle className="h-11 w-11 text-primary animate-spin mb-3" />
            <h3 className="text-base font-semibold">Loading Posts...</h3>
            <p className="text-xs text-muted-foreground mt-1">Fetching community content</p>
          </div>
        ) : (
          <div className="px-4 pb-20 pt-3 safe-bottom">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-bold mb-2">No posts found</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto px-4">
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'Be the first to share something!'}
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => setIsCreatePostOpen(true)} 
                    className="rounded-full shadow-md h-11 px-6 text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts
                  .filter((p) => !p.isPinned)
                  .map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            )}
          </div>
        )}
      </main>
  
      {/* Filter Sheet - Mobile Only */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-background border-t border-border/50 backdrop-blur-xl shadow-2xl h-auto max-h-[80dvh] overflow-y-auto pb-6">
          <SheetHeader className="text-left pb-4 border-b border-border/50 px-1">
            <SheetTitle className="text-xl font-bold">Filters & Options</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 px-1 py-5">
            {/* Sort Section */}
            <div>
              <h3 className="font-semibold mb-3 text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Sort By
              </h3>
              <div className="space-y-2.5">
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  className={cn(
                    "w-full justify-start h-14 rounded-xl text-sm",
                    sortBy === 'recent' && "shadow-md"
                  )}
                  onClick={() => {
                    setSortBy('recent');
                    setIsFilterSheetOpen(false);
                  }}
                >
                  <Clock className="h-5 w-5 mr-3" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm">Recent</div>
                    <div className="text-xs text-muted-foreground">Newest posts first</div>
                  </div>
                </Button>
                <Button
                  variant={sortBy === 'popular' ? 'default' : 'outline'}
                  className={cn(
                    "w-full justify-start h-14 rounded-xl text-sm",
                    sortBy === 'popular' && "shadow-md"
                  )}
                  onClick={() => {
                    setSortBy('popular');
                    setIsFilterSheetOpen(false);
                  }}
                >
                  <Flame className="h-5 w-5 mr-3" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm">Popular</div>
                    <div className="text-xs text-muted-foreground">Most liked posts</div>
                  </div>
                </Button>
              </div>
            </div>
  
            {/* Stats Section */}
            <div className="pt-2">
              <h3 className="font-semibold mb-3 text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Award className="h-3.5 w-3.5" />
                Community Stats
              </h3>
              <CommunityStats />
            </div>
          </div>
        </SheetContent>
      </Sheet>
  
      {/* Create Post Sheet */}
      <CreatePostSheet
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => {}}
      />
    </div>
  );
}

    
