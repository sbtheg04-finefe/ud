import { useState } from "react";
import { Link } from "wouter";
import { useGetFeed, useGetFeedSummary, getGetFeedQueryKey, getGetFeedSummaryQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FeedItemCard } from "@/components/shared/feed-item-card";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Utensils, Video, TrendingUp,
  Swords, Star, Building2, ChefHat,
  ArrowRight, Sparkles, Gavel, Zap, Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function RoleActionBanner() {
  const { data: user, isPartner, isJudge, isAuthLoading } = useCurrentUser();

  if (isAuthLoading || !user) return null;

  const firstName = user.displayName?.split(" ")[0] || "Chef";

  if (isPartner && isJudge) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Full Package Member
            </div>
            <h2 className="text-xl font-bold mb-1">Welcome back, {firstName}.</h2>
            <p className="text-emerald-100 text-sm">You're a brand sponsor and a certified judge. Your battles get maximum community visibility.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link href="/judge/queue">
            <button className="w-full rounded-xl bg-white/20 hover:bg-white/30 transition-colors px-3 py-2 text-sm font-medium flex items-center gap-2">
              <Gavel className="w-4 h-4" /> Open Judge Queue
            </button>
          </Link>
          <Link href="/partner/dashboard">
            <button className="w-full rounded-xl bg-white/20 hover:bg-white/30 transition-colors px-3 py-2 text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Partner Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isJudge) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 p-5 text-white mb-6">
        <div className="flex items-center gap-2 text-purple-100 text-xs font-semibold uppercase tracking-widest mb-1">
          <Star className="w-3.5 h-3.5" /> Certified Judge
        </div>
        <h2 className="text-xl font-bold mb-1">Battles are waiting for you, {firstName}.</h2>
        <p className="text-purple-100 text-sm mb-4">
          Battles with a judge rank 3× higher in the feed. Your authority score grows with every verdict.
        </p>
        <Link href="/judge/queue">
          <button className="rounded-xl bg-white text-purple-700 font-semibold px-4 py-2 text-sm flex items-center gap-2 hover:bg-purple-50 transition-colors">
            <Gavel className="w-4 h-4" /> Open Judge Queue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    );
  }

  if (isPartner) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white mb-6">
        <div className="flex items-center gap-2 text-blue-100 text-xs font-semibold uppercase tracking-widest mb-1">
          <Building2 className="w-3.5 h-3.5" /> Brand Partner
        </div>
        <h2 className="text-xl font-bold mb-1">Ready to sponsor your next battle?</h2>
        <p className="text-blue-100 text-sm mb-4">Sponsored battles get 2.5× more participants. Pick a live battle and attach your brand in minutes.</p>
        <div className="flex gap-2">
          <Link href="/partner/dashboard">
            <button className="rounded-xl bg-white text-blue-700 font-semibold px-4 py-2 text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors">
              <Building2 className="w-4 h-4" /> Partner Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
          <Link href="/battles">
            <button className="rounded-xl bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 text-sm font-medium">
              Browse Battles
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-5 mb-6">
      <div className="flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-widest mb-1">
        <ChefHat className="w-3.5 h-3.5" /> What will you cook today?
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Hey {firstName}, the community is cooking.</h2>
      <p className="text-gray-500 text-sm mb-4">Join a live battle, start your own circle, or share what you made today.</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/battles">
          <button className="rounded-xl bg-orange-500 text-white font-semibold px-4 py-2 text-sm flex items-center gap-2 hover:bg-orange-600 transition-colors">
            <Swords className="w-4 h-4" /> Live Battles
          </button>
        </Link>
        <Link href="/groups">
          <button className="rounded-xl border border-gray-200 bg-white text-gray-700 font-medium px-4 py-2 text-sm flex items-center gap-2 hover:border-orange-300 transition-colors">
            <Users className="w-4 h-4" /> My Circles
          </button>
        </Link>
        <Link href="/create">
          <button className="rounded-xl border border-gray-200 bg-white text-gray-700 font-medium px-4 py-2 text-sm flex items-center gap-2 hover:border-orange-300 transition-colors">
            <Plus className="w-4 h-4" /> Share a Meal
          </button>
        </Link>
      </div>
    </div>
  );
}

