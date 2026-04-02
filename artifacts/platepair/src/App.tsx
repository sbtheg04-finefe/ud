import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import { useTrack } from "@/hooks/use-track";

import Home from "@/pages/home";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/group-detail";
import MealDetail from "@/pages/meal-detail";
import Videos from "@/pages/videos";
import SavedItems from "@/pages/saved";
import Profile from "@/pages/profile";
import Create from "@/pages/create";
import EditProfile from "@/pages/edit-profile";
import Battles from "@/pages/battles";
import BattleDetail from "@/pages/battle-detail";
import CreateBattle from "@/pages/create-battle";
import Onboarding from "@/pages/onboarding";
import PartnerDashboard from "@/pages/partner-dashboard";
import JudgeQueue from "@/pages/judge-queue";

const queryClient = new QueryClient();

function AuthLanding({ login }: { login: () => void }) {
  const { track } = useTrack();

  useEffect(() => {
    track("landing_viewed");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-white mb-4 shadow-lg">
            <span className="text-3xl">🍳</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PlatePair</h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            The community where meals become battles,<br className="hidden sm:block" /> hacks become cookbooks, and every cook leaves their mark.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            { emoji: "⚔️", stat: "48", label: "Live battles" },
            { emoji: "👨‍🍳", stat: "1,200+", label: "Community cooks" },
            { emoji: "⭐", stat: "230+", label: "Certified judges" },
          ].map(s => (
            <div key={s.label} className="bg-white/80 rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
              <div className="text-xl mb-0.5">{s.emoji}</div>
              <div className="font-bold text-gray-900 text-lg leading-none">{s.stat}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-6">
          {[
            { text: "Join a live dish battle", emoji: "🔥" },
            { text: "Start a private cooking circle with friends", emoji: "🫂" },
            { text: "Get your cooking hack AI-reviewed and published", emoji: "🤖" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3 bg-white/70 rounded-xl px-4 py-2.5 border border-gray-100">
              <span className="text-lg">{item.emoji}</span>
              <span className="text-sm text-gray-700 font-medium">{item.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { track("login_clicked"); login(); }}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 px-6 rounded-xl text-lg transition-colors shadow-md"
        >
          Join the Community — Log In
        </button>
        <p className="text-xs text-gray-400 mt-3 text-center">Secure sign-in · No password needed · Under 60 seconds to your first battle</p>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, login } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading PlatePair…</p>
        </div>
      </div>
    );
  }

  if (!user && location !== "/onboarding") {
    return <AuthLanding login={login} />;
  }

  if (user && !user.onboardingCompleted && location !== "/onboarding") {
    window.location.href = "/onboarding";
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/partner/dashboard" component={PartnerDashboard} />
      <Route path="/judge/queue" component={JudgeQueue} />
      <Route path="/" component={Home} />
      <Route path="/groups" component={Groups} />
      <Route path="/groups/:groupId" component={GroupDetail} />
      <Route path="/meals/:mealId" component={MealDetail} />
      <Route path="/videos" component={Videos} />
      <Route path="/saved" component={SavedItems} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/profile/:userId/edit" component={EditProfile} />
      <Route path="/create" component={Create} />
      <Route path="/battles/create" component={CreateBattle} />
      <Route path="/battles/:battleId" component={BattleDetail} />
      <Route path="/battles" component={Battles} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGuard>
            <Router />
          </AuthGuard>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
