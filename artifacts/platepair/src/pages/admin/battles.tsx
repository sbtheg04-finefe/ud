import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Search, RefreshCw, Trash2, Edit3, Swords, AlertTriangle, Star, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  judging: "bg-amber-100 text-amber-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <p className="font-semibold text-gray-900">Confirm Action</p>
        </div>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Confirm</Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBattles() {
  const [battles, setBattles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBattles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("battleStatus", statusFilter);
      const res = await fetch(`/api/admin/battles?${params}`);
      const data = await res.json();
      setBattles(data.battles ?? []);
      setTotal(data.total ?? 0);
    } catch (_) {}
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchBattles(); }, [fetchBattles]);

  const deleteBattle = async (id: number) => {
    const res = await fetch(`/api/admin/battles/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("Battle soft-deleted"); fetchBattles(); }
    else showToast("Delete failed", false);
  };

  const toggleFeatured = async (battle: any) => {
    const res = await fetch(`/api/admin/battles/${battle.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !battle.isFeatured }),
    });
    if (res.ok) { showToast(battle.isFeatured ? "Unfeatured" : "Featured!"); fetchBattles(); }
    else showToast("Failed", false);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {confirmDialog && (
          <ConfirmDialog
            message={confirmDialog.message}
            onConfirm={() => { confirmDialog.action(); setConfirmDialog(null); }}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Swords size={22} className="text-red-500" /> Battle Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total battles</p>
          </div>
          <Button variant="outline" onClick={fetchBattles} disabled={loading} className="gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search battles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 text-sm" />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            {["open", "active", "judging", "completed", "cancelled"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Battle</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Participants</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Flags</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Created</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : battles.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No battles found</td></tr>
              ) : (
                battles.map(battle => (
                  <tr key={battle.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {battle.coverImageUrl && <img src={battle.coverImageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1 max-w-xs">{battle.title}</p>
                          <p className="text-xs text-gray-400">{battle.challengeType} · {battle.scopeType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[battle.battleStatus] ?? "bg-gray-100"}`}>
                        {battle.battleStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {battle.participantCount}/{battle.maxParticipants}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {battle.isHot && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><Flame size={9} />Hot</span>}
                        {battle.isFeatured && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><Star size={9} />Featured</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDistanceToNow(new Date(battle.createdAt), { addSuffix: true })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => toggleFeatured(battle)}
                          title={battle.isFeatured ? "Unfeature" : "Feature"}
                          className={`p-1.5 rounded-lg transition-colors ${battle.isFeatured ? "text-amber-500 bg-amber-50" : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"}`}
                        >
                          <Star size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDialog({ message: `Soft-delete battle "${battle.title}"?`, action: () => deleteBattle(battle.id) })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
