import { useState } from "react";
import { Link } from "wouter";
import { useListVideos } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedItemCard } from "@/components/shared/feed-item-card";
import { Video as VideoIcon, PlayCircle, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Videos() {
  const [filterTag, setFilterTag] = useState<string | null>(null);
  
  const { data: videos, isLoading } = useListVideos({ query: { enabled: true } });

  // Get all unique tags from videos
  const allTags = videos ? Array.from(new Set(videos.flatMap(v => v.tags))) : [];

  const filteredVideos = videos?.filter(video => 
    !filterTag || video.tags.includes(filterTag)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2 text-accent flex items-center gap-2">
              <PlayCircle className="text-accent" />
              Cooking Hacks
            </h1>
            <p className="text-muted-foreground">Quick videos, tips, and techniques from the community.</p>
          </div>
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <Button 
              variant={filterTag === null ? "default" : "outline"} 
              className="rounded-full h-8 px-4 text-xs"
              onClick={() => setFilterTag(null)}
            >
              All Hacks
            </Button>
            {allTags.map(tag => (
              <Button 
                key={tag}
                variant={filterTag === tag ? "default" : "outline"} 
                className="rounded-full h-8 px-4 text-xs"
                onClick={() => setFilterTag(tag)}
              >
                #{tag}
              </Button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <Skeleton className="aspect-[4/5] w-full" />
                <div className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))
          ) : filteredVideos?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
              <VideoIcon className="mx-auto mb-4 opacity-50" size={48} />
              <p>No cooking hacks found.</p>
              {filterTag && (
                <Button variant="link" onClick={() => setFilterTag(null)} className="mt-2">
                  Clear filter
                </Button>
              )}
            </div>
          ) : (
            filteredVideos?.map((video, i) => (
              <div key={video.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                <FeedItemCard item={{ type: "video", video, createdAt: video.createdAt }} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