function QuickActions() {
  const { isPartner, isJudge } = useCurrentUser();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <Link href="/battles">
        <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 text-center hover:shadow-md transition-all cursor-pointer group">
          <Swords className="w-6 h-6 text-orange-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-semibold text-gray-800">Battle Arena</div>
          <div className="text-xs text-gray-500">48 live now</div>
        </div>
      </Link>
      <Link href="/videos">
        <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-4 text-center hover:shadow-md transition-all cursor-pointer group">
          <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-semibold text-gray-800">Cooking Hacks</div>
          <div className="text-xs text-gray-500">AI-reviewed tips</div>
        </div>
      </Link>
      {isJudge ? (
        <Link href="/judge/queue">
          <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4 text-center hover:shadow-md transition-all cursor-pointer group">
            <Gavel className="w-6 h-6 text-purple-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-gray-800">Judge Queue</div>
            <div className="text-xs text-purple-500 font-medium">Needs your verdict</div>
          </div>
        </Link>
      ) : (
        <Link href="/groups">
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-center hover:shadow-md transition-all cursor-pointer group">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-gray-800">My Circles</div>
            <div className="text-xs text-gray-500">Your groups</div>
          </div>
        </Link>
      )}
      {isPartner ? (
        <Link href="/partner/dashboard">
          <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4 text-center hover:shadow-md transition-all cursor-pointer group">
            <Building2 className="w-6 h-6 text-indigo-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-gray-800">Sponsor</div>
            <div className="text-xs text-indigo-500 font-medium">Partner dashboard</div>
          </div>
        </Link>
      ) : (
        <Link href="/create">
          <div className="rounded-2xl bg-green-50 border border-green-100 p-4 text-center hover:shadow-md transition-all cursor-pointer group">
            <Plus className="w-6 h-6 text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-gray-800">Share</div>
            <div className="text-xs text-gray-500">Post a meal or hack</div>
          </div>
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const [filter, setFilter] = useState<"all" | "meals" | "videos">("all");
  const { data: summary, isLoading: isLoadingSummary } = useGetFeedSummary(undefined, { query: { enabled: true, queryKey: getGetFeedSummaryQueryKey() } });
  const { data: feedData, isLoading: isLoadingFeed } = useGetFeed(undefined, { query: { enabled: true, queryKey: getGetFeedQueryKey() } });

  const filteredFeed = feedData?.items.filter(item => {
    if (filter === "all") return true;
    if (filter === "meals") return item.type === "meal";
    if (filter === "videos") return item.type === "video";
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-3xl">

        {/* Role-aware action banner */}
        <RoleActionBanner />

        {/* Quick-action tiles */}
        <QuickActions />

        {/* Community stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border rounded-xl p-3 flex flex-col items-center text-center shadow-sm">
            <Users className="text-primary mb-1" size={18} />
            {isLoadingSummary ? <Skeleton className="h-5 w-8 mb-0.5" /> : <span className="text-xl font-bold font-serif">{summary?.activeCooks ?? 0}</span>}
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Cooks</span>
          </div>
          <div className="bg-card border rounded-xl p-3 flex flex-col items-center text-center shadow-sm">
            <Utensils className="text-secondary mb-1" size={18} />
            {isLoadingSummary ? <Skeleton className="h-5 w-8 mb-0.5" /> : <span className="text-xl font-bold font-serif">{summary?.mealsAvailableToday ?? 0}</span>}
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Meals Today</span>
          </div>
          <div className="bg-card border rounded-xl p-3 flex flex-col items-center text-center shadow-sm">
            <TrendingUp className="text-primary mb-1" size={18} />
            {isLoadingSummary ? (
              <Skeleton className="h-5 w-8 mb-0.5" />
            ) : (
              <div className="flex gap-1 flex-wrap justify-center">
                {summary?.trendingTags?.slice(0, 1).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            )}
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">Trending</span>
          </div>
        </div>

        {/* Feed header + filters */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Community Feed</h2>
          <div className="flex gap-1.5">
            {(["all", "meals", "videos"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "Everything" : f === "meals" ? "Meals" : "Hacks"}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-5">
          {isLoadingFeed ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card shadow">
                <div className="p-6">
                  <Skeleton className="h-10 w-full mb-4" />
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))
          ) : filteredFeed?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
              <Utensils className="mx-auto mb-4 opacity-50" size={48} />
              <p>Nothing here yet.</p>
              <p className="text-sm mt-1">Be the first to share a meal or hack!</p>
              <Link href="/create">
                <Button className="mt-4 rounded-full bg-orange-500 hover:bg-orange-600">
                  Share something
                </Button>
              </Link>
            </div>
          ) : (
            filteredFeed?.map((item, i) => (
              <div
                key={`${item.type}-${item.meal?.id || item.video?.id}`}
                className="animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                <FeedItemCard item={item} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
