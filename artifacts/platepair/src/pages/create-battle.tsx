import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useListMeals, useListVideos, useCreateBattleFromContent, useCreateBattle, getListMealsQueryKey, getListVideosQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTrack } from "@/hooks/use-track";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Swords, Zap, ChefHat, PlayCircle, Users, Globe, Lock, Flame,
  Link2, ArrowRight, Check, AlertCircle, Loader2, Star, Clock, Sparkles,
  ShoppingCart, Utensils, ExternalLink, RefreshCw,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "🎵",
  instagram: "📸",
  youtube: "▶️",
  twitter: "🐦",
  pinterest: "📌",
  facebook: "👥",
  web: "🌐",
};

const SCOPE_OPTIONS = [
  { value: "circle", label: "My Circle", desc: "Private to your group", icon: Lock },
  { value: "local", label: "Local", desc: "Open to nearby cooks", icon: Users },
  { value: "public", label: "Public", desc: "Anyone can join", icon: Globe },
  { value: "global", label: "Global", desc: "Worldwide tournament", icon: Flame },
];

const CHALLENGE_TYPES = [
  { value: "solo_remake", label: "Solo Remake", desc: "Everyone recreates the dish" },
  { value: "team_battle", label: "Team Battle", desc: "Teams compete head-to-head" },
  { value: "remix_battle", label: "Remix Battle", desc: "Keep the core, add your twist" },
  { value: "speed_battle", label: "Speed Battle", desc: "Fastest successful submission wins" },
  { value: "budget_battle", label: "Budget Battle", desc: "Make it under a cost limit" },
];

interface ExtractedContent {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  platform: string;
  creator: string | null;
  sourceUrl: string;
  suggestedIngredients: string[];
  suggestedTools: string[];
  estimatedTimeMinutes: number | null;
  battleTitle: string;
  battleWorthinessScore: number;
}

type Step = "url" | "confirm" | "settings" | "launch";

