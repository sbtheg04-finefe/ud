import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useGetUserSaves, getGetUserSavesQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedItemCard } from "@/components/shared/feed-item-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark, ChefHat, PlayCircle } from "lucide-react";

export default function SavedItems() {
  const { data: user } = useCurrentUser();
  const userId = user?.id;
  
  const { data: savedItems, isLoading } = useGetUserSaves(userId || 0, {
    query: { enabled: !!userId, queryKey: getGetUserSavesQueryKey(userId || 0) }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2 flex items-center gap-2">
            <Bookmark className="text-primary" />
            Saved Items
          </h1>
          <p className="text-muted-foreground">Your personal collection of recipes and cooking hacks.</p>
        </div>

        <Tabs defaultValue="meals" className="w-full">
          <TabsList className="mb-6 h-12 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="meals" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
              <ChefHat size={18} />
              Meals ({savedItems?.meals.length || 0})
            </TabsTrigger>
            <TabsTrigger value="videos" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
              <PlayCircle size={18} />
              Hacks ({savedItems?.videos.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="meals" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full rounded-xl" />
                ))
              ) : savedItems?.meals.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
                  <Bookmark className="mx-auto mb-4 opacity-50" size={48} />
                  <p>No saved meals yet.</p>
                </div>
              ) : (
                savedItems?.meals.map((meal, i) => (
                  <div key={meal.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                    <FeedItemCard item={{ type: "meal", meal, createdAt: meal.createdAt }} />
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="videos" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full rounded-xl" />
                ))
              ) : savedItems?.videos.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
                  <PlayCircle className="mx-auto mb-4 opacity-50" size={48} />
                  <p>No saved hacks yet.</p>
                </div>
              ) : (
                savedItems?.videos.map((video, i) => (
                  <div key={video.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                    <FeedItemCard item={{ type: "video", video, createdAt: video.createdAt }} />
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
