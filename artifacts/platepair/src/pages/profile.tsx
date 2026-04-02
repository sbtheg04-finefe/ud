import { useParams, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  useGetUser, useGetUserStats, useListMeals, useListVideos,
  getGetUserQueryKey, getGetUserStatsQueryKey, getListMealsQueryKey, getListVideosQueryKey,
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedItemCard } from "@/components/shared/feed-item-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ChefHat, PlayCircle, Edit } from "lucide-react";

export default function Profile() {
  const { userId } = useParams();
  const id = Number(userId);
  const { data: currentUser } = useCurrentUser();
  const isOwnProfile = currentUser?.id === id;

  const { data: user, isLoading: isLoadingUser } = useGetUser(id, { query: { enabled: !!id, queryKey: getGetUserQueryKey(id) } });
  const { data: stats, isLoading: isLoadingStats } = useGetUserStats(id, { query: { enabled: !!id, queryKey: getGetUserStatsQueryKey(id) } });

  const { data: meals, isLoading: isLoadingMeals } = useListMeals({ authorId: id }, { query: { enabled: !!id, queryKey: getListMealsQueryKey({ authorId: id }) } });
  const { data: videos, isLoading: isLoadingVideos } = useListVideos({ authorId: id }, { query: { enabled: !!id, queryKey: getListVideosQueryKey({ authorId: id }) } });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Cover/Header area */}
      <div className="w-full h-32 md:h-48 bg-gradient-to-r from-primary/20 to-accent/20 relative" />

      <main className="container mx-auto px-4 max-w-5xl -mt-16 relative z-10 pb-12">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Profile Sidebar */}
          <div className="w-full md:w-80 flex flex-col gap-6">
            <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
              {isLoadingUser ? (
                <Skeleton className="h-32 w-32 rounded-full mb-4" />
              ) : (
                <Avatar className="h-32 w-32 border-4 border-background shadow-md mb-4 -mt-16">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl">{user?.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              
              {isLoadingUser ? (
                <>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-serif font-bold">{user?.displayName}</h1>
                  <p className="text-muted-foreground mb-4">@{user?.username}</p>
                </>
              )}

              {isOwnProfile && (
                <Link href={`/profile/${id}/edit`} className="w-full mb-6 block">
                  <Button variant="outline" className="w-full gap-2 rounded-xl">
                    <Edit size={16} /> Edit Profile
                  </Button>
                </Link>
              )}

              <div className="w-full space-y-4 text-sm text-left">
                {isLoadingUser ? (
                  <Skeleton className="h-20 w-full" />
                ) : user?.bio ? (
                  <p className="text-foreground/90">{user.bio}</p>
                ) : null}

                <div className="pt-4 border-t border-border/50 space-y-3">
                  {user?.locationText && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin size={16} />
                      <span>{user.locationText}</span>
                    </div>
                  )}
                  {user?.createdAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar size={16} />
                      <span>Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg mb-4">Activity</h3>
              {isLoadingStats ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Meals Shared</span>
                    <span className="font-medium text-lg">{stats?.totalMeals || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cooking Hacks</span>
                    <span className="font-medium text-lg">{stats?.totalVideos || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Groups Joined</span>
                    <span className="font-medium text-lg">{stats?.groupCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Likes</span>
                    <span className="font-medium text-lg text-primary">{stats?.totalLikes || 0}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {(!isLoadingUser && ((user?.dietaryPreferences?.length ?? 0) > 0 || (user?.cookingInterests?.length ?? 0) > 0)) && (
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                {(user?.dietaryPreferences?.length ?? 0) > 0 && (
                  <div className="mb-4">
                    <h3 className="font-serif font-bold text-sm mb-2 text-muted-foreground uppercase tracking-wider">Dietary</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {user?.dietaryPreferences?.map(tag => (
                        <Badge key={tag} variant="outline" className="bg-secondary/10 border-secondary/20 text-secondary-foreground">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(user?.cookingInterests?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="font-serif font-bold text-sm mb-2 text-muted-foreground uppercase tracking-wider">Interests</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {user?.cookingInterests?.map(tag => (
                        <Badge key={tag} variant="outline" className="bg-muted/50">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 mt-8 md:mt-16">
            <Tabs defaultValue="meals" className="w-full">
              <TabsList className="mb-6 h-12 p-1 bg-muted/50 rounded-xl inline-flex w-auto">
                <TabsTrigger value="meals" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
                  <ChefHat size={18} />
                  Meals
                </TabsTrigger>
                <TabsTrigger value="videos" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
                  <PlayCircle size={18} />
                  Hacks
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="meals" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isLoadingMeals ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-80 w-full rounded-xl" />
                    ))
                  ) : meals?.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
                      <ChefHat className="mx-auto mb-4 opacity-50" size={48} />
                      <p>No meals shared yet.</p>
                    </div>
                  ) : (
                    meals?.map((meal, i) => (
                      <div key={meal.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                        <FeedItemCard item={{ type: "meal", meal, createdAt: meal.createdAt }} />
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="videos" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isLoadingVideos ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-80 w-full rounded-xl" />
                    ))
                  ) : videos?.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
                      <PlayCircle className="mx-auto mb-4 opacity-50" size={48} />
                      <p>No cooking hacks shared yet.</p>
                    </div>
                  ) : (
                    videos?.map((video, i) => (
                      <div key={video.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                        <FeedItemCard item={{ type: "video", video, createdAt: video.createdAt }} />
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </main>
    </div>
  );
}
