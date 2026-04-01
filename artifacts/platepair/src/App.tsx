import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/group-detail";
import MealDetail from "@/pages/meal-detail";
import Videos from "@/pages/videos";
import SavedItems from "@/pages/saved";
import Profile from "@/pages/profile";
import Create from "@/pages/create";
import EditProfile from "@/pages/edit-profile";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/groups" component={Groups} />
      <Route path="/groups/:groupId" component={GroupDetail} />
      <Route path="/meals/:mealId" component={MealDetail} />
      <Route path="/videos" component={Videos} />
      <Route path="/saved" component={SavedItems} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/profile/:userId/edit" component={EditProfile} />
      <Route path="/create" component={Create} />
      <Route component={NotFound} />
    </Switch>
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
