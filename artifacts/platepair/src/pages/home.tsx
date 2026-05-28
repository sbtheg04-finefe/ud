import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useGetFeed, useGetFeedSummary, getGetFeedQueryKey, getGetFeedSummaryQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FeedItemCard } from "@/components/shared/feed-item-card";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Link2, Clipboard, Image, Film, FileText, FileCode, Plus, X,
  ArrowUpRight, Loader2, Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
  platform?: string;
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
    setIsLoading(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/link/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch preview");
      setPreview({
        url: url.trim(),
        title: data.title,
        description: data.description,
        image: data.image,
        domain: data.domain,
        platform: data.platform,
      });
    } catch (e: any) {
      setError(e.message ?? "Could not fetch link preview");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim()) fetchPreview(inputValue);
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setInputValue(text.trim());
        fetchPreview(text.trim());
      }
    } catch {
      inputRef.current?.focus();
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (text?.trim()) {
      setInputValue(text.trim());
      fetchPreview(text.trim());
    }
  }

  const fileTypes = [
    { label: "IMG", count: "+5", icon: Image, color: "bg-indigo-100 text-indigo-600", pos: "top-4 left-6" },
    { label: "MOV", count: null, icon: Film, color: "bg-indigo-100 text-indigo-600", pos: "top-4 right-6" },
    { label: "DOCX", count: null, icon: FileText, color: "bg-indigo-100 text-indigo-600", pos: "bottom-4 left-4" },
    { label: "PDF", count: null, icon: FileText, color: "bg-indigo-100 text-indigo-600", pos: "bottom-4 left-1/2 -translate-x-1/2" },
    { label: "MD", count: "+10", icon: FileCode, color: "bg-indigo-100 text-indigo-600", pos: "bottom-4 right-4" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      {/* Link input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Link2 size={18} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Type or paste link..."
          className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
        />
        <button
          type="button"
          onClick={handlePaste}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          title="Paste from clipboard"
        >
          <Clipboard size={16} />
        </button>
      </form>

      {/* Preview result */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Fetching preview…
        </div>
      )}

      {error && (
        <div className="px-4 py-3 text-sm text-red-500 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      {preview && !isLoading && (
        <div className="relative">
          {preview.image && (
            <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
              <img src={preview.image} alt={preview.title ?? ""} className="w-full h-full object-cover" />
              <button
                onClick={() => { setPreview(null); setInputValue(""); }}
                className="absolute top-3 right-3 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className="p-4">
            {preview.domain && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs bg-gray-900 text-white rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1">
                  {preview.domain} <ArrowUpRight size={10} />
                </span>
              </div>
            )}
            {preview.title && <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{preview.title}</h3>}
            {preview.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{preview.description}</p>}
            <div className="flex gap-2 mt-3">
              {isAuthenticated ? (
                <Link href="/create">
                  <button className="flex-1 bg-gray-900 text-white text-xs font-semibold rounded-full px-4 py-2 flex items-center justify-center gap-1.5 hover:bg-gray-700 transition-colors">
                    Save to Hub
                  </button>
                </Link>
              ) : (
                <Link href="/login">
                  <button className="flex-1 bg-gray-900 text-white text-xs font-semibold rounded-full px-4 py-2 flex items-center justify-center gap-1.5 hover:bg-gray-700 transition-colors">
                    Sign in to Save
                  </button>
                </Link>
              )}
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-gray-200 text-gray-700 text-xs font-semibold rounded-full px-4 py-2 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors"
              >
                Visit Link <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* File drop zone */}
      {!preview && !isLoading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative h-44 mx-3 my-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 select-none ${
            isDragging
              ? "border-indigo-400 bg-indigo-50"
              : "border-gray-200 bg-gray-50/60 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.docx,.md" />

          {/* Floating file type badges */}
          <div className="absolute top-3 left-5 flex flex-col items-center gap-1">
            <div className="relative">
              <div className="w-10 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1.5">
                <span className="text-[9px] font-bold text-white bg-gray-900 rounded px-1 py-0.5">IMG</span>
              </div>
              <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-gray-700 text-white rounded-full px-1 font-semibold">+5</span>
            </div>
          </div>

          <div className="absolute top-3 right-5">
            <div className="w-10 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1.5">
              <span className="text-[9px] font-bold text-white bg-gray-900 rounded px-1 py-0.5">MOV</span>
            </div>
          </div>

          <div className="absolute bottom-3 left-4">
            <div className="w-10 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1.5">
              <span className="text-[9px] font-bold text-white bg-gray-900 rounded px-1 py-0.5">DOCX</span>
            </div>
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="w-10 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1.5">
              <span className="text-[9px] font-bold text-white bg-gray-900 rounded px-1 py-0.5">PDF</span>
            </div>
          </div>

          <div className="absolute bottom-3 right-4">
            <div className="relative">
              <div className="w-10 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-end justify-center pb-1.5">
                <span className="text-[9px] font-bold text-white bg-gray-900 rounded px-1 py-0.5">MD</span>
              </div>
              <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-gray-700 text-white rounded-full px-1 font-semibold">+10</span>
            </div>
          </div>

          {/* Center text */}
          <p className="text-sm text-gray-400 font-medium z-10">Drop files here</p>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="z-10 text-xs border border-gray-300 bg-white text-gray-600 rounded-full px-4 py-1.5 hover:border-gray-400 transition-colors font-medium"
          >
            Choose a file
          </button>
        </div>
      )}
    </div>
  );
}

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
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {(["all", "meals", "videos"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : f === "meals" ? "Meals" : "Hacks"}
          </button>
        ))}
      </div>

      {/* Feed cards */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <Skeleton className="h-52 w-full rounded-none" />
              <div className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : filteredFeed?.length === 0 ? (
          <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
            <Utensils className="mx-auto mb-3 opacity-40" size={40} />
            <p className="font-medium text-gray-500">Nothing here yet</p>
            <p className="text-sm mt-1 mb-4">Be the first to share a meal or hack</p>
            <Link href="/create">
              <Button size="sm" className="rounded-full bg-orange-500 hover:bg-orange-600 text-white">
                Share something
              </Button>
            </Link>
          </div>
        ) : (
          filteredFeed?.map((item, i) => (
            <div
              key={`${item.type}-${item.meal?.id || item.video?.id}`}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              <FeedItemCard item={item} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        {/* Link + file input hub */}
        <LinkInputCard />

        {/* Feed */}
        <FeedSection />
      </main>

      {/* Floating add button */}
      <Link href={isAuthenticated ? "/create" : "/login"}>
        <button className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center text-white">
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </Link>
    </div>
  );
}