export default function CreateBattle() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { data: user } = useCurrentUser();
  const { track } = useTrack();

  const params = new URLSearchParams(search);
  const preSourceType = params.get("sourceType") as "meal" | "video" | null;
  const preSourceId = params.get("sourceId") ? Number(params.get("sourceId")) : null;

  const [step, setStep] = useState<Step>(preSourceType && preSourceId ? "settings" : "url");

  // URL flow state
  const [urlInput, setUrlInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);

  // Fallback (PlatePair content) state
  const [useFallback, setUseFallback] = useState(!!(preSourceType && preSourceId));
  const [sourceType, setSourceType] = useState<"meal" | "video" | "scratch">(preSourceType ?? "meal");
  const [selectedMealId, setSelectedMealId] = useState<number | null>(preSourceType === "meal" ? preSourceId : null);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(preSourceType === "video" ? preSourceId : null);

  // Editable battle details
  const [title, setTitle] = useState(preSourceType ? "" : "");
  const [description, setDescription] = useState("");
  const [scopeType, setScopeType] = useState("public");
  const [challengeType, setChallengeType] = useState("solo_remake");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [customIngredient, setCustomIngredient] = useState("");
  const [registrationDays, setRegistrationDays] = useState(3);
  const [cookingDays, setCookingDays] = useState(2);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { data: meals, isLoading: mealsLoading } = useListMeals({}, { query: { enabled: useFallback && sourceType === "meal", queryKey: getListMealsQueryKey({}) } });
  const { data: videos, isLoading: videosLoading } = useListVideos({}, { query: { enabled: useFallback && sourceType === "video", queryKey: getListVideosQueryKey({}) } });

  const autoCreateMutation = useCreateBattleFromContent({
    mutation: { onSuccess: (battle) => { navigate(`/battles/${battle.id}`); } }
  });

  const createMutation = useCreateBattle({
    mutation: {
      onSuccess: (battle) => {
        track("battle_created", { source: extracted ? "url" : "scratch", platform: extracted?.platform });
        navigate(`/battles/${battle.id}`);
      }
    }
  });

  async function generateAIDescription() {
    if (!title.trim()) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/ai/battle-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), sourceUrl: extracted?.sourceUrl, ingredients }),
      });
      if (res.ok) {
        const data = await res.json() as { description: string; suggestedTags?: string[]; challengePrompt?: string };
        setDescription(data.description);
        if (data.suggestedTags?.length) {
          const newTags = data.suggestedTags.filter((t: string) => !ingredients.includes(t));
          if (newTags.length) setIngredients(prev => [...prev, ...newTags.slice(0, 3)]);
        }
      }
    } catch (e) {
      console.error("AI generation failed:", e);
    } finally {
      setIsGeneratingAI(false);
    }
  }

  async function handleExtractUrl() {
    if (!urlInput.trim()) return;
    setIsExtracting(true);
    setExtractError("");
    try {
      const res = await fetch("/api/battles/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error || "Could not extract content from that URL.");
      } else {
        setExtracted(data as ExtractedContent);
        setTitle(data.battleTitle);
        setDescription(data.description?.slice(0, 200) || "");
        setIngredients(data.suggestedIngredients || []);
        setStep("confirm");
      }
    } catch {
      setExtractError("Network error. Please try again.");
    }
    setIsExtracting(false);
  }

  function handleCreateFromUrl() {
    if (!user || !extracted) return;
    const regEnd = new Date();
    regEnd.setDate(regEnd.getDate() + registrationDays);
    const subDeadline = new Date(regEnd);
    subDeadline.setDate(subDeadline.getDate() + cookingDays);

    createMutation.mutate({
      data: {
        title: title || extracted.battleTitle,
        description,
        sourceType: "external" as any,
        sourceUrl: extracted.sourceUrl,
        sourcePlatform: extracted.platform,
        sourceCreator: extracted.creator ?? undefined,
        sourceThumbnailUrl: extracted.thumbnailUrl ?? undefined,
        coverImageUrl: extracted.thumbnailUrl ?? undefined,
        challengeType: challengeType as any,
        scopeType: scopeType as any,
        createdBy: user.id,
        ingredientList: ingredients,
        optionalSubstitutions: [],
        toolList: [],
        dietaryNotes: [],
        registrationEnd: regEnd.toISOString(),
        submissionDeadline: subDeadline.toISOString(),
      } as any
    });
  }

  function handleAutoCreate() {
    if (!user) return;
    const sourceId = sourceType === "meal" ? selectedMealId : selectedVideoId;
    if (!sourceId) return;
    autoCreateMutation.mutate({
      data: { sourceType: sourceType as "meal" | "video", sourceId, createdBy: user.id, scopeType: scopeType as any }
    });
  }

  const selectedMeal = meals?.find(m => m.id === selectedMealId);
  const selectedVideo = videos?.find(v => v.id === selectedVideoId);

  const worthScore = extracted?.battleWorthinessScore ?? 0;
  const worthColor = worthScore >= 80 ? "text-green-600" : worthScore >= 60 ? "text-amber-600" : "text-gray-500";
  const worthLabel = worthScore >= 80 ? "🔥 Battle Ready" : worthScore >= 60 ? "⚡ Good Pick" : "⚪ Low Activity";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">

        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-1 flex items-center gap-2">
            <Swords className="text-primary" size={28} />
            Start a Battle
          </h1>
          <p className="text-muted-foreground text-sm">Turn any viral food video into a community competition.</p>
        </div>

        {/* STEP: URL paste (primary entry) */}
        {step === "url" && !useFallback && (
          <div className="space-y-6">
            {/* URL hero card */}
            <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6">
              <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-widest mb-3">
                <Link2 className="w-3.5 h-3.5" /> Paste any viral food URL
              </div>
              <p className="text-sm text-gray-600 mb-4">
                TikTok, Instagram Reels, YouTube Shorts — paste the link and we'll auto-build the battle card with ingredients and prep checklist.
              </p>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleExtractUrl(); }}
                  placeholder="https://www.tiktok.com/@chef/video/..."
                  className="rounded-xl flex-1 bg-white"
                  autoFocus
                />
                <Button
                  onClick={handleExtractUrl}
                  disabled={!urlInput.trim() || isExtracting}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 shrink-0"
                >
                  {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
              {extractError && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{extractError}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {["TikTok 🎵", "Instagram 📸", "YouTube ▶️", "Twitter 🐦", "Pinterest 📌"].map(p => (
                  <span key={p} className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded-full">{p}</span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs text-gray-400"><span className="bg-background px-3">or use PlatePair content</span></div>
            </div>

            {/* Fallback options */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "meal", label: "A Meal Post", icon: ChefHat },
                { value: "video", label: "A Cooking Hack", icon: PlayCircle },
                { value: "scratch", label: "From Scratch", icon: Swords },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setSourceType(value as any); setUseFallback(true); }}
                  className="p-4 border-2 rounded-xl text-center transition-all border-border hover:border-primary/40"
                >
                  <Icon size={22} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">{label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Confirm extracted content */}
        {step === "confirm" && extracted && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-xl">Battle Preview</h2>
              <button onClick={() => { setStep("url"); setExtracted(null); }} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Change URL
              </button>
            </div>

            {/* Extracted card preview */}
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              {extracted.thumbnailUrl && (
                <div className="relative">
                  <img src={extracted.thumbnailUrl} alt="" className="w-full h-48 object-cover" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
                      {PLATFORM_ICONS[extracted.platform] || "🌐"} {extracted.platform.charAt(0).toUpperCase() + extracted.platform.slice(1)}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`bg-black/60 text-xs font-bold px-2 py-1 rounded-full ${worthColor} bg-white`}>
                      {worthLabel}
                    </span>
                  </div>
                </div>
              )}
              <div className="p-4">
                {extracted.creator && (
                  <p className="text-xs text-muted-foreground mb-1">Creator: {extracted.creator}</p>
                )}
                <p className="font-medium text-sm line-clamp-2 mb-3">{extracted.title}</p>

                <div className="grid grid-cols-2 gap-3">
                  {extracted.suggestedIngredients.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                        <ShoppingCart className="w-3 h-3" /> Detected ingredients
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {extracted.suggestedIngredients.slice(0, 6).map(ing => (
                          <span key={ing} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100">{ing}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {extracted.estimatedTimeMinutes && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                        <Clock className="w-3 h-3" /> Estimated time
                      </div>
                      <span className="text-sm font-medium">{extracted.estimatedTimeMinutes} min</span>
                    </div>
                  )}
                </div>

                <a href={extracted.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-blue-500 hover:underline">
                  <ExternalLink className="w-3 h-3" /> View original
                </a>
              </div>
            </div>

            {/* Editable battle title */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Battle Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" />
            </div>

            {/* Battle description with AI generation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Battle Description</label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={generateAIDescription}
                  disabled={isGeneratingAI || !title.trim()}
                  className="h-7 text-xs gap-1 text-primary hover:bg-primary/5"
                >
                  {isGeneratingAI ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {isGeneratingAI ? "Writing..." : "AI Generate"}
                </Button>
              </div>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what makes this battle exciting..."
                className="rounded-xl"
                rows={3}
              />
            </div>

            {/* Ingredient editor */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Required Ingredients</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ingredients.map(ing => (
                  <button key={ing} onClick={() => setIngredients(prev => prev.filter(i => i !== ing))}
                    className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                    {ing} ✕
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customIngredient}
                  onChange={e => setCustomIngredient(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && customIngredient.trim()) {
                      setIngredients(prev => [...prev, customIngredient.trim()]);
                      setCustomIngredient("");
                    }
                  }}
                  placeholder="Add ingredient…"
                  className="rounded-xl text-sm flex-1"
                />
                <Button size="sm" variant="outline" onClick={() => {
                  if (customIngredient.trim()) {
                    setIngredients(prev => [...prev, customIngredient.trim()]);
                    setCustomIngredient("");
                  }
                }}>Add</Button>
              </div>
            </div>

            <Button onClick={() => setStep("settings")} className="w-full rounded-xl bg-orange-500 hover:bg-orange-600">
              Set Battle Rules <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* STEP: Settings (scope, challenge type, timing) */}
        {step === "settings" && (
          <div className="space-y-6">
            <h2 className="font-serif font-bold text-xl">Battle Rules</h2>

            {/* Who can join */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Who can join?</label>
              <div className="grid grid-cols-2 gap-2">
                {SCOPE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                  <button key={value} onClick={() => setScopeType(value)}
                    className={`p-3 border-2 rounded-xl text-left transition-all ${scopeType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon size={14} className={scopeType === value ? "text-primary" : "text-muted-foreground"} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Challenge type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Battle format</label>
              <div className="space-y-2">
                {CHALLENGE_TYPES.map(({ value, label, desc }) => (
                  <button key={value} onClick={() => setChallengeType(value)}
                    className={`w-full flex items-center justify-between p-3 border-2 rounded-xl text-left transition-all ${challengeType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    {challengeType === value && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Timing */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Timeline</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Registration window</p>
                  <div className="flex items-center gap-2">
                    {[1, 3, 7].map(d => (
                      <button key={d} onClick={() => setRegistrationDays(d)}
                        className={`flex-1 text-sm py-2 rounded-xl border-2 font-medium transition-colors ${registrationDays === d ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cooking window</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(d => (
                      <button key={d} onClick={() => setCookingDays(d)}
                        className={`flex-1 text-sm py-2 rounded-xl border-2 font-medium transition-colors ${cookingDays === d ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(extracted ? "confirm" : "url")} className="rounded-xl flex-1">
                Back
              </Button>
              <Button onClick={() => setStep("launch")} className="rounded-xl flex-1 bg-orange-500 hover:bg-orange-600">
                Preview & Launch <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Launch */}
        {step === "launch" && (
          <div className="space-y-5">
            <h2 className="font-serif font-bold text-xl">Ready to Launch</h2>

            <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
              {extracted?.thumbnailUrl && (
                <img src={extracted.thumbnailUrl} alt="" className="w-full h-36 object-cover rounded-xl" />
              )}
              <div>
                <h3 className="font-bold text-lg">{title}</h3>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Scope:</span>
                  <span className="font-medium capitalize">{scopeType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{CHALLENGE_TYPES.find(c => c.value === challengeType)?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Registration:</span>
                  <span className="font-medium">{registrationDays} day{registrationDays !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cooking:</span>
                  <span className="font-medium">{cookingDays} day{cookingDays !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {ingredients.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Required ingredients ({ingredients.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ingredients.map(ing => (
                      <span key={ing} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100">{ing}</span>
                    ))}
                  </div>
                </div>
              )}

              {extracted && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
                  <span>{PLATFORM_ICONS[extracted.platform]}</span>
                  <span>Source: {extracted.platform}</span>
                  {extracted.creator && <span>· {extracted.creator}</span>}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("settings")} className="rounded-xl flex-1">
                Back
              </Button>
              <Button
                onClick={extracted ? handleCreateFromUrl : handleAutoCreate}
                disabled={createMutation.isPending || autoCreateMutation.isPending || !title.trim()}
                className="rounded-xl flex-1 bg-orange-500 hover:bg-orange-600 font-semibold"
              >
                {createMutation.isPending || autoCreateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Launching…</>
                ) : (
                  <><Swords className="w-4 h-4 mr-2" /> Launch Battle</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Fallback: from PlatePair content */}
        {useFallback && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-xl">Choose Source</h2>
              <button onClick={() => setUseFallback(false)} className="text-sm text-orange-500 hover:text-orange-600">
                ← Paste URL instead
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "meal", label: "A Meal Post", icon: ChefHat },
                { value: "video", label: "A Cooking Hack", icon: PlayCircle },
                { value: "scratch", label: "From Scratch", icon: Swords },
              ].map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setSourceType(value as any)}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${sourceType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <Icon size={22} className={`mx-auto mb-2 ${sourceType === value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">{label}</p>
                </button>
              ))}
            </div>

            {sourceType === "meal" && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mealsLoading ? Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-16 w-full rounded-xl" />) : meals?.map(meal => (
                  <button key={meal.id} onClick={() => setSelectedMealId(meal.id === selectedMealId ? null : meal.id)}
                    className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl text-left transition-all ${selectedMealId === meal.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    {meal.imageUrl && <img src={meal.imageUrl} alt={meal.title} className="w-14 h-10 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{meal.title}</p>
                      <p className="text-xs text-muted-foreground">{meal.author?.displayName}</p>
                    </div>
                    {selectedMealId === meal.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {sourceType === "video" && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {videosLoading ? Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-16 w-full rounded-xl" />) : videos?.map(video => (
                  <button key={video.id} onClick={() => setSelectedVideoId(video.id === selectedVideoId ? null : video.id)}
                    className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl text-left transition-all ${selectedVideoId === video.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    {video.thumbnailUrl && <img src={video.thumbnailUrl} alt={video.title} className="w-14 h-10 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{video.title}</p>
                      <p className="text-xs text-muted-foreground">{video.author?.displayName}</p>
                    </div>
                    {selectedVideoId === video.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {sourceType === "scratch" && (
              <div className="space-y-3">
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Battle title" className="rounded-xl" />
                <div className="relative">
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What's the challenge? (or let AI write it)"
                    className="rounded-xl pr-3"
                    rows={3}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={generateAIDescription}
                    disabled={isGeneratingAI || !title.trim()}
                    className="absolute bottom-2 right-2 h-7 text-xs gap-1 bg-background border-primary/30 text-primary hover:bg-primary/5"
                  >
                    {isGeneratingAI ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {isGeneratingAI ? "Writing..." : "AI Write"}
                  </Button>
                </div>
              </div>
            )}

            {((sourceType === "meal" && selectedMealId) || (sourceType === "video" && selectedVideoId)) && (
              <Button onClick={() => { setStep("settings"); setExtracted(null); setUseFallback(false); }}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600">
                Set Battle Rules <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
