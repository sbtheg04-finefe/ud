import { useState } from "react";
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
  Home, Compass, PlusCircle, Users, BarChart2,
  Search, Bell, Settings, LogOut, UserCircle2,
  LayoutDashboard, Shield, Building2, Star, ChefHat,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";

const PAGE_TITLES: Record<string, string> = {
  "/":          "Home",
  "/videos":    "Discover",
  "/create":    "Share",
  "/groups":    "Circles",
  "/battles":   "Circles",
  "/dashboard": "You",
  "/saved":     "Saved",
};

export function Navbar() {
  const [location] = useLocation();
  const { data: user, isPartner, isJudge } = useCurrentUser();
  const { logout, isAuthenticated, isLoading, user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    path === "/" ? location === "/" : location.startsWith(path)
  )?.[1] ?? "PlatePair";

  const bottomTabs = [
    { href: "/",        label: "Home",     icon: Home },
    { href: "/videos",  label: "Discover", icon: Compass },
    { href: "/groups",  label: "Circles",  icon: Users },
    { href: "/dashboard", label: "You",    icon: BarChart2 },
  ];

  return (
    <>
      {/* ── Top header ── */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">

          {/* Left: logo + page title */}
          <div className="flex items-center gap-2.5">
            <Link href="/">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shrink-0">
                <ChefHat size={18} />
              </div>
            </Link>
            <span className="text-xl font-bold text-gray-900 tracking-tight">{pageTitle}</span>
          </div>

          {/* Right: action icons */}
          <div className="flex items-center gap-1">
            <Link href="/videos">
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                <Search size={20} />
              </button>
            </Link>

            {isAuthenticated && <NotificationBell />}

            {!isLoading && !isAuthenticated && (
              <Link href="/login">
                <button className="flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 px-3 py-1.5 rounded-full border border-orange-200 hover:border-orange-400 transition-colors">
                  Sign In
                </button>
              </Link>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
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
                    <div className="flex flex-col leading-tight">
                      <p className="font-semibold text-sm">{user.displayName}</p>
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
                      <Settings size={14} /> Settings
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
        </div>
      </header>

      {/* ── Bottom tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
        <div className="flex items-end justify-around max-w-2xl mx-auto px-2 pt-1 pb-2">

          {/* First two tabs */}
          {bottomTabs.slice(0, 2).map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? "text-orange-500" : "text-gray-400"}
                />
                <span className={`text-[10px] font-medium leading-none ${isActive ? "text-orange-500" : "text-gray-400"}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Center large Share / Record button */}
          <Link href={isAuthenticated ? "/create" : "/login"} className="flex flex-col items-center flex-1 -mt-5">
            <div className="w-14 h-14 rounded-full bg-orange-500 shadow-lg shadow-orange-200 flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all">
              <PlusCircle size={28} className="text-white" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-medium text-gray-400 mt-0.5 leading-none">Share</span>
          </Link>

          {/* Last two tabs */}
          {bottomTabs.slice(2).map(({ href, label, icon: Icon }) => {
            const isActive = location.startsWith(href);
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 flex-1 py-1 transition-colors">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? "text-orange-500" : "text-gray-400"}
                />
                <span className={`text-[10px] font-medium leading-none ${isActive ? "text-orange-500" : "text-gray-400"}`}>
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
