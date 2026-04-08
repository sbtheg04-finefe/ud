import { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { getListGroupsQueryKey } from "@workspace/api-client-react";
import { Users, Globe, Lock, EyeOff, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

type Visibility = "public" | "private" | "invite_only";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; desc: string; icon: React.FC<{ size: number; className?: string }> }[] = [
  { value: "public", label: "Public", desc: "Anyone can find and join", icon: Globe },
  { value: "private", label: "Private", desc: "Members only — others can see it exists", icon: Lock },
  { value: "invite_only", label: "Invite Only", desc: "Completely hidden — join by invite", icon: EyeOff },
];

const POPULAR_TAGS = [
  "Italian", "Japanese", "Mexican", "Plant-Based", "Baking", "Grilling",
  "Budget Cooking", "Quick Meals", "Family Friendly", "Spicy", "Seafood", "Desserts",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export default function CreateGroup() {
  const [, setLocation] = useLocation();
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slug = slugify(name);

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (t && !selectedTags.includes(t) && selectedTags.length < 5) {
      setSelectedTags(prev => [...prev, t]);
      setCustomTag("");
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give your group a name.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          slug: slug || "group-" + Date.now(),
          description: description.trim() || null,
          visibility,
          tags: selectedTags,
          createdById: user.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to create group");

      const group = await res.json();
      await queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });

      toast({ title: "Group created!", description: `${group.name} is ready.` });
      setLocation(`/groups/${group.id}`);
    } catch {
      toast({ title: "Failed to create group", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft size={16} /> Back to Groups
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2 text-primary">Start a Circle</h1>
          <p className="text-muted-foreground">Create a private space for your cooking community — family, friends, or foodies.</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Group Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Group Name *</label>
                <Input
                  placeholder="e.g. The Sunday Grill Club"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={60}
                />
                {slug && (
                  <p className="text-xs text-muted-foreground mt-1">
                    URL: /groups/<span className="font-mono">{slug}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Textarea
                  placeholder="What does your group cook? What brings you together?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{description.length}/300</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {VISIBILITY_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setVisibility(value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    visibility === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${visibility === value ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon size={18} className={visibility === value ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  {visibility === value && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags <span className="text-muted-foreground font-normal text-xs">(up to 5)</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {POPULAR_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedTags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag…"
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustomTag()}
                  className="text-sm"
                  maxLength={30}
                />
                <Button variant="outline" size="sm" onClick={addCustomTag} disabled={!customTag.trim() || selectedTags.length >= 5}>
                  Add
                </Button>
              </div>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedTags.map(t => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleTag(t)}
                    >
                      {t} ×
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setLocation("/groups")}>
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2 rounded-full"
              onClick={handleCreate}
              disabled={isSubmitting || !name.trim()}
              size="lg"
            >
              <Users size={18} />
              {isSubmitting ? "Creating…" : "Create Group"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
