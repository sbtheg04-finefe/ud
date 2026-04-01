import { useState } from "react";
import { Link } from "wouter";
import { useListBattles } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swords, Flame, Clock, Users, Trophy, ChevronRight, Star, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

const BATTLE_CLASS_LABELS: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  instant_battle: { label: "Instant Battle", icon: Zap, color: "text-green-600" },
  circle_challenge: { label: "Circle Challenge", icon: Users, color: "text-blue-600" },
  skill_battle: { label: "Skill Battle", icon: Star, color: "text-amber-600" },
  seasonal_showdown: { label: "Seasonal", icon: Flame, color: "text-orange-600" },
  mealkit_remix: { label: "Meal-Kit Remix", icon: Trophy, color: "text-primary" },
};

export default function Battles() {
  const [filterScope, setFilterScope] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("open");

  const { data: battles, isLoading } = useListBattles(
    filterScope ? { scopeType: filterScope as any, battleStatus: filterStatus as any } : { battleStatus: filterStatus as any },
    { query: { enabled: true } }
  );

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

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {["open", "live", "judging", "completed"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? "default" : "outline"}
              className="rounded-full text-xs"
              onClick={() => setFilterStatus(s)}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_LABELS[s]?.dot}`} />
              {STATUS_LABELS[s]?.label}
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
                <Skeleton className="h-48 w-full" />
                <div className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : !battles?.length ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
            <Swords className="mx-auto mb-4 opacity-30" size={48} />
            <p className="font-medium mb-2">No battles found</p>
            <p className="text-sm mb-4">Be the first to start a cooking battle!</p>
            <Link href="/battles/create">
              <Button variant="outline" className="rounded-full">Start a Battle</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {battles.map((battle) => {
              const scope = SCOPE_LABELS[battle.scopeType] || SCOPE_LABELS.public;
              const status = STATUS_LABELS[battle.battleStatus] || STATUS_LABELS.open;
              const battleClass = BATTLE_CLASS_LABELS[battle.battleWorthinessScore >= 8.5 ? "instant_battle" : "circle_challenge"] || BATTLE_CLASS_LABELS.circle_challenge;
              const ClassIcon = battleClass.icon;

              return (
                <Link key={battle.id} href={`/battles/${battle.id}`}>
                  <div className="rounded-2xl border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
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

                      {/* Bottom info */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${scope.color}`}>
                          {scope.label}
                        </span>
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

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {battle.participantCount} joined
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy size={12} />
                            {battle.entryCount} entries
                          </span>
                          {battle.submissionDeadline && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDistanceToNow(new Date(battle.submissionDeadline), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
