import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTrack } from "@/hooks/use-track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Eye, EyeOff, ArrowRight, Users, Swords, Star } from "lucide-react";

type FormMode = "choose" | "login" | "register";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, register, emailLogin, login } = useAuth();
  const { track } = useTrack();

  const [mode, setMode] = useState<FormMode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    track("landing_viewed");
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (!user.onboardingCompleted) {
        setLocation("/onboarding");
      } else {
        setLocation("/");
      }
    }
  }, [user, isLoading]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await register(email, password, displayName, referralCode || undefined);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      track("onboarding_started");
      setLocation("/onboarding");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await emailLogin(email, password);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      const resp = await fetch("/api/auth/user", { credentials: "include" });
      const data = await resp.json();
      if (data.user && !data.user.onboardingCompleted) {
        setLocation("/onboarding");
      } else {
        setLocation("/");
      }
    }
  }

  const stats = [
    { icon: <Swords className="w-4 h-4" />, stat: "48", label: "Live battles" },
    { icon: <Users className="w-4 h-4" />, stat: "1,200+", label: "Community cooks" },
    { icon: <Star className="w-4 h-4" />, stat: "230+", label: "Certified judges" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-white mb-4 shadow-lg">
            <ChefHat size={32} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PlatePair</h1>
          <p className="text-gray-500">The community where meals become battles</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white/80 rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
              <div className="flex justify-center text-orange-500 mb-1">{s.icon}</div>
              <div className="font-bold text-gray-900 text-lg leading-none">{s.stat}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className="w-full flex items-center justify-between bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl text-base transition-colors shadow-md"
            >
              <span>Create a free account</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="w-full flex items-center justify-between border-2 border-gray-200 bg-white hover:border-orange-300 text-gray-800 font-semibold py-4 px-6 rounded-xl text-base transition-colors"
            >
              <span>Sign in to my account</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs text-gray-400 bg-transparent"><span className="bg-gradient-to-br from-orange-50 via-white to-purple-50 px-3">or</span></div>
            </div>

            <button
              onClick={() => { track("login_clicked"); login(); }}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium py-3 px-6 rounded-xl text-sm transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
              Continue with Replit
            </button>

            <button
              onClick={() => setLocation("/")}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
            >
              Browse as guest — no account needed
            </button>
          </div>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">Your name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Gordon Ramsay Jr."
                  required
                  className="mt-1 rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="chef@example.com"
                  required
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="rounded-xl pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="referral" className="text-sm font-medium text-gray-700">Referral code <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="referral"
                  type="text"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="XXXX1234"
                  maxLength={16}
                  className="mt-1 rounded-xl font-mono uppercase"
                />
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl py-3 text-base font-semibold">
              {isSubmitting ? "Creating account…" : "Create account & continue"}
            </Button>
            <button type="button" onClick={() => { setMode("choose"); setError(""); }} className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">
              ← Back
            </button>
          </form>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div>
                <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="chef@example.com"
                  required
                  className="mt-1 rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    className="rounded-xl pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl py-3 text-base font-semibold">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
            <button type="button" onClick={() => { setMode("register"); setError(""); }} className="w-full text-sm text-gray-500 hover:text-gray-700 py-1 text-center">
              Don't have an account? Create one free
            </button>
            <button type="button" onClick={() => { setMode("choose"); setError(""); }} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 text-center">
              ← Back
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          No Replit account needed · Free to browse · Your data stays yours
        </p>
      </div>
    </div>
  );
}
