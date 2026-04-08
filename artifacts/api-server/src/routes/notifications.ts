import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { battlesTable, battleInterestTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

async function getNotificationsTable() {
  return db.execute(sql`SELECT 1`).then(() => true).catch(() => false);
}

async function listNotifications(userId: number) {
  const rows = await db.execute(
    sql`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`
  );
  return rows.rows as any[];
}

async function createNotification(userId: number, type: string, title: string, body: string, data: Record<string, any> = {}) {
  await db.execute(
    sql`INSERT INTO notifications (user_id, type, title, body, data) VALUES (${userId}, ${type}, ${title}, ${body}, ${JSON.stringify(data)}::jsonb)`
  );
}

async function autoGenerateBattleNotifications(userId: number) {
  const userBattles = await db.select().from(battlesTable)
    .where(and(eq(battlesTable.createdBy, userId), eq(battlesTable.battleStatus, "open")))
    .limit(20);

  for (const battle of userBattles) {
    const regEnd = battle.registrationEnd;
    if (!regEnd) continue;

    const hoursLeft = (new Date(regEnd).getTime() - Date.now()) / 3600000;
    if (hoursLeft < 0) continue;

    const needsMore = battle.participantCount < 2;

    if (needsMore && hoursLeft <= 3) {
      const existing = await db.execute(
        sql`SELECT id FROM notifications WHERE user_id = ${userId} AND type = 'battle_at_risk' AND data->>'battleId' = ${String(battle.id)} AND created_at > now() - interval '24 hours'`
      );
      if ((existing.rows as any[]).length === 0) {
        await createNotification(
          userId,
          "battle_at_risk",
          "⚠️ Battle needs more cooks",
          `"${battle.title}" closes in ${Math.round(hoursLeft)}h with only ${battle.participantCount} participant${battle.participantCount !== 1 ? "s" : ""}. Share the invite link to fill the remaining slots.`,
          { battleId: battle.id, battleTitle: battle.title }
        );
      }
    }

    if (!needsMore && hoursLeft <= 3) {
      const existing = await db.execute(
        sql`SELECT id FROM notifications WHERE user_id = ${userId} AND type = 'battle_closing_soon' AND data->>'battleId' = ${String(battle.id)} AND created_at > now() - interval '24 hours'`
      );
      if ((existing.rows as any[]).length === 0) {
        await createNotification(
          userId,
          "battle_closing_soon",
          "⏰ Registration closing soon",
          `"${battle.title}" closes in ${Math.round(hoursLeft)}h with ${battle.participantCount} participants ready.`,
          { battleId: battle.id, battleTitle: battle.title }
        );
      }
    }
  }
}

router.get("/notifications", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    await autoGenerateBattleNotifications(userId);
    const notifications = await listNotifications(userId);
    const unreadCount = notifications.filter((n: any) => !n.is_read).length;
    res.json({ notifications, unreadCount });
  } catch (e) {
    res.json({ notifications: [], unreadCount: 0 });
  }
});

router.patch("/notifications/read-all", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.execute(sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}`);
  res.json({ ok: true });
});

router.patch("/notifications/:id/read", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.execute(sql`UPDATE notifications SET is_read = true WHERE id = ${Number(req.params.id)} AND user_id = ${userId}`);
  res.json({ ok: true });
});

export { createNotification };
export default router;
