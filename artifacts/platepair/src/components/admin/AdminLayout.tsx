import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Zap, Utensils, Swords,
  Download, ScrollText, ChevronRight, LogOut, Shield
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/hacks", label: "Hacks", icon: Zap },
  { href: "/admin/meals", label: "Meals", icon: Utensils },
  { href: "/admin/battles", label: "Battles", icon: Swords },
  { href: "/admin/import", label: "Import Content", icon: Download },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">PlatePair Admin</p>
              <p className="text-[11px] text-gray-400">Control Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  isActive ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}>
                  <item.icon size={16} />
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400">
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
              {user?.displayName?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user?.displayName ?? "Admin"}</p>
              <p className="truncate">{user?.email ?? ""}</p>
            </div>
          </div>
          <Link href="/">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer mt-1">
              <LogOut size={14} />
              Back to App
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
