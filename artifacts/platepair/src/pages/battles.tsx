import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useListBattles, getListBattlesQueryKey, useGetHotBattles, getGetHotBattlesQueryKey, useToggleBattleBookmark } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swords, Flame, Clock, Users, Trophy, ChevronRight, Star, Zap, Bookmark, BookmarkCheck, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const SCOPE_LABELS: Record<string, { label: string; color: string }> = {
  private: { label: "Circle", color: "bg-violet-100 text-violet-700" },
  circle: { label: "Circle", color: "bg-violet-100 text-violet-700" },
  local: { label: "Local", color: "bg-blue-100 text-blue-700" },
  public: { label: "Public", color: "bg-green-100 text-green-700" },
  global: { label: "Global", color: "bg-orange-100 text-orange-700" },
};

const STATUS_LABELS: Record<string, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "bg-gray-400" },
  open: { label: "Open", dot: "bg-green-500" },
  live: { label: "Live Now", dot: "bg-red-500" },
  judging: { label: "Judging", dot: "bg-amber-500" },
  completed: { label: "Completed", dot: "bg-slate-400" },
  archived: { label: "Archived", dot: "bg-gray-300" },
};

const CHALLENGE_LABELS: Record<string, string> = {
  solo_remake: "Solo Remake",
  team_battle: "Team Battle",
  remix_battle: "Remix Battle",
  speed_battle: "Speed Battle",
  budget_battle: "Budget Battle",
  ingredient_restriction: "Pantry Challenge",
  culture_variation: "Culture Remix",
};

type BattleItem = {
  id: number;
  title: string;
  description?: string | null;
  battleStatus: string;
  scopeType: string;
  challengeType: string;
  coverImageUrl?: string | null;
  battleWorthinessScore: number;
  participantCount: number;
  entryCount: number;
  maxParticipants?: number;
  minParticipants?: number;
  slotsOpen?: number;
  isHot?: boolean;
  isFeatured?: boolean;
  isBookmarked?: boolean;
  registrationEnd?: string | null;
  submissionDeadline?: string | null;
};

