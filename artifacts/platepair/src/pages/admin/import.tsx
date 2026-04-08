import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Link2, Search, CheckCircle2, RefreshCw, Edit3, Download, AlertTriangle, Tag, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ImportStep = "url" | "preview" | "confirm" | "done";

const PLATFORM_CONFIG: Record<string, { icon: string; color: string }> = {
  tiktok: { icon: "🎵", color: "text-pink-600" },
  instagram: { icon: "📸", color: "text-purple-600" },
  youtube: { icon: "▶️", color: "text-red-600" },
  web: { icon: "🌐", color: "text-blue-600" },
};

export default function AdminImport() {
  const [step, setStep] = useState<ImportStep>("url");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savedHack, setSavedHack] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnail, setEditThumbnail] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editStatus, setEditStatus] = useState("submitted");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPreview = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/admin/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setFetchError(data.error ?? "Could not fetch URL"); setFetching(false); return; }
      setPreview(data);
      setEditTitle(data.suggestedTitle ?? data.title ?? "");
      setEditDescription(data.description ?? "");
      setEditThumbnail(data.thumbnailUrl ?? "");
      setEditTags(data.tags?.join(", ") ?? "");
      setEditStatus("submitted");
      setStep("preview");
    } catch (err: any) {
      setFetchError("Network error: " + err.message);
    }
    setFetching(false);
  };

  const saveImport = async () => {
    setSaving(true);
    try {
      const tagArr = editTags.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean).slice(0, 5);
      const res = await fetch("/api/admin/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          thumbnailUrl: editThumbnail.trim() || null,
          sourceUrl: url.trim(),
          sourcePlatform: preview?.platform ?? "web",
          tags: tagArr,
          hackStatus: editStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Save failed", false); setSaving(false); return; }
      setSavedHack(data);
      setStep("done");
      showToast("Content imported successfully!");
    } catch (err: any) {
      showToast("Network error", false);
    }
    setSaving(false);
  };

  const reset = () => {
    setStep("url");
    setUrl("");
    setPreview(null);
    setSavedHack(null);
    setFetchError(null);
  };

  const platform = preview?.platform ? PLATFORM_CONFIG[preview.platform] ?? PLATFORM_CONFIG.web : null;

  return (
    <AdminLayout>
      <div className="p-8 max-w-3xl">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.msg}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Download size={22} className="text-green-500" /> Import Content
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Paste any recipe URL — TikTok, Instagram, YouTube, food blog. Preview metadata, edit fields, then confirm to save.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { key: "url", label: "1. Paste URL" },
            { key: "preview", label: "2. Preview & Edit" },
            { key: "done", label: "3. Saved" },
          ].map((s, i) => {
            const isActive = step === s.key || (step === "confirm" && s.key === "preview");
            const isDone = (step === "preview" && i === 0) || (step === "done" && i < 2);
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  isActive ? "bg-primary text-white" : isDone ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {isDone ? <CheckCircle2 size={12} /> : null}
                  {s.label}
                </div>
                {i < 2 && <div className="w-6 h-px bg-gray-200" />}
              </div>
            );
          })}
        </div>

        {/* Warning */}
        <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <AlertTriangle size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>Manual import only.</strong> This tool fetches basic metadata (title, image, description) from the URL. You must review and confirm all fields before saving. Nothing is auto-published.
          </p>
        </div>

        {/* STEP 1: URL Input */}
        {step === "url" && (
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Link2 size={16} className="text-gray-500" /> Paste Recipe URL
            </h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://tiktok.com/@chef/video/... or any recipe URL"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchPreview()}
                  className="flex-1 text-sm"
                />
                <Button onClick={fetchPreview} disabled={!url.trim() || fetching} className="gap-2 shrink-0">
                  {fetching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  {fetching ? "Fetching..." : "Fetch"}
                </Button>
              </div>
              {fetchError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertTriangle size={14} />
                  {fetchError}
                </div>
              )}
              <div className="text-xs text-gray-400 space-y-1">
                <p className="font-medium">Works with:</p>
                <div className="flex flex-wrap gap-2">
                  {["🎵 TikTok", "📸 Instagram", "▶️ YouTube", "🌐 Food blogs", "📰 Recipe sites"].map(s => (
                    <span key={s} className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Edit */}
        {(step === "preview" || step === "confirm") && preview && (
          <div className="space-y-4">
            {/* Extracted preview */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                Raw Metadata Extracted
                {platform && <span className={`text-xs font-normal ${platform.color}`}>{platform.icon} {preview.platform}</span>}
              </h2>
              <div className="flex gap-4">
                {preview.thumbnailUrl && (
                  <img src={preview.thumbnailUrl} alt="preview" className="w-24 h-20 rounded-xl object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">{preview.title || "(no title found)"}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-3">{preview.description || "(no description found)"}</p>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 inline-block truncate max-w-xs">{url}</a>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                <Edit3 size={15} className="text-gray-500" /> Edit Before Saving
              </h2>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  <FileText size={12} /> Title <span className="text-gray-400 font-normal">(max 120 chars)</span>
                </label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={120} className="text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Description / Notes</label>
                <Textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                  maxLength={300}
                />
                <p className="text-right text-[10px] text-gray-400 mt-0.5">{editDescription.length}/300</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  <ImageIcon size={12} /> Thumbnail URL
                </label>
                <Input value={editThumbnail} onChange={e => setEditThumbnail(e.target.value)} placeholder="https://..." className="text-sm" />
                {editThumbnail && (
                  <img src={editThumbnail} alt="thumb" className="w-20 h-14 rounded-lg object-cover mt-2" onError={e => (e.currentTarget.style.display = "none")} />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block flex items-center gap-1">
                  <Tag size={12} /> Tags <span className="text-gray-400 font-normal">(comma-separated, max 5)</span>
                </label>
                <Input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="tiktok, airfryer, chicken" className="text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Initial Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                >
                  <option value="submitted">Submitted (goes to community voting)</option>
                  <option value="community_voting">Community Voting</option>
                  <option value="approved">Approved (skip voting + AI)</option>
                  <option value="challenged">Needs Work</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">← Start Over</Button>
              <Button
                onClick={saveImport}
                disabled={!editTitle.trim() || saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {saving ? "Saving..." : "Confirm & Save"}
              </Button>
            </div>

            <p className="text-center text-xs text-gray-400">This action is logged in the audit trail. Nothing is auto-published unless you set status to Approved.</p>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === "done" && savedHack && (
          <div className="bg-white border border-green-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h2 className="font-bold text-xl text-gray-900 mb-2">Content Imported</h2>
            <p className="text-gray-500 text-sm mb-1">Saved as hack ID #{savedHack.id}</p>
            <p className="font-medium text-gray-900 mb-5">"{savedHack.title}"</p>
            {savedHack.thumbnailUrl && (
              <img src={savedHack.thumbnailUrl} alt="saved" className="w-full max-w-xs rounded-xl mx-auto mb-5 object-cover h-32" />
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={reset} className="gap-2">
                <Download size={14} /> Import Another
              </Button>
              <Button onClick={() => window.open(`/videos`, "_blank")} className="gap-2">
                View in Hacks →
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
