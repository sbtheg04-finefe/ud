import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTrack } from "@/hooks/use-track";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat, Building2, Star, Sparkles, Check, ArrowRight, ArrowLeft,
  Copy, Flame, Users, BookOpen, Gavel, Briefcase, Eye, Swords,
  Heart, Zap, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Intent =
  | "join_challenge"
  | "start_circle"
  | "explore"
  | "judge"
  | "partner"
  | "watch";

type CookLevel = "beginner" | "home" | "advanced" | "pro";

interface IntentOption {
  id: Intent;
  label: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  roleHint?: "judge" | "partner";
}

const INTENTS: IntentOption[] = [
  {
    id: "join_challenge",
    label: "Join a Challenge",
    tagline: "Compete in a live dish battle",
    icon: <Swords className="w-6 h-6" />,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  {
    id: "start_circle",
    label: "Start a Circle",
    tagline: "Create your own cooking group",
    icon: <Users className="w-6 h-6" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "explore",
    label: "Explore Meal Ideas",
    tagline: "Discover recipes and hacks from the community",
    icon: <BookOpen className="w-6 h-6" />,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  {
    id: "judge",
    label: "Judge Entries",
    tagline: "Score dishes and earn community authority",
    icon: <Gavel className="w-6 h-6" />,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    roleHint: "judge",
  },
  {
    id: "partner",
    label: "Partner / Sponsor",
    tagline: "Back a challenge with your brand or business",
    icon: <Briefcase className="w-6 h-6" />,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    roleHint: "partner",
  },
  {
    id: "watch",
    label: "Watch & Save",
    tagline: "Just browsing for now — no pressure",
    icon: <Eye className="w-6 h-6" />,
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
];

const COOK_LEVELS: { id: CookLevel; label: string; desc: string; emoji: string }[] = [
  { id: "beginner", label: "Just Getting Started", desc: "Learning the basics", emoji: "🌱" },
  { id: "home", label: "Home Cook", desc: "Comfortable in the kitchen", emoji: "🍳" },
  { id: "advanced", label: "Advanced Cook", desc: "Experimenting with techniques", emoji: "🔪" },
  { id: "pro", label: "Professional", desc: "Chef / food industry background", emoji: "👨‍🍳" },
];

const CUISINE_TAGS = [
  "Asian", "Italian", "Mexican", "Baking", "Grilling",
  "Plant-Based", "Street Food", "Fine Dining", "Budget Meals",
  "Quick & Easy", "World Cuisine", "Fermentation",
];

const PARTNER_CATEGORIES = [
  "Food & Beverage", "Kitchen Equipment", "Ingredients & Spices",
  "Meal Kits", "Food Tech", "Hospitality", "Health & Nutrition",
];

const JUDGE_SPECIALTIES = [
  "Technique", "Flavor", "Presentation", "Innovation",
  "Budget", "Speed", "Cultural Authenticity",
];

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { track } = useTrack();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    track("onboarding_started");
  }, []);

  useEffect(() => {
    if (step > 0) track("onboarding_step_viewed", { step });
  }, [step]);

  const [intent, setIntent] = useState<Intent | null>(null);
  const [cookLevel, setCookLevel] = useState<CookLevel | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);

  const [profile, setProfile] = useState({
    displayName: authUser?.firstName
      ? `${authUser.firstName} ${authUser.lastName ?? ""}`.trim()
      : "",
    username: "",
    referralCode: "",
    circleName: "",
  });

  const [partnerData, setPartnerData] = useState({
    brandName: "",
    brandCategory: "Food & Beverage",
    billingEmail: authUser?.email ?? "",
    website: "",
  });

  const [judgeData, setJudgeData] = useState({
    credentials: "",
    specialties: [] as string[],
    yearsExperience: 0,
  });

  const selectedIntent = INTENTS.find(i => i.id === intent);
  const wantsJudge = intent === "judge";
  const wantsPartner = intent === "partner";

  const roles: string[] = ["user"];
  if (wantsJudge) roles.push("judge");
  if (wantsPartner) roles.push("partner");

  function toggleCuisine(c: string) {
    setCuisines(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  }

  function toggleSpecialty(item: string) {
    const key = item.toLowerCase().replace(/ /g, "_");
    setJudgeData(p => ({
      ...p,
      specialties: p.specialties.includes(key)
        ? p.specialties.filter(s => s !== key)
        : [...p.specialties, key],
    }));
  }

  async function handleComplete() {
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        roles,
        displayName: profile.displayName || authUser?.firstName || "Cook",
        username: profile.username || undefined,
        bio: cookLevel ? `Cooking level: ${cookLevel}` : undefined,
        referralCode: profile.referralCode || undefined,
      };

      if (wantsPartner && partnerData.brandName) {
        body.partnerProfile = {
          brandName: partnerData.brandName,
          brandCategory: partnerData.brandCategory,
          billingEmail: partnerData.billingEmail || authUser?.email,
          website: partnerData.website || undefined,
        };
      }

      if (wantsJudge) {
        body.judgeProfile = {
          credentials: judgeData.credentials || undefined,
          specialties: judgeData.specialties,
          yearsExperience: judgeData.yearsExperience,
        };
      }

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Onboarding failed");

      track("onboarding_completed", { intent, roles });

      window.location.href =
        wantsPartner ? "/partner/dashboard" :
        wantsJudge ? "/judge/queue" :
        intent === "join_challenge" ? "/battles" :
        intent === "start_circle" ? "/groups" :
        "/";
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      setIsSubmitting(false);
    }
  }

  const progressPercent = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex flex-col items-center justify-start pt-8 pb-24 px-4">
      <div className="w-full max-w-2xl">

        {/* Logo + Progress */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shrink-0">
            <ChefHat size={20} />
          </div>
          <div className="flex-1">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-500 rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Step {step + 1} of {TOTAL_STEPS}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 0: INTENT ─────────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step-intent"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Hey{authUser?.firstName ? `, ${authUser.firstName}` : ""}! What are you here to do?
                </h1>
                <p className="text-gray-500">
                  Pick one — you can do everything else too, we just want to get you started fast.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {INTENTS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setIntent(opt.id)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all duration-150 group ${
                      intent === opt.id
                        ? `${opt.bg} ${opt.border} shadow-md`
                        : "bg-white border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className={`mb-2 ${intent === opt.id ? opt.color : "text-gray-400 group-hover:text-gray-600"} transition-colors`}>
                      {opt.icon}
                    </div>
                    <div className={`font-semibold text-sm mb-0.5 ${intent === opt.id ? "text-gray-900" : "text-gray-700"}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-500">{opt.tagline}</div>
                    {opt.roleHint && (
                      <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${opt.bg} ${opt.color}`}>
                        <Sparkles className="w-3 h-3" />
                        {opt.roleHint === "judge" ? "Unlocks Judge role" : "Unlocks Partner role"}
                      </div>
                    )}
                    {intent === opt.id && (
                      <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${opt.color}`}>
                        <Check className="w-3.5 h-3.5" /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white h-11 rounded-xl"
                  disabled={!intent}
                  onClick={() => setStep(1)}
                >
                  Let's go <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <button
                  onClick={() => { setIntent("watch"); setStep(1); }}
                  className="text-sm text-gray-400 hover:text-gray-600 py-1"
                >
                  Just take me in → I'll figure it out
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: PROFILE ─────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-profile"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Your cooking identity</h2>
                <p className="text-gray-500">Just the basics — you can add more to your profile later.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input
                  placeholder="How you appear in the community"
                  value={profile.displayName}
                  onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>How would you describe your cooking level?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COOK_LEVELS.map(lv => (
                    <button
                      key={lv.id}
                      onClick={() => setCookLevel(lv.id)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        cookLevel === lv.id
                          ? "border-orange-400 bg-orange-50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="text-xl mb-1">{lv.emoji}</div>
                      <div className="font-medium text-sm text-gray-800">{lv.label}</div>
                      <div className="text-xs text-gray-500">{lv.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  What cuisines excite you? <span className="text-gray-400 text-xs">(pick any)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_TAGS.map(c => (
                    <button
                      key={c}
                      onClick={() => toggleCuisine(c)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        cuisines.includes(c)
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-11">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-11"
                  disabled={!profile.displayName.trim()}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: FIRST VALUE MOMENT ─────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-value"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-5"
            >
              {/* Join Challenge */}
              {intent === "join_challenge" && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Your first battle is waiting</h2>
                    <p className="text-gray-500">Here's what's live right now — you can jump straight in after setup.</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-5 text-white">
                    <div className="flex items-center gap-2 text-orange-100 text-xs font-medium mb-2 uppercase tracking-wider">
                      <Flame className="w-3.5 h-3.5" /> Live Battle
                    </div>
                    <h3 className="text-xl font-bold mb-1">Best Comfort Bowl Challenge</h3>
                    <p className="text-orange-100 text-sm mb-3">Make your ultimate comfort bowl — rice, noodle, grain or veggie base. Any cuisine. Judged on taste, texture, and warmth.</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>🏆 48 entries</span>
                      <span>⏱ 3 days left</span>
                      <span>⭐ Judged</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-sm text-orange-700">
                    <span className="font-medium">Ready to compete?</span> Complete setup and we'll take you straight to the Battle Arena to join this challenge.
                  </div>
                </>
              )}

              {/* Start Circle */}
              {intent === "start_circle" && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Let's set up your circle</h2>
                    <p className="text-gray-500">A circle is your private cooking group. You run it, set challenges, invite your people.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Circle Name</Label>
                    <Input
                      placeholder="e.g. The Spice Squad, Sunday Brunch Crew"
                      value={profile.circleName}
                      onChange={e => setProfile(p => ({ ...p, circleName: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: "🏡", label: "Friends & Family" },
                      { icon: "💼", label: "Work Crew" },
                      { icon: "🌍", label: "Open Community" },
                    ].map(t => (
                      <div key={t.label} className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                        <div className="text-2xl mb-1">{t.icon}</div>
                        <div className="text-xs font-medium text-gray-700">{t.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                    <span className="font-medium">How it works:</span> Once you're in, you'll get a shareable invite link for your circle. Battles you host there stay private to your group unless you choose to go public.
                  </div>
                </>
              )}

              {/* Judge */}
              {intent === "judge" && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Activate your Judge role</h2>
                    <p className="text-gray-500">Judges are how PlatePair maintains quality and fairness. Battles with a judge rank 3× higher in the community feed.</p>
                  </div>

                  <div className="rounded-2xl bg-purple-50 border-2 border-purple-200 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                        <Star className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-purple-900">Judge role</div>
                        <div className="text-sm text-purple-600">Community certified</div>
                      </div>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {["Score entries across live battles", "Build your Judge Authority Score", "Earn 'Verified Judge' badge on your profile", "Get first access to high-profile battles", "Create your own judged showcases later"].map(p => (
                        <li key={p} className="flex items-start gap-2 text-sm text-purple-800">
                          <Check className="w-3.5 h-3.5 mt-0.5 text-purple-500 shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Your culinary background <span className="text-gray-400 text-xs">(optional)</span></Label>
                      <Input
                        placeholder="e.g. culinary school, home chef, food blogger, 10 years cooking"
                        value={judgeData.credentials}
                        onChange={e => setJudgeData(p => ({ ...p, credentials: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Judge specialties <span className="text-gray-400 text-xs">(pick what you know)</span></Label>
                      <div className="flex flex-wrap gap-2">
                        {JUDGE_SPECIALTIES.map(item => {
                          const key = item.toLowerCase().replace(/ /g, "_");
                          return (
                            <button
                              key={item}
                              onClick={() => toggleSpecialty(item)}
                              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                                judgeData.specialties.includes(key)
                                  ? "bg-purple-500 text-white border-purple-500"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
                              }`}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Partner */}
              {intent === "partner" && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Set up your brand</h2>
                    <p className="text-gray-500">Partners sponsor battles and supply prizes, ingredients, or visibility — and get analytics on every campaign.</p>
                  </div>

                  <div className="rounded-2xl bg-indigo-50 border-2 border-indigo-200 p-5 mb-2">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-indigo-900">Partner role</div>
                        <div className="text-sm text-indigo-600">Sponsored battles get 2.5× more participants</div>
                      </div>
                    </div>
                    <ul className="space-y-2 mb-2">
                      {["Brand tag on every sponsored battle card", "Prize attachment to battle results", "Partner analytics dashboard", "Create follow-on campaigns from wins", "Support local & regional activations"].map(p => (
                        <li key={p} className="flex items-start gap-2 text-sm text-indigo-800">
                          <Check className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Brand Name <span className="text-red-400">*</span></Label>
                      <Input
                        placeholder="e.g. Spice & Co."
                        value={partnerData.brandName}
                        onChange={e => setPartnerData(p => ({ ...p, brandName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <select
                        value={partnerData.brandCategory}
                        onChange={e => setPartnerData(p => ({ ...p, brandCategory: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                      >
                        {PARTNER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Contact Email <span className="text-red-400">*</span></Label>
                      <Input
                        type="email"
                        placeholder="billing@yourbrand.com"
                        value={partnerData.billingEmail}
                        onChange={e => setPartnerData(p => ({ ...p, billingEmail: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website <span className="text-gray-400 text-xs">(optional)</span></Label>
                      <Input
                        placeholder="https://yourbrand.com"
                        value={partnerData.website}
                        onChange={e => setPartnerData(p => ({ ...p, website: e.target.value }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Explore / Watch */}
              {(intent === "explore" || intent === "watch") && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {intent === "explore" ? "Here's what's trending" : "Take a look around"}
                    </h2>
                    <p className="text-gray-500">No pressure. Explore at your own pace — everything's available from day one.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: <Flame className="w-5 h-5" />, label: "Live Battles", desc: "48 active right now", color: "text-orange-600", bg: "bg-orange-50" },
                      { icon: <Heart className="w-5 h-5" />, label: "Community Feed", desc: "1,200+ meal posts", color: "text-red-500", bg: "bg-red-50" },
                      { icon: <Zap className="w-5 h-5" />, label: "Cooking Hacks", desc: "AI-reviewed tips", color: "text-yellow-600", bg: "bg-yellow-50" },
                    ].map(card => (
                      <div key={card.label} className={`rounded-2xl ${card.bg} p-4`}>
                        <div className={`${card.color} mb-2`}>{card.icon}</div>
                        <div className="font-semibold text-sm text-gray-800">{card.label}</div>
                        <div className="text-xs text-gray-500">{card.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600">
                    <p className="font-medium text-gray-700 mb-1">You can always upgrade later</p>
                    <p>When you're ready to compete, judge, or bring your brand — just tap your profile and expand your role. No forms to redo.</p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-11"
                  disabled={
                    (intent === "partner" && (!partnerData.brandName.trim() || !partnerData.billingEmail.trim()))
                  }
                  onClick={() => setStep(3)}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: INVITE MOMENT ──────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step-invite"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Bring your people in</h2>
                <p className="text-gray-500">
                  {intent === "start_circle"
                    ? "Circles are more fun with 3+ people — here's your invite link the moment you're set up."
                    : "Know someone who should join? This is the moment to invite them."}
                </p>
              </div>

              {/* "Who invited you?" */}
              <div className="rounded-2xl border-2 border-dashed border-gray-200 p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Did someone invite you?</p>
                <Input
                  placeholder="Paste their referral code (optional)"
                  value={profile.referralCode}
                  onChange={e => setProfile(p => ({ ...p, referralCode: e.target.value.toUpperCase().trim() }))}
                  maxLength={16}
                  className="font-mono tracking-widest uppercase"
                />
                <p className="text-xs text-gray-400">Entering a code connects you to their circle automatically.</p>
              </div>

              {/* Who to invite */}
              <div className="rounded-2xl bg-white border border-gray-100 p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Who should be in your PlatePair network?</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: "🍽️", label: "A foodie friend", desc: "to compete with you" },
                    { icon: "⭐", label: "Someone who judges fairly", desc: "to score your dishes" },
                    { icon: "🏢", label: "A local business", desc: "to sponsor your battles" },
                    { icon: "👨‍👩‍👧", label: "Your household / family", desc: "private circle" },
                  ].map(card => (
                    <div key={card.label} className="rounded-xl bg-gray-50 p-3">
                      <div className="text-lg mb-1">{card.icon}</div>
                      <div className="text-xs font-medium text-gray-800">{card.label}</div>
                      <div className="text-xs text-gray-500">{card.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-xs text-orange-700">
                  <Globe className="w-3.5 h-3.5 inline mr-1" />
                  Your personal invite link will be ready once you complete setup — you'll see it on your welcome screen.
                </div>
              </div>

              {/* Soft role upgrade cards — only for basic users */}
              {!wantsJudge && !wantsPartner && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Want to expand your impact?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Star className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-700">Add Judge role</span>
                      </div>
                      <p className="text-xs text-purple-600">Your battles rank 3× higher in the feed. No mandatory judging — just increases prestige.</p>
                    </div>
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-semibold text-indigo-700">Add Partner role</span>
                      </div>
                      <p className="text-xs text-indigo-600">Bring a brand in. Sponsored challenges get 2.5× more entries on average.</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-400">You can activate these any time from your profile — no forms to redo.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-11"
                  onClick={() => setStep(4)}
                >
                  Almost there <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: WELCOME ─────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step-welcome"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                You're in, {profile.displayName || authUser?.firstName || "Chef"}!
              </h2>
              <p className="text-gray-500 mb-6 text-base">
                {intent === "join_challenge" && "Head to the Battle Arena — your first battle is waiting."}
                {intent === "start_circle" && "Your circle is ready to launch. Invite your people and set your first challenge."}
                {intent === "judge" && "Your Judge profile is live. The queue is already showing battles that need you."}
                {intent === "partner" && "Your brand is set up. Browse live battles and sponsor your first one."}
                {(intent === "explore" || intent === "watch") && "The whole community is open to you. Explore, save, and jump in whenever you're ready."}
              </p>

              {/* What's unlocked */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 mb-5 text-left">
                <p className="text-sm font-semibold text-gray-700 mb-3">What you've unlocked:</p>
                <ul className="space-y-2">
                  {[
                    "Full access to the community feed, groups, and hacks",
                    "Submit meals and enter any open battle",
                    "Save dishes to your personal collection",
                    ...(wantsJudge ? ["Judge battles and build your Authority Score", "Verified Judge badge on your profile"] : []),
                    ...(wantsPartner ? ["Sponsor battles as " + (partnerData.brandName || "your brand"), "Partner analytics dashboard", "Brand tag on sponsored battle cards"] : []),
                    intent === "start_circle" ? (profile.circleName ? `Launch "${profile.circleName}" and invite your crew` : "Start your private circle") : null,
                  ].filter(Boolean).map(p => (
                    <li key={p as string} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-green-600" />
                      </div>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Referral code */}
              {authUser?.referralCode && (
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 mb-5 text-left">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-2">Your invite code — share to grow your circle</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-orange-200 rounded-lg px-4 py-2 text-lg font-mono font-bold text-orange-600 tracking-widest">
                      {authUser.referralCode}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-200 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        navigator.clipboard.writeText(authUser?.referralCode ?? "");
                        toast({ title: "Copied!", description: "Share it with anyone — they'll land in your circle." });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-orange-500 mt-2">
                    Anyone who signs up with your code automatically joins your cooking circle.
                  </p>
                </div>
              )}

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base rounded-xl"
                disabled={isSubmitting}
                onClick={handleComplete}
              >
                {isSubmitting ? "Setting things up…" : (
                  intent === "join_challenge" ? "Go to Battle Arena →" :
                  intent === "start_circle" ? "Launch My Circle →" :
                  intent === "judge" ? "Open Judge Queue →" :
                  intent === "partner" ? "Go to Partner Dashboard →" :
                  "Start Exploring →"
                )}
              </Button>

              <button
                onClick={handleComplete}
                className="mt-3 text-sm text-gray-400 hover:text-gray-600"
              >
                Take me to the main feed instead
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
