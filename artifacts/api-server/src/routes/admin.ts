import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable, videosTable, mealsTable, battlesTable, auditLogsTable
} from "@workspace/db/schema";
import { eq, desc, asc, ilike, and, isNull, isNotNull, count, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();
router.use(requireAdmin);

async function writeAuditLog(
  adminId: number,
  adminName: string,
  action: string,
  entityType: string,
  entityId: number | null,
  entityTitle: string | null,
  metadata?: object
) {
  await db.insert(auditLogsTable).values({
    adminId,
    adminName,
    action,
    entityType,
    entityId,
    entityTitle,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

router.get("/admin/stats", async (req: Request, res: Response) => {
  const [users] = await db.select({ value: count() }).from(usersTable);
  const [hacks] = await db.select({ value: count() }).from(videosTable).where(isNull(videosTable.deletedAt));
  const [meals] = await db.select({ value: count() }).from(mealsTable).where(isNull(mealsTable.deletedAt));
  const [battles] = await db.select({ value: count() }).from(battlesTable).where(isNull(battlesTable.deletedAt));
  const [approvedHacks] = await db.select({ value: count() }).from(videosTable)
    .where(and(isNull(videosTable.deletedAt), eq(videosTable.hackStatus, "approved")));
  const [admins] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.role, "admin"));
  const recentLogs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(5);

  res.json({
    users: Number(users.value),
    hacks: Number(hacks.value),
    meals: Number(meals.value),
    battles: Number(battles.value),
    approvedHacks: Number(approvedHacks.value),
    admins: Number(admins.value),
    recentLogs,
  });
});

router.get("/admin/users", async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const role = req.query.role as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  let query = db.select().from(usersTable).$dynamic();
  const conds = [];
  if (search) conds.push(or(ilike(usersTable.displayName, `%${search}%`), ilike(usersTable.email, `%${search}%`)));
  if (role) conds.push(eq(usersTable.role, role as any));
  if (conds.length > 0) query = query.where(and(...conds));

  const users = await query.orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(usersTable);
  res.json({ users, total: Number(total) });
});

router.put("/admin/users/:id/role", async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;
  if (!["user", "moderator", "admin"].includes(role)) {
    res.status(400).json({ error: "Invalid role. Must be user, moderator, or admin" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, userId)).returning();
  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "change_role", "user", userId, user.displayName, { from: user.role, to: role });
  res.json(updated);
});

router.delete("/admin/users/:id", async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.role === "admin") { res.status(400).json({ error: "Cannot delete an admin account. Demote first." }); return; }

  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "delete_user", "user", userId, user.displayName, { email: user.email });
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ deleted: true, id: userId });
});

router.get("/admin/hacks", async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const showDeleted = req.query.showDeleted === "true";
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  let query = db.select().from(videosTable).$dynamic();
  const conds: any[] = [];

  if (!showDeleted) conds.push(isNull(videosTable.deletedAt));
  else conds.push(isNotNull(videosTable.deletedAt));

  if (search) conds.push(ilike(videosTable.title, `%${search}%`));
  if (status) conds.push(eq(videosTable.hackStatus, status as any));
  if (conds.length > 0) query = query.where(and(...conds));

  const hacks = await query.orderBy(desc(videosTable.createdAt)).limit(limit).offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(videosTable)
    .where(showDeleted ? isNotNull(videosTable.deletedAt) : isNull(videosTable.deletedAt));

  res.json({ hacks, total: Number(total) });
});

router.put("/admin/hacks/:id", async (req: Request, res: Response) => {
  const hackId = parseInt(req.params.id);
  const { title, caption, hackStatus, tags, thumbnailUrl, sourceUrl } = req.body;
  const [hack] = await db.select().from(videosTable).where(eq(videosTable.id, hackId));
  if (!hack) { res.status(404).json({ error: "Hack not found" }); return; }

  const [updated] = await db.update(videosTable)
    .set({
      ...(title !== undefined && { title }),
      ...(caption !== undefined && { caption }),
      ...(hackStatus !== undefined && { hackStatus }),
      ...(tags !== undefined && { tags }),
      ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      ...(sourceUrl !== undefined && { sourceUrl }),
    })
    .where(eq(videosTable.id, hackId))
    .returning();

  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "edit_hack", "hack", hackId, hack.title, { changes: req.body });
  res.json(updated);
});

router.put("/admin/hacks/:id/status", async (req: Request, res: Response) => {
  const hackId = parseInt(req.params.id);
  const { hackStatus } = req.body;
  const validStatuses = ["submitted", "community_voting", "ai_reviewing", "approved", "challenged", "rejected"];
  if (!validStatuses.includes(hackStatus)) {
    res.status(400).json({ error: "Invalid hackStatus" });
    return;
  }
  const [hack] = await db.select().from(videosTable).where(eq(videosTable.id, hackId));
  if (!hack) { res.status(404).json({ error: "Hack not found" }); return; }

  const [updated] = await db.update(videosTable)
    .set({ hackStatus, approvedAt: hackStatus === "approved" ? new Date() : hack.approvedAt })
    .where(eq(videosTable.id, hackId))
    .returning();

  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "change_hack_status", "hack", hackId, hack.title, { from: hack.hackStatus, to: hackStatus });
  res.json(updated);
});

