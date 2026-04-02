import { useState } from "react";
import { Link } from "wouter";
import { useListVideos, useVoteOnHack, useSubmitHackForReview, getListVideosQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronUp, ChevronDown, Sparkles, CheckCircle2, Clock, ThumbsUp,
  Zap, PlayCircle, ChefHat, Trophy, FlameKindling, Star
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type TabKey = "all" | "voting" | "approved" | "challenged";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-muted", text: "text-muted-foreground", label: "Submitted" },
  community_voting: { bg: "bg-blue-100", text: "text-blue-700", label: "Community Voting" },
  ai_reviewing: { bg: "bg-amber-100", text: "text-amber-700", label: "AI Reviewing..." },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "AI Approved" },
  challenged: { bg: "bg-orange-100", text: "text-orange-700", label: "Needs Work" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Not Approved" },
};

function ScoreMeter({ score }: { score: number }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 8 ? "bg-green-500" : score >= 6.5 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-foreground tabular-nums">{score.toFixed(1)}</span>
    </div>
  );
}

function HackCard({ video, currentUserId }: { video: any; currentUserId: number }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const voteMutation = useVoteOnHack({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listVideos"] });
      }
    }
  });

  const reviewMutation = useSubmitHackForReview({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listVideos"] });
      }
    }
  });

  const handleVote = (voteType: "up" | "down") => {
    voteMutation.mutate({ videoId: video.id, data: { userId: currentUserId, voteType } });
  };

  const handleSubmitForReview = () => {
    reviewMutation.mutate({ videoId: video.id, data: { userId: currentUserId } });
  };

  const statusInfo = STATUS_COLORS[video.hackStatus] ?? STATUS_COLORS.submitted;
  const isApproved = video.hackStatus === "approved";
  const isChallenged = video.hackStatus === "challenged";
  const isVoting = video.hackStatus === "community_voting";
  const aiScore = video.aiScore ? parseFloat(video.aiScore) : null;
  const canSubmitForReview = isVoting && video.communityUpvotes >= 2;
  const total = video.communityUpvotes + video.communityDownvotes;
  const approvalPct = total > 0 ? Math.round((video.communityUpvotes / total) * 100) : 0;

  return (
    <div className={`rounded-2xl border bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md ${isApproved ? "border-green-200" : ""}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayCircle size={40} className="text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
            {isApproved && <CheckCircle2 size={11} />}
            {isVoting && <ChevronUp size={11} />}
            {video.hackStatus === "ai_reviewing" && <Sparkles size={11} />}
            {statusInfo.label}
          </span>
        </div>
        {isApproved && aiScore !== null && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">
              <Star size={10} fill="white" />
              {aiScore.toFixed(1)}
            </div>
          </div>
        )}
        {video.durationSeconds && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {video.durationSeconds}s
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <Link href={`/videos/${video.id}`}>
          <h3 className="font-semibold text-base leading-snug mb-1 hover:text-primary cursor-pointer line-clamp-2">
            {video.title}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <Link href={`/profile/${video.author?.id}`}>
            <div className="flex items-center gap-1.5 cursor-pointer group">
              <Avatar className="h-5 w-5">
                <AvatarImage src={video.author?.avatarUrl} />
                <AvatarFallback className="text-[10px]">{video.author?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {video.author?.displayName}
              </span>
            </div>
          </Link>
          <span className="text-muted-foreground/50 text-xs">·</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
          </span>
        </div>

        {video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {video.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* AI Score breakdown if approved */}
        {isApproved && aiScore !== null && (
          <div className="mb-3">
            <ScoreMeter score={aiScore} />
          </div>
        )}

        {/* AI Analysis snippet if approved */}
        {isApproved && video.aiAnalysis && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-green-700 font-medium flex items-center gap-1 hover:underline"
            >
              <Sparkles size={11} />
              AI Verdict {expanded ? "▲" : "▼"}
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed bg-green-50 rounded-lg p-3 border border-green-100">
                {video.aiAnalysis}
              </p>
            )}
          </div>
        )}

        {/* Challenged analysis */}
        {isChallenged && video.aiAnalysis && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-orange-600 font-medium flex items-center gap-1 hover:underline"
            >
              <Sparkles size={11} />
              AI Feedback {expanded ? "▲" : "▼"}
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed bg-orange-50 rounded-lg p-3 border border-orange-100">
                {video.aiAnalysis}
              </p>
            )}
          </div>
        )}

        {/* Community approval meter */}
        {(isVoting || isApproved || isChallenged) && total > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Community approval</span>
              <span className="text-xs font-semibold text-foreground">{approvalPct}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-primary rounded-full transition-all"
                style={{ width: `${approvalPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Creative engagement score */}
        {video.creativeEngagementScore > 0 && (
          <div className="flex items-center gap-1 mb-3 text-xs text-muted-foreground">
            <FlameKindling size={12} className="text-primary" />
            <span><strong className="text-foreground">{video.creativeEngagementScore}</strong> creative impact</span>
          </div>
        )}

        {/* Voting controls */}
        <div className="flex items-center gap-2 pt-3 border-t">
          <div className="flex items-center gap-1 flex-1">
            <button
              onClick={() => handleVote("up")}
              disabled={voteMutation.isPending}
              className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors"
            >
              <ChevronUp size={16} />
              {video.communityUpvotes}
            </button>
            <button
              onClick={() => handleVote("down")}
              disabled={voteMutation.isPending}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:bg-muted px-2 py-1 rounded-lg transition-colors"
            >
              <ChevronDown size={16} />
              {video.communityDownvotes}
            </button>
          </div>

          {canSubmitForReview && !isApproved && !isChallenged && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 border-primary/30 text-primary hover:bg-primary/5"
              onClick={handleSubmitForReview}
              disabled={reviewMutation.isPending}
            >
              <Sparkles size={11} className="mr-1" />
              {reviewMutation.isPending ? "Reviewing..." : "Ask AI to Review"}
            </Button>
          )}

          {isApproved && (
            <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
              <CheckCircle2 size={13} />
              Approved
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovedShowcase({ videos }: { videos: any[] }) {
  const approved = videos.filter(v => v.hackStatus === "approved")
    .sort((a, b) => parseFloat(b.aiScore ?? "0") - parseFloat(a.aiScore ?? "0"))
    .slice(0, 3);

  if (approved.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={20} className="text-amber-500" />
        <h2 className="text-lg font-serif font-bold">Community Cookbook</h2>
        <Badge className="bg-green-100 text-green-700 border-0 text-xs">AI Approved</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        These hacks earned the community seal — voted up, then approved by our AI quality engine for clarity, originality, and practicality.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {approved.map((video, i) => {
          const aiScore = video.aiScore ? parseFloat(video.aiScore) : null;
          return (
            <Link key={video.id} href={`/videos/${video.id}`}>
              <div className="relative bg-card border border-green-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlayCircle size={32} className="text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-semibold line-clamp-2 leading-snug">{video.title}</p>
                  </div>
                  {i === 0 && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">#1 This Week</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={video.author?.avatarUrl} />
                        <AvatarFallback className="text-[10px]">{video.author?.displayName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{video.author?.displayName}</span>
                    </div>
                    {aiScore !== null && (
                      <div className="flex items-center gap-1 text-xs font-bold text-green-700">
                        <Star size={11} className="fill-green-500 text-green-500" />
                        {aiScore.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Videos() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const { data: user } = useCurrentUser();

  const { data: videos, isLoading } = useListVideos({}, { query: { enabled: true, queryKey: getListVideosQueryKey({}) } });

  const allTags = videos ? Array.from(new Set(videos.flatMap(v => v.tags))) : [];

  const filtered = videos?.filter(v => {
    if (filterTag && !v.tags.includes(filterTag)) return false;
    if (activeTab === "voting") return v.hackStatus === "community_voting" || v.hackStatus === "submitted";
    if (activeTab === "approved") return v.hackStatus === "approved";
    if (activeTab === "challenged") return v.hackStatus === "challenged" || v.hackStatus === "rejected";
    return true;
  });

  const approvedCount = videos?.filter(v => v.hackStatus === "approved").length ?? 0;
  const votingCount = videos?.filter(v => v.hackStatus === "community_voting" || v.hackStatus === "submitted").length ?? 0;

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: "all", label: "All Hacks", icon: <Zap size={13} /> },
    { key: "voting", label: "Community Vote", count: votingCount, icon: <ChevronUp size={13} /> },
    { key: "approved", label: "AI Approved", count: approvedCount, icon: <CheckCircle2 size={13} /> },
    { key: "challenged", label: "Needs Work", icon: <Clock size={13} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2 flex items-center gap-2">
                <Zap className="text-primary" size={28} />
                Cooking Hacks
              </h1>
              <p className="text-muted-foreground max-w-lg">
                Community-sourced cooking techniques. Vote on what works, and our AI engine reviews top hacks to build the Community Cookbook — the approved playbook for better cooking.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
                <CheckCircle2 size={13} className="text-green-600" />
                <span className="font-semibold text-green-700">{approvedCount} approved</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
                <ThumbsUp size={13} className="text-blue-600" />
                <span className="font-semibold text-blue-700">{votingCount} in voting</span>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 mb-8 p-4 bg-muted/40 rounded-2xl border border-border/50">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <ChevronUp size={16} className="text-primary" />
            </div>
            <p className="text-xs font-semibold">1. Community votes</p>
            <p className="text-xs text-muted-foreground">Upvote hacks you've tried and love</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
              <Sparkles size={16} className="text-amber-600" />
            </div>
            <p className="text-xs font-semibold">2. AI reviews</p>
            <p className="text-xs text-muted-foreground">Scores clarity, originality & practicality</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <Trophy size={16} className="text-green-600" />
            </div>
            <p className="text-xs font-semibold">3. Gets approved</p>
            <p className="text-xs text-muted-foreground">Joins the Community Cookbook</p>
          </div>
        </div>

        {/* Approved showcase */}
        {!isLoading && videos && <ApprovedShowcase videos={videos} />}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 bg-muted/50 p-1 rounded-xl border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                activeTab === tab.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={filterTag === null ? "default" : "outline"}
              className="rounded-full h-7 px-3 text-xs shrink-0"
              onClick={() => setFilterTag(null)}
            >
              All
            </Button>
            {allTags.slice(0, 10).map(tag => (
              <Button
                key={tag}
                variant={filterTag === tag ? "default" : "outline"}
                className="rounded-full h-7 px-3 text-xs shrink-0"
                onClick={() => setFilterTag(tag)}
              >
                #{tag}
              </Button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : filtered?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
              <ChefHat className="mx-auto mb-4 opacity-50" size={40} />
              <p className="font-medium">No hacks here yet</p>
              {filterTag && (
                <Button variant="link" onClick={() => setFilterTag(null)} className="mt-2 text-sm">
                  Clear filter
                </Button>
              )}
            </div>
          ) : (
            filtered?.map((video, i) => (
              <div key={video.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 40}ms` }}>
                <HackCard video={video} currentUserId={user?.id ?? 1} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
