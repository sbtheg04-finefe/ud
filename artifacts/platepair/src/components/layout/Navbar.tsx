import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid, Layers, BookmarkCheck, MessageSquare, Globe,
  Search, Sparkles, SlidersHorizontal, ChefHat,
  LogOut, UserCircle2, LayoutDashboard, Shield,
  Building2, Star, X,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useLocation as useWouterLocation } from "wouter";

const bottomNavItems = [
  { href: "/",           label: "Cards",       icon: LayoutGrid },
  { href: "/groups",     label: "Stacks",      icon: Layers },
  { href: "/saved",      label: "Collections", icon: BookmarkCheck },
  { href: "/battles",    label: "Chat",        icon: MessageSquare },
  { href: "/videos",     label: "Discover",    icon: Globe },
];

export function Navbar({ onSearch }: { onSearch?: (q: string) => void }) {
  const [location] = useLocation();
  const { data: user, isPartner, isJudge } = useCurrentUser();
  const { logout, isAuthenticated, isLoading, user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch?.(searchValue);
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <>
      {/* ── Top header ── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 h-14 max-w-2xl mx-auto">

          {/* Logo — collapses when search is open */}
          {!searchOpen && (
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white">
                <ChefHat size={20} />
              </div>
            </Link>
          )}

          {/* Search bar */}
          {searchOpen ? (
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder="Search meals, hacks, creators…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchValue(""); }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </form>
          ) : (
            <button
              onClick={openSearch}
              className="flex-1 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full px-4 py-2 text-left"
            >
              <Search size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Search</span>
            </button>
          )}

          {/* Right icons */}
          {!searchOpen && (
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                <Sparkles size={20} className="text-indigo-500" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                <SlidersHorizontal size={20} />
              </button>

              {isAuthenticated && <NotificationBell />}

              {!isLoading && !isAuthenticated && (
                <Link href="/login">
                  <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                    <UserCircle2 size={22} />
                  </button>
                </Link>
              )}

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ml-1">
                      <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-semibold">
                          {user.displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center gap-2 p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                          {user.displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="font-medium text-sm">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer flex items-center gap-2">
                        <LayoutDashboard size={14} /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user.id}`} className="cursor-pointer flex items-center gap-2">
                        <UserCircle2 size={14} /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user.id}/edit`} className="cursor-pointer flex items-center gap-2">
                        <SlidersHorizontal size={14} /> Settings
                      </Link>
                    </DropdownMenuItem>
                    {isPartner && (
                      <DropdownMenuItem asChild>
                        <Link href="/partner/dashboard" className="cursor-pointer flex items-center gap-2 text-blue-600">
                          <Building2 size={14} /> Partner Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isJudge && (
                      <DropdownMenuItem asChild>
                        <Link href="/judge/queue" className="cursor-pointer flex items-center gap-2 text-purple-600">
                          <Star size={14} /> Judge Queue
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer flex items-center gap-2 text-orange-600 font-semibold">
                          <Shield size={14} /> Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 cursor-pointer flex items-center gap-2" onClick={logout}>
                      <LogOut size={14} /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Bottom tab bar (all screen sizes) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-gray-100">
        <div className="flex items-stretch justify-around max-w-2xl mx-auto">
          {bottomNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 transition-colors ${
                  isActive ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-orange-50" : ""}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] font-medium leading-none ${isActive ? "text-orange-500" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
