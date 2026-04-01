import { Router } from "express";
import { db } from "@workspace/db";
import { groupsTable, groupMembershipsTable, mealsTable, videosTable, usersTable } from "@workspace/db/schema";
import { eq, count, and, gte } from "drizzle-orm";
import { CreateGroupBody, JoinGroupBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const groups = await db.select().from(groupsTable).orderBy(groupsTable.createdAt);
  const groupsWithCounts = await Promise.all(
    groups.map(async (group) => {
      const [{ value: memberCount }] = await db
        .select({ value: count() })
        .from(groupMembershipsTable)
        .where(eq(groupMembershipsTable.groupId, group.id));
      return { ...group, memberCount: Number(memberCount) };
    })
  );
  res.json(groupsWithCounts);
});

router.post("/", async (req, res) => {
  const body = CreateGroupBody.parse(req.body);
  const [group] = await db.insert(groupsTable).values({
    name: body.name,
    slug: body.slug,
    description: body.description ?? null,
    coverImageUrl: body.coverImageUrl ?? null,
    visibility: (body.visibility as "public" | "private" | "invite_only") ?? "public",
    createdById: body.createdById,
    tags: body.tags ?? [],
  }).returning();

  await db.insert(groupMembershipsTable).values({
    userId: body.createdById,
    groupId: group.id,
    role: "admin",
  });

  const memberCount = 1;
  res.status(201).json({ ...group, memberCount });
});

router.get("/:groupId", async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(groupMembershipsTable)
    .where(eq(groupMembershipsTable.groupId, groupId));
  res.json({ ...group, memberCount: Number(memberCount) });
});

router.get("/:groupId/members", async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const memberships = await db
    .select({ membership: groupMembershipsTable, user: usersTable })
    .from(groupMembershipsTable)
    .innerJoin(usersTable, eq(groupMembershipsTable.userId, usersTable.id))
    .where(eq(groupMembershipsTable.groupId, groupId));

  const result = memberships.map(({ membership, user }) => ({
    ...membership,
    user,
  }));
  res.json(result);
});

router.post("/:groupId/members", async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const body = JoinGroupBody.parse(req.body);

  const existing = await db
    .select()
    .from(groupMembershipsTable)
    .where(and(eq(groupMembershipsTable.userId, body.userId), eq(groupMembershipsTable.groupId, groupId)));

  if (existing.length > 0) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, body.userId));
    res.status(201).json({ ...existing[0], user });
    return;
  }

  const [membership] = await db.insert(groupMembershipsTable).values({
    userId: body.userId,
    groupId,
    role: (body.role as "member" | "moderator" | "admin") ?? "member",
  }).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, body.userId));
  res.status(201).json({ ...membership, user });
});

router.get("/:groupId/stats", async (req, res) => {
  const groupId = parseInt(req.params.groupId);

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(groupMembershipsTable)
    .where(eq(groupMembershipsTable.groupId, groupId));

  const [{ value: totalMeals }] = await db
    .select({ value: count() })
    .from(mealsTable)
    .where(eq(mealsTable.groupId, groupId));

  const [{ value: totalVideos }] = await db
    .select({ value: count() })
    .from(videosTable)
    .where(eq(videosTable.groupId, groupId));

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ value: activeCooks }] = await db
    .select({ value: count() })
    .from(mealsTable)
    .where(and(eq(mealsTable.groupId, groupId), gte(mealsTable.createdAt, oneDayAgo)));

  const [{ value: recentActivity }] = await db
    .select({ value: count() })
    .from(mealsTable)
    .where(and(eq(mealsTable.groupId, groupId), gte(mealsTable.createdAt, oneDayAgo)));

  res.json({
    groupId,
    memberCount: Number(memberCount),
    totalMeals: Number(totalMeals),
    totalVideos: Number(totalVideos),
    activeCooks: Number(activeCooks),
    recentActivity: Number(recentActivity),
  });
});

export default router;
