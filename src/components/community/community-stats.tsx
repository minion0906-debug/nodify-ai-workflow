
"use client";

import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Users, MessageSquare, TrendingUp, Award } from "lucide-react";
import { mockPosts, mockProfiles, mockComments } from "@/lib/community-data";

export function CommunityStats() {
  const stats = useMemo(() => {
    return {
      totalMembers: mockProfiles.length,
      totalPosts: mockPosts.length,
      totalComments: mockComments.length,
      solvedPosts: mockPosts.filter(p => p.isResolved).length,
    };
  }, []);

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Community Stats
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Members</span>
          </div>
          <span className="font-semibold">{stats.totalMembers.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>Posts</span>
          </div>
          <span className="font-semibold">{stats.totalPosts.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>Comments</span>
          </div>
          <span className="font-semibold">{stats.totalComments.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="h-4 w-4" />
            <span>Solved</span>
          </div>
          <span className="font-semibold text-green-600">{stats.solvedPosts.toLocaleString()}</span>
        </div>
      </div>
    </Card>
  );
}
