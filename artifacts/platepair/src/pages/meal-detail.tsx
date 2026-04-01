import { useParams, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { 
  useGetMeal, 
  useToggleReaction, 
  useToggleSave,
  getGetMealQueryKey
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { CommentSection } from "@/components/shared/comment-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Bookmark, Users, ChefHat, Clock, MapPin, Share2 } from "lucide-react";

const statusColors: Record<string, string> = {
  idea: "bg-muted text-muted-foreground border-transparent",
  cooking: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  finished: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const statusLabels: Record<string, string> = {
  idea: "Idea",
  cooking: "Cooking Now",
  available: "Available",
  finished: "Finished",
};

export default function MealDetail() {
  const { mealId } = useParams();
  const id = Number(mealId);
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: meal, isLoading } = useGetMeal(id, { query: { enabled: !!id } });

  const toggleReaction = useToggleReaction({
    mutation: {
      onSuccess: (res) => {
        queryClient.setQueryData(getGetMealQueryKey(id), (old: any) => 
          old ? { ...old, likeCount: res.likeCount } : old
        );
      }
    }
  });

  const toggleSave = useToggleSave({
    mutation: {
      onSuccess: (res) => {
        queryClient.setQueryData(getGetMealQueryKey(id), (old: any) => 
          old ? { ...old, saveCount: res.saveCount } : old
        );
      }
    }
  });

  const handleLike = () => {
    if (!user) return;
    toggleReaction.mutate({
      data: {
        userId: user.id,
        targetType: "meal",
        targetId: id,
        reactionType: "like"
      }
    });
  };

  const handleSave = () => {
    if (!user) return;
    toggleSave.mutate({
      data: {
        userId: user.id,
        targetType: "meal",
        targetId: id
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="w-full h-64 md:h-96 rounded-2xl mb-8" />
          <div className="flex gap-8">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full mt-8" />
            </div>
            <div className="hidden md:block w-80">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Meal not found</h1>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header Section */}
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${meal.author.id}`}>
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                <AvatarImage src={meal.author.avatarUrl || undefined} alt={meal.author.displayName} />
                <AvatarFallback>{meal.author.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link href={`/profile/${meal.author.id}`} className="font-medium hover:underline cursor-pointer">
                {meal.author.displayName}
              </Link>
              <div className="flex items-center text-sm text-muted-foreground gap-2">
                <span>{formatDistanceToNow(new Date(meal.createdAt), { addSuffix: true })}</span>
                {meal.group && (
                  <>
                    <span>•</span>
                    <Link href={`/groups/${meal.group.id}`} className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                      <Users size={12} />
                      {meal.group.name}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={handleSave}>
              <Bookmark size={16} />
              <span>Save ({meal.saveCount})</span>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full gap-2">
              <Share2 size={16} />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Hero Image */}
        {meal.imageUrl && (
          <div className="relative w-full h-64 md:h-96 rounded-3xl overflow-hidden mb-8 shadow-sm">
            <img 
              src={meal.imageUrl} 
              alt={meal.title}
              className="object-cover w-full h-full"
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge variant="secondary" className="bg-background/90 backdrop-blur text-foreground border-transparent shadow-sm flex items-center gap-1.5 px-3 py-1">
                <ChefHat size={14} className="text-primary" />
                <span className="capitalize font-medium text-sm">{meal.mealType}</span>
              </Badge>
            </div>
            <div className="absolute top-4 right-4">
              <Badge variant="outline" className={`${statusColors[meal.shareStatus]} shadow-sm px-3 py-1 font-medium`}>
                {statusLabels[meal.shareStatus]}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            <div>
              {!meal.imageUrl && (
                <div className="flex gap-2 mb-4">
                  <Badge variant="secondary" className="flex items-center gap-1.5">
                    <ChefHat size={14} className="text-primary" />
                    <span className="capitalize">{meal.mealType}</span>
                  </Badge>
                  <Badge variant="outline" className={statusColors[meal.shareStatus]}>
                    {statusLabels[meal.shareStatus]}
                  </Badge>
                </div>
              )}
              
              <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">{meal.title}</h1>
              
              {meal.description && (
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {meal.description}
                </p>
              )}
            </div>

            {/* Quick Info Bar */}
            <div className="flex flex-wrap gap-4 py-4 border-y border-border/50">
              {meal.servings && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Servings</p>
                    <p className="font-medium">{meal.servings}</p>
                  </div>
                </div>
              )}
              {meal.locationText && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="p-2 rounded-full bg-secondary/10 text-secondary">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                    <p className="font-medium">{meal.locationText}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {(meal.cuisineTags.length > 0 || meal.dietaryTags.length > 0) && (
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-lg">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {meal.dietaryTags.map(tag => (
                    <Badge key={tag} variant="outline" className="uppercase tracking-wider text-secondary-foreground bg-secondary/10 border-secondary/20">
                      {tag}
                    </Badge>
                  ))}
                  {meal.cuisineTags.map(tag => (
                    <Badge key={tag} variant="outline" className="uppercase tracking-wider text-muted-foreground bg-muted/50 border-muted">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {meal.ingredientsSummary && (
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-xl flex items-center gap-2">
                  Ingredients
                </h3>
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <p className="whitespace-pre-wrap text-foreground/90">{meal.ingredientsSummary}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            {meal.instructionsSummary && (
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-xl flex items-center gap-2">
                  Instructions
                </h3>
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{meal.instructionsSummary}</p>
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-border/50">
              <CommentSection targetType="meal" targetId={id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Interaction Card */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm sticky top-24">
              <h3 className="font-serif font-bold text-lg mb-4">Show some love</h3>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="default" 
                  className="w-full justify-start gap-3 rounded-xl h-12" 
                  onClick={handleLike}
                >
                  <Heart size={20} />
                  <span>Like this meal ({meal.likeCount})</span>
                </Button>
                
                {meal.shareStatus === 'available' && (
                  <Button variant="secondary" className="w-full justify-start gap-3 rounded-xl h-12">
                    <ChefHat size={20} />
                    <span>Request a portion</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Author Snippet */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg mb-4">About the Cook</h3>
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 border border-border">
                  <AvatarImage src={meal.author.avatarUrl || undefined} />
                  <AvatarFallback>{meal.author.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/profile/${meal.author.id}`} className="font-medium hover:underline block">
                    {meal.author.displayName}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {meal.author.bio || "A passionate home cook sharing their kitchen creations."}
                  </p>
                </div>
              </div>
              <Link href={`/profile/${meal.author.id}`}>
                <Button variant="outline" className="w-full mt-4 rounded-xl">View Profile</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
