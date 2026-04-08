import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Star, Check, Clock, Trophy, ChevronRight, Zap, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetJudgeProfile, useGetJudgeAssignments,
  getGetJudgeProfileQueryKey, getGetJudgeAssignmentsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function JudgeQueue() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: profile, refetch: refetchProfile } = useGetJudgeProfile({ query: { enabled: !!authUser, queryKey: getGetJudgeProfileQueryKey() } });
  const { data: assignments, refetch } = useGetJudgeAssignments({ query: { enabled: !!authUser, queryKey: getGetJudgeAssignmentsQueryKey() } });

  const pending = (assignments ?? []).filter(a => !a.isAccepted && !a.completedAt);
  const active = (assignments ?? []).filter(a => a.isAccepted && !a.completedAt);
  const completed = (assignments ?? []).filter(a => !!a.completedAt);

  async function acceptAssignment(assignmentId: number, battleId: number) {
    try {
      const res = await fetch(`/api/judge/assignments/${assignmentId}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast({ title: "Assignment accepted!", description: "Taking you to the scoring page…" });
      await refetch();
      setLocation(`/judge/score/${battleId}/${assignmentId}`);
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  }

  async function toggleAvailability() {
    const next = !(profile?.isAvailable ?? true);
    try {
      await fetch("/api/judge/profile/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAvailable: next }),
      });
      await refetchProfile();
      toast({ title: next ? "Now Available" : "Now Unavailable", description: next ? "You may receive new assignments." : "You won't receive new assignments." });
    } catch {
      toast({ title: "Failed to update availability", variant: "destructive" });
    }
  }

  const stats = [
    { label: "Total Judged", value: profile?.totalJudged ?? 0, icon: <Trophy className="w-5 h-5 text-orange-500" /> },
    { label: "Avg Rating", value: profile?.averageRating ? `${profile.averageRating.toFixed(1)}/5` : "—", icon: <Star className="w-5 h-5 text-yellow-500" /> },
    { label: "Status", value: profile?.isVerified ? "Verified" : (profile?.isAvailable ? "Available" : "Unavailable"), icon: <Zap className="w-5 h-5 text-purple-500" /> },
    { label: "Active", value: active.length, icon: <Clock className="w-5 h-5 text-blue-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Judge Queue</div>
              <div className="font-bold text-gray-900">
                {authUser?.displayName ?? "Judge"}
                {profile?.isVerified && (
                  <Badge className="ml-2 bg-purple-100 text-purple-700 text-xs">Verified Judge</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAvailability}
              className={profile?.isAvailable ? "border-green-200 text-green-700 hover:bg-green-50" : "border-gray-200 text-gray-500"}
            >
              {profile?.isAvailable ? "● Available" : "○ Unavailable"}
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm">Back to Feed</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Specialties */}
        {profile?.specialties && profile.specialties.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Your Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map(s => (
                <Badge key={s} className="bg-purple-50 text-purple-700 border border-purple-100">
                  {s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Judge Impact Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <Award className="w-8 h-8 mt-1 shrink-0" />
            <div>
              <h3 className="font-bold text-xl mb-1">Your Impact as a Judge</h3>
              <p className="text-purple-100 text-sm mb-3">
                Battles you judge rank 3x higher in the community feed. Your evaluations build permanent community trust — 
                every approved hack you validate adds to the Community Cookbook with your name attached.
              </p>
              <div className="flex flex-wrap gap-2">
                {["3x feed ranking", "Community Cookbook credit", "Judge Authority Score", "Certified badge"].map(tag => (
                  <span key={tag} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Assignments */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Pending Invitations</h2>
            {pending.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700">{pending.length} new</Badge>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">No pending invitations</p>
              <p className="text-sm text-gray-400">When battles need a judge, you'll get an invitation here. Browse active battles to see what's happening.</p>
              <Link href="/battles">
                <Button className="mt-4" variant="outline">Browse Battles</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(assignment => (
                <div key={assignment.id} className="bg-white rounded-2xl border border-orange-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{assignment.battle.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {assignment.battle.challengeType} · {assignment.battle.battleStatus}
                      </div>
                      {assignment.compensationAmount > 0 && (
                        <div className="text-sm text-green-600 font-medium mt-1">
                          ${assignment.compensationAmount} compensation
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/battles/${assignment.battle.id}`}>
                        <Button size="sm" variant="outline">Preview</Button>
                      </Link>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => acceptAssignment(assignment.id, assignment.battle.id)}
                      >
                        <Check className="w-4 h-4 mr-1" /> Accept
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Assignments */}
        {active.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Active — In Progress</h2>
            <div className="space-y-3">
              {active.map(assignment => (
                <div key={assignment.id} className="bg-white rounded-2xl border border-purple-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="font-semibold text-gray-900">{assignment.battle.title}</div>
                    <div className="text-sm text-gray-500">{assignment.battle.challengeType}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700">Judging</Badge>
                    <Link href={`/judge/score/${assignment.battle.id}/${assignment.id}`}>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1">
                        <Star className="w-3.5 h-3.5" /> Score
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Completed ({completed.length})</h2>
            <div className="space-y-3">
              {completed.map(assignment => (
                <Link key={assignment.id} href={`/battles/${assignment.battle.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity">
                    <div>
                      <div className="font-semibold text-gray-900">{assignment.battle.title}</div>
                      <div className="text-sm text-gray-500">
                        Completed {assignment.completedAt ? new Date(assignment.completedAt).toLocaleDateString() : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700">Done</Badge>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
