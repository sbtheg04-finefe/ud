import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

export const POINT_RULES = [
  { reason: "hack_reaction", label: "React to a hack", points: 1 },
  { reason: "battle_join_complete", label: "Join a completed battle", points: 2 },
  { reason: "battle_created", label: "Create a battle that gets 1+ joiner", points: 3 },
  { reason: "battle_win", label: "Win a battle", points: 5 },
  { reason: "judge_entries", label: "Judge 3+ entries", points: 10 },
];

export const POINT_REWARDS = [
  { points: 5, label: "Bonus battle entry", icon: "⚔️" },
  { points: 10, label: "Featured battle promotion", icon: "⭐" },
  { points: 25, label: "Free week of Pro", icon: "🚀" },
  { points: 50, label: "Cookbook publishing", icon: "📚" },
  { points: 100, label: "Free LatePoint booking site", icon: "📅" },
];

function currentWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export async function awardPoints(userId: number, reason: string, points: number) {
  const weekStart = currentWeekStart();
  await db.execute(
    sql`INSERT INTO user_weekly_points (user_id, points, reason, week_start_date)
        VALUES (${userId}, ${points}, ${reason}, ${weekStart}::date)`
  );
}

router.get("/points/weekly", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.json({ total: 0, breakdown: [], rewards: POINT_REWARDS, rules: POINT_RULES }); return; }

  const weekStart = currentWeekStart();
  const rows = await db.execute(
    sql`SELECT reason, SUM(points) as points FROM user_weekly_points
        WHERE user_id = ${userId} AND week_start_date = ${weekStart}::date
        GROUP BY reason ORDER BY points DESC`
  );

  const breakdown = (rows.rows as any[]).map(r => ({
    reason: r.reason,
    label: POINT_RULES.find(p => p.reason === r.reason)?.label || r.reason,
    points: Number(r.points),
  }));

  const total = breakdown.reduce((sum, b) => sum + b.points, 0);

  const nextReward = POINT_REWARDS.find(r => r.points > total);

  res.json({ total, breakdown, nextReward, rewards: POINT_REWARDS, rules: POINT_RULES, weekStart });
});

router.get("/points/leaderboard", async (req: Request, res: Response) => {
  const weekStart = currentWeekStart();
  const rows = await db.execute(
    sql`SELECT u.id, u.display_name, u.avatar_url, SUM(p.points) as total_points
        FROM user_weekly_points p
        JOIN users u ON u.id = p.user_id
        WHERE p.week_start_date = ${weekStart}::date
        GROUP BY u.id, u.display_name, u.avatar_url
        ORDER BY total_points DESC LIMIT 10`
  );
  res.json(rows.rows);
});

export default router;
