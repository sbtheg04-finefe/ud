import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useListVideos, useVoteOnHack, useSubmitHackForReview, useCreateVideo, getListVideosQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronUp, ChevronDown, Sparkles, CheckCircle2, Clock, ThumbsUp,
  Zap, PlayCircle, ChefHat, Trophy, FlameKindling, Star, Swords,
  Plus, X, Flame, BookOpen, TrendingUp, Link2, Image as ImageIcon,
  Tag, ArrowRight, RefreshCw, Eye, Bookmark, MessageCircle, GitFork
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type SortKey = "hot" | "battle_ready" | "recent" | "approved";

const PLATFORM_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  tiktok: { label: "TikTok", color: "text-pink-600", bg: "bg-pink-50 border-pink-200", icon: "🎵" },
  instagram: { label: "Instagram", color: "text-purple-600", bg: "bg-purple-50 border-purple-200", icon: "📸" },
  youtube: { label: "YouTube", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "▶️" },
  twitter: { label: "X/Twitter", color: "text-sky-600", bg: "bg-sky-50 border-sky-200", icon: "🐦" },
  web: { label: "Web", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: "🌐" },
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-gray-100", text: "text-gray-600", label: "New" },
  community_voting: { bg: "bg-blue-100", text: "text-blue-700", label: "Voting" },
  ai_reviewing: { bg: "bg-amber-100", text: "text-amber-700", label: "AI Reviewing" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "✓ Approved" },
  challenged: { bg: "bg-orange-100", text: "text-orange-700", label: "Needs Work" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Not Approved" },
};

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return null;
  const cfg = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.web;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function HackCard({ video, currentUserId, onBattleThis }: { video: any; currentUserId: number; onBattleThis?: (v: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [tried, setTried] = useState(false);
  const queryClient = useQueryClient();

  const voteMutation = useVoteOnHack({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listVideos"] })
    }
  });

  const reviewMutation = useSubmitHackForReview({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listVideos"] })
    }
  });

  const handleVote = (voteType: "up" | "down") => {
    voteMutation.mutate({ videoId: video.id, data: { userId: currentUserId, voteType } });
  };

  const handleTry = async () => {
    setTried(true);
    try {
      await fetch(`/api/videos/${video.id}/try`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
    } catch (_) {}
  };

  const statusInfo = STATUS_BADGE[video.hackStatus] ?? STATUS_BADGE.submitted;
  const isApproved = video.hackStatus === "approved";
  const isChallenged = video.hackStatus === "challenged";
  const isVoting = video.hackStatus === "community_voting" || video.hackStatus === "submitted";
  const aiScore = video.aiScore ? parseFloat(video.aiScore) : null;
  const canSubmitForReview = (video.hackStatus === "community_voting") && video.communityUpvotes >= 2;
  const total = video.communityUpvotes + video.communityDownvotes;
  const approvalPct = total > 0 ? Math.round((video.communityUpvotes / total) * 100) : 0;
  const displayImg = video.photoUrl || video.thumbnailUrl;
  const isHighEngagement = video.communityUpvotes >= 30;

  return (
    <div className={`rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all group ${isApproved ? "border-green-200" : isHighEngagement ? "border-orange-200" : ""}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {displayImg ? (
          <img
            src={displayImg.startsWith("/objects/") ? `/api/storage${displayImg}` : displayImg}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
            <ChefHat size={36} className="text-orange-200" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Status badge top-left */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
            {statusInfo.label}
          </span>
          {isHighEngagement && !isApproved && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white flex items-center gap-0.5">
              <Flame size={9} /> Hot
            </span>
          )}
        </div>

        {/* AI score top-right */}
        {isApproved && aiScore !== null && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 bg-green-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-bold">
              <Star size={10} fill="white" />
              {aiScore.toFixed(1)}
            </div>
          </div>
        )}

        {/* Vote count overlay */}
        <div className="absolute bottom-2 left-3 flex items-center gap-1">
          <span className="text-white text-sm font-bold drop-shadow">🔥 {video.communityUpvotes}</span>
        </div>

        {/* Platform badge overlay */}
        {video.sourcePlatform && (
          <div className="absolute bottom-2 right-3">
            <PlatformBadge platform={video.sourcePlatform} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <Link href={`/videos/${video.id}`}>
          <h3 className="font-semibold text-sm leading-snug mb-2 hover:text-primary cursor-pointer line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
        </Link>

        {video.caption && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{video.caption}</p>
        )}

        {/* Author row */}
        <div className="flex items-center gap-2 mb-3">
          <Link href={`/profile/${video.author?.id}`}>
            <div className="flex items-center gap-1.5 cursor-pointer">
              <Avatar className="h-5 w-5">
                <AvatarImage src={video.author?.avatarUrl} />
                <AvatarFallback className="text-[9px]">{video.author?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                @{video.author?.displayName}
              </span>
            </div>
          </Link>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Tags */}
        {video.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {video.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Ingredients chips */}
        {video.ingredients && video.ingredients.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1.5">Key ingredients</p>
            <div className="flex flex-wrap gap-1">
              {(video.ingredients as string[]).slice(0, 5).map((ing: string, i: number) => (
                <span key={i} className="text-[10px] bg-orange-50 border border-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  {ing.split(" ").slice(-1)[0]}
                </span>
              ))}
              {video.ingredients.length > 5 && (
                <span className="text-[10px] text-muted-foreground px-1 py-0.5">+{video.ingredients.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {/* Source URL */}
        {video.sourceUrl && (
          <a
            href={video.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 mb-3 transition-colors"
          >
            <Link2 size={11} /> View source
          </a>
        )}

        {/* AI Analysis (expandable) */}
        {(isApproved || isChallenged) && video.aiAnalysis && (
          <div className="mb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className={`text-xs font-medium flex items-center gap-1 hover:underline ${isApproved ? "text-green-700" : "text-orange-600"}`}
            >
              <Sparkles size={11} />
              AI Verdict {expanded ? "▲" : "▼"}
            </button>
            {expanded && (
              <p className={`mt-2 text-xs text-muted-foreground leading-relaxed p-3 rounded-lg border ${isApproved ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100"}`}>
                {video.aiAnalysis}
              </p>
            )}
          </div>
        )}

        {/* Approval meter */}
        {total > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Community approval</span>
              <span className="text-[10px] font-semibold">{approvalPct}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-1 bg-primary rounded-full transition-all" style={{ width: `${approvalPct}%` }} />
            </div>
          </div>
        )}

        {/* Engagement CTAs */}
        <div className="flex items-center gap-1 pt-3 border-t flex-wrap">
          {/* Vote up */}
          <button
            onClick={() => handleVote("up")}
            disabled={voteMutation.isPending}
            className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:bg-green-50 px-2 py-1.5 rounded-lg transition-colors"
          >
            <ChevronUp size={14} />
            {video.communityUpvotes}
          </button>

          {/* Vote down */}
          <button
            onClick={() => handleVote("down")}
            disabled={voteMutation.isPending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:bg-muted px-2 py-1.5 rounded-lg transition-colors"
          >
            <ChevronDown size={14} />
            {video.communityDownvotes > 0 ? video.communityDownvotes : ""}
          </button>

          <div className="flex-1" />

          {/* Try It */}
          <button
            onClick={handleTry}
            title="Save to prep list"
            className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${tried ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Bookmark size={13} />
            <span className="hidden sm:inline">{tried ? "Saved" : "Try It"}</span>
          </button>

          {/* Battle This */}
          <Link href={`/battles/create?sourceType=video&sourceId=${video.id}`}>
            <button className="flex items-center gap-1 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-2.5 py-1.5 rounded-lg transition-colors">
              <Swords size={12} />
              <span className="hidden sm:inline">Battle</span>
            </button>
          </Link>

          {/* Submit for AI review */}
          {canSubmitForReview && (
            <button
              onClick={() => reviewMutation.mutate({ videoId: video.id, data: { userId: currentUserId } })}
              disabled={reviewMutation.isPending}
              title="Ask AI to review"
              className="flex items-center gap-1 text-xs text-primary hover:bg-primary/5 px-2 py-1.5 rounded-lg transition-colors border border-primary/20"
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">{reviewMutation.isPending ? "..." : "AI Review"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovedTopRow({ videos }: { videos: any[] }) {
  const top = videos.filter(v => v.hackStatus === "approved")
    .sort((a, b) => parseFloat(b.aiScore ?? "0") - parseFloat(a.aiScore ?? "0"))
    .slice(0, 3);

  if (top.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={20} className="text-amber-500" />
        <h2 className="text-lg font-serif font-bold">Community Cookbook</h2>
        <Badge className="bg-green-100 text-green-700 border-0 text-xs">AI Approved</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{videos.filter(v => v.hackStatus === "approved").length} hacks</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top.map((video, i) => {
          const aiScore = video.aiScore ? parseFloat(video.aiScore) : null;
          const displayImg = video.photoUrl || video.thumbnailUrl;
          return (
            <Link key={video.id} href={`/videos/${video.id}`}>
              <div className="relative bg-card border border-green-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {displayImg ? (
                    <img
                      src={displayImg.startsWith("/objects/") ? `/api/storage${displayImg}` : displayImg}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
                      <Trophy size={32} className="text-green-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-white text-sm font-semibold line-clamp-2 leading-snug">{video.title}</p>
                  </div>
                  {i === 0 && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">#1 This Week</span>
                    </div>
                  )}
                  {video.sourcePlatform && (
                    <div className="absolute top-2 right-2">
                      <PlatformBadge platform={video.sourcePlatform} />
                    </div>
                  )}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={video.author?.avatarUrl} />
                      <AvatarFallback className="text-[9px]">{video.author?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{video.author?.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">🔥 {video.communityUpvotes}</span>
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

function CronStatusPanel({ onPopulate }: { onPopulate: () => void }) {
  const [status, setStatus] = useState<any>(null);
  const [populating, setPopulating] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/hacks/cron-status");
      const data = await res.json();
      setStatus(data);
      setShowPanel(true);
    } catch (_) {}
  };

  const handlePopulate = async () => {
    setPopulating(true);
    try {
      const res = await fetch("/api/hacks/populate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 20 }),
      });
      const data = await res.json();
      setStatus((prev: any) => ({ ...prev, lastRun: data }));
      onPopulate();
    } catch (_) {} finally {
      setPopulating(false);
    }
  };

  if (!showPanel) {
    return (
      <div className="text-center">
        <button
          onClick={fetchStatus}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          View content pipeline status
        </button>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border rounded-2xl p-5 text-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw size={15} className="text-primary" />
          <span className="font-semibold">Daily Hack Pipeline</span>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">AUTO</span>
        </div>
        <button onClick={() => setShowPanel(false)} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total Hacks", value: status?.stats?.total ?? "–", color: "text-foreground" },
          { label: "Auto-Generated", value: status?.stats?.demo ?? "–", color: "text-blue-600" },
          { label: "User Submitted", value: status?.stats?.userSubmitted ?? "–", color: "text-orange-600" },
          { label: "AI Approved", value: status?.stats?.approved ?? "–", color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="bg-background border rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 space-y-1">
          {status?.lastRun && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Last run:</span>{" "}
              {new Date(status.lastRun.ranAt).toLocaleString()} — +{status.lastRun.inserted} hacks from {status.lastRun.categories?.join(", ")}
            </p>
          )}
          {status?.nextScheduledRun && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Next auto-run:</span>{" "}
              {new Date(status.nextScheduledRun).toLocaleString()} (6AM ET daily)
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePopulate}
          disabled={populating}
          className="gap-2 shrink-0 rounded-full"
        >
          {populating ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
          {populating ? "Fetching..." : "Fetch Now (20 hacks)"}
        </Button>
      </div>
    </div>
  );
}

function DropHackForm({ userId, onSuccess }: { userId: number; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [tags, setTags] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const createMutation = useCreateVideo({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["listVideos"] });
        onSuccess();
      }
    }
  });

  const detectPlatform = (url: string) => {
    if (url.includes("tiktok.com")) return "tiktok";
    if (url.includes("instagram.com")) return "instagram";
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
    return "web";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch("/api/storage/request-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, filename: file.name }),
      });
      const { uploadUrl, objectPath } = await res.json();
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setPhotoUrl(objectPath);
    } catch (_) {
      console.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    const tagArr = tags.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean).slice(0, 3);
    createMutation.mutate({
      data: {
        authorId: userId,
        title: title.trim(),
        caption: caption.trim().slice(0, 200) || null,
        thumbnailUrl: photoUrl || null,
        tags: tagArr,
        sourceUrl: sourceUrl.trim() || undefined,
        sourcePlatform: sourceUrl.trim() ? detectPlatform(sourceUrl.trim()) : undefined,
      } as any,
    });
  };

  return (
    <div className="space-y-4">
      {/* Photo upload */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all"
      >
        {photoUrl ? (
          <div className="relative">
            <img
              src={photoUrl.startsWith("/objects/") ? `/api/storage${photoUrl}` : photoUrl}
              alt="Preview"
              className="mx-auto rounded-lg max-h-32 object-cover"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setPhotoUrl(""); }}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        ) : uploading ? (
          <div className="text-muted-foreground text-sm flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" /> Uploading...
          </div>
        ) : (
          <div className="text-muted-foreground">
            <ImageIcon size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Add a photo</p>
            <p className="text-xs">JPG or PNG, shows up in the feed</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Source URL */}
      <div className="relative">
        <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Paste TikTok, Instagram, or YouTube URL..."
          value={sourceUrl}
          onChange={e => setSourceUrl(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      {/* Title */}
      <Input
        placeholder="The hack in one line (e.g. 'Soy sauce + butter = instant umami bomb')"
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={120}
        className="text-sm"
      />

      {/* Caption */}
      <div className="relative">
        <Textarea
          placeholder="Quick notes — what you changed, why it works, any tips (100 chars max)"
          value={caption}
          onChange={e => setCaption(e.target.value.slice(0, 200))}
          rows={2}
          className="text-sm resize-none"
        />
        <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{caption.length}/200</span>
      </div>

      {/* Tags */}
      <div className="relative">
        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="#airfryer, #wings, #remix  (up to 3 tags)"
          value={tags}
          onChange={e => setTags(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={handleSubmit}
          disabled={!title.trim() || createMutation.isPending}
          className="flex-1 rounded-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {createMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          {createMutation.isPending ? "Dropping..." : "Drop the Hack"}
        </Button>
        <p className="text-xs text-muted-foreground">+2 pts for contributing</p>
      </div>
    </div>
  );
}

export default function Videos() {
  const [sort, setSort] = useState<SortKey>("hot");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: videos, isLoading } = useListVideos(
    { sort } as any,
    { query: { queryKey: ["listVideos", sort], enabled: true } }
  );

  const seedHacks = async () => {
    setSeeding(true);
    try {
      await fetch("/api/videos/seed", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["listVideos"] });
    } finally {
      setSeeding(false);
    }
  };

  const allTags = videos ? Array.from(new Set(videos.flatMap(v => v.tags ?? []))) : [];

  const filtered = videos?.filter(v => {
    if (filterTag && !(v.tags ?? []).includes(filterTag)) return false;
    if (sort === "approved") return v.hackStatus === "approved";
    if (sort === "battle_ready") return v.communityUpvotes >= 10 || v.hackStatus === "approved";
    return true;
  });

  const approvedCount = videos?.filter(v => v.hackStatus === "approved").length ?? 0;
  const votingCount = videos?.filter(v => v.hackStatus === "community_voting" || v.hackStatus === "submitted").length ?? 0;
  const battleReadyCount = videos?.filter(v => v.communityUpvotes >= 10 || v.hackStatus === "approved").length ?? 0;

  const sortTabs: { key: SortKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "hot", label: "Hot", icon: <Flame size={13} />, count: votingCount },
    { key: "battle_ready", label: "Battle Ready", icon: <Swords size={13} />, count: battleReadyCount },
    { key: "recent", label: "Recent", icon: <Clock size={13} /> },
    { key: "approved", label: "Cookbook", icon: <Trophy size={13} />, count: approvedCount },
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
              <p className="text-muted-foreground max-w-lg text-sm">
                Drop your doomscroll finds, battle lessons, and recipe remixes. Community votes → AI approves → cookbook → battle created.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
                <CheckCircle2 size={13} className="text-green-600" />
                <span className="text-sm font-semibold text-green-700">{approvedCount}</span>
                <span className="text-xs text-green-600 hidden sm:inline">approved</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
                <ThumbsUp size={13} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">{votingCount}</span>
                <span className="text-xs text-blue-600 hidden sm:inline">voting</span>
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="rounded-full gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-md"
              >
                {showForm ? <X size={16} /> : <Plus size={16} />}
                <span className="hidden sm:inline">{showForm ? "Cancel" : "Drop a Hack"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick hack form */}
        {showForm && (
          <div className="mb-8 bg-card border rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={18} className="text-orange-500" />
              <h2 className="font-bold text-base">Drop a Hack</h2>
              <span className="text-xs text-muted-foreground ml-auto">+2 pts for contributing</span>
            </div>
            {user ? (
              <DropHackForm userId={user.id} onSuccess={() => setShowForm(false)} />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-3">Sign in to drop a hack</p>
                <Link href="/auth">
                  <Button className="rounded-full">Sign In</Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* How it works — compact */}
        <div className="grid grid-cols-4 gap-2 mb-8 p-3 bg-muted/40 rounded-2xl border border-border/50">
          {[
            { icon: <Zap size={14} className="text-orange-500" />, label: "Drop hack", sub: "+2 pts" },
            { icon: <ChevronUp size={14} className="text-blue-500" />, label: "Community votes", sub: "+1 pt/vote" },
            { icon: <Sparkles size={14} className="text-amber-500" />, label: "AI approves", sub: "+5 pts" },
            { icon: <Swords size={14} className="text-orange-600" />, label: "Becomes battle", sub: "+10 pts" },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-7 h-7 rounded-full bg-background border flex items-center justify-center mx-auto mb-1.5 shadow-sm">
                {step.icon}
              </div>
              <p className="text-[11px] font-semibold leading-tight">{step.label}</p>
              <p className="text-[10px] text-muted-foreground">{step.sub}</p>
            </div>
          ))}
        </div>

        {/* Community Cookbook Top Row */}
        {!isLoading && videos && sort !== "approved" && <ApprovedTopRow videos={videos} />}

        {/* Sort Tabs */}
        <div className="flex items-center gap-1 mb-5 bg-muted/50 p-1 rounded-xl border overflow-x-auto">
          {sortTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap min-w-0 ${
                sort === tab.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${sort === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={filterTag === null ? "default" : "outline"}
              className="rounded-full h-7 px-3 text-xs shrink-0"
              onClick={() => setFilterTag(null)}
            >
              All
            </Button>
            {allTags.slice(0, 12).map(tag => (
              <Button
                key={tag}
                variant={filterTag === tag ? "default" : "outline"}
                className="rounded-full h-7 px-3 text-xs shrink-0"
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              >
                #{tag}
              </Button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : !filtered || filtered.length === 0 ? (
            <div className="col-span-full">
              <div className="text-center py-16 border border-dashed rounded-2xl bg-card/50">
                <ChefHat className="mx-auto mb-4 opacity-30" size={48} />
                <p className="font-serif font-bold text-lg mb-1">
                  {sort === "battle_ready" ? "No battle-ready hacks yet" : "No hacks here yet"}
                </p>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  {sort === "battle_ready"
                    ? "Hacks with 10+ votes become battle-ready. Start voting!"
                    : "Be the first to drop a hack you've found doomscrolling."}
                </p>
                <div className="flex items-center gap-3 justify-center">
                  <Button
                    onClick={() => setShowForm(true)}
                    className="rounded-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Plus size={15} /> Drop a Hack
                  </Button>
                  {videos && videos.length === 0 && (
                    <Button
                      variant="outline"
                      onClick={seedHacks}
                      disabled={seeding}
                      className="rounded-full gap-2"
                    >
                      {seeding ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                      Load Demo Hacks
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            filtered.map((video, i) => (
              <div key={video.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 30}ms` }}>
                <HackCard video={video} currentUserId={user?.id ?? 1} />
              </div>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        {filtered && filtered.length > 0 && (
          <div className="mt-12 space-y-6">
            <div className="text-center">
              <div className="inline-flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
                <p className="font-serif font-bold">Found something great while doomscrolling?</p>
                <p className="text-sm text-muted-foreground">Drop the hack — turn recipe scrolling into battle fuel.</p>
                <Button
                  onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="rounded-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus size={15} /> Drop a Hack
                </Button>
              </div>
            </div>

            {/* Cron Status Panel */}
            <CronStatusPanel onPopulate={() => queryClient.invalidateQueries({ queryKey: ["listVideos"] })} />
          </div>
        )}
      </main>
    </div>
  );
}
