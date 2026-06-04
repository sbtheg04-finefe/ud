import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, ChefHat, BookOpen, Video, Users, Star, Flame,
  ArrowRight, Swords,
} from "lucide-react";
import {
  useListBattles, getListBattlesQueryKey,
  useListVideos, getListVideosQueryKey,
} from "@workspace/api-client-react";

type Creator = {
  id: number;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  cookingInterests: string[];
};

function useCreators() {
  const [data, setData] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/creators", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { data, loading };
}

const CATEGORY_FILTERS = [
  { id: "all",        label: "All",        emoji: "✨" },
  { id: "baking",     label: "Baking",     emoji: "🎂" },
  { id: "meal-prep",  label: "Meal Prep",  emoji: "🥗" },
  { id: "caribbean",  label: "Caribbean",  emoji: "🌴" },
  { id: "desserts",   label: "Desserts",   emoji: "🍮" },
  { id: "healthy",    label: "Healthy",    emoji: "🥦" },
  { id: "coaching",   label: "Coaching",   emoji: "🏆" },
];

function CreatorCard({ creator }: { creator: Creator }) {
  const initials = creator.displayName.substring(0, 2).toUpperCase();
  return (
    <Link href={`/profile/${creator.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-orange-200 transition-all hover:-translate-y-0.5">
        <div className="h-20 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50" />
        <div className="px-4 pb-4 -mt-8">
          <Avatar className="h-14 w-14 border-4 border-white shadow-sm mb-2">
            <AvatarImage src={creator.avatarUrl || undefined} />
            <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="font-bold text-gray-900 text-sm truncate">{creator.displayName}</div>
          <div className="text-xs text-gray-400 mb-2">@{creator.username}</div>
          {creator.bio && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2.5">{creator.bio}</p>
          )}
          {creator.cookingInterests.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {creator.cookingInterests.slice(0, 2).map(interest => (
                <span key={interest} className="text-[10px] bg-orange-50 text-orange-600 rounded-full px-2 py-0.5 font-medium">
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function FeaturedBattles() {
  const { data: battlesData, isLoading } = useListBattles(
    { battleStatus: "open", limit: 4 } as any,
    { query: { enabled: true, queryKey: [...getListBattlesQueryKey(), "creators-featured"] } }
  );
  const battles = (battlesData as any)?.battles ?? (Array.isArray(battlesData) ? battlesData : []);

  if (!isLoading && battles.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-bold text-gray-900">🔥 Live Challenges</span>
        <Link href="/battles">
          <span className="text-xs font-semibold text-orange-500 flex items-center gap-0.5">See all <ArrowRight size={12} /></span>
        </Link>
      </div>
      <div className="flex flex-col gap-2.5">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          : battles.map((b: any) => (
              <Link key={b.id} href={`/battles/${b.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 flex items-center gap-3 p-3 hover:border-orange-200 transition-colors">
                  {b.coverImageUrl ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      <img src={b.coverImageUrl} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <Swords size={24} className="text-orange-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 line-clamp-1">{b.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{b.participantCount ?? 0} cooks joined</div>
                  </div>
                  <button className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-full px-3 py-1.5 transition-colors">
                    Join
                  </button>
                </div>
              </Link>
            ))
        }
      </div>
    </div>
  );
}

function FeaturedHacks() {
  const { data: vids, isLoading } = useListVideos(
    { limit: 3 } as any,
    { query: { enabled: true, queryKey: [...getListVideosQueryKey(), "creators-hacks"] } }
  );
  const videos = (vids as any)?.videos ?? (Array.isArray(vids) ? vids : []);

  if (!isLoading && videos.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-bold text-gray-900">⚡ Top Hacks</span>
        <Link href="/videos">
          <span className="text-xs font-semibold text-orange-500 flex items-center gap-0.5">See all <ArrowRight size={12} /></span>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="shrink-0 w-36 h-44 rounded-2xl" />)
          : videos.slice(0, 5).map((v: any) => (
              <Link key={v.id} href={`/videos`}>
                <div className="shrink-0 w-36 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                  {v.thumbnailUrl ? (
                    <div className="h-28 w-full overflow-hidden bg-gray-100">
                      <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-28 w-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                      <Video size={24} className="text-blue-300" />
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">{v.title}</p>
                  </div>
                </div>
              </Link>
            ))
        }
      </div>
    </div>
  );
}

export default function Creators() {
  const { data: creators, loading } = useCreators();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = creators.filter(c =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    (c.bio ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-28">

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 mb-4 shadow-sm">
          <Search size={17} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search creators, dishes, or styles…"
            className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 mb-5">
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === cat.id
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              <span>{cat.emoji}</span>{cat.label}
            </button>
          ))}
        </div>

        {/* Featured challenges */}
        <FeaturedBattles />

        {/* Top Hacks */}
        <FeaturedHacks />

        {/* Creators grid */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-bold text-gray-900">👨‍🍳 Creators</span>
          <span className="text-xs text-gray-400">{filtered.length} found</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
            <ChefHat className="mx-auto mb-2 opacity-30" size={36} />
            <p className="text-sm font-medium">No creators found</p>
            <p className="text-xs mt-1">Try a different search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(c => <CreatorCard key={c.id} creator={c} />)}
          </div>
        )}
      </main>
    </div>
  );
}