router.delete("/admin/hacks/:id", async (req: Request, res: Response) => {
  const hackId = parseInt(req.params.id);
  const [hack] = await db.select().from(videosTable).where(eq(videosTable.id, hackId));
  if (!hack) { res.status(404).json({ error: "Hack not found" }); return; }

  await db.update(videosTable).set({ deletedAt: new Date() }).where(eq(videosTable.id, hackId));
  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "soft_delete_hack", "hack", hackId, hack.title, {});
  res.json({ deleted: true, id: hackId });
});

router.delete("/admin/hacks/:id/hard", async (req: Request, res: Response) => {
  const hackId = parseInt(req.params.id);
  const [hack] = await db.select().from(videosTable).where(eq(videosTable.id, hackId));
  if (!hack) { res.status(404).json({ error: "Hack not found" }); return; }

  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "hard_delete_hack", "hack", hackId, hack.title, {});
  await db.delete(videosTable).where(eq(videosTable.id, hackId));
  res.json({ deleted: true, permanent: true, id: hackId });
});

router.post("/admin/hacks/bulk-delete", async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }
  const numIds = ids.map(Number).filter(n => !isNaN(n));
  await db.update(videosTable).set({ deletedAt: new Date() })
    .where(sql`id = ANY(${numIds})`);

  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "bulk_delete_hacks", "hack", null, null, { ids: numIds, count: numIds.length });
  res.json({ deleted: numIds.length, ids: numIds });
});

router.post("/admin/hacks/bulk-status", async (req: Request, res: Response) => {
  const { ids, hackStatus } = req.body;
  const validStatuses = ["submitted", "community_voting", "approved", "challenged", "rejected"];
  if (!Array.isArray(ids) || !hackStatus || !validStatuses.includes(hackStatus)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const numIds = ids.map(Number).filter(n => !isNaN(n));
  await db.update(videosTable).set({ hackStatus })
    .where(sql`id = ANY(${numIds})`);

  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "bulk_status_hacks", "hack", null, null, { ids: numIds, hackStatus });
  res.json({ updated: numIds.length });
});

router.get("/admin/meals", async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const shareStatus = req.query.shareStatus as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  let query = db.select().from(mealsTable).$dynamic();
  const conds: any[] = [isNull(mealsTable.deletedAt)];
  if (search) conds.push(ilike(mealsTable.title, `%${search}%`));
  if (shareStatus) conds.push(eq(mealsTable.shareStatus, shareStatus as any));
  query = query.where(and(...conds));

  const meals = await query.orderBy(desc(mealsTable.createdAt)).limit(limit).offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(mealsTable).where(isNull(mealsTable.deletedAt));
  res.json({ meals, total: Number(total) });
});

router.put("/admin/meals/:id", async (req: Request, res: Response) => {
  const mealId = parseInt(req.params.id);
  const { title, description, shareStatus, imageUrl } = req.body;
  const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, mealId));
  if (!meal) { res.status(404).json({ error: "Meal not found" }); return; }

  const [updated] = await db.update(mealsTable)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(shareStatus !== undefined && { shareStatus }),
      ...(imageUrl !== undefined && { imageUrl }),
    })
    .where(eq(mealsTable.id, mealId))
    .returning();

  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "edit_meal", "meal", mealId, meal.title, { changes: req.body });
  res.json(updated);
});

router.delete("/admin/meals/:id", async (req: Request, res: Response) => {
  const mealId = parseInt(req.params.id);
  const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, mealId));
  if (!meal) { res.status(404).json({ error: "Meal not found" }); return; }

  await db.update(mealsTable).set({ deletedAt: new Date() }).where(eq(mealsTable.id, mealId));
  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "soft_delete_meal", "meal", mealId, meal.title, {});
  res.json({ deleted: true, id: mealId });
});

router.get("/admin/battles", async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const battleStatus = req.query.battleStatus as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  let query = db.select().from(battlesTable).$dynamic();
  const conds: any[] = [isNull(battlesTable.deletedAt)];
  if (search) conds.push(ilike(battlesTable.title, `%${search}%`));
  if (battleStatus) conds.push(eq(battlesTable.battleStatus, battleStatus as any));
  query = query.where(and(...conds));

  const battles = await query.orderBy(desc(battlesTable.createdAt)).limit(limit).offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(battlesTable).where(isNull(battlesTable.deletedAt));
  res.json({ battles, total: Number(total) });
});

