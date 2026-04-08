import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetBattle, useListBattleEntries, getGetBattleQueryKey, getListBattleEntriesQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronLeft, Trophy, Star, CheckCircle2, Swords } from "lucide-react";

const SCORE_LABELS: Record<string, string> = {
  completionScore: "Completion",
  creativityScore: "Creativity",
  presentationScore: "Presentation",
};

const SCORE_COLORS: Record<string, string> = {
  completionScore: "text-blue-600",
  creativityScore: "text-purple-600",
  presentationScore: "text-orange-600",
};

interface EntryScore {
  completionScore: number;
  creativityScore: number;
  presentationScore: number;
  notes: string;
}

export default function JudgeScore() {
  const { battleId, assignmentId } = useParams<{ battleId: string; assignmentId: string }>();
  const id = Number(battleId);
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: battle, isLoading: battleLoading } = useGetBattle(
    id,
    { query: { enabled: !!id, queryKey: getGetBattleQueryKey(id) } }
  );

  const { data: entries, isLoading: entriesLoading } = useListBattleEntries(
    id,
    { query: { enabled: !!id, queryKey: getListBattleEntriesQueryKey(id) } }
  );

  const [scores, setScores] = useState<Record<number, EntryScore>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getEntryScore = (entryId: number): EntryScore =>
    scores[entryId] ?? { completionScore: 5, creativityScore: 5, presentationScore: 5, notes: "" };

  const updateScore = (entryId: number, field: keyof EntryScore, value: number | string) => {
    setScores(prev => ({
      ...prev,
      [entryId]: { ...getEntryScore(entryId), [field]: value },
    }));
  };

  const getAverage = (entryId: number) => {
    const s = getEntryScore(entryId);
    return ((s.completionScore + s.creativityScore + s.presentationScore) / 3).toFixed(1);
  };

  async function handleSubmit() {
    if (!entries || entries.length === 0) {
      toast({ title: "No entries to score", variant: "destructive" });
      return;
    }

    const asgId = assignmentId || "0";
    setIsSubmitting(true);
    try {
      const payload = entries.map(e => ({
        entryId: e.id,
        ...getEntryScore(e.id),
      }));

      const res = await fetch(`/api/judge/assignments/${asgId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scores: payload }),
      });

      if (!res.ok) throw new Error("Failed to submit scores");

      await queryClient.invalidateQueries({ queryKey: getListBattleEntriesQueryKey(id) });

      setSubmitted(true);
      toast({ title: "Scores submitted!", description: "Your judgement has been recorded." });
    } catch {
      toast({ title: "Failed to submit scores", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (battleLoading || entriesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-48 w-full mb-4" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 max-w-2xl text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-3">Judgement Complete</h1>
          <p className="text-muted-foreground mb-8">
            Your scores have been recorded for <strong>{battle?.title}</strong>. Thank you for your time!
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setLocation("/judge/queue")}>
              Back to Queue
            </Button>
            <Button onClick={() => setLocation(`/battles/${battleId}`)}>
              View Battle
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Link href="/judge/queue" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft size={16} /> Back to Queue
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Star size={20} className="text-purple-600" />
            </div>
            <Badge className="bg-purple-600 text-white">Judge Mode</Badge>
          </div>
          <h1 className="text-2xl font-serif font-bold mb-1">{battle?.title}</h1>
          <p className="text-muted-foreground text-sm">
            Score each entry on a scale of 1–10 across three dimensions.
          </p>
        </div>

        {!entries || entries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Swords size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">No entries have been submitted yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back once participants have submitted their work.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {entries.map((entry, i) => {
              const s = getEntryScore(entry.id);
              const avg = getAverage(entry.id);

              return (
                <Card key={entry.id} className="overflow-hidden animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 80}ms` }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${entry.userId}`} />
                          <AvatarFallback>C</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">Entry #{i + 1}</p>
                          {entry.caption && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{entry.caption}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Average</p>
                        <p className="text-2xl font-bold text-primary">{avg}</p>
                      </div>
                    </div>
                  </CardHeader>

                  {entry.photoUrl && (
                    <div className="px-4 pb-3">
                      <img
                        src={entry.photoUrl}
                        alt={entry.caption ?? "Entry photo"}
                        className="w-full h-48 object-cover rounded-xl"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}

                  {entry.journalNote && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground italic bg-muted/50 p-3 rounded-lg">
                        "{entry.journalNote}"
                      </p>
                    </div>
                  )}

                  <CardContent className="space-y-5">
                    {(["completionScore", "creativityScore", "presentationScore"] as const).map(field => (
                      <div key={field}>
                        <div className="flex justify-between mb-2">
                          <span className={`text-sm font-medium ${SCORE_COLORS[field]}`}>
                            {SCORE_LABELS[field]}
                          </span>
                          <span className="text-sm font-bold w-8 text-right">{s[field]}</span>
                        </div>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[s[field]]}
                          onValueChange={([v]) => updateScore(entry.id, field, v)}
                          className="w-full"
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground">1 — Needs Work</span>
                          <span className="text-[10px] text-muted-foreground">10 — Exceptional</span>
                        </div>
                      </div>
                    ))}

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">
                        Judge Notes <span className="text-[10px]">(optional)</span>
                      </label>
                      <Textarea
                        placeholder="What stood out? Any feedback for the cook..."
                        value={s.notes}
                        onChange={e => updateScore(entry.id, "notes", e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {entries.length} {entries.length === 1 ? "entry" : "entries"} to judge
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2 rounded-full px-6"
                size="lg"
              >
                <Trophy size={18} />
                {isSubmitting ? "Submitting…" : "Submit All Scores"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
