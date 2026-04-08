import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Search, RefreshCw, Trash2, CheckCircle2, XCircle, Edit3,
  ChevronUp, ChevronDown, MoreHorizontal, AlertTriangle, Zap, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  community_voting: "bg-blue-100 text-blue-700",
  submitted: "bg-gray-100 text-gray-600",
  ai_reviewing: "bg-amber-100 text-amber-700",
  challenged: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
};

interface Hack {
  id: number;
  title: string;
  hackStatus: string;
  communityUpvotes: number;
  communityDownvotes: number;
  sourcePlatform: string | null;
  thumbnailUrl: string | null;
  isDemo: number;
  createdAt: string;
  deletedAt: string | null;
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Confirm Action</p>
          </div>
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

function EditDialog({ hack, onSave, onCancel }: { hack: Hack; onSave: (data: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(hack.title);
  const [status, setStatus] = useState(hack.hackStatus);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl w-full">
        <h3 className="font-bold text-lg mb-4">Edit Hack</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            >
              {["submitted", "community_voting", "approved", "challenged", "rejected"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={() => onSave({ title, hackStatus: status })} className="flex-1">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminHacks() {
  const [hacks, setHacks] = useState<Hack[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);
  const [editingHack, setEditingHack] = useState<Hack | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100", showDeleted: String(showDeleted) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/hacks?${params}`);
      const data = await res.json();
      setHacks(data.hacks ?? []);
      setTotal(data.total ?? 0);
    } catch (_) {}
    setLoading(false);
  }, [search, statusFilter, showDeleted]);

  useEffect(() => { fetchHacks(); }, [fetchHacks]);

  const deleteHack = async (id: number) => {
    const res = await fetch(`/api/admin/hacks/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("Hack soft-deleted"); fetchHacks(); }
    else showToast("Delete failed", false);
  };

  const bulkDelete = async () => {
    const res = await fetch("/api/admin/hacks/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    });
    if (res.ok) { showToast(`Deleted ${selected.length} hacks`); setSelected([]); fetchHacks(); }
    else showToast("Bulk delete failed", false);
  };

  const bulkApprove = async () => {
    const res = await fetch("/api/admin/hacks/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected, hackStatus: "approved" }),
    });
    if (res.ok) { showToast(`Approved ${selected.length} hacks`); setSelected([]); fetchHacks(); }
    else showToast("Bulk approve failed", false);
  };

  const saveEdit = async (data: any) => {
    if (!editingHack) return;
    const res = await fetch(`/api/admin/hacks/${editingHack.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { showToast("Hack updated"); setEditingHack(null); fetchHacks(); }
    else showToast("Update failed", false);
  };

  const toggleSelect = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(selected.length === hacks.length ? [] : hacks.map(h => h.id));

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
        {editingHack && <EditDialog hack={editingHack} onSave={saveEdit} onCancel={() => setEditingHack(null)} />}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Zap size={22} className="text-orange-500" /> Hacks Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total hacks (non-deleted)</p>
          </div>
          <Button variant="outline" onClick={fetchHacks} disabled={loading} className="gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search hacks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 text-sm" />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            {["submitted", "community_voting", "approved", "challenged", "rejected"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded" />
            Show deleted
          </label>
        </div>

        {/* Bulk actions */}
        {selected.length > 0 && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-sm font-semibold text-blue-800">{selected.length} selected</span>
            <Button
              size="sm"
              className="gap-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setConfirmDialog({ message: `Approve ${selected.length} hacks?`, action: bulkApprove })}
            >
              <CheckCircle2 size={13} /> Bulk Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1"
              onClick={() => setConfirmDialog({ message: `Soft-delete ${selected.length} hacks? They can be recovered.`, action: bulkDelete })}
            >
              <Trash2 size={13} /> Bulk Delete
            </Button>
            <button onClick={() => setSelected([])} className="ml-auto text-sm text-blue-600 hover:underline">Clear</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selected.length === hacks.length && hacks.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Votes</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Created</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : hacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No hacks found</td>
                </tr>
              ) : (
                hacks.map(hack => (
                  <tr key={hack.id} className={`hover:bg-gray-50 ${hack.deletedAt ? "opacity-50 bg-red-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(hack.id)} onChange={() => toggleSelect(hack.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {hack.thumbnailUrl && (
                          <img src={hack.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        <span className="font-medium text-gray-900 line-clamp-1 max-w-xs">{hack.title}</span>
                        {hack.isDemo === 1 && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold shrink-0">AUTO</span>}
                        {hack.deletedAt && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold shrink-0">DELETED</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[hack.hackStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {hack.hackStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-green-600 font-semibold">↑{hack.communityUpvotes}</span>
                      <span className="text-red-400 ml-1">↓{hack.communityDownvotes}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{hack.sourcePlatform ?? "user"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDistanceToNow(new Date(hack.createdAt), { addSuffix: true })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditingHack(hack)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        {!hack.deletedAt && (
                          <button
                            onClick={() => setConfirmDialog({ message: `Soft-delete "${hack.title}"? Can be recovered.`, action: () => deleteHack(hack.id) })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
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
