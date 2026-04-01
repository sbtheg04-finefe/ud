import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Building2, Star, Sparkles, Check, ArrowRight, ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Tier = "user" | "partner" | "judge";

interface TierCard {
  id: Tier[];
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  perks: string[];
  incentive?: string;
}

const TIERS: TierCard[] = [
  {
    id: ["user"],
    title: "Just Cook",
    subtitle: "Community member",
    icon: <ChefHat className="w-8 h-8" />,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    perks: [
      "Share meals & cooking hacks",
      "Join & vote on community battles",
      "Build your Cook's Portfolio",
      "Follow cooks in your circles",
    ],
  },
  {
    id: ["user", "partner"],
    title: "Bring Your Brand",
    subtitle: "Community member + brand partner",
    icon: <Building2 className="w-8 h-8" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    perks: [
      "Everything in Just Cook",
      "Sponsor battles with your brand",
      "Prize tags on your sponsored battles",
      "Brand visibility in battle results",
      "Partner analytics dashboard",
    ],
    incentive: "Sponsored battles get 2.5x more participants on average",
  },
  {
    id: ["user", "judge"],
    title: "Become a Judge",
    subtitle: "Community member + certified judge",
    icon: <Star className="w-8 h-8" />,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    perks: [
      "Everything in Just Cook",
      "Judge battle entries",
      "Validate community cooking hacks",
      "Build your Judge Authority Score",
      "Earn 'Certified Judge' badges",
    ],
    incentive: "Battles with judges rank 3x higher in the community feed",
  },
  {
    id: ["user", "partner", "judge"],
    title: "Full Package",
    subtitle: "Cook · Brand · Judge",
    icon: <Sparkles className="w-8 h-8" />,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    perks: [
      "Everything from all tiers",
      "Sponsor battles AND judge them",
      "Maximum community authority",
      "Category expert status",
      "Priority in battle matchmaking",
    ],
    incentive: "Full-package members generate 5x more community engagement",
  },
];

const COOKING_INTERESTS = [
  "Asian Cuisine", "Italian", "Mexican", "Baking", "Grilling",
  "Plant-Based", "Fermentation", "Pastry", "Street Food", "Fine Dining",
  "Budget Cooking", "Meal Prep", "Quick Meals", "World Cuisine",
];

const JUDGE_SPECIALTIES = [
  "Technique", "Flavor", "Presentation", "Innovation",
  "Budget", "Speed", "Cultural Authenticity",
];

