import { Link, useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Users, Video, Bookmark, PlusCircle, ChefHat, Swords, Building2, Star, LogOut } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();
  const { data: user, isPartner, isJudge } = useCurrentUser();
  const { logout } = useAuth();

  const navItems = [
    { href: "/", label: "Feed", icon: Home },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "/videos", label: "Hacks", icon: Video },
    { href: "/battles", label: "Battles", icon: Swords },
    { href: "/saved", label: "Saved", icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ChefHat size={24} />
            </div>
            <span className="hidden font-serif text-xl font-bold tracking-tight sm:inline-block">
              PlatePair
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`link-nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isPartner && (
            <Link href="/partner/dashboard">
              <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <Building2 size={15} />
                <span>Partner</span>
              </Button>
            </Link>
          )}
          {isJudge && (
            <Link href="/judge/queue">
              <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                <Star size={15} />
                <span>Judge</span>
              </Button>
            </Link>
          )}

          <Link href="/create" data-testid="link-create">
            <Button className="rounded-full shadow-md gap-2" size="sm">
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </Link>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" data-testid="button-user-menu">
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {user.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium" data-testid="text-menu-name">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-menu-username">
                      @{user.username}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.id}`} className="cursor-pointer w-full flex items-center" data-testid="link-menu-profile">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.id}/edit`} className="cursor-pointer w-full flex items-center" data-testid="link-menu-settings">
                    Settings
                  </Link>
                </DropdownMenuItem>
                {isPartner && (
                  <DropdownMenuItem asChild>
                    <Link href="/partner/dashboard" className="cursor-pointer w-full flex items-center gap-2 text-blue-600">
                      <Building2 size={14} /> Partner Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                {isJudge && (
                  <DropdownMenuItem asChild>
                    <Link href="/judge/queue" className="cursor-pointer w-full flex items-center gap-2 text-purple-600">
                      <Star size={14} /> Judge Queue
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer flex items-center gap-2"
                  onClick={logout}
                >
                  <LogOut size={14} /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Mobile nav */}
      <div className="md:hidden border-t fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur z-50">
        <nav className="flex items-center justify-around p-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`p-1 rounded-full ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
