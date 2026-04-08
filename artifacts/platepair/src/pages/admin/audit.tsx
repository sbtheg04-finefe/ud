import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ScrollText, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  delete_user: "text-red-600 bg-red-50",
  soft_delete_hack: "text-red-500 bg-red-50",
  hard_delete_hack: "text-red-700 bg-red-100 font-bold",
  bulk_delete_hacks: "text-red-600 bg-red-50",
  soft_delete_meal: "text-red-500 bg-red-50",
  soft_delete_battle: "text-red-500 bg-red-50",
  change_role: "text-purple-600 bg-purple-50",
  change_hack_status: "text-blue-600 bg-blue-50",
  bulk_status_hacks: "text-blue-500 bg-blue-50",
  bulk_approve_hacks: "text-green-600 bg-green-50",
  import_content: "text-green-600 bg-green-50",
  edit_hack: "text-amber-600 bg-amber-50",
  edit_meal: "text-amber-600 bg-amber-50",
  edit_battle: "text-amber-600 bg-amber-50",
};

const ENTITY_COLORS: Record<string, string> = {
  hack: "text-orange-600",
  meal: "text-purple-600",
  battle: "text-red-600",
  user: "text-blue-600",
};

export default function AdminAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (entityFilter) params.set("entityType", entityFilter);
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (_) {}
    setLoading(false);
  }, [entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ScrollText size={22} className="text-gray-500" /> Audit Log
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} logged actions (immutable)</p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading} className="gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <Filter size={14} className="text-gray-400" />
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All entity types</option>
            <option value="hack">Hacks</option>
            <option value="meal">Meals</option>
            <option value="battle">Battles</option>
            <option value="user">Users</option>
          </select>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-40">Timestamp</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Entity</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Target</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <ScrollText size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">No admin actions logged yet</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  let metadata: any = {};
                  try { metadata = log.metadata ? JSON.parse(log.metadata) : {}; } catch (_) {}
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {format(new Date(log.createdAt), "MM/dd HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${ACTION_COLORS[log.action] ?? "text-gray-600 bg-gray-50"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${ENTITY_COLORS[log.entityType] ?? "text-gray-600"}`}>
                          {log.entityType}
                          {log.entityId && <span className="text-gray-400 font-normal"> #{log.entityId}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                        <span className="line-clamp-1">{log.entityTitle ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{log.adminName}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {Object.entries(metadata).filter(([k]) => !["count"].includes(k)).slice(0, 2).map(([k, v]) => (
                          <span key={k} className="mr-2">
                            <span className="font-medium text-gray-500">{k}:</span> {String(v).slice(0, 30)}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
