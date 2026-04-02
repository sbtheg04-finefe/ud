import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
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
import LoginPage from "@/pages/login";

const queryClient = new QueryClient();

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user && !user.onboardingCompleted && location !== "/onboarding") {
      setLocation("/onboarding");
    }
  }, [user, isLoading, location]);

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

  return <>{children}</>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to={`/login?returnTo=${encodeURIComponent(location)}`} />;
  }

  return <Component />;
}

function Router() {
  return (
    <OnboardingGuard>
      <Switch>
        {/* Public routes — guests can access */}
        <Route path="/login" component={LoginPage} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/" component={Home} />
        <Route path="/battles" component={Battles} />
        <Route path="/battles/:battleId" component={BattleDetail} />
        <Route path="/videos" component={Videos} />
        <Route path="/groups" component={Groups} />
        <Route path="/groups/:groupId" component={GroupDetail} />
        <Route path="/meals/:mealId" component={MealDetail} />
        <Route path="/profile/:userId" component={Profile} />

        {/* Protected routes — require sign-in */}
        <Route path="/create">{() => <ProtectedRoute component={Create} />}</Route>
        <Route path="/battles/create">{() => <ProtectedRoute component={CreateBattle} />}</Route>
        <Route path="/profile/:userId/edit">{() => <ProtectedRoute component={EditProfile} />}</Route>
        <Route path="/saved">{() => <ProtectedRoute component={SavedItems} />}</Route>
        <Route path="/partner/dashboard">{() => <ProtectedRoute component={PartnerDashboard} />}</Route>
        <Route path="/judge/queue">{() => <ProtectedRoute component={JudgeQueue} />}</Route>

        <Route component={NotFound} />
      </Switch>
    </OnboardingGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