router.put("/admin/battles/:id", async (req: Request, res: Response) => {
  const battleId = parseInt(req.params.id);
  const { title, description, battleStatus, isFeatured, isHot } = req.body;
  const [battle] = await db.select().from(battlesTable).where(eq(battlesTable.id, battleId));
  if (!battle) { res.status(404).json({ error: "Battle not found" }); return; }

  const [updated] = await db.update(battlesTable)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(battleStatus !== undefined && { battleStatus }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isHot !== undefined && { isHot }),
    })
    .where(eq(battlesTable.id, battleId))
    .returning();

  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "edit_battle", "battle", battleId, battle.title, { changes: req.body });
  res.json(updated);
});

router.delete("/admin/battles/:id", async (req: Request, res: Response) => {
  const battleId = parseInt(req.params.id);
  const [battle] = await db.select().from(battlesTable).where(eq(battlesTable.id, battleId));
  if (!battle) { res.status(404).json({ error: "Battle not found" }); return; }

  await db.update(battlesTable).set({ deletedAt: new Date() }).where(eq(battlesTable.id, battleId));
  await writeAuditLog(req.user!.id, req.user!.username ?? "admin", "soft_delete_battle", "battle", battleId, battle.title, {});
  res.json({ deleted: true, id: battleId });
});

router.get("/admin/audit-logs", async (_req: Request, res: Response) => {
  const limit = Math.min(Number(_req.query.limit ?? 100), 500);
  const offset = Number(_req.query.offset ?? 0);
  const entityType = _req.query.entityType as string | undefined;
  const action = _req.query.action as string | undefined;

  let query = db.select().from(auditLogsTable).$dynamic();
  const conds = [];
  if (entityType) conds.push(eq(auditLogsTable.entityType, entityType));
  if (action) conds.push(ilike(auditLogsTable.action, `%${action}%`));
  if (conds.length > 0) query = query.where(and(...conds));

  const logs = await query.orderBy(desc(auditLogsTable.createdAt)).limit(limit).offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(auditLogsTable);
  res.json({ logs, total: Number(total) });
});

router.post("/admin/import/preview", async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PlatePair/1.0)",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(8000),
    });

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i);
    const ogImgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,400})["']/i);
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})["']/i);
    const twitterImgMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    const title = (ogTitleMatch?.[1] || titleMatch?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const thumbnailUrl = ogImgMatch?.[1] || twitterImgMatch?.[1] || null;
    const description = (ogDescMatch?.[1] || metaDescMatch?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 300);

    const platform = url.includes("tiktok.com") ? "tiktok"
      : url.includes("instagram.com") ? "instagram"
      : url.includes("youtube.com") || url.includes("youtu.be") ? "youtube"
      : "web";

    const suggestedTitle = title
      ? `Pro kitchen secret → ${title}`.slice(0, 75)
      : "Viral recipe hack";

    res.json({
      url,
      title,
      thumbnailUrl,
      description,
      platform,
      suggestedTitle,
      tags: [platform, "imported"],
    });
  } catch (err: any) {
    res.status(422).json({ error: `Could not fetch URL: ${err.message ?? "unknown error"}` });
  }
});

router.post("/admin/import/save", async (req: Request, res: Response) => {
  const {
    title, description, thumbnailUrl, sourceUrl, sourcePlatform,
    tags, hackStatus, ingredients
  } = req.body;

  if (!title || !sourceUrl) {
    res.status(400).json({ error: "title and sourceUrl are required" });
    return;
  }

  const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));

  const [hack] = await db.insert(videosTable).values({
    authorId: req.user!.id,
    title: title.trim().slice(0, 120),
    caption: description?.trim().slice(0, 300) ?? null,
    thumbnailUrl: thumbnailUrl ?? null,
    sourceUrl: sourceUrl.trim(),
    sourcePlatform: sourcePlatform ?? null,
    tags: Array.isArray(tags) ? tags.slice(0, 5) : [],
    ingredients: Array.isArray(ingredients) ? ingredients.slice(0, 12) : [],
    hackStatus: hackStatus ?? "submitted",
    communityUpvotes: 0,
    communityDownvotes: 0,
    isDemo: 0,
    populatedAt: new Date(),
  }).returning();

  await writeAuditLog(
    req.user!.id,
    adminUser?.displayName ?? "admin",
    "import_content",
    "hack",
    hack.id,
    hack.title,
    { sourceUrl, hackStatus }
  );

  res.status(201).json(hack);
});

router.post("/admin/bootstrap", async (req: Request, res: Response) => {
  const { secret } = req.body;
  const bootstrapSecret = process.env["ADMIN_BOOTSTRAP_SECRET"];
  if (!bootstrapSecret || secret !== bootstrapSecret) {
    res.status(403).json({ error: "Invalid bootstrap secret" });
    return;
  }
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
  if (admin) {
    res.json({ message: "Admin already exists", adminId: admin.id, email: admin.email });
    return;
  }
  const [firstUser] = await db.select().from(usersTable).orderBy(asc(usersTable.id)).limit(1);
  if (!firstUser) {
    res.status(404).json({ error: "No users in database to promote" });
    return;
  }
  const [promoted] = await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, firstUser.id)).returning();
  res.json({ promoted: true, adminId: promoted.id, email: promoted.email, displayName: promoted.displayName });
});

export default router;
