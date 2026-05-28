import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Heart, Bookmark, MessageCircle, Clock, Users, PlayCircle, ChefHat } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { FeedItem, MealShareStatus } from "@workspace/api-client-react";

interface FeedItemCardProps {
  item: FeedItem;
}

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

export function FeedItemCard({ item }: FeedItemCardProps) {
  if (item.type === "meal" && item.meal) {
    const meal = item.meal;
    return (
      <Card className="overflow-hidden hover-elevate transition-all border-border/50 group" data-testid={`card-feed-meal-${meal.id}`}>
        <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${meal.author.id}`}>
              <Avatar className="h-10 w-10 border border-background shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                <AvatarImage src={meal.author.avatarUrl || undefined} alt={meal.author.displayName} />
                <AvatarFallback>{meal.author.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex flex-col">
              <Link href={`/profile/${meal.author.id}`} className="font-medium text-sm hover:underline cursor-pointer" data-testid={`link-author-${meal.author.id}`}>
                {meal.author.displayName}
              </Link>
              <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                {meal.group && (
                  <>
                    <span>•</span>
                    <Link href={`/groups/${meal.group.id}`} className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                      <Users size={10} />
                      {meal.group.name}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={statusColors[meal.shareStatus]} data-testid={`badge-status-${meal.shareStatus}`}>
            {statusLabels[meal.shareStatus]}
          </Badge>
        </CardHeader>
        
        <Link href={`/meals/${meal.id}`} className="cursor-pointer block mt-3" data-testid={`link-meal-${meal.id}`}>
          {meal.imageUrl && (
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              <img 
                src={meal.imageUrl} 
                alt={meal.title}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-background/80 backdrop-blur text-foreground border-transparent shadow-sm flex items-center gap-1">
                  <ChefHat size={12} className="text-primary" />
                  <span className="capitalize">{meal.mealType}</span>
                </Badge>
              </div>
            </div>
          )}
          
          <CardContent className={`p-4 ${meal.imageUrl ? 'pt-4' : 'pt-2'}`}>
            <h3 className="font-serif text-xl font-bold line-clamp-1 mb-1 group-hover:text-primary transition-colors" data-testid={`text-meal-title-${meal.id}`}>
              {meal.title}
            </h3>
            {meal.description && (
              <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                {meal.description}
              </p>
            )}
            
            {(meal.cuisineTags.length > 0 || meal.dietaryTags.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {meal.dietaryTags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] uppercase tracking-wider text-secondary-foreground bg-secondary/10 border-secondary/20">
                    {tag}
                  </Badge>
                ))}
                {meal.cuisineTags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 border-muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Link>
        
        <CardFooter className="p-4 pt-0 flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors cursor-pointer" data-testid={`button-like-${meal.id}`}>
            <Heart size={18} />
            <span>{meal.likeCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors cursor-pointer">
            <MessageCircle size={18} />
            <span>{meal.commentCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium ml-auto hover:text-primary transition-colors cursor-pointer" data-testid={`button-save-${meal.id}`}>
            <Bookmark size={18} />
          </div>
        </CardFooter>
      </Card>
    );
  }

  if (item.type === "video" && item.video) {
    const video = item.video;
    const author = video.author;
    return (
      <Card className="overflow-hidden hover-elevate transition-all border-border/50 group" data-testid={`card-feed-video-${video.id}`}>
        <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3">
            {author && (
              <Link href={`/profile/${author.id}`}>
                <Avatar className="h-10 w-10 border border-background shadow-sm hover:ring-2 hover:ring-accent/20 transition-all cursor-pointer">
                  <AvatarImage src={author.avatarUrl || undefined} alt={author.displayName} />
                  <AvatarFallback>{author.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
            )}
            <div className="flex flex-col">
              {author && (
                <Link href={`/profile/${author.id}`} className="font-medium text-sm hover:underline cursor-pointer" data-testid={`link-author-${author.id}`}>
                  {author.displayName}
                </Link>
              )}
              <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                {video.group && (
                  <>
                    <span>•</span>
                    <Link href={`/groups/${video.group.id}`} className="hover:text-accent transition-colors flex items-center gap-1 cursor-pointer">
                      <Users size={10} />
                      {video.group.name}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20 flex items-center gap-1">
            <PlayCircle size={12} className="text-accent" />
            Hack
          </Badge>
        </CardHeader>
        
        <Link href={`/videos`} className="cursor-pointer block mt-3" data-testid={`link-video-${video.id}`}>
          {video.thumbnailUrl && (
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
              <img 
                src={video.thumbnailUrl} 
                alt={video.title}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="h-14 w-14 rounded-full bg-background/90 backdrop-blur flex items-center justify-center text-foreground shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                  <PlayCircle size={28} className="text-accent ml-1" />
                </div>
              </div>
              {video.durationSeconds && (
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1 backdrop-blur">
                  <Clock size={12} />
                  <span>{Math.floor(video.durationSeconds / 60)}:{(video.durationSeconds % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
            </div>
          )}
          
          <CardContent className={`p-4 ${video.thumbnailUrl ? 'pt-4' : 'pt-2'}`}>
            <h3 className="font-serif text-lg font-bold line-clamp-2 mb-1 group-hover:text-accent transition-colors" data-testid={`text-video-title-${video.id}`}>
              {video.title}
            </h3>
            {video.caption && (
              <p className="text-muted-foreground text-sm line-clamp-1 mb-3">
                {video.caption}
              </p>
            )}
            
            {video.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {video.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] tracking-wide text-muted-foreground bg-muted/50">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Link>
        
        <CardFooter className="p-4 pt-0 flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors cursor-pointer" data-testid={`button-like-video-${video.id}`}>
            <Heart size={18} />
            <span>{video.likeCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors cursor-pointer">
            <MessageCircle size={18} />
            <span>{video.commentCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium ml-auto hover:text-accent transition-colors cursor-pointer" data-testid={`button-save-video-${video.id}`}>
            <Bookmark size={18} />
          </div>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