function SlotProgress({ filled, total }: { filled: number; total: number }) {
  const pct = Math.min(100, Math.round((filled / Math.max(1, total)) * 100));
  const slotsLeft = Math.max(0, total - filled);
  const color = pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{filled} / {total} participants</span>
        <span>{slotsLeft === 0 ? "Full" : `${slotsLeft} slots open`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ClosingSoonBadge({ deadline }: { deadline: string }) {
  const hoursLeft = differenceInHours(new Date(deadline), new Date());
  if (hoursLeft > 24) return null;
  if (hoursLeft < 0) return <span className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle size={10} />Closed</span>;
  return (
    <span className="text-xs text-amber-600 font-semibold flex items-center gap-1 animate-pulse">
      <Clock size={10} />
      Closes in {hoursLeft}h
    </span>
  );
}

function BattleCard({ battle, onBookmark }: { battle: BattleItem; onBookmark?: (id: number) => void }) {
  const scope = SCOPE_LABELS[battle.scopeType] || SCOPE_LABELS.public;
  const status = STATUS_LABELS[battle.battleStatus] || STATUS_LABELS.open;
  const maxP = battle.maxParticipants ?? 16;
  const slotsOpen = battle.slotsOpen ?? Math.max(0, maxP - battle.participantCount);
  const isAlmostFull = slotsOpen <= 2 && slotsOpen > 0;
  const deadline = battle.registrationEnd || battle.submissionDeadline;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative">
      {/* Bookmark button */}
      {onBookmark && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBookmark(battle.id); }}
          className="absolute top-3 right-12 z-10 bg-background/80 backdrop-blur rounded-full p-1.5 hover:bg-background transition-colors"
          aria-label={battle.isBookmarked ? "Remove bookmark" : "Bookmark battle"}
        >
          {battle.isBookmarked ? (
            <BookmarkCheck size={14} className="text-primary" />
          ) : (
            <Bookmark size={14} className="text-muted-foreground" />
          )}
        </button>
      )}

      {/* Cover image */}
      <div className="relative h-44 bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
        {battle.coverImageUrl ? (
          <img
            src={battle.coverImageUrl}
            alt={battle.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Swords className="text-primary/30" size={56} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/90 backdrop-blur rounded-full px-3 py-1 text-xs font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>

        {/* Score badge */}
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur rounded-full px-2.5 py-1 text-xs font-bold text-primary flex items-center gap-1">
          <Flame size={10} />
          {battle.battleWorthinessScore.toFixed(1)}
        </div>

        {/* Hot / Featured / Almost Full badges */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {battle.isHot && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1">
                <TrendingUp size={10} />
                Hot
              </span>
            )}
            {battle.isFeatured && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                <Star size={10} />
                Featured
              </span>
            )}
            {isAlmostFull && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
                {slotsOpen} slot{slotsOpen !== 1 ? "s" : ""} left!
              </span>
            )}
            {!battle.isHot && !battle.isFeatured && !isAlmostFull && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${scope.color}`}>
                {scope.label}
              </span>
            )}
          </div>
          <span className="text-xs text-white/90 font-medium">
            {CHALLENGE_LABELS[battle.challengeType] || battle.challengeType}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-serif font-bold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {battle.title}
        </h3>
        {battle.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{battle.description}</p>
        )}

        {/* Slot progress bar */}
        <div className="mb-3">
          <SlotProgress filled={battle.participantCount} total={maxP} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Trophy size={12} />
              {battle.entryCount} entries
            </span>
            {deadline ? (
              <ClosingSoonBadge deadline={deadline} />
            ) : battle.submissionDeadline ? (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDistanceToNow(new Date(battle.submissionDeadline), { addSuffix: true })}
              </span>
            ) : null}
          </div>
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}

export default function Battles() {
  const [, setLocation] = useLocation();
  const [filterScope, setFilterScope] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const listParams = filterScope
    ? { scopeType: filterScope as any, battleStatus: filterStatus === "closing_soon" ? "open" as any : filterStatus as any }
    : { battleStatus: filterStatus === "closing_soon" ? "open" as any : filterStatus as any };

  const { data: battles, isLoading } = useListBattles(
    listParams,
    { query: { enabled: true, queryKey: getListBattlesQueryKey(listParams) } }
  );

  const { data: hotBattles } = useGetHotBattles(
    { limit: 3 },
    { query: { enabled: true, queryKey: getGetHotBattlesQueryKey({ limit: 3 }) } }
  );

  const bookmarkMutation = useToggleBattleBookmark();

  const handleBookmark = useCallback((battleId: number) => {
    if (!user) {
      toast({ title: "Sign in to save battles", variant: "default" });
      return;
    }
    bookmarkMutation.mutate({ battleId }, {
      onSuccess: (data) => {
        toast({ title: data.bookmarked ? "Battle saved!" : "Bookmark removed", variant: "default" });
        queryClient.invalidateQueries({ queryKey: getListBattlesQueryKey(listParams) });
        queryClient.invalidateQueries({ queryKey: getGetHotBattlesQueryKey({ limit: 3 }) });
      },
    });
  }, [user, bookmarkMutation, toast, queryClient, listParams]);

  const displayedBattles = filterStatus === "closing_soon"
    ? battles?.filter(b => {
        const d = (b as any).registrationEnd || (b as any).submissionDeadline;
        if (!d) return false;
        return differenceInHours(new Date(d), new Date()) <= 24 && differenceInHours(new Date(d), new Date()) >= 0;
      })
    : battles;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2 flex items-center gap-2">
              <Swords className="text-primary" size={28} />
              Battle Arena
            </h1>
            <p className="text-muted-foreground">Don't just watch — cook, compete, and win.</p>
          </div>
          <Link href="/battles/create">
            <Button className="rounded-full gap-2 shadow-md">
              <Flame size={16} />
              Start a Battle
            </Button>
          </Link>
        </div>

        {/* Hot Battles Section */}
        {hotBattles && hotBattles.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-red-500" size={18} />
              <h2 className="font-bold text-lg">Hot Right Now</h2>
              <span className="text-xs text-muted-foreground ml-auto">Filling fast</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {hotBattles.map((battle) => (
                <Link key={battle.id} href={`/battles/${battle.id}`}>
                  <BattleCard battle={battle as BattleItem} onBookmark={handleBookmark} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { key: "open", label: "Open", dot: "bg-green-500" },
            { key: "live", label: "Live Now", dot: "bg-red-500" },
            { key: "closing_soon", label: "Closing Soon", dot: "bg-amber-500" },
            { key: "judging", label: "Judging", dot: "bg-amber-500" },
            { key: "completed", label: "Completed", dot: "bg-slate-400" },
          ].map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={filterStatus === s.key ? "default" : "outline"}
              className="rounded-full text-xs whitespace-nowrap"
              onClick={() => setFilterStatus(s.key)}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.dot}`} />
              {s.label}
            </Button>
          ))}
        </div>

        {/* Scope filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            size="sm"
            variant={filterScope === null ? "secondary" : "ghost"}
            className="rounded-full text-xs h-7"
            onClick={() => setFilterScope(null)}
          >
            All Scopes
          </Button>
          {["circle", "local", "public", "global"].map((scope) => (
            <Button
              key={scope}
              size="sm"
              variant={filterScope === scope ? "secondary" : "ghost"}
              className="rounded-full text-xs h-7"
              onClick={() => setFilterScope(scope === filterScope ? null : scope)}
            >
              {SCOPE_LABELS[scope]?.label}
            </Button>
          ))}
        </div>

        {/* Battle cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card overflow-hidden">
                <Skeleton className="h-44 w-full" />
                <div className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-2 w-full mb-3 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : !displayedBattles?.length ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
            <Swords className="mx-auto mb-4 opacity-30" size={48} />
            <p className="font-medium mb-2">
              {filterStatus === "closing_soon" ? "No battles closing in the next 24 hours" : "No battles found"}
            </p>
            <p className="text-sm mb-4">Be the first to start a cooking battle!</p>
            <Link href="/battles/create">
              <Button variant="outline" className="rounded-full">Start a Battle</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedBattles.map((battle) => (
              <Link key={battle.id} href={`/battles/${battle.id}`}>
                <BattleCard battle={battle as BattleItem} onBookmark={handleBookmark} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
