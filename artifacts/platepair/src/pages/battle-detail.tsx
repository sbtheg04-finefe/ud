import { useState } from "react";
import { useParams, Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  useGetBattle,
  useListBattleEntries,
  useJoinBattle,
  useSubmitBattleEntry,
  useTrackBattleInterest,
  getGetBattleQueryKey,
  getListBattleEntriesQueryKey,
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Swords, Flame, Clock, Users, Trophy, CheckCircle2, ChevronLeft,
  Camera, BookOpen, Utensils, Wrench, DollarSign, Timer, Star, Zap, ArrowRight,
  Share2, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CHALLENGE_LABELS: Record<string, string> = {
  solo_remake: "Solo Remake",
  team_battle: "Team Battle",
  remix_battle: "Remix Battle",
  speed_battle: "Speed Battle",
  budget_battle: "Budget Battle",
  ingredient_restriction: "Pantry Challenge",
  culture_variation: "Culture Remix",
};

const SCOPE_COLORS: Record<string, string> = {
  private: "bg-violet-100 text-violet-700",
  circle: "bg-violet-100 text-violet-700",
  local: "bg-blue-100 text-blue-700",
  public: "bg-green-100 text-green-700",
  global: "bg-orange-100 text-orange-700",
};

const DIFFICULTY_LABELS = ["", "Easy", "Medium", "Advanced", "Expert", "Master Chef"];
const DIFFICULTY_COLORS = ["", "text-green-600", "text-amber-500", "text-orange-500", "text-red-500", "text-red-700"];

export default function BattleDetail() {
  const { battleId } = useParams();
  const id = Number(battleId);
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showSubmit, setShowSubmit] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [caption, setCaption] = useState("");
  const [journalNote, setJournalNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { data: battle, isLoading } = useGetBattle(id, { query: { enabled: !!id, queryKey: getGetBattleQueryKey(id) } });
  const { data: entries } = useListBattleEntries(id, { query: { enabled: !!id, queryKey: getListBattleEntriesQueryKey(id) } });

  const joinMutation = useJoinBattle({
    mutation: {
      onSuccess: () => {
        setHasJoined(true);
        queryClient.invalidateQueries({ queryKey: getGetBattleQueryKey(id) });
      }
    }
  });

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: battle?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", description: "Battle link copied to clipboard." });
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Battle link copied to clipboard." });
    }
  }

  const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
    draft: [{ label: "Open for Registrations", next: "open" }],
    open: [{ label: "Go Live", next: "live" }, { label: "Archive", next: "archived" }],
    live: [{ label: "Move to Judging", next: "judging" }, { label: "Archive", next: "archived" }],
    judging: [{ label: "Mark Completed", next: "completed" }],
    completed: [],
    archived: [],
  };

  async function updateStatus(nextStatus: string) {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/battles/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: getGetBattleQueryKey(id) });
      toast({ title: "Status updated", description: `Battle is now ${nextStatus}.` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setStatusUpdating(false);
    }
  }

  const submitMutation = useSubmitBattleEntry({
    mutation: {
      onSuccess: () => {
        setHasSubmitted(true);
        setShowSubmit(false);
        queryClient.invalidateQueries({ queryKey: getListBattleEntriesQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetBattleQueryKey(id) });
      }
    }
  });

  const interestMutation = useTrackBattleInterest({});

  function handleTrackPrep() {
    if (user) {
      interestMutation.mutate({ battleId: id, data: { userId: user.id, intentType: "opened_prep" } });
    }
    setShowPrep(true);
  }

  function handleJoin() {
    if (!user) return;
    joinMutation.mutate({ battleId: id, data: { userId: user.id } });
  }

  function handleSubmit() {
    if (!user) return;
    submitMutation.mutate({
      battleId: id,
      data: {
        userId: user.id,
        caption: caption || undefined,
        journalNote: journalNote || undefined,
        photoUrl: photoUrl || undefined,
        substitutionsUsed: [],
      }
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-64 w-full rounded-2xl mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-24 w-full mb-4" />
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Battle not found.</p>
          <Link href="/battles"><Button variant="link">Back to Arena</Button></Link>
        </div>
      </div>
    );
  }

  const req = battle.requirements;
  const isOpen = battle.battleStatus === "open" || battle.battleStatus === "live";
  const scoreColor = battle.battleWorthinessScore >= 8 ? "text-green-600" : battle.battleWorthinessScore >= 6 ? "text-amber-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Hero */}
      <div className="relative w-full h-56 md:h-80 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
        {battle.coverImageUrl ? (
          <img src={battle.coverImageUrl} alt={battle.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Swords className="text-primary/20" size={80} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="absolute top-4 left-4">
          <Link href="/battles">
            <Button size="sm" variant="outline" className="rounded-full bg-background/80 backdrop-blur gap-1">
              <ChevronLeft size={14} /> Arena
            </Button>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className={SCOPE_COLORS[battle.scopeType]}>
              {battle.scopeType === "circle" || battle.scopeType === "private" ? "Circle" : battle.scopeType.charAt(0).toUpperCase() + battle.scopeType.slice(1)}
            </Badge>
            <Badge variant="outline">{CHALLENGE_LABELS[battle.challengeType]}</Badge>
            <div className="flex items-center gap-1 text-xs font-bold">
              <Flame size={12} className={scoreColor} />
              <span className={scoreColor}>{battle.battleWorthinessScore.toFixed(1)} battle score</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-serif font-bold">{battle.title}</h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Stats bar */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground border-b pb-4">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-primary" />
                <strong className="text-foreground">{battle.participantCount}</strong> joined
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy size={14} className="text-accent" />
                <strong className="text-foreground">{battle.entryCount}</strong> entries
              </span>
              {battle.submissionDeadline && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  Closes {formatDistanceToNow(new Date(battle.submissionDeadline), { addSuffix: true })}
                </span>
              )}
              <span className="ml-auto text-xs font-medium">
                By {battle.creator?.displayName}
              </span>
            </div>

            {/* Description */}
            {battle.description && (
              <p className="text-muted-foreground leading-relaxed">{battle.description}</p>
            )}

            {/* Source content link */}
            {(battle.sourceMeal || battle.sourceVideo) && (
              <div className="border rounded-xl p-4 bg-card flex items-center gap-4">
                {(battle.sourceMeal?.imageUrl || battle.sourceVideo?.thumbnailUrl) && (
                  <img
                    src={battle.sourceMeal?.imageUrl || battle.sourceVideo?.thumbnailUrl || ""}
                    className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                    alt="Source"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Challenge based on</p>
                  <p className="font-semibold truncate">{battle.sourceMeal?.title || battle.sourceVideo?.title}</p>
                  {battle.sourceMeal && (
                    <Link href={`/meals/${battle.sourceMeal.id}`}>
                      <Button size="sm" variant="link" className="p-0 h-auto text-xs gap-1">
                        View original meal <ArrowRight size={10} />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Prep checklist */}
            {showPrep && req && (
              <div className="border rounded-2xl p-5 bg-card space-y-5">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  Preparation Checklist
                </h3>

                {req.ingredientList?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Utensils size={14} className="text-primary" /> Required Ingredients
                    </p>
                    <ul className="space-y-1">
                      {req.ingredientList.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-4 h-4 rounded border border-muted-foreground/30 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {req.optionalSubstitutions?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm mb-2 text-muted-foreground">
                      Optional Substitutions (don't have the original? these work too)
                    </p>
                    <ul className="space-y-1">
                      {req.optionalSubstitutions.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">→</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {req.toolList?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Wrench size={14} className="text-muted-foreground" /> Tools Needed
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {req.toolList.map((tool, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{tool}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  {req.estimatedTimeMinutes && (
                    <div className="text-center">
                      <Timer size={18} className="mx-auto mb-1 text-blue-500" />
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-semibold text-sm">{req.estimatedTimeMinutes} min</p>
                    </div>
                  )}
                  {(req.estimatedCostMin || req.estimatedCostMax) && (
                    <div className="text-center">
                      <DollarSign size={18} className="mx-auto mb-1 text-green-500" />
                      <p className="text-xs text-muted-foreground">Cost</p>
                      <p className="font-semibold text-sm">
                        ${req.estimatedCostMin || 0}–${req.estimatedCostMax || "?"}
                      </p>
                    </div>
                  )}
                  {req.difficultyLevel && (
                    <div className="text-center">
                      <Star size={18} className={`mx-auto mb-1 ${DIFFICULTY_COLORS[req.difficultyLevel]}`} />
                      <p className="text-xs text-muted-foreground">Difficulty</p>
                      <p className={`font-semibold text-sm ${DIFFICULTY_COLORS[req.difficultyLevel]}`}>
                        {DIFFICULTY_LABELS[req.difficultyLevel]}
                      </p>
                    </div>
                  )}
                </div>

                {req.dietaryNotes?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Dietary notes: {req.dietaryNotes.join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* Submit entry form */}
            {showSubmit && !hasSubmitted && (
              <div className="border rounded-2xl p-5 bg-card space-y-4">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Camera size={18} className="text-primary" />
                  Submit Your Entry
                </h3>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Photo of your dish</label>
                  <ImageUpload
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    onClear={() => setPhotoUrl("")}
                    label="Add a photo of your dish"
                    hint="Show the community your creation"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Caption</label>
                  <Textarea
                    placeholder="Describe your version of the dish..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                    <BookOpen size={14} className="text-primary" />
                    Cooking Journal <span className="text-muted-foreground font-normal text-xs">(+bonus points)</span>
                  </label>
                  <Textarea
                    placeholder="What did you change? What worked? What would you do differently?"
                    value={journalNote}
                    onChange={(e) => setJournalNote(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="flex-1"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit My Entry"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowSubmit(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {hasSubmitted && (
              <div className="border border-green-200 rounded-2xl p-5 bg-green-50 text-center">
                <CheckCircle2 className="mx-auto mb-2 text-green-600" size={32} />
                <h3 className="font-serif font-bold text-lg text-green-800">Entry Submitted!</h3>
                <p className="text-green-700 text-sm">Your rendition is now in the arena. Good luck!</p>
              </div>
            )}

            {/* Entries */}
            {entries && entries.length > 0 && (
              <div>
                <h3 className="font-serif font-bold text-xl mb-4 flex items-center gap-2">
                  <Trophy size={18} className="text-accent" />
                  Battle Entries ({entries.length})
                </h3>
                <div className="space-y-3">
                  {entries.map((entry, i) => (
                    <div key={entry.id} className="border rounded-xl p-4 bg-card flex gap-4">
                      {entry.photoUrl && (
                        <img
                          src={entry.photoUrl.startsWith("/objects/") ? `/api/storage${entry.photoUrl}` : entry.photoUrl}
                          alt="Entry"
                          className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {i === 0 && (
                            <span className="text-xs font-bold text-yellow-600 flex items-center gap-1">
                              <Trophy size={10} /> #1
                            </span>
                          )}
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={entry.user?.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">{entry.user?.displayName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm">{entry.user?.displayName}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(entry.submittedAt), { addSuffix: true })}
                          </span>
                        </div>
                        {entry.caption && <p className="text-sm text-muted-foreground line-clamp-2">{entry.caption}</p>}
                        {entry.journalNote && (
                          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                            <BookOpen size={10} className="inline mr-1" />
                            {entry.journalNote}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Score: <strong className="text-foreground">{entry.totalScore.toFixed(1)}</strong></span>
                          <span>{entry.peerVotes} votes</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* CTA card */}
            <div className="border rounded-2xl p-5 bg-card text-center space-y-3 sticky top-4">
              {hasJoined || hasSubmitted ? (
                <>
                  <CheckCircle2 className="mx-auto text-green-500" size={32} />
                  <p className="font-semibold text-green-700">You're in the battle!</p>
                  {!hasSubmitted && isOpen && (
                    <Button onClick={() => setShowSubmit(true)} className="w-full">
                      Submit My Entry
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Swords className="mx-auto text-primary opacity-70" size={32} />
                  <p className="font-semibold">Ready to compete?</p>
                  {req && !showPrep && (
                    <Button variant="outline" className="w-full gap-2" onClick={handleTrackPrep}>
                      <CheckCircle2 size={14} />
                      Prepare for Battle
                    </Button>
                  )}
                  {isOpen && (
                    <Button
                      className="w-full gap-2"
                      onClick={handleJoin}
                      disabled={joinMutation.isPending}
                    >
                      <Swords size={14} />
                      {joinMutation.isPending ? "Joining..." : "Join Battle"}
                    </Button>
                  )}
                  {!isOpen && (
                    <p className="text-sm text-muted-foreground">This battle is {battle.battleStatus}</p>
                  )}
                </>
              )}
            </div>

            {/* Quick stats */}
            <div className="border rounded-xl p-4 bg-card space-y-3 text-sm">
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Battle Info</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium">{CHALLENGE_LABELS[battle.challengeType]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Scope</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SCOPE_COLORS[battle.scopeType]}`}>
                    {battle.scopeType.charAt(0).toUpperCase() + battle.scopeType.slice(1)}
                  </span>
                </div>
                {req?.estimatedTimeMinutes && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Est. Time</span>
                    <span className="font-medium">{req.estimatedTimeMinutes} min</span>
                  </div>
                )}
                {req?.difficultyLevel && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Difficulty</span>
                    <span className={`font-medium ${DIFFICULTY_COLORS[req.difficultyLevel]}`}>
                      {DIFFICULTY_LABELS[req.difficultyLevel]}
                    </span>
                  </div>
                )}
                {battle.submissionDeadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="font-medium text-xs">{format(new Date(battle.submissionDeadline), "MMM d")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top entries preview */}
            {battle.topEntries && battle.topEntries.length > 0 && (
              <div className="border rounded-xl p-4 bg-card">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-3">Top Entries</p>
                <div className="space-y-2">
                  {battle.topEntries.map((entry, i) => (
                    <div key={entry.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={entry.user?.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">{entry.user?.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1 truncate">{entry.user?.displayName}</span>
                      <span className="text-xs font-bold text-primary">{entry.totalScore.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleShare}
            >
              <Share2 size={14} /> Share Battle
            </Button>

            {/* Creator Status Management */}
            {user && battle.createdBy === user.id && (() => {
              const transitions = STATUS_TRANSITIONS[battle.battleStatus] ?? [];
              if (transitions.length === 0) return null;
              return (
                <div className="border rounded-xl p-4 bg-amber-50 border-amber-200 space-y-2">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Creator Controls</p>
                  <p className="text-xs text-amber-700">Current status: <strong>{battle.battleStatus}</strong></p>
                  {transitions.map(({ label, next }) => (
                    <Button
                      key={next}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                      disabled={statusUpdating}
                      onClick={() => updateStatus(next)}
                    >
                      <ChevronRight size={12} className="mr-1" /> {label}
                    </Button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
