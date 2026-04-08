import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Swords, Flame, Clock, Trophy, TrendingUp, Star, Zap, Users, BookMarked,
  CalendarCheck, AlertCircle, ChevronRight, Plus, Bell, Award, Sparkles,
} from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";

const POINT_REWARDS = [
  { points: 5, label: "Bonus battle entry", icon: "⚔️" },
  { points: 10, label: "Featured battle promotion", icon: "⭐" },
  { points: 25, label: "Free week of Pro", icon: "🚀" },
  { points: 50, label: "Cookbook publishing", icon: "📚" },
  { points: 100, label: "Free LatePoint booking site", icon: "📅" },
];

const POINT_RULES = [
  { icon: "💬", label: "React to a hack", points: 1 },
  { icon: "⚔️", label: "Join a battle", points: 2 },
  { icon: "🏟️", label: "Create a battle that fills", points: 3 },
  { icon: "🏆", label: "Win a battle", points: 5 },
  { icon: "⚖️", label: "Judge 3+ entries", points: 10 },
];

function useWeeklyPoints() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/points/weekly", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { data, loading };
}

function useLeaderboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/points/leaderboard", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { data, loading };
}

function useMyBattles() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/battles?battleStatus=open&limit=10", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { data, loading };
}

function useNotifications() {
  const [data, setData] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    fetch("/api/notifications", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d.notifications || []); setUnread(d.unreadCount || 0); })
      .catch(() => {});
  }, []);
  return { data, unread };
}

