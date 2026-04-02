import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Building2, TrendingUp, Trophy, Users, Plus, Sparkles, ArrowRight, Star, Eye, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useListBattles, useGetPartnerProfile, useGetPartnerBattles,
  getGetPartnerProfileQueryKey, getGetPartnerBattlesQueryKey, getListBattlesQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function PartnerDashboard() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [sponsoring, setSponsoring] = useState<number | null>(null);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [selectedBattleId, setSelectedBattleId] = useState<number | null>(null);
  const [sponsorForm, setSponsorForm] = useState({ amount: "", prize: "" });

  const { data: profile } = useGetPartnerProfile({ query: { enabled: !!authUser, queryKey: getGetPartnerProfileQueryKey() } });
  const { data: partnerBattles } = useGetPartnerBattles({ query: { enabled: !!authUser, queryKey: getGetPartnerBattlesQueryKey() } });
  const { data: allBattles } = useListBattles({}, { query: { enabled: true, queryKey: getListBattlesQueryKey({}) } });

  const openBattles = (allBattles ?? []).filter(b => b.battleStatus === "open" || b.battleStatus === "live");

  async function handleSponsor() {
    if (!selectedBattleId) return;
    setSponsoring(selectedBattleId);
    try {
      const res = await fetch("/api/partner/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          battleId: selectedBattleId,
          sponsorshipAmount: parseFloat(sponsorForm.amount) || 0,
          prizeDescription: sponsorForm.prize || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Battle sponsored!", description: "Your brand is now featured on this battle." });
      setShowSponsorModal(false);
      setSponsorForm({ amount: "", prize: "" });
    } catch {
      toast({ title: "Failed to sponsor", description: "Please try again.", variant: "destructive" });
    } finally {
      setSponsoring(null);
    }
  }

  const stats = [
    { label: "Active Sponsorships", value: profile?.activeSponsorships ?? 0, icon: <Trophy className="w-5 h-5 text-orange-500" /> },
    { label: "Total Sponsored", value: profile?.totalSponsored ?? 0, icon: <TrendingUp className="w-5 h-5 text-blue-500" /> },
    { label: "Partner Status", value: profile?.isVerified ? "Verified" : "Active", icon: <Star className="w-5 h-5 text-purple-500" /> },
    { label: "Community Reach", value: "2.5x", icon: <Eye className="w-5 h-5 text-green-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Partner Dashboard</div>
              <div className="font-bold text-gray-900">{profile?.brandName ?? authUser?.displayName ?? "My Brand"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">Back to Feed</Button>
            </Link>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowSponsorModal(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Sponsor a Battle
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Value Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <Sparkles className="w-8 h-8 mt-1 shrink-0" />
            <div>
              <h3 className="font-bold text-xl mb-1">Partner Impact</h3>
              <p className="text-blue-100 text-sm mb-3">
                Sponsored battles get 2.5x more participants on average. Your brand appears on battle cards, 
                winner announcements, and the community cookbook when a hack you backed gets approved.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Brand on battle cards", "Winner announcements", "Hack approvals", "Community leaderboard"].map(tag => (
                  <span key={tag} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* My Sponsored Battles */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Sponsored Battles</h2>
          {(partnerBattles ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">No sponsorships yet</p>
              <p className="text-sm text-gray-400 mb-4">Sponsor a battle below to get your brand in front of thousands of engaged cooks.</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowSponsorModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Sponsor Your First Battle
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(partnerBattles ?? []).map(battle => (
                <Link key={battle.id} href={`/battles/${battle.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="font-semibold text-gray-900">{battle.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{battle.battleStatus} · {battle.challengeType}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-100 text-blue-700">Sponsored</Badge>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Open Battles to Sponsor */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Battles Looking for Sponsors</h2>
            <Link href="/battles">
              <Button variant="ghost" size="sm">Browse All <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
          <div className="space-y-3">
            {openBattles.slice(0, 5).map(battle => (
              <div key={battle.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{battle.title}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {battle.challengeType} · {battle.scopeType} · Score: {Math.round(battle.battleWorthinessScore * 10) / 10}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => { setSelectedBattleId(battle.id); setShowSponsorModal(true); }}
                >
                  Sponsor
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sponsor Modal */}
      {showSponsorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Sponsor a Battle</h3>
            <p className="text-sm text-gray-500 mb-5">Your brand gets featured on the battle card, winner post, and community feed.</p>

            {!selectedBattleId && (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {openBattles.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBattleId(b.id)}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm"
                  >
                    <div className="font-medium">{b.title}</div>
                    <div className="text-gray-400">{b.challengeType}</div>
                  </button>
                ))}
              </div>
            )}

            {selectedBattleId && (
              <div className="rounded-xl bg-blue-50 p-3 mb-4 text-sm text-blue-700">
                Selected: <strong>{openBattles.find(b => b.id === selectedBattleId)?.title}</strong>
                <button onClick={() => setSelectedBattleId(null)} className="ml-2 underline text-blue-500">change</button>
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Sponsorship Amount ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={sponsorForm.amount}
                  onChange={e => setSponsorForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Prize Description (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. $200 gift card + featured product kit"
                  value={sponsorForm.prize}
                  onChange={e => setSponsorForm(p => ({ ...p, prize: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowSponsorModal(false); setSelectedBattleId(null); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!selectedBattleId || !!sponsoring}
                onClick={handleSponsor}
              >
                {sponsoring ? "Sponsoring..." : "Confirm Sponsorship"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
