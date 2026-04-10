import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTrack } from "@/hooks/use-track";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Link2, Sparkles,
  ChefHat, Check, Loader2, X, ExternalLink,
} from "lucide-react";

/* ─── tiny helpers ─────────────────────────────── */
const PLATFORM_META: Record<string, { label: string; icon: string; color: string; ring: string }> = {
  tiktok:    { label: "TikTok",    icon: "🎵", color: "#fe2c55", ring: "ring-pink-500"    },
  instagram: { label: "Instagram", icon: "📸", color: "#e1306c", ring: "ring-rose-500"    },
  youtube:   { label: "YouTube",   icon: "▶️", color: "#ff0000", ring: "ring-red-500"     },
  x:         { label: "X / Twitter", icon: "𝕏", color: "#000",   ring: "ring-gray-600"   },
  pinterest: { label: "Pinterest", icon: "📌", color: "#e60023", ring: "ring-red-500"     },
  reddit:    { label: "Reddit",    icon: "🤖", color: "#ff4500", ring: "ring-orange-500"  },
  web:       { label: "Web",       icon: "🌐", color: "#6366f1", ring: "ring-indigo-400"  },
};

function detectPlatform(url: string): string {
  try {
    const h = new URL(url).hostname;
    if (h.includes("tiktok"))    return "tiktok";
    if (h.includes("instagram")) return "instagram";
    if (h.includes("youtube") || h.includes("youtu.be")) return "youtube";
    if (h.includes("twitter") || h.includes("x.com"))   return "x";
    if (h.includes("pinterest")) return "pinterest";
    if (h.includes("reddit"))    return "reddit";
    return "web";
  } catch { return "web"; }
}

const MODES = [
  {
    id: "battle",
    label: "Battle Mode",
    emoji: "⚔️",
    tagline: "Compete, win, dominate",
    desc: "Jump into live cooking challenges. Post your take on a prompt, get judged by the community, climb the leaderboard.",
    gradient: "from-orange-500 via-red-500 to-rose-600",
    bg: "bg-gradient-to-br from-orange-500 via-red-500 to-rose-600",
    glow: "shadow-orange-500/40",
    ring: "ring-orange-400",
    dest: "/battles",
  },
  {
    id: "crew",
    label: "Crew Mode",
    emoji: "👥",
    tagline: "Build your cooking circle",
    desc: "Invite friends, run private battles, share meal plans, build a group cookbook together.",
    gradient: "from-blue-600 via-blue-500 to-violet-600",
    bg: "bg-gradient-to-br from-blue-600 via-blue-500 to-violet-600",
    glow: "shadow-blue-500/40",
    ring: "ring-blue-400",
    dest: "/groups",
  },
  {
    id: "replay",
    label: "Replay Mode",
    emoji: "🎬",
    tagline: "Browse, save, and vibe",
    desc: "Scroll the community feed, bookmark hacks you love, and build your personal cooking playbook.",
    gradient: "from-teal-500 via-cyan-500 to-emerald-600",
    bg: "bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-600",
    glow: "shadow-teal-500/40",
    ring: "ring-teal-400",
    dest: "/videos",
  },
];

const slide = {
  initial:  { opacity: 0, x: 40  },
  animate:  { opacity: 1, x: 0   },
  exit:     { opacity: 0, x: -40 },
  transition: { duration: 0.28, ease: [0.32, 0, 0.2, 1] },
};