function BattleStatusCard({ battle, userId }: { battle: any; userId: number }) {
  const maxP = battle.maxParticipants ?? 16;
  const minP = battle.minParticipants ?? 4;
  const pct = Math.min(100, Math.round((battle.participantCount / maxP) * 100));
  const isCreator = battle.createdBy === userId;
  const isAtRisk = battle.participantCount < 2;
  const deadline = battle.registrationEnd || battle.submissionDeadline;
  const hoursLeft = deadline ? differenceInHours(new Date(deadline), new Date()) : null;

  return (
    <Link href={`/battles/${battle.id}`}>
      <div className={`border rounded-xl p-4 bg-card hover:shadow-md transition-shadow cursor-pointer ${isAtRisk && isCreator ? "border-amber-300 bg-amber-50" : ""}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{battle.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {isCreator && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Your battle</span>
              )}
              {isAtRisk && isCreator && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <AlertCircle size={10} /> At risk
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{battle.participantCount}/{maxP} cooks</span>
            <span>{Math.max(0, maxP - battle.participantCount)} slots open</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
          </div>
          {hoursLeft !== null && hoursLeft >= 0 && hoursLeft <= 24 && (
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
              <Clock size={10} /> Closes in {hoursLeft}h
            </p>
          )}
          {isAtRisk && isCreator && (
            <p className="text-xs text-amber-700 mt-1">Share your invite link to fill this battle.</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function PointsCard({ points }: { points: any }) {
  if (!points) return null;
  const total = points.total || 0;
  const nextReward = POINT_REWARDS.find(r => r.points > total);
  const progressPct = nextReward ? Math.round((total / nextReward.points) * 100) : 100;

  return (
    <div className="border rounded-2xl p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Zap size={13} /> Weekly Points
        </p>
        <span className="text-2xl font-bold text-primary">{total} pts</span>
      </div>

      {nextReward && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress to next reward</span>
            <span>{total}/{nextReward.points} pts</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Next: <strong>{nextReward.icon} {nextReward.label}</strong> at {nextReward.points} pts
          </p>
        </div>
      )}

      {points.breakdown?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">This week</p>
          {points.breakdown.map((b: any) => (
            <div key={b.reason} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="font-semibold text-primary">+{b.points}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Earn points by:</p>
        <div className="grid grid-cols-2 gap-1">
          {POINT_RULES.map(r => (
            <div key={r.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{r.icon}</span>
              <span>{r.label}</span>
              <span className="ml-auto font-semibold text-foreground">{r.points}pt</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProUpgradeCard() {
  return (
    <div className="border rounded-2xl p-5 bg-gradient-to-br from-primary/5 to-amber-50 border-primary/20 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm">Upgrade to Pro</p>
          <p className="text-xs text-muted-foreground">Unlock your full cooking potential</p>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {[
          "Enter premium battles",
          "Create unlimited battles",
          "Priority battle promotion",
          "Cookbook publishing tools",
          "LatePoint booking unlock",
          "Advanced analytics",
        ].map(b => (
          <li key={b} className="flex items-center gap-2 text-xs">
            <span className="text-green-500 font-bold">✓</span> {b}
          </li>
        ))}
      </ul>
      <Button className="w-full rounded-full text-sm gap-2" size="sm">
        <Sparkles size={13} /> Upgrade to Pro
      </Button>
      <p className="text-[10px] text-center text-muted-foreground">Or earn 25 weekly points for a free Pro week</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: user } = useCurrentUser();
  const { data: points, loading: pointsLoading } = useWeeklyPoints();
  const { data: battles, loading: battlesLoading } = useMyBattles();
  const { data: notifications, unread } = useNotifications();
  const { data: leaderboard, loading: leaderboardLoading } = useLeaderboard();

  const [, navigate] = useLocation();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">Sign in to view your dashboard.</p>
          <Link href="/login"><Button>Sign In</Button></Link>
        </div>
      </div>
    );
  }

  const atRiskBattles = battles.filter(b => b.createdBy === user.id && b.participantCount < 2);
  const activeBattles = battles.filter(b => b.battleStatus === "open" || b.battleStatus === "live");
  const unreadNotifs = notifications.filter((n: any) => !n.is_read);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-1">My Dashboard</h1>
            <p className="text-muted-foreground">Your battles, points, and progress</p>
          </div>
          <Link href="/battles/create">
            <Button className="rounded-full gap-2 shadow-md">
              <Plus size={16} /> New Battle
            </Button>
          </Link>
        </div>

        {/* At-risk alerts */}
        {atRiskBattles.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-300 bg-amber-50 flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-amber-800">
                {atRiskBattles.length} battle{atRiskBattles.length !== 1 ? "s" : ""} need{atRiskBattles.length === 1 ? "s" : ""} more participants
              </p>
              <p className="text-sm text-amber-700">Share your invite links to avoid these battles not starting.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">

            {/* Notifications */}
            {unreadNotifs.length > 0 && (
              <div className="border rounded-2xl p-4 bg-card space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Bell size={15} className="text-primary" />
                  Notifications
                  <span className="ml-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{unreadNotifs.length}</span>
                </p>
                <div className="space-y-2">
                  {unreadNotifs.slice(0, 5).map((n: any) => (
                    <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="text-lg">{n.title.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        {n.data?.battleId && (
                          <Link href={`/battles/${n.data.battleId}`}>
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1 gap-1">
                              View battle <ChevronRight size={10} />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active battles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Swords size={18} className="text-primary" /> Active Battles
                </h2>
                <Link href="/battles">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    All battles <ChevronRight size={12} />
                  </Button>
                </Link>
              </div>
              {battlesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
              ) : activeBattles.length === 0 ? (
                <div className="border border-dashed rounded-2xl p-8 text-center text-muted-foreground">
                  <Swords className="mx-auto mb-3 opacity-30" size={40} />
                  <p className="font-medium mb-2">No active battles yet</p>
                  <Link href="/battles">
                    <Button variant="outline" size="sm" className="rounded-full gap-2 mt-1">
                      <Swords size={14} /> Browse Arena
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBattles.slice(0, 6).map(b => (
                    <BattleStatusCard key={b.id} battle={b} userId={user.id} />
                  ))}
                </div>
              )}
            </div>

            {/* Weekly leaderboard */}
            <div className="border rounded-2xl p-5 bg-card">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Trophy size={13} /> Weekly Leaderboard
              </p>
              {leaderboardLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-9 rounded-lg" />)}
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No points earned yet this week. Be the first!</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((u: any, i: number) => (
                    <div key={u.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <span className="text-base w-5 text-center shrink-0">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{u.display_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1 truncate">{u.display_name}</span>
                      <span className={`text-xs font-bold ${i === 0 ? "text-yellow-600" : "text-primary"}`}>
                        {u.total_points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All point rewards */}
            <div className="border rounded-2xl p-5 bg-card">
              <p className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Award size={13} /> Point Rewards
              </p>
              <div className="space-y-2">
                {POINT_REWARDS.map(r => (
                  <div key={r.points} className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${(points?.total ?? 0) >= r.points ? "bg-green-50 border border-green-200" : "bg-muted/40"}`}>
                    <span className="flex items-center gap-2">
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </span>
                    <span className={`text-xs font-bold ${(points?.total ?? 0) >= r.points ? "text-green-600" : "text-muted-foreground"}`}>
                      {(points?.total ?? 0) >= r.points ? "✓ Unlocked" : `${r.points} pts`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Points card */}
            {pointsLoading ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : (
              <PointsCard points={points} />
            )}

            {/* Pro upgrade */}
            <ProUpgradeCard />

            {/* Quick links */}
            <div className="border rounded-xl p-4 bg-card space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</p>
              <Link href="/battles/create" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                  <Plus size={13} /> Create a Battle
                </Button>
              </Link>
              <Link href="/battles" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                  <Swords size={13} /> Browse Arena
                </Button>
              </Link>
              <Link href="/create" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                  <Sparkles size={13} /> Share a Hack
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
