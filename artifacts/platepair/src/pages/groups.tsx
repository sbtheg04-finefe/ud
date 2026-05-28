import { useState } from "react";
import { Link } from "wouter";
import {
  useListGroups, getListGroupsQueryKey,
  useListBattles, getListBattlesQueryKey,
} from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Globe, Lock, Plus, Swords, ChevronRight, Flame } from "lucide-react";

type Tab = "active" | "battles" | "circles";

function BattleCard({ battle }: { battle: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {battle.coverImageUrl ? (
        <div className="h-32 w-full overflow-hidden bg-gray-100">
          <img src={battle.coverImageUrl} alt={battle.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50 flex items-center justify-center">
          <Swords size={32} className="text-orange-300" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{battle.title}</h3>
          {battle.battleStatus === "live" && (
            <span className="shrink-0 text-[10px] font-bold bg-red-500 text-white rounded-full px-2 py-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        {battle.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2.5">{battle.description}</p>
        )}
        <div className="flex items-center gap-2 mb-3">
          <Flame size={12} className="text-orange-400" />
          <span className="text-xs text-gray-400">{battle.participantCount ?? 0} cooks joined</span>
          {battle.endDate && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">
                {new Date(battle.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </>
          )}
        </div>
        <Link href={`/battles/${battle.id}`}>
          <button className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold rounded-full py-2.5 transition-all">
            Join
          </button>
        </Link>
      </div>
    </div>
  );
}

function CircleCard({ group }: { group: any }) {
  return (
    <Link href={`/groups/${group.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-orange-200 transition-colors">
        {group.coverImageUrl ? (
          <div className="h-28 w-full overflow-hidden bg-gray-100">
            <img src={group.coverImageUrl} alt={group.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-28 w-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
            <Users size={28} className="text-blue-200" />
          </div>
        )}
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{group.name}</h3>
            <span className="shrink-0">
              {group.visibility === "public"
                ? <Globe size={13} className="text-gray-300" />
                : <Lock size={13} className="text-gray-300" />}
            </span>
          </div>
          {group.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2.5">{group.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={11} /> {group.memberCount ?? 0} members
            </div>
            <ChevronRight size={14} className="text-gray-300" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Groups() {
  const [tab, setTab] = useState<Tab>("battles");

  const { data: groups, isLoading: loadingGroups } = useListGroups({
    query: { enabled: true, queryKey: getListGroupsQueryKey() }
  });

  const { data: battlesData, isLoading: loadingBattles } = useListBattles(
    { battleStatus: "open", limit: 20 } as any,
    { query: { enabled: true, queryKey: [...getListBattlesQueryKey(), "open"] } }
  );

  const battles = (battlesData as any)?.battles ?? (Array.isArray(battlesData) ? battlesData : []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "active",  label: "Active" },
    { id: "battles", label: "Battles" },
    { id: "circles", label: "Circles" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-28">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Circles</h1>
            <p className="text-sm text-gray-500">Battles · Groups · Cook-alongs</p>
          </div>
          <Link href="/groups/create">
            <button className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors">
              <Plus size={16} /> New
            </button>
          </Link>
        </div>

        <div className="flex border-b border-gray-200 mb-5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${
                tab === t.id ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {tab === "active" && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recommended For You</p>
            {loadingBattles ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
              </div>
            ) : battles.slice(0, 4).length > 0 ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {battles.slice(0, 4).map((b: any) => <BattleCard key={b.id} battle={b} />)}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl mb-6">
                <Swords className="mx-auto mb-2 opacity-30" size={32} />
                <p className="text-sm">No active battles right now</p>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Circles</p>
              <Link href="/groups/create">
                <span className="text-xs font-semibold text-orange-500">+ Create</span>
              </Link>
            </div>
            {loadingGroups ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
              </div>
            ) : (groups?.slice(0, 4) ?? []).length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {groups!.slice(0, 4).map(g => <CircleCard key={g.id} group={g} />)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <Users className="mx-auto mb-2 opacity-30" size={28} />
                <p className="text-sm">No circles yet</p>
                <Link href="/groups/create">
                  <button className="mt-3 text-xs font-semibold text-orange-500">Start one →</button>
                </Link>
              </div>
            )}
          </div>
        )}

        {tab === "battles" && (
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <Swords size={22} className="text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-0.5">Start a Cook Battle</h3>
                  <p className="text-sm text-gray-500 mb-3">You set the dish, you set the rules, you decide who competes.</p>
                  <Link href="/battles/create">
                    <button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-full py-2.5 transition-colors">
                      Create a Battle
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Open Battles</p>
            {loadingBattles ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
              </div>
            ) : battles.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <Swords className="mx-auto mb-2 opacity-30" size={32} />
                <p className="text-sm">No open battles yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {battles.map((b: any) => <BattleCard key={b.id} battle={b} />)}
              </div>
            )}
          </div>
        )}

        {tab === "circles" && (
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Users size={22} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-0.5">Start a Cooking Circle</h3>
                  <p className="text-sm text-gray-500 mb-3">Bring your family, friends, or neighborhood together around food.</p>
                  <Link href="/groups/create">
                    <button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-full py-2.5 transition-colors">
                      Create a Circle
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All Circles</p>
            {loadingGroups ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
              </div>
            ) : (groups ?? []).length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <Users className="mx-auto mb-2 opacity-30" size={28} />
                <p className="text-sm">No circles found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {groups!.map(g => <CircleCard key={g.id} group={g} />)}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