/* ─── main component ───────────────────────────── */
export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user: authUser } = useAuth();
  const { track } = useTrack();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Link state
  const [url, setUrl]         = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [preview, setPreview]   = useState<any>(null);
  const platform = url ? detectPlatform(url) : null;
  const pmeta = platform ? PLATFORM_META[platform] : null;

  // Crew state
  const [crewName, setCrewName] = useState("");

  // Mode state
  const [chosenMode, setChosenMode] = useState<string | null>(null);

  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { track("onboarding_v2_started"); }, []);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    track("onboarding_v2_step", { step: next });
  }

  async function fetchPreview() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchErr(null);
    try {
      const res = await fetch("/api/link/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setFetchErr(data.error ?? "Could not read that link"); setFetching(false); return; }
      setPreview(data);
      go(1);
    } catch { setFetchErr("Network error — try again"); }
    setFetching(false);
  }

  async function completeOnboarding(dest: string) {
    try {
      const mode = chosenMode ?? "replay";
      const body: any = {
        roles: ["user"],
        displayName: authUser?.displayName || authUser?.firstName || "Cook",
        username: authUser?.username || undefined,
        onboardingMode: mode,
      };
      if (crewName.trim()) body.circleName = crewName.trim();
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      track("onboarding_v2_completed", { mode, hasLink: !!preview });
    } catch {}
    window.location.href = dest;
  }

  /* ── shared wrapper ─────────────────────────── */
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {step > 0 ? (
            <button
              onClick={() => go(step - 1 === 1 && !preview ? 0 : step - 1)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ArrowLeft size={14} className="text-white/70" />
            </button>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <ChefHat size={14} className="text-white" />
            </div>
          )}
          <span className="text-sm font-bold text-white/80 tracking-wide">PlatePair</span>
        </div>
        {/* Step dots */}
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "w-5 h-2 bg-orange-500"
                  : i < step
                  ? "w-2 h-2 bg-white/40"
                  : "w-2 h-2 bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Screen body */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false} custom={direction}>

          {/* ══════════════════════════════════════════
              SCREEN 0 — LINK DROP
          ══════════════════════════════════════════ */}
          {step === 0 && (
            <motion.div
              key="s0"
              custom={direction}
              variants={{ ...slide }}
              initial="initial" animate="animate" exit="exit"
              className="flex-1 flex flex-col justify-between px-5 pt-8 pb-10 h-full"
            >
              {/* Headline block */}
              <div>
                <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/70 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
                  <Sparkles size={11} className="text-orange-400" />
                  Start with something real
                </div>
                <h1 className="text-4xl font-black leading-[1.1] tracking-tight mb-4">
                  Drop a link<br />
                  <span className="text-orange-400">that fired you up.</span>
                </h1>
                <p className="text-white/55 text-base leading-relaxed max-w-sm">
                  A recipe, a hack, a viral cook — paste any link from any platform and we'll build your whole session around it.
                </p>
              </div>

              {/* Platform badges */}
              <div className="flex gap-2 flex-wrap my-6">
                {["tiktok","instagram","youtube","web"].map(p => {
                  const m = PLATFORM_META[p];
                  const isActive = platform === p && url.length > 5;
                  return (
                    <div
                      key={p}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-white text-black scale-105 shadow-lg"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      <span className="text-sm">{m.icon}</span>
                      {m.label}
                    </div>
                  );
                })}
              </div>

              {/* URL input */}
              <div className="space-y-3">
                <div className={`relative flex items-center bg-white/10 rounded-2xl border transition-all duration-200 ${
                  fetchErr ? "border-red-500/60" : url.length > 5 ? "border-orange-500/60" : "border-white/10"
                }`}>
                  <div className="pl-4 text-white/30 shrink-0">
                    {pmeta && url.length > 5
                      ? <span className="text-xl">{pmeta.icon}</span>
                      : <Link2 size={16} />
                    }
                  </div>
                  <input
                    ref={urlInputRef}
                    type="url"
                    placeholder="Paste any link here…"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setFetchErr(null); }}
                    onKeyDown={e => e.key === "Enter" && fetchPreview()}
                    className="flex-1 bg-transparent text-white placeholder:text-white/30 text-base px-3 py-4 outline-none"
                    autoComplete="off"
                    autoFocus
                  />
                  {url && (
                    <button onClick={() => { setUrl(""); setFetchErr(null); }} className="pr-4 text-white/30 hover:text-white/60">
                      <X size={16} />
                    </button>
                  )}
                </div>
                {fetchErr && <p className="text-red-400 text-sm pl-1">{fetchErr}</p>}

                <button
                  onClick={fetchPreview}
                  disabled={!url.trim() || fetching}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-2xl transition-all active:scale-[0.98]"
                >
                  {fetching
                    ? <><Loader2 size={18} className="animate-spin" /> Reading the vibe…</>
                    : <><Sparkles size={16} /> Decode this link <ArrowRight size={16} /></>
                  }
                </button>

                <button
                  onClick={() => go(2)}
                  className="w-full text-white/35 hover:text-white/60 text-sm py-2 transition-colors"
                >
                  Skip — take me straight in →
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              SCREEN 1 — VIBE READ
          ══════════════════════════════════════════ */}
          {step === 1 && preview && (
            <motion.div
              key="s1"
              custom={direction}
              variants={{ ...slide }}
              initial="initial" animate="animate" exit="exit"
              className="flex-1 flex flex-col overflow-y-auto"
            >
              {/* Hero image */}
              <div className="relative w-full h-52 shrink-0 overflow-hidden bg-white/5">
                {preview.thumbnailUrl ? (
                  <img
                    src={preview.thumbnailUrl}
                    alt="preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">
                    {PLATFORM_META[preview.platform ?? "web"]?.icon ?? "🌐"}
                  </div>
                )}
                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
                {/* platform badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold">
                  <span>{PLATFORM_META[preview.platform ?? "web"]?.icon}</span>
                  {PLATFORM_META[preview.platform ?? "web"]?.label}
                </div>
              </div>

              {/* Card body */}
              <div className="px-5 pt-5 pb-10 space-y-5 flex-1 flex flex-col">
                {/* Theme pill */}
                <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full self-start">
                  <Sparkles size={11} />
                  {preview.theme ?? "Content Drop"}
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-2xl font-black leading-tight mb-2">
                    {preview.title || "Untitled"}
                  </h2>
                  {preview.description && (
                    <p className="text-white/50 text-sm leading-relaxed line-clamp-3">
                      {preview.description}
                    </p>
                  )}
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-white/30 hover:text-white/60 text-xs mt-2 transition-colors"
                  >
                    <ExternalLink size={10} /> {new URL(preview.url).hostname.replace("www.", "")}
                  </a>
                </div>

                {/* Suggested use */}
                <div className="bg-white/8 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1.5">
                    Suggested play
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {preview.suggestedUse}
                  </p>
                </div>

                {/* CTAs */}
                <div className="space-y-3 mt-auto pt-2">
                  <button
                    onClick={() => go(2)}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold text-base py-4 rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Build around this <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => go(2)}
                    className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white/80 font-semibold text-sm py-3.5 rounded-2xl transition-all"
                  >
                    Just start fresh instead
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              SCREEN 2 — CREW BUILDER
          ══════════════════════════════════════════ */}
          {step === 2 && (
            <motion.div
              key="s2"
              custom={direction}
              variants={{ ...slide }}
              initial="initial" animate="animate" exit="exit"
              className="flex-1 flex flex-col justify-between px-5 pt-8 pb-10"
            >
              <div className="space-y-6">
                {/* Headline */}
                <div>
                  <div className="text-5xl mb-4">👥</div>
                  <h2 className="text-3xl font-black leading-[1.15] mb-3">
                    Build your<br />
                    <span className="text-blue-400">crew.</span>
                  </h2>
                  <p className="text-white/55 text-base leading-relaxed max-w-sm">
                    A crew is your private cooking circle — run battles, share hacks, build a group cookbook. Invite your people, your rules.
                  </p>
                </div>

                {/* How it works — 3 horizontal chips */}
                <div className="space-y-2">
                  {[
                    { icon: "⚔️", text: "Host private battles with your group" },
                    { icon: "📖", text: "Build a shared crew cookbook" },
                    { icon: "🔗", text: "One shareable invite link to bring everyone in" },
                  ].map(item => (
                    <div key={item.icon} className="flex items-center gap-3 bg-white/6 rounded-xl px-4 py-3">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <p className="text-white/70 text-sm">{item.text}</p>
                    </div>
                  ))}
                </div>

                {/* Crew name input */}
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">
                    Name your crew <span className="text-white/25 normal-case font-normal">(optional — you can do this later)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spice Gang, Sunday Roast Crew…"
                    value={crewName}
                    onChange={e => setCrewName(e.target.value)}
                    maxLength={40}
                    className="w-full bg-white/10 border border-white/10 focus:border-white/30 text-white placeholder:text-white/25 text-base px-4 py-3.5 rounded-2xl outline-none transition-colors"
                  />
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-3 pt-6">
                <button
                  onClick={() => go(3)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base py-4 rounded-2xl transition-all active:scale-[0.98]"
                >
                  {crewName.trim() ? `Set up "${crewName}" →` : "Set up my crew →"}
                </button>
                <button
                  onClick={() => go(3)}
                  className="w-full text-white/35 hover:text-white/60 text-sm py-2 transition-colors"
                >
                  Skip — I'll join an existing one
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              SCREEN 3 — MODE SELECTOR
          ══════════════════════════════════════════ */}
          {step === 3 && (
            <motion.div
              key="s3"
              custom={direction}
              variants={{ ...slide }}
              initial="initial" animate="animate" exit="exit"
              className="flex-1 flex flex-col px-5 pt-6 pb-10"
            >
              <div className="mb-6">
                <h2 className="text-3xl font-black leading-[1.15] mb-2">
                  How do you want<br />
                  <span className="text-orange-400">to play?</span>
                </h2>
                <p className="text-white/45 text-sm">Pick your starting mode — you can switch any time.</p>
              </div>

              {/* 3 large mode cards */}
              <div className="flex flex-col gap-3 flex-1">
                {MODES.map(mode => {
                  const isChosen = chosenMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setChosenMode(mode.id)}
                      className={`relative flex-1 rounded-2xl p-5 text-left transition-all duration-200 overflow-hidden
                        ${mode.bg}
                        ${isChosen ? `ring-4 ${mode.ring} ring-offset-2 ring-offset-[#0a0a0a] shadow-2xl ${mode.glow} scale-[1.01]` : "opacity-70 hover:opacity-90 hover:scale-[1.005]"}
                      `}
                    >
                      {/* Icon + label */}
                      <div className="flex items-start justify-between mb-auto">
                        <div>
                          <div className="text-4xl mb-2">{mode.emoji}</div>
                          <div className="font-black text-xl text-white">{mode.label}</div>
                          <div className="text-white/70 text-sm font-medium mt-0.5">{mode.tagline}</div>
                        </div>
                        {isChosen && (
                          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                            <Check size={14} className="text-black" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <p className="text-white/65 text-sm leading-relaxed mt-3">{mode.desc}</p>

                      {/* Subtle texture */}
                      <div className="absolute -bottom-4 -right-4 text-white/10 text-8xl select-none pointer-events-none leading-none">{mode.emoji}</div>
                    </button>
                  );
                })}
              </div>

              {/* Final CTA */}
              <div className="pt-5">
                <button
                  onClick={() => {
                    const m = MODES.find(m => m.id === chosenMode) ?? MODES[0];
                    completeOnboarding(m.dest);
                  }}
                  disabled={!chosenMode}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-orange-500/30"
                >
                  {chosenMode
                    ? `Start in ${MODES.find(m => m.id === chosenMode)?.label} →`
                    : "Choose a mode to continue"
                  }
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
