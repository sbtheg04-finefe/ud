import { Router } from "express";
import { db, growthEventsTable } from "@workspace/db";

const router = Router();

router.post("/events", async (req, res) => {
  const { eventType, sessionId, metadata } = req.body;

  if (!eventType || typeof eventType !== "string") {
    res.status(400).json({ error: "eventType required" });
    return;
  }

  try {
    await db.insert(growthEventsTable).values({
      userId: req.isAuthenticated() ? req.user.id : null,
      sessionId: sessionId ?? null,
      eventType,
      metadata: metadata ?? null,
    });
  } catch {
    // Silently fail — never let tracking break the user experience
  }

  res.status(204).end();
});

export default router;
