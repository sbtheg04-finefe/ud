import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Bell, ChevronRight, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function markRead(id: number) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }

  const TYPE_ICONS: Record<string, string> = {
    battle_at_risk: "⚠️",
    battle_closing_soon: "⏰",
    battle_joined: "🎉",
    battle_started: "🔥",
    battle_completed: "🏆",
    points_earned: "⭐",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) loadNotifications(); }}
        className="relative p-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-background border rounded-2xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <Bell className="mx-auto mb-2 opacity-30" size={28} />
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${!n.is_read ? "bg-primary/5" : ""}`}
                  onClick={() => { if (!n.is_read) markRead(n.id); }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      {n.data?.battleId && (
                        <Link href={`/battles/${n.data.battleId}`} onClick={() => setOpen(false)}>
                          <span className="text-xs text-primary mt-1 flex items-center gap-1 hover:underline">
                            View battle <ChevronRight size={10} />
                          </span>
                        </Link>
                      )}
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t">
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1">
                View dashboard <ChevronRight size={11} />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
