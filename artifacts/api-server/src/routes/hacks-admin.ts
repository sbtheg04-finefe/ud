import { Router, type Request, type Response } from "express";
import { populateHacks, lastPopulateResult, nextScheduledRun } from "../lib/hack-populator";
import { db } from "@workspace/db";
import { videosTable } from "@workspace/db/schema";
import { count, eq } from "drizzle-orm";

const router = Router();

router.get("/hacks/cron-status", async (_req: Request, res: Response) => {
  const [{ value: total }] = await db.select({ value: count() }).from(videosTable);
  const [{ value: demo }] = await db.select({ value: count() }).from(videosTable)
    .where(eq(videosTable.isDemo, 1));
  const [{ value: approved }] = await db.select({ value: count() }).from(videosTable)
    .where(eq(videosTable.hackStatus, "approved"));

  res.json({
    lastRun: lastPopulateResult,
    nextScheduledRun,
    stats: {
      total: Number(total),
      demo: Number(demo),
      userSubmitted: Number(total) - Number(demo),
      approved: Number(approved),
    },
  });
});

router.post("/hacks/populate", async (req: Request, res: Response) => {
  const targetCount = Number(req.body?.count ?? 30);
  if (isNaN(targetCount) || targetCount < 1 || targetCount > 100) {
    res.status(400).json({ error: "count must be 1-100" });
    return;
  }
  try {
    const result = await populateHacks(targetCount);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Population failed" });
  }
});

export default router;
