import { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

export type TrackEventType =
  | "landing_viewed"
  | "login_clicked"
  | "onboarding_started"
  | "onboarding_step_viewed"
  | "onboarding_intent_selected"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "battle_viewed"
  | "battle_joined"
  | "battle_created"
  | "battle_entry_submitted"
  | "group_viewed"
  | "group_created"
  | "group_joined"
  | "invite_sent"
  | "invite_code_copied"
  | "hack_upvoted"
  | "hack_ai_review_requested"
  | "partner_dashboard_viewed"
  | "judge_queue_viewed"
  | "feed_filtered"
  | "meal_shared"
  | "profile_viewed";

let _anonId: string | null = null;
function getAnonId(): string {
  if (_anonId) return _anonId;
  const stored = localStorage.getItem("pp_anon_id");
  if (stored) { _anonId = stored; return stored; }
  const id = crypto.randomUUID();
  localStorage.setItem("pp_anon_id", id);
  _anonId = id;
  return id;
}

export function useTrack() {
  const { user } = useAuth();

  const track = useCallback(
    (event: TrackEventType, metadata?: Record<string, unknown>) => {
      const payload = {
        eventType: event,
        sessionId: getAnonId(),
        metadata: { ...metadata, path: window.location.pathname },
      };
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).catch(() => {});
    },
    [user],
  );

  return { track };
}
