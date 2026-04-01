import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🍳</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PlatePair</h1>
          <p className="text-gray-500 text-lg mb-8">
            The community where meals become battles, hacks become cookbooks, and every cook leaves their mark.
          </p>
          <button
            onClick={login}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl text-lg transition-colors"
          >
            Get Started — Log In
          </button>
          <p className="text-xs text-gray-400 mt-4">Secure authentication · No password needed</p>
        </div>
      </div>
    );
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
