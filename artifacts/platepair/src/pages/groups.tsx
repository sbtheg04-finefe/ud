import { Link } from "wouter";
import { useListGroups, getListGroupsQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Users, Globe, Lock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Groups() {
  const { data: groups, isLoading } = useListGroups({ query: { enabled: true, queryKey: getListGroupsQueryKey() } });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2 text-primary">Discover Groups</h1>
            <p className="text-muted-foreground">Find your cooking circle—neighborhoods, families, or teams.</p>
          </div>
          <Link href="/groups/create">
            <Button className="gap-2 rounded-full shadow-sm">
              <Plus size={16} /> Start a Circle
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-32 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))
          ) : groups?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
              <Users className="mx-auto mb-4 opacity-50" size={48} />
              <p>No groups found.</p>
            </div>
          ) : (
            groups?.map((group, i) => (
              <Link key={group.id} href={`/groups/${group.id}`} className="block">
                <Card className="overflow-hidden hover-elevate transition-all border-border/50 h-full group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                  {group.coverImageUrl ? (
                    <div className="h-32 w-full overflow-hidden bg-muted relative">
                      <img 
                        src={group.coverImageUrl} 
                        alt={group.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                          {group.visibility === "public" ? <Globe size={12} className="mr-1" /> : <Lock size={12} className="mr-1" />}
                          <span className="capitalize">{group.visibility.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-secondary/20 flex items-center justify-center relative">
                      <Users size={32} className="text-secondary/40" />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                          {group.visibility === "public" ? <Globe size={12} className="mr-1" /> : <Lock size={12} className="mr-1" />}
                          <span className="capitalize">{group.visibility.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                    </div>
                  )}
                  <CardHeader className="p-4 pb-2">
                    <h2 className="font-serif text-xl font-bold group-hover:text-primary transition-colors">{group.name}</h2>
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0 mt-auto">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
                      <div className="flex items-center gap-1.5">
                        <Users size={16} />
                        <span>{group.memberCount} members</span>
                      </div>
                    </div>
                    {group.tags && group.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {group.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] bg-muted/50">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
