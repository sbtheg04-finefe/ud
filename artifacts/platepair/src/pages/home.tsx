import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  useGetFeed, getGetFeedQueryKey,
  useListBattles, getListBattlesQueryKey,
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuth } from "@/hooks/use-auth";
import { FeedItemCard } from "@/components/shared/feed-item-card";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChefHat, Flame, Swords, Users, Pencil, X, ArrowRight,
  Link2, Clipboard, ArrowUpRight, Loader2, Utensils,
  CheckCircle2, Circle, ChevronRight,
} from "lucide-react";

// ─── "What's your vibe?" modal ───────────────────────────────────────────────

const VIBES = [
  { id: "new",     emoji: "🍳", label: "Cook something new",       sub: "Try a recipe you've never made" },
  { id: "host",    emoji: "🥘", label: "Host a dinner",            sub: "Plan a meal to share with others" },
  { id: "skill",   emoji: "🔪", label: "Level up a technique",     sub: "Get sharper in the kitchen" },
  { id: "quick",   emoji: "⚡", label: "Beat the clock",           sub: "Quick meals under 30 minutes" },
];

const VIBE_KEY = "platepair_vibe";

function VibeModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(
    () => localStorage.getItem(VIBE_KEY)
  );

  function save() {
    if (selected) localStorage.setItem(VIBE_KEY, selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-900">What's your cooking vibe?</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          We'll use this to surface the right battles, hacks, and circles for you.
        </p>
        <div className="flex flex-col gap-2 mb-6">
          {VIBES.map(v => (
            <button
              key={v.id}
              onClick={() => setSelected(v.id)}
              className={`flex items-center gap-4 w-full rounded-2xl px-4 py-3.5 text-left transition-all border-2 ${
                selected === v.id
                  ? "border-orange-400 bg-orange-50"
                  : "border-transparent bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <span className="text-2xl">{v.emoji}</span>
              <div>
                <div className="font-semibold text-sm text-gray-900">{v.label}</div>
                <div className="text-xs text-gray-500">{v.sub}</div>
              </div>
              {selected === v.id && (
                <CheckCircle2 size={18} className="text-orange-500 ml-auto shrink-0" />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={save}
          className={`w-full py-3.5 rounded-full font-semibold text-sm transition-all ${
            selected
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "bg-orange-200 text-orange-300 cursor-not-allowed"
          }`}
        >
          Set my vibe
        </button>
      </div>
    </div>
  );
}

// ─── Vibe summary card (collapsed state) ─────────────────────────────────────

function VibeCard() {
  const [open, setOpen] = useState(false);
  const saved = localStorage.getItem(VIBE_KEY);
  const vibe = VIBES.find(v => v.id === saved);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3.5 mb-3 hover:border-orange-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-lg">
            {vibe ? vibe.emoji : "🍽️"}
          </div>
          <div className="text-left">
            <div className="text-xs text-orange-500 font-semibold uppercase tracking-wider">What's your vibe?</div>
            <div className="text-sm font-semibold text-gray-800">
              {vibe ? vibe.label : "Set your cooking focus"}
            </div>
          </div>
        </div>
        <Pencil size={15} className="text-gray-400 shrink-0" />
      </button>
      {open && <VibeModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Momentum checklist ───────────────────────────────────────────────────────

const CHECKLIST_KEY = "platepair_checklist";

const STEPS = [
  { id: "share",   icon: ChefHat,  label: "Share your first meal",  sub: "Show the community what you made.", href: "/create" },
  { id: "circles", icon: Users,    label: "Join a cooking circle",   sub: "Find your people.", href: "/groups" },
  { id: "battle",  icon: Swords,   label: "Enter a battle",          sub: "Compete and get feedback.", href: "/battles" },
  { id: "hack",    icon: Flame,    label: "Save a cooking hack",     sub: "Build your personal recipe vault.", href: "/videos" },
];

function MomentumChecklist() {
  const [done, setDone] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]"); } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState(done.length === STEPS.length);

  function toggle(id: string) {
    const next = done.includes(id) ? done.filter(d => d !== id) : [...done, id];
    setDone(next);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
    if (next.length === STEPS.length) setCollapsed(true);
  }

  const progress = done.length / STEPS.length;

  if (collapsed && done.length === STEPS.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between px-4 pt-4 pb-3"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base font-bold text-gray-900">Keep cooking! 🔥</span>
            <span className="text-xs text-gray-400 font-medium">{done.length}/{STEPS.length}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <ChevronRight
          size={18}
          className={`text-gray-400 ml-3 transition-transform ${collapsed ? "" : "rotate-90"}`}
        />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 flex flex-col gap-1">
          {STEPS.map(step => {
            const isDone = done.includes(step.id);
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-3 py-2.5 border-t border-gray-50 first:border-t-0">
                <button onClick={() => toggle(step.id)} className="shrink-0">
                  {isDone
                    ? <CheckCircle2 size={22} className="text-green-500" />
                    : <Circle size={22} className="text-gray-300" />
                  }
                </button>
                <div className={`flex-1 min-w-0 ${isDone ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-orange-400 shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 truncate">{step.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-5">{step.sub}</p>
                </div>
                {!isDone && (
                  <Link href={step.href}>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Recommended battles carousel ────────────────────────────────────────────

function RecommendedBattles() {
  const { data, isLoading } = useListBattles(
    { battleStatus: "open", limit: 8 } as any,
    { query: { enabled: true, queryKey: [...getListBattlesQueryKey(), "open", 8] } }
  );

  const battles = (data as any)?.battles ?? (Array.isArray(data) ? data : []);

  if (!isLoading && battles.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <span className="text-base font-bold text-gray-900">Recommended for You</span>
        <Link href="/battles">
          <span className="text-xs font-semibold text-orange-500 flex items-center gap-0.5">
            See all <ArrowRight size={12} />
          </span>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shrink-0 w-48 rounded-2xl overflow-hidden bg-white border border-gray-100">
                <Skeleton className="h-28 w-full rounded-none" />
                <div className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-1.5" />
                  <Skeleton className="h-3 w-1/2 mb-3" />
                  <Skeleton className="h-8 w-full rounded-full" />
                </div>
              </div>
            ))
          : battles.slice(0, 6).map((battle: any) => (
              <div key={battle.id} className="shrink-0 w-48 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                {battle.coverImageUrl ? (
                  <div className="h-28 w-full overflow-hidden bg-gray-100">
                    <img src={battle.coverImageUrl} alt={battle.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-28 w-full bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                    <Swords size={28} className="text-orange-300" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug mb-1">{battle.title}</p>
                  <p className="text-[10px] text-gray-400 mb-2.5">
                    {battle.participantCount ?? 0} joined
                  </p>
                  <Link href={`/battles/${battle.id}`}>
                    <button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-full py-1.5 transition-colors">
                      Join
                    </button>
                  </Link>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ─── Link paste + file drop ───────────────────────────────────────────────────

interface LinkPreview {
  url: string; title?: string; description?: string;
  image?: string; domain?: string;
}

function LinkInputCard() {
  const { isAuthenticated } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchPreview(url: string) {
    if (!url.trim()) return;
    setIsLoading(true); setError(null); setPreview(null);
    try {
      const res = await fetch("/api/link/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch preview");
      setPreview({ url: url.trim(), title: data.title, description: data.description, image: data.image, domain: data.domain });
    } catch (e: any) {
      setError(e.message ?? "Could not fetch link preview");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) { setInputValue(text.trim()); fetchPreview(text.trim()); }
    } catch { inputRef.current?.focus(); }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
      <form onSubmit={e => { e.preventDefault(); if (inputValue.trim()) fetchPreview(inputValue); }}
        className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Link2 size={17} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Type or paste a food link to save it..."
          className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
        />
        <button type="button" onClick={handlePaste}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600" title="Paste from clipboard">
          <Clipboard size={15} />
        </button>
      </form>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-5 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Fetching preview…
        </div>
      )}

      {error && (
        <div className="px-4 py-3 text-sm text-red-500 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {preview && !isLoading && (
        <div className="relative">
          {preview.image && (
            <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
              <img src={preview.image} alt="" className="w-full h-full object-cover" />
              <button onClick={() => { setPreview(null); setInputValue(""); }}
                className="absolute top-3 right-3 bg-black/70 text-white rounded-full p-1.5">
                <X size={13} />
              </button>
            </div>
          )}
          <div className="p-4">
            {preview.domain && (
              <span className="text-[11px] bg-gray-900 text-white rounded-full px-2.5 py-0.5 font-medium inline-flex items-center gap-1 mb-2">
                {preview.domain} <ArrowUpRight size={9} />
              </span>
            )}
            {preview.title && <h3 className="font-bold text-gray-900 text-sm mb-1 leading-snug">{preview.title}</h3>}
            {preview.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{preview.description}</p>}
            <div className="flex gap-2">
              <Link href={isAuthenticated ? "/create" : "/login"} className="flex-1">
                <button className="w-full bg-gray-900 text-white text-xs font-bold rounded-full px-4 py-2 hover:bg-gray-700 transition-colors">
                  Save to Hub
                </button>
              </Link>
              <a href={preview.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 border border-gray-200 text-gray-700 text-xs font-bold rounded-full px-4 py-2 flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors">
                Visit <ArrowUpRight size={11} />
              </a>
            </div>
          </div>
        </div>
      )}

      {!preview && !isLoading && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault(); setIsDragging(false);
            const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
            if (text?.trim()) { setInputValue(text.trim()); fetchPreview(text.trim()); }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`relative h-40 mx-3 my-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
            isDragging ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-gray-50/60 hover:border-gray-300"
          }`}
        >
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.docx,.md" />
          {/* File type badges */}
          <div className="absolute top-3 left-5">
            <div className="relative">
              <div className="w-9 h-11 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1">
                <span className="text-[8px] font-bold text-white bg-gray-800 rounded px-1 py-0.5">IMG</span>
              </div>
              <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-gray-600 text-white rounded-full px-1 font-bold">+5</span>
            </div>
          </div>
          <div className="absolute top-3 right-5">
            <div className="w-9 h-11 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1">
              <span className="text-[8px] font-bold text-white bg-gray-800 rounded px-1 py-0.5">MOV</span>
            </div>
          </div>
          <div className="absolute bottom-3 left-4">
            <div className="w-9 h-11 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1">
              <span className="text-[8px] font-bold text-white bg-gray-800 rounded px-1 py-0.5">DOCX</span>
            </div>
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="w-9 h-11 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1">
              <span className="text-[8px] font-bold text-white bg-gray-800 rounded px-1 py-0.5">PDF</span>
            </div>
          </div>
          <div className="absolute bottom-3 right-4">
            <div className="relative">
              <div className="w-9 h-11 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1">
                <span className="text-[8px] font-bold text-white bg-gray-800 rounded px-1 py-0.5">MD</span>
              </div>
              <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-gray-600 text-white rounded-full px-1 font-bold">+10</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 font-medium z-10">Drop files here</p>
          <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="z-10 text-xs border border-gray-300 bg-white text-gray-600 rounded-full px-4 py-1.5 font-medium hover:border-gray-400 transition-colors">
            Choose a file
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Feed section ─────────────────────────────────────────────────────────────

function FeedSection() {
  const [filter, setFilter] = useState<"all" | "meals" | "videos">("all");
  const { data: feedData, isLoading } = useGetFeed(undefined, {
    query: { enabled: true, queryKey: getGetFeedQueryKey() },
  });

  const filteredFeed = feedData?.items.filter(item => {
    if (filter === "meals") return item.type === "meal";
    if (filter === "videos") return item.type === "video";
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
        {(["all", "meals", "videos"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : f === "meals" ? "Meals" : "Hacks"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <Skeleton className="h-52 w-full rounded-none" />
                <div className="p-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></div>
              </div>
            ))
          : filteredFeed?.length === 0
          ? (
            <div className="text-center py-14 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <Utensils className="mx-auto mb-3 opacity-40" size={36} />
              <p className="font-semibold text-gray-500 mb-1">Nothing here yet</p>
              <p className="text-sm mb-4">Be the first to share a meal or hack</p>
              <Link href="/create">
                <Button size="sm" className="rounded-full bg-orange-500 hover:bg-orange-600 text-white">
                  Share something
                </Button>
              </Link>
            </div>
          )
          : filteredFeed?.map((item, i) => (
              <div
                key={`${item.type}-${item.meal?.id || item.video?.id}`}
                className="animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
              >
                <FeedItemCard item={item} />
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-28">
        <VibeCard />
        <RecommendedBattles />
        <MomentumChecklist />
        <LinkInputCard />
        <FeedSection />
      </main>
    </div>
  );
}
