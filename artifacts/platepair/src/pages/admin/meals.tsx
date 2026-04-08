import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Search, RefreshCw, Trash2, Edit3, Utensils, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-gray-100 text-gray-600",
  cooking: "bg-amber-100 text-amber-700",
  available: "bg-blue-100 text-blue-700",
  finished: "bg-green-100 text-green-700",
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

export default function AdminMeals() {
  const [meals, setMeals] = useState<any[]>([]);
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

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("shareStatus", statusFilter);
      const res = await fetch(`/api/admin/meals?${params}`);
      const data = await res.json();
      setMeals(data.meals ?? []);
      setTotal(data.total ?? 0);
    } catch (_) {}
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const deleteMeal = async (id: number) => {
    const res = await fetch(`/api/admin/meals/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("Meal soft-deleted"); fetchMeals(); }
    else showToast("Delete failed", false);
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
              <Utensils size={22} className="text-purple-500" /> Meal Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total meals</p>
          </div>
          <Button variant="outline" onClick={fetchMeals} disabled={loading} className="gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search meals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 text-sm" />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            {["idea", "cooking", "available", "finished"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Meal</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Likes</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Created</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : meals.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No meals found</td></tr>
              ) : (
                meals.map(meal => (
                  <tr key={meal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {meal.imageUrl && <img src={meal.imageUrl.startsWith("/objects/") ? `/api/storage${meal.imageUrl}` : meal.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                        <span className="font-medium text-gray-900 line-clamp-1 max-w-xs">{meal.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[meal.shareStatus] ?? "bg-gray-100"}`}>
                        {meal.shareStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{meal.mealType}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{meal.likeCount ?? 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDistanceToNow(new Date(meal.createdAt), { addSuffix: true })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setConfirmDialog({ message: `Soft-delete "${meal.title}"?`, action: () => deleteMeal(meal.id) })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
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
