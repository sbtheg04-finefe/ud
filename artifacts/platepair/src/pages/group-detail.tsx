import { useParams, Link } from "wouter";
import { useGetGroup, useGetGroupStats, useListGroupMembers, useGetFeed } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedItemCard } from "@/components/shared/feed-item-card";
import { Users, Globe, Lock, ShieldCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function GroupDetail() {
  const { groupId } = useParams();
  const id = Number(groupId);

  const { data: group, isLoading: isLoadingGroup } = useGetGroup(id, { query: { enabled: !!id } });
  const { data: stats, isLoading: isLoadingStats } = useGetGroupStats(id, { query: { enabled: !!id } });
  const { data: members, isLoading: isLoadingMembers } = useListGroupMembers(id, { query: { enabled: !!id } });
  const { data: feedData, isLoading: isLoadingFeed } = useGetFeed({ query: { enabled: !!id } }, { query: { groupId: id } } as any); // Workaround for params passing

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Cover Image */}
      <div className="w-full h-48 md:h-64 bg-muted relative">
        {isLoadingGroup ? (
          <Skeleton className="w-full h-full" />
        ) : group?.coverImageUrl ? (
          <img src={group.coverImageUrl} alt={group.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
            <Users size={64} className="text-secondary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
      </div>

      <main className="container mx-auto px-4 max-w-5xl -mt-20 relative z-10 pb-12">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-card border rounded-2xl p-6 shadow-sm mb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {isLoadingGroup ? (
                    <Skeleton className="h-8 w-48 mb-2" />
                  ) : (
                    <h1 className="text-3xl font-serif font-bold text-foreground">{group?.name}</h1>
                  )}
                  
                  {isLoadingGroup ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        {group?.visibility === "public" ? <Globe size={12} className="mr-1" /> : <Lock size={12} className="mr-1" />}
                        <span className="capitalize">{group?.visibility.replace('_', ' ')}</span>
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users size={14} /> {group?.memberCount} members
                      </span>
                    </div>
                  )}
                </div>
                <Button>Join Group</Button>
              </div>
              
              {isLoadingGroup ? (
                <Skeleton className="h-16 w-full" />
              ) : group?.description ? (
                <p className="text-muted-foreground">{group.description}</p>
              ) : null}

              {group?.tags && group.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {group.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="bg-muted/50">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Group Feed</h2>
            </div>

            <div className="flex flex-col gap-6">
              {isLoadingFeed ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-xl" />
                ))
              ) : feedData?.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
                  <p>No activity yet.</p>
                </div>
              ) : (
                feedData?.items.map((item, i) => (
                  <div key={`${item.type}-${item.meal?.id || item.video?.id}`} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                    <FeedItemCard item={item} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-80 flex flex-col gap-6">
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg mb-4">Group Stats</h3>
              {isLoadingStats ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Meals</span>
                    <span className="font-medium">{stats?.totalMeals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cooking Hacks</span>
                    <span className="font-medium">{stats?.totalVideos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Cooks</span>
                    <span className="font-medium">{stats?.activeCooks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recent Activity</span>
                    <span className="font-medium">{stats?.recentActivity} posts</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-lg">Members</h3>
                <span className="text-sm text-muted-foreground">{members?.length || 0}</span>
              </div>
              
              <div className="space-y-4">
                {isLoadingMembers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))
                ) : (
                  members?.slice(0, 8).map(member => (
                    <Link key={member.id} href={`/profile/${member.user.id}`} className="flex items-center gap-3 group">
                      <img src={member.user.avatarUrl || `https://ui-avatars.com/api/?name=${member.user.displayName}`} alt={member.user.displayName} className="h-10 w-10 rounded-full border border-border group-hover:border-primary transition-colors" />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm group-hover:text-primary transition-colors">{member.user.displayName}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {member.role === 'admin' ? <ShieldCheck size={12} className="text-primary" /> : null}
                          <span className="capitalize">{member.role}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              
              {members && members.length > 8 && (
                <Button variant="ghost" className="w-full mt-4 text-sm">View All Members</Button>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
