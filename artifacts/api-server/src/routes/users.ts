import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, groupMembershipsTable, mealsTable, videosTable, savesTable, reactionsTable } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

router.post("/", async (req, res) => {
  const body = CreateUserBody.parse(req.body);
  const [user] = await db.insert(usersTable).values({
    displayName: body.displayName,
    username: body.username,
    email: body.email,
    avatarUrl: body.avatarUrl ?? null,
    bio: body.bio ?? null,
    locationText: body.locationText ?? null,
    dietaryPreferences: body.dietaryPreferences ?? [],
    cookingInterests: body.cookingInterests ?? [],
  }).returning();
  res.status(201).json(user);
});

router.get("/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.patch("/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const body = UpdateUserBody.parse(req.body);
  const [user] = await db.update(usersTable).set({
    ...(body.displayName !== undefined && { displayName: body.displayName }),
    ...(body.bio !== undefined && { bio: body.bio }),
    ...(body.locationText !== undefined && { locationText: body.locationText }),
    ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
    ...(body.dietaryPreferences !== undefined && { dietaryPreferences: body.dietaryPreferences }),
    ...(body.cookingInterests !== undefined && { cookingInterests: body.cookingInterests }),
  }).where(eq(usersTable.id, userId)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.get("/:userId/stats", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [{ value: totalMeals }] = await db
    .select({ value: count() })
    .from(mealsTable)
    .where(eq(mealsTable.authorId, userId));

  const [{ value: totalVideos }] = await db
    .select({ value: count() })
    .from(videosTable)
    .where(eq(videosTable.authorId, userId));

  const [{ value: totalSaves }] = await db
    .select({ value: count() })
    .from(savesTable)
    .where(eq(savesTable.userId, userId));

  const [{ value: totalLikes }] = await db
    .select({ value: count() })
    .from(reactionsTable)
    .where(eq(reactionsTable.userId, userId));

  const [{ value: groupCount }] = await db
    .select({ value: count() })
    .from(groupMembershipsTable)
    .where(eq(groupMembershipsTable.userId, userId));

  res.json({
    userId,
    totalMeals: Number(totalMeals),
    totalVideos: Number(totalVideos),
    totalSaves: Number(totalSaves),
    totalLikes: Number(totalLikes),
    groupCount: Number(groupCount),
    joinedAt: user.createdAt,
  });
});

router.get("/:userId/groups", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { groupsTable } = await import("@workspace/db/schema");
  const memberships = await db
    .select({ group: groupsTable })
    .from(groupMembershipsTable)
    .innerJoin(groupsTable, eq(groupMembershipsTable.groupId, groupsTable.id))
    .where(eq(groupMembershipsTable.userId, userId));

  const groups = await Promise.all(
    memberships.map(async ({ group }) => {
      const [{ value: memberCount }] = await db
        .select({ value: count() })
        .from(groupMembershipsTable)
        .where(eq(groupMembershipsTable.groupId, group.id));
      return { ...group, memberCount: Number(memberCount) };
    })
  );

  res.json(groups);
});

export default router;
