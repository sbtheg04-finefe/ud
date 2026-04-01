import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useListMeals, useListVideos, useCreateBattleFromContent, useCreateBattle } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Zap, ChefHat, PlayCircle, Users, Globe, Lock, ChevronRight, Flame } from "lucide-react";

const SCOPE_OPTIONS = [
  { value: "circle", label: "My Circle", desc: "Private to your group", icon: Lock },
  { value: "local", label: "Local", desc: "Open to nearby cooks", icon: Users },
  { value: "public", label: "Public", desc: "Anyone can join", icon: Globe },
  { value: "global", label: "Global Dash", desc: "Worldwide tournament", icon: Flame },
];

const CHALLENGE_TYPES = [
  { value: "solo_remake", label: "Solo Remake", desc: "Each person recreates the dish solo" },
  { value: "team_battle", label: "Team Battle", desc: "Teams compete against each other" },
  { value: "remix_battle", label: "Remix Battle", desc: "Preserve the core, add your twist" },
  { value: "speed_battle", label: "Speed Battle", desc: "Fastest successful submission wins" },
  { value: "budget_battle", label: "Budget Battle", desc: "Make the dish under a cost limit" },
];

type Step = "source" | "type" | "details" | "confirm";

export default function CreateBattle() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { data: user } = useCurrentUser();

  const params = new URLSearchParams(search);
  const preSourceType = params.get("sourceType") as "meal" | "video" | null;
  const preSourceId = params.get("sourceId") ? Number(params.get("sourceId")) : null;

  const [step, setStep] = useState<Step>(preSourceType && preSourceId ? "type" : "source");
  const [sourceType, setSourceType] = useState<"meal" | "video" | "scratch">(preSourceType ?? "meal");
  const [selectedMealId, setSelectedMealId] = useState<number | null>(preSourceType === "meal" ? preSourceId : null);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(preSourceType === "video" ? preSourceId : null);
  const [scopeType, setScopeType] = useState("public");
  const [challengeType, setChallengeType] = useState("solo_remake");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: meals, isLoading: mealsLoading } = useListMeals({}, { query: { enabled: sourceType === "meal" } });
  const { data: videos, isLoading: videosLoading } = useListVideos({}, { query: { enabled: sourceType === "video" } });

  const autoCreateMutation = useCreateBattleFromContent({
    mutation: {
      onSuccess: (battle) => {
        navigate(`/battles/${battle.id}`);
      }
    }
  });

  const createMutation = useCreateBattle({
    mutation: {
      onSuccess: (battle) => {
        navigate(`/battles/${battle.id}`);
      }
    }
  });

  function handleAutoCreate() {
    if (!user) return;
    const sourceId = sourceType === "meal" ? selectedMealId : selectedVideoId;
    if (!sourceId) return;

    autoCreateMutation.mutate({
      data: {
        sourceType: sourceType as "meal" | "video",
        sourceId,
        createdBy: user.id,
        scopeType: scopeType as any,
      }
    });
  }

  function handleManualCreate() {
    if (!user || !title) return;

    createMutation.mutate({
      data: {
        title,
        description,
        sourceType: sourceType === "scratch" ? "external" : sourceType as any,
        sourceMealId: selectedMealId,
        sourceVideoId: selectedVideoId,
        challengeType: challengeType as any,
        scopeType: scopeType as any,
        createdBy: user.id,
        ingredientList: [],
        optionalSubstitutions: [],
        toolList: [],
        dietaryNotes: [],
      }
    });
  }

  const selectedMeal = meals?.find(m => m.id === selectedMealId);
  const selectedVideo = videos?.find(v => v.id === selectedVideoId);
  const selectedSource = selectedMeal || selectedVideo;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2 flex items-center gap-2">
            <Swords className="text-primary" size={28} />
            Start a Battle
          </h1>
          <p className="text-muted-foreground">Turn a meal or cooking hack into a community competition.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          {(["source", "type", "details", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s === step ? "bg-primary text-white" :
                (["source", "type", "details", "confirm"].indexOf(step) > i) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              {i < 3 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Source */}
        {step === "source" && (
          <div className="space-y-6">
            <h2 className="font-serif font-bold text-xl">What's the battle based on?</h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "meal", label: "A Meal Post", icon: ChefHat },
                { value: "video", label: "A Cooking Hack", icon: PlayCircle },
                { value: "scratch", label: "From Scratch", icon: Swords },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setSourceType(value as any)}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    sourceType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon size={24} className={`mx-auto mb-2 ${sourceType === value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">{label}</p>
                </button>
              ))}
            </div>

            {/* Meal picker */}
            {sourceType === "meal" && (
              <div>
                <p className="text-sm font-medium mb-3">Choose a meal post:</p>
                {mealsLoading ? (
                  <div className="space-y-2">{Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {meals?.map(meal => (
                      <button
                        key={meal.id}
                        onClick={() => setSelectedMealId(meal.id === selectedMealId ? null : meal.id)}
                        className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl text-left transition-all ${
                          selectedMealId === meal.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                      >
                        {meal.imageUrl && (
                          <img src={meal.imageUrl} alt={meal.title} className="w-14 h-10 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{meal.title}</p>
                          <p className="text-xs text-muted-foreground">{meal.author?.displayName}</p>
                        </div>
                        {selectedMealId === meal.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Video picker */}
            {sourceType === "video" && (
              <div>
                <p className="text-sm font-medium mb-3">Choose a cooking hack video:</p>
                {videosLoading ? (
                  <div className="space-y-2">{Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {videos?.map(video => (
                      <button
                        key={video.id}
                        onClick={() => setSelectedVideoId(video.id === selectedVideoId ? null : video.id)}
                        className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl text-left transition-all ${
                          selectedVideoId === video.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                      >
                        {video.thumbnailUrl && (
                          <img src={video.thumbnailUrl} alt={video.title} className="w-14 h-10 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground">{video.author?.displayName}</p>
                        </div>
                        {selectedVideoId === video.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep("type")}
                disabled={sourceType !== "scratch" && !selectedMealId && !selectedVideoId}
                className="gap-2"
              >
                Next <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Type */}
        {step === "type" && (
          <div className="space-y-6">
            <h2 className="font-serif font-bold text-xl">What kind of battle?</h2>

            <div className="space-y-2">
              {CHALLENGE_TYPES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setChallengeType(value)}
                  className={`w-full flex items-center gap-3 p-4 border-2 rounded-xl text-left transition-all ${
                    challengeType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${challengeType === value ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <h3 className="font-semibold text-base">Scope</h3>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setScopeType(value)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    scopeType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <Icon size={18} className={`mb-2 ${scopeType === value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("source")}>Back</Button>
              <Button onClick={() => setStep("details")} className="gap-2">
                Next <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === "details" && (
          <div className="space-y-6">
            <h2 className="font-serif font-bold text-xl">Battle Details</h2>

            {sourceType !== "scratch" && selectedSource && (
              <div className="border rounded-xl p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Auto-generating battle from:</p>
                <p className="font-semibold">{selectedSource.title}</p>
                <p className="text-xs text-muted-foreground">PlatePair will auto-fill ingredients, tools, and requirements</p>
              </div>
            )}

            {sourceType === "scratch" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Battle Title *</label>
                  <Input
                    placeholder="e.g. Weekend Pasta Showdown"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Textarea
                    placeholder="Describe the challenge and what participants need to cook..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("type")}>Back</Button>
              <Button onClick={() => setStep("confirm")} disabled={sourceType === "scratch" && !title} className="gap-2">
                Review <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && (
          <div className="space-y-6">
            <h2 className="font-serif font-bold text-xl">Ready to launch?</h2>

            <div className="border rounded-2xl p-5 bg-card space-y-4">
              <div className="flex items-start gap-3">
                <Swords className="text-primary flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">Battle source</p>
                  <p className="font-semibold">{selectedSource?.title || title || "Custom Battle"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Flame className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">Challenge type</p>
                  <p className="font-semibold">{CHALLENGE_TYPES.find(c => c.value === challengeType)?.label}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">Scope</p>
                  <p className="font-semibold">{SCOPE_OPTIONS.find(s => s.value === scopeType)?.label}</p>
                </div>
              </div>
            </div>

            {sourceType !== "scratch" && (
              <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 text-sm text-muted-foreground">
                <Zap size={14} className="inline mr-1 text-primary" />
                PlatePair will automatically generate the ingredient list, tool checklist, prep time estimate, and difficulty score from the source content.
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("details")}>Back</Button>
              <Button
                onClick={sourceType !== "scratch" ? handleAutoCreate : handleManualCreate}
                disabled={autoCreateMutation.isPending || createMutation.isPending}
                className="flex-1 gap-2"
              >
                <Swords size={16} />
                {autoCreateMutation.isPending || createMutation.isPending ? "Launching..." : "Launch Battle"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
