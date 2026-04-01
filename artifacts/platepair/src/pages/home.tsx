import { useState } from "react";
import { Link } from "wouter";
import { useGetFeed, useGetFeedSummary } from "@workspace/api-client-react";
import { FeedItemCard } from "@/components/shared/feed-item-card";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Utensils, Video, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [filter, setFilter] = useState<"all" | "meals" | "videos">("all");
  
  const { data: feedData, isLoading: isLoadingFeed } = useGetFeed({ query: { enabled: true } });
  const { data: summary, isLoading: isLoadingSummary } = useGetFeedSummary({ query: { enabled: true } });

  const filteredFeed = feedData?.items.filter(item => {
    if (filter === "all") return true;
    if (filter === "meals") return item.type === "meal";
    if (filter === "videos") return item.type === "video";
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Neighborhood Kitchen</h1>
          <p className="text-muted-foreground">See what's cooking in your trusted circles.</p>
        </div>

        {/* Feed Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <Users className="text-primary mb-2" size={24} />
            {isLoadingSummary ? <Skeleton className="h-6 w-12 mb-1" /> : <span className="text-2xl font-bold font-serif">{summary?.activeCooks || 0}</span>}
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Cooks</span>
          </div>
          <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <Utensils className="text-secondary mb-2" size={24} />
            {isLoadingSummary ? <Skeleton className="h-6 w-12 mb-1" /> : <span className="text-2xl font-bold font-serif">{summary?.mealsAvailableToday || 0}</span>}
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Meals Today</span>
          </div>
          <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <Video className="text-accent mb-2" size={24} />
            {isLoadingSummary ? <Skeleton className="h-6 w-12 mb-1" /> : <span className="text-2xl font-bold font-serif">{summary?.recentVideos || 0}</span>}
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Recent Hacks</span>
          </div>
          <div className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <TrendingUp className="text-primary mb-2" size={24} />
            {isLoadingSummary ? (
              <Skeleton className="h-6 w-12 mb-1" />
            ) : (
              <div className="flex gap-1 mt-1 justify-center flex-wrap">
                {summary?.trendingTags?.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            )}
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Trending</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            className="rounded-full"
            onClick={() => setFilter("all")}
          >
            Everything
          </Button>
          <Button 
            variant={filter === "meals" ? "default" : "outline"} 
            className="rounded-full"
            onClick={() => setFilter("meals")}
          >
            Meals Only
          </Button>
          <Button 
            variant={filter === "videos" ? "default" : "outline"} 
            className="rounded-full"
            onClick={() => setFilter("videos")}
          >
            Cooking Hacks
          </Button>
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-6">
          {isLoadingFeed ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6">
                  <Skeleton className="h-10 w-full mb-4" />
                  <Skeleton className="h-64 w-full mb-4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))
          ) : filteredFeed?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
              <Utensils className="mx-auto mb-4 opacity-50" size={48} />
              <p>No activity yet.</p>
              <p className="text-sm mt-1">Be the first to share a meal or hack!</p>
            </div>
          ) : (
            filteredFeed?.map((item, i) => (
              <div key={`${item.type}-${item.meal?.id || item.video?.id}`} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
                <FeedItemCard item={item} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
