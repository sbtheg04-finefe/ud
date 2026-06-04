import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Swords, BookOpen, Video, Users, ChevronRight, Plus, Trash2,
  TrendingUp, BarChart2, CalendarCheck, Zap, CheckCircle2,
  Eye, PenLine, Clock, DollarSign, X, Star, Edit3,
} from "lucide-react";

// ── API helpers ───────────────────────────────────────────────────────────────

function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`/api${path}`, { credentials: "include", ...opts });
}

function useMyBattles() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiFetch("/battles?limit=20")
      .then(r => r.json())
      .then(d => {
        const battles = d?.battles ?? (Array.isArray(d) ? d : []);
        setData(battles);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  return { data, loading };
}

function useProducts() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  function load() {
    apiFetch("/creator/products")
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }
  useEffect(load, []);
  return { data, loading, reload: load };
}

function useSessions() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  function load() {
    apiFetch("/creator/sessions")
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }
  useEffect(load, []);
  return { data, loading, reload: load };
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ user, battles, products, sessions }: any) {
  const publishedProducts = products.filter((p: any) => p.status === "published");
  const publishedSessions = sessions.filter((s: any) => s.status === "published");
  const openBattles = battles.filter((b: any) => ["open", "live"].includes(b.battleStatus));

  return (
    <div>
      {/* Creator profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center gap-3">
        <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
          <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-lg">
            {user?.displayName?.substring(0, 2).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">{user?.displayName ?? "Your Name"}</div>
          <div className="text-sm text-gray-400">@{user?.username ?? "you"}</div>
          {user?.bio && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{user.bio}</div>}
        </div>
        <Link href={`/profile/${user?.id}/edit`}>
          <button className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
            <Edit3 size={15} className="text-gray-600" />
          </button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard icon={Swords}    label="Hosted challenges"  value={battles.length}           color="bg-orange-500" />
        <StatCard icon={Users}     label="Cooks joined"       value={battles.reduce((s: number, b: any) => s + (b.participantCount ?? 0), 0)} color="bg-blue-500" />
        <StatCard icon={BookOpen}  label="Products published" value={publishedProducts.length}  color="bg-emerald-500" />
        <StatCard icon={CalendarCheck} label="Sessions live"  value={publishedSessions.length}  color="bg-violet-500" />
      </div>

      {/* Quick actions */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Quick actions</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/battles/create", icon: Swords,        label: "Host a challenge",  color: "text-orange-500 bg-orange-50" },
            { href: "/create",         icon: Zap,            label: "Share a meal",      color: "text-amber-500 bg-amber-50" },
            { href: "/dashboard?tab=products", icon: BookOpen, label: "Add product",    color: "text-emerald-500 bg-emerald-50" },
            { href: "/dashboard?tab=sessions", icon: CalendarCheck, label: "Add session", color: "text-violet-500 bg-violet-50" },
          ].map(a => (
            <Link key={a.href} href={a.href}>
              <div className={`flex items-center gap-2.5 rounded-xl p-3 border border-gray-100 bg-white hover:border-gray-300 transition-colors`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.color}`}>
                  <a.icon size={15} />
                </div>
                <span className="text-sm font-semibold text-gray-800">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Active challenges */}
      {openBattles.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Your live challenges</p>
          <div className="flex flex-col gap-2">
            {openBattles.map((b: any) => (
              <Link key={b.id} href={`/battles/${b.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 flex items-center gap-3 p-3 hover:border-orange-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <Swords size={18} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{b.title}</div>
                    <div className="text-xs text-gray-400">{b.participantCount ?? 0} cooks joined</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Challenges tab ────────────────────────────────────────────────────────────

function ChallengesTab({ battles, loading }: any) {
  return (
    <div>
      <Link href="/battles/create">
        <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl py-3.5 mb-4 flex items-center justify-center gap-2 transition-colors">
          <Plus size={18} /> Host a New Challenge
        </button>
      </Link>
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl mb-2" />)
      ) : battles.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <Swords className="mx-auto mb-2 opacity-30" size={32} />
          <p className="text-sm font-medium">No challenges yet</p>
          <p className="text-xs mt-1">Host one and bring your audience together</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {battles.map((b: any) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">{b.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {b.participantCount ?? 0} joined · {b.entryCount ?? 0} entries
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${
                  b.battleStatus === "live" ? "bg-red-100 text-red-600"
                  : b.battleStatus === "open" ? "bg-green-100 text-green-600"
                  : b.battleStatus === "judging" ? "bg-amber-100 text-amber-600"
                  : "bg-gray-100 text-gray-500"
                }`}>
                  {b.battleStatus}
                </span>
              </div>
              <div className="flex gap-2">
                <Link href={`/battles/${b.id}`} className="flex-1">
                  <button className="w-full text-xs font-semibold border border-gray-200 rounded-full py-1.5 hover:border-gray-400 transition-colors">
                    View
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Products tab ──────────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  ebook: "Ebook", recipe_pack: "Recipe Pack", guide: "Guide",
  meal_plan: "Meal Plan", template: "Template",
};

function ProductForm({ onSave, onCancel }: { onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("ebook");
  const [price, setPrice]             = useState("");
  const [accessLink, setAccessLink]   = useState("");
  const [saving, setSaving]           = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title, description, productType, priceInCents: Math.round(Number(price || 0) * 100), accessLink });
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-gray-900 text-sm">New Digital Product</span>
        <button type="button" onClick={onCancel}><X size={16} className="text-gray-400" /></button>
      </div>
      <div className="flex flex-col gap-2.5">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Product title *" required
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description"
          rows={2} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400 resize-none" />
        <div className="grid grid-cols-2 gap-2">
          <select value={productType} onChange={e => setProductType(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none bg-white focus:border-orange-400">
            {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" type="number" min="0" step="0.01"
              className="w-full text-sm border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 outline-none focus:border-orange-400" />
          </div>
        </div>
        <input value={accessLink} onChange={e => setAccessLink(e.target.value)} placeholder="Link to file or download URL"
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400" />
        <button type="submit" disabled={saving || !title.trim()}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 text-white font-bold rounded-full py-2.5 text-sm transition-colors">
          {saving ? "Saving…" : "Save Product"}
        </button>
      </div>
    </form>
  );
}

function ProductsTab() {
  const { data: products, loading, reload } = useProducts();
  const [showForm, setShowForm] = useState(false);

  async function handleSave(data: any) {
    await apiFetch("/creator/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowForm(false);
    reload();
  }

  async function toggleStatus(product: any) {
    await apiFetch(`/creator/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: product.status === "published" ? "draft" : "published" }),
    });
    reload();
  }

  async function deleteProduct(id: number) {
    if (!confirm("Delete this product?")) return;
    await apiFetch(`/creator/products/${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div>
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl py-3.5 mb-4 flex items-center justify-center gap-2 transition-colors">
          <Plus size={18} /> Add Digital Product
        </button>
      )}
      {showForm && <ProductForm onSave={handleSave} onCancel={() => setShowForm(false)} />}

      {/* What is this? */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-emerald-700 mb-1">💡 What counts as a product?</p>
        <p className="text-xs text-emerald-600">Recipe ebooks, meal plan PDFs, kitchen guides, how-to breakdowns, pantry bundles. Publish it once, share it everywhere.</p>
      </div>

      {loading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl mb-2" />)
      ) : products.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <BookOpen className="mx-auto mb-2 opacity-30" size={32} />
          <p className="text-sm font-medium">No products yet</p>
          <p className="text-xs mt-1">Add your first recipe pack or ebook</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {products.map((p: any) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">{p.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{PRODUCT_TYPE_LABELS[p.productType] ?? p.productType}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {p.priceInCents === 0 ? "Free" : `$${(p.priceInCents / 100).toFixed(2)}`}
                    </span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">{p.purchaseCount} sales</span>
                  </div>
                </div>
                <button onClick={() => deleteProduct(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
              <button onClick={() => toggleStatus(p)}
                className={`text-xs font-bold rounded-full px-3 py-1 transition-colors ${
                  p.status === "published"
                    ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                    : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                }`}>
                {p.status === "published" ? "Published · Unpublish" : "Draft · Publish"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sessions tab ──────────────────────────────────────────────────────────────

const SESSION_TYPE_LABELS: Record<string, string> = {
  video_call: "Video Call", phone: "Phone", in_person: "In Person", cook_along: "Cook-Along",
};

function SessionForm({ onSave, onCancel }: { onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle]           = useState("");
  const [description, setDesc]      = useState("");
  const [sessionType, setType]      = useState("video_call");
  const [duration, setDuration]     = useState("60");
  const [price, setPrice]           = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving]         = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title, description, sessionType, durationMinutes: Number(duration), priceInCents: Math.round(Number(price || 0) * 100), confirmationMessage: confirmation });
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-gray-900 text-sm">New Session Offer</span>
        <button type="button" onClick={onCancel}><X size={16} className="text-gray-400" /></button>
      </div>
      <div className="flex flex-col gap-2.5">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title *" required
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400" />
        <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="What will you cover?" rows={2}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400 resize-none" />
        <div className="grid grid-cols-2 gap-2">
          <select value={sessionType} onChange={e => setType(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none bg-white focus:border-orange-400">
            {Object.entries(SESSION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={duration} onChange={e => setDuration(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none bg-white focus:border-orange-400">
            {["30","45","60","90","120"].map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" type="number" min="0" step="0.01"
            className="w-full text-sm border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 outline-none focus:border-orange-400" />
        </div>
        <input value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Confirmation message (optional)"
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400" />
        <button type="submit" disabled={saving || !title.trim()}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-200 text-white font-bold rounded-full py-2.5 text-sm transition-colors">
          {saving ? "Saving…" : "Save Session"}
        </button>
      </div>
    </form>
  );
}

function SessionsTab() {
  const { data: sessions, loading, reload } = useSessions();
  const [showForm, setShowForm] = useState(false);

  async function handleSave(data: any) {
    await apiFetch("/creator/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowForm(false);
    reload();
  }

  async function toggleStatus(session: any) {
    await apiFetch(`/creator/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: session.status === "published" ? "draft" : "published" }),
    });
    reload();
  }

  async function deleteSession(id: number) {
    if (!confirm("Delete this session?")) return;
    await apiFetch(`/creator/sessions/${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div>
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl py-3.5 mb-4 flex items-center justify-center gap-2 transition-colors">
          <Plus size={18} /> Add a Session Offer
        </button>
      )}
      {showForm && <SessionForm onSave={handleSave} onCancel={() => setShowForm(false)} />}

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-violet-700 mb-1">💡 What's a session?</p>
        <p className="text-xs text-violet-600">1-on-1 coaching, virtual cook-alongs, consultations, personalized recipe reviews. Time you offer, your way.</p>
      </div>

      {loading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl mb-2" />)
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <CalendarCheck className="mx-auto mb-2 opacity-30" size={32} />
          <p className="text-sm font-medium">No sessions yet</p>
          <p className="text-xs mt-1">Offer a cook-along or 1-on-1 coaching</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sessions.map((s: any) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">{s.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">{s.durationMinutes} min</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {s.priceInCents === 0 ? "Free" : `$${(s.priceInCents / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>
                <button onClick={() => deleteSession(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
              <button onClick={() => toggleStatus(s)}
                className={`text-xs font-bold rounded-full px-3 py-1 transition-colors ${
                  s.status === "published"
                    ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                    : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                }`}>
                {s.status === "published" ? "Published · Unpublish" : "Draft · Publish"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "overview" | "challenges" | "products" | "sessions";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "overview",   label: "Overview",   icon: BarChart2 },
  { id: "challenges", label: "Challenges", icon: Swords },
  { id: "products",   label: "Products",   icon: BookOpen },
  { id: "sessions",   label: "Sessions",   icon: CalendarCheck },
];

export default function Dashboard() {
  const { data: user }                              = useCurrentUser();
  const { data: battles, loading: loadingBattles }  = useMyBattles();
  const { data: products }                          = useProducts();
  const { data: sessions }                          = useSessions();

  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-28">

        {/* Tab navigation */}
        <div className="flex overflow-x-auto scrollbar-none gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 mb-5 shadow-sm">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 shrink-0 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  tab === t.id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.substring(0, 3)}</span>
              </button>
            );
          })}
        </div>

        {tab === "overview"   && <OverviewTab user={user} battles={battles} products={products} sessions={sessions} />}
        {tab === "challenges" && <ChallengesTab battles={battles} loading={loadingBattles} />}
        {tab === "products"   && <ProductsTab />}
        {tab === "sessions"   && <SessionsTab />}
      </main>
    </div>
  );
}