const PARTNER_CATEGORIES = [
  "Food & Beverage", "Kitchen Equipment", "Ingredients & Spices",
  "Meal Kits", "Food Tech", "Hospitality", "Health & Nutrition",
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [selectedTier, setSelectedTier] = useState<TierCard | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [profile, setProfile] = useState({
    displayName: authUser?.firstName ? `${authUser.firstName} ${authUser.lastName ?? ""}`.trim() : "",
    username: "",
    bio: "",
    interests: [] as string[],
    referralCode: "",
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
    bio: "",
  });

  const roles = selectedTier?.id ?? ["user"];
  const isPartner = roles.includes("partner");
  const isJudge = roles.includes("judge");
  const totalSteps = isPartner || isJudge ? 4 : 3;

  function toggleInterest(item: string) {
    setProfile(p => ({
      ...p,
      interests: p.interests.includes(item)
        ? p.interests.filter(i => i !== item)
        : [...p.interests, item],
    }));
  }

  function toggleSpecialty(item: string) {
    const key = item.toLowerCase().replace(/ /g, "_") as string;
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
        bio: profile.bio || undefined,
        referralCode: profile.referralCode || undefined,
      };

      if (isPartner) {
        body.partnerProfile = {
          brandName: partnerData.brandName,
          brandCategory: partnerData.brandCategory,
          billingEmail: partnerData.billingEmail || authUser?.email,
          website: partnerData.website || undefined,
        };
      }

      if (isJudge) {
        body.judgeProfile = {
          credentials: judgeData.credentials || undefined,
          specialties: judgeData.specialties,
          yearsExperience: judgeData.yearsExperience,
          bio: judgeData.bio || undefined,
        };
      }

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Onboarding failed");

      window.location.href = isPartner ? "/partner/dashboard" : isJudge ? "/judge/queue" : "/";
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-orange-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 0: Tier Selection */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome to PlatePair
                  {authUser?.firstName ? `, ${authUser.firstName}` : ""}!
                </h1>
                <p className="text-gray-500 text-lg">
                  What brings you here? Pick your path — you can always expand it later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {TIERS.map((tier) => (
                  <button
                    key={tier.title}
                    onClick={() => setSelectedTier(tier)}
                    className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 ${tier.bg} ${
                      selectedTier?.title === tier.title
                        ? `${tier.border} shadow-lg scale-[1.02]`
                        : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    <div className={`mb-3 ${tier.color}`}>{tier.icon}</div>
                    <div className="font-bold text-gray-900 text-lg mb-0.5">{tier.title}</div>
                    <div className="text-sm text-gray-500 mb-3">{tier.subtitle}</div>
                    <ul className="space-y-1">
                      {tier.perks.map(p => (
                        <li key={p} className="flex items-start gap-1.5 text-sm text-gray-700">
                          <Check className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                    {tier.incentive && (
                      <div className={`mt-3 text-xs font-medium px-2.5 py-1.5 rounded-lg ${tier.bg} ${tier.color} border ${tier.border}`}>
                        ✨ {tier.incentive}
                      </div>
                    )}
                    {selectedTier?.title === tier.title && (
                      <div className={`mt-3 flex items-center gap-1 text-sm font-semibold ${tier.color}`}>
                        <Check className="w-4 h-4" /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="text-center text-sm text-gray-400 mb-6">
                Every tier gets full access to the feed, battles, and hacks.{" "}
                <span className="font-medium text-gray-600">Judges amplify outcomes, they don't gate them.</span>
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base rounded-xl"
                disabled={!selectedTier}
                onClick={() => setStep(1)}
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* STEP 1: Basic Profile */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Your cooking identity</h2>
                <p className="text-gray-500">Tell the community a bit about yourself.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="How you appear in the community"
                    value={profile.displayName}
                    onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Username <span className="text-gray-400 text-xs">(optional)</span></Label>
                  <Input
                    placeholder="@yourhandle"
                    value={profile.username}
                    onChange={e => setProfile(p => ({ ...p, username: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Bio <span className="text-gray-400 text-xs">(optional)</span></Label>
                <Textarea
                  placeholder="What's your cooking story? Specialty dishes? Cooking philosophy?"
                  value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Cooking Interests <span className="text-gray-400 text-xs">(pick any that fit)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {COOKING_INTERESTS.map(item => (
                    <button
                      key={item}
                      onClick={() => toggleInterest(item)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        profile.interests.includes(item)
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Referral Code <span className="text-gray-400 text-xs">(optional — join your inviter's group)</span></Label>
                <Input
                  placeholder="Enter a code if someone invited you"
                  value={profile.referralCode}
                  onChange={e => setProfile(p => ({ ...p, referralCode: e.target.value.toUpperCase() }))}
                  maxLength={16}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-11">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-11"
                  onClick={() => setStep(isPartner || isJudge ? 2 : 3)}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Role-specific profile */}
          {step === 2 && (isPartner || isJudge) && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {isPartner && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Brand Details</h2>
                    <p className="text-gray-500">Set up your partner profile to start sponsoring battles.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Billing Email <span className="text-red-400">*</span></Label>
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

                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                    <p className="font-medium mb-1">What happens next</p>
                    <p>After onboarding, you'll land on your Partner Dashboard where you can browse live battles and choose which ones to sponsor. Your brand gets tagged on battle cards and winners' posts.</p>
                  </div>
                </>
              )}

              {isJudge && !isPartner && (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Judge Profile</h2>
                    <p className="text-gray-500">Tell us about your culinary expertise so we can match you with the right battles.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Culinary Credentials <span className="text-gray-400 text-xs">(optional)</span></Label>
                      <Input
                        placeholder="e.g. Culinary school, professional chef"
                        value={judgeData.credentials}
                        onChange={e => setJudgeData(p => ({ ...p, credentials: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Years of Experience</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={judgeData.yearsExperience}
                        onChange={e => setJudgeData(p => ({ ...p, yearsExperience: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Judging Specialties <span className="text-gray-400 text-xs">(pick what you know best)</span></Label>
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

                  <div className="space-y-1.5">
                    <Label>Judge Bio <span className="text-gray-400 text-xs">(optional)</span></Label>
                    <Textarea
                      placeholder="What makes you a great judge? Your approach to evaluation?"
                      value={judgeData.bio}
                      onChange={e => setJudgeData(p => ({ ...p, bio: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="rounded-xl bg-purple-50 border border-purple-100 p-4 text-sm text-purple-700">
                    <p className="font-medium mb-1">Your judge group</p>
                    <p>You'll be added to the PlatePair Judges Circle — a group of verified judges who get first access to battles needing evaluation. You also get a permanent profile as a community authority.</p>
                  </div>
                </>
              )}

              {isPartner && isJudge && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-700">
                  <p className="font-medium mb-1">Full Package member</p>
                  <p>You've set up your brand details. Your judge profile will be created with default settings — you can customize it from your Partner Dashboard after onboarding.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-11"
                  disabled={isPartner && !partnerData.brandName}
                  onClick={() => setStep(3)}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Welcome + What's Unlocked */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                You're all set, {profile.displayName || authUser?.firstName || "Chef"}!
              </h2>
              <p className="text-gray-500 mb-8 text-lg">
                Here's what you've unlocked with your{" "}
                <span className="font-semibold text-orange-600">{selectedTier?.title}</span> account.
              </p>

              <div className={`rounded-2xl border-2 p-6 mb-6 text-left ${selectedTier?.bg} ${selectedTier?.border}`}>
                <div className={`flex items-center gap-2 font-bold text-lg mb-4 ${selectedTier?.color}`}>
                  {selectedTier?.icon} {selectedTier?.title}
                </div>
                <ul className="space-y-2">
                  {selectedTier?.perks.map(p => (
                    <li key={p} className="flex items-center gap-2 text-gray-800">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {authUser?.referralCode && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-6 text-left">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Your referral code — share it to grow your network:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-lg font-mono font-bold text-orange-600 tracking-widest">
                      {authUser.referralCode}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(authUser.referralCode ?? "");
                        toast({ title: "Copied!", description: "Referral code copied to clipboard." });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Anyone who signs up with your code automatically joins your cooking circle.
                  </p>
                </div>
              )}

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base rounded-xl"
                disabled={isSubmitting}
                onClick={handleComplete}
              >
                {isSubmitting ? "Setting up your account..." : (
                  isPartner ? "Go to Partner Dashboard →" :
                  isJudge ? "Go to Judge Queue →" :
                  "Start Cooking →"
                )}
              </Button>

              {(isPartner || isJudge) && (
                <button
                  onClick={() => { handleComplete(); }}
                  className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline"
                >
                  Skip to main feed instead
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
