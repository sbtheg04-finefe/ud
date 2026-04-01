import { Router } from "express";
import { db } from "@workspace/db";
import { mealsTable, videosTable, usersTable, groupsTable, groupMembershipsTable, reactionsTable } from "@workspace/db/schema";
import { desc, gte, count, eq } from "drizzle-orm";
import { GetFeedQueryParams, GetFeedSummaryQueryParams } from "@workspace/api-zod";

const router = Router();

async function enrichMeal(meal: typeof mealsTable.$inferSelect) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, meal.authorId));
  let group = null;
  if (meal.groupId) {
    const [g] = await db.select().from(groupsTable).where(eq(groupsTable.id, meal.groupId));
    if (g) {
      const [{ value: memberCount }] = await db
        .select({ value: count() })
        .from(groupMembershipsTable)
        .where(eq(groupMembershipsTable.groupId, g.id));
      group = { ...g, memberCount: Number(memberCount) };
    }
  }
  return { ...meal, author, group };
}

async function enrichVideo(video: typeof videosTable.$inferSelect) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, video.authorId));
  let group = null;
  if (video.groupId) {
    const [g] = await db.select().from(groupsTable).where(eq(groupsTable.id, video.groupId));
    if (g) {
      const [{ value: memberCount }] = await db
        .select({ value: count() })
        .from(groupMembershipsTable)
        .where(eq(groupMembershipsTable.groupId, g.id));
      group = { ...g, memberCount: Number(memberCount) };
    }
  }
  return { ...video, author, group, linkedMeal: null };
}

router.get("/", async (req, res) => {
  const params = GetFeedQueryParams.parse(req.query);
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const meals = await db.select().from(mealsTable).orderBy(desc(mealsTable.createdAt)).limit(limit);
  const videos = await db.select().from(videosTable).orderBy(desc(videosTable.createdAt)).limit(limit);

  const enrichedMeals = await Promise.all(meals.map(enrichMeal));
  const enrichedVideos = await Promise.all(videos.map(enrichVideo));

  const feedItems = [
    ...enrichedMeals.map((m) => ({ type: "meal" as const, meal: m, video: null, createdAt: m.createdAt })),
    ...enrichedVideos.map((v) => ({ type: "video" as const, video: v, meal: null, createdAt: v.createdAt })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(offset, offset + limit);

  const total = meals.length + videos.length;
  res.json({ items: feedItems, total, hasMore: total > offset + limit });
});

router.get("/summary", async (req, res) => {
  GetFeedSummaryQueryParams.parse(req.query);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [{ value: activeCooks }] = await db
    .select({ value: count() })
    .from(mealsTable)
    .where(gte(mealsTable.createdAt, oneDayAgo));

  const [{ value: mealsAvailableToday }] = await db
    .select({ value: count() })
    .from(mealsTable)
    .where(eq(mealsTable.shareStatus, "available"));

  const [{ value: totalGroups }] = await db.select({ value: count() }).from(groupsTable);

  const [{ value: recentVideos }] = await db
    .select({ value: count() })
    .from(videosTable)
    .where(gte(videosTable.createdAt, oneDayAgo));

  const meals = await db.select().from(mealsTable).orderBy(desc(mealsTable.createdAt)).limit(50);
  const tagMap = new Map<string, number>();
  for (const meal of meals) {
    for (const tag of [...meal.cuisineTags, ...meal.dietaryTags]) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }
  const trendingTags = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  res.json({
    activeCooks: Number(activeCooks),
    mealsAvailableToday: Number(mealsAvailableToday),
    totalGroups: Number(totalGroups),
    recentVideos: Number(recentVideos),
    trendingTags,
  });
});

export default router;
