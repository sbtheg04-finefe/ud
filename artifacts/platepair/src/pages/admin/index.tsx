import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Users, Zap, Utensils, Swords, CheckCircle2, Shield,
  TrendingUp, AlertTriangle, RefreshCw, Clock, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  delete_user: "text-red-600",
  soft_delete_hack: "text-red-500",
  hard_delete_hack: "text-red-700 font-bold",
  bulk_delete_hacks: "text-red-600",
  change_role: "text-purple-600",
  change_hack_status: "text-blue-600",
  bulk_status_hacks: "text-blue-500",
  import_content: "text-green-600",
  edit_hack: "text-amber-600",
  edit_meal: "text-amber-600",
  edit_battle: "text-amber-600",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const STAT_CARDS = [
    { label: "Total Users", value: stats?.users, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/users" },
    { label: "Hacks", value: stats?.hacks, icon: Zap, color: "text-orange-600", bg: "bg-orange-50", href: "/admin/hacks" },
    { label: "Approved Hacks", value: stats?.approvedHacks, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", href: "/admin/hacks" },
    { label: "Meals", value: stats?.meals, icon: Utensils, color: "text-purple-600", bg: "bg-purple-50", href: "/admin/meals" },
    { label: "Battles", value: stats?.battles, icon: Swords, color: "text-red-600", bg: "bg-red-50", href: "/admin/battles" },
    { label: "Admin Users", value: stats?.admins, icon: Shield, color: "text-gray-600", bg: "bg-gray-100", href: "/admin/users" },
  ];

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage all PlatePair content and users</p>
          </div>
          <Button variant="outline" onClick={fetchStats} disabled={loading} className="gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        {/* Warning banner */}
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Admin Zone — Handle with care</p>
            <p className="text-xs text-amber-700 mt-0.5">All destructive actions are logged. Deletions are soft by default. Hard deletes are permanent and irreversible.</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {STAT_CARDS.map(card => (
            <Link key={card.label} href={card.href}>
              <div className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon size={18} className={card.color} />
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "—" : (card.value ?? 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { href: "/admin/import", label: "Import content from URL", desc: "Paste any recipe link → preview → save", color: "bg-green-500" },
                { href: "/admin/hacks", label: "Manage hacks", desc: "Edit, approve, delete, bulk actions", color: "bg-orange-500" },
                { href: "/admin/users", label: "Manage users", desc: "Promote, demote, delete accounts", color: "bg-blue-500" },
                { href: "/admin/audit", label: "View audit log", desc: "See all recent admin actions", color: "bg-gray-500" },
              ].map(a => (
                <Link key={a.href} href={a.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group">
                    <div className={`w-2 h-2 rounded-full ${a.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{a.label}</p>
                      <p className="text-xs text-gray-500">{a.desc}</p>
                    </div>
                    <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent audit log */}
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              Recent Activity
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : stats?.recentLogs?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No admin actions yet</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentLogs?.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-2 py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-mono font-semibold ${ACTION_COLORS[log.action] ?? "text-gray-600"}`}>
                        {log.action}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{log.entityTitle ?? log.entityType}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
                <Link href="/admin/audit">
                  <p className="text-xs text-primary hover:underline mt-2 cursor-pointer">View full log →</p>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
