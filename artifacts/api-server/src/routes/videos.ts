import { Router } from "express";
import { db } from "@workspace/db";
import { videosTable, usersTable, groupsTable, mealsTable, groupMembershipsTable } from "@workspace/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { CreateVideoBody, ListVideosQueryParams } from "@workspace/api-zod";

const router = Router();

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
  let linkedMeal = null;
  if (video.linkedMealId) {
    const [m] = await db.select().from(mealsTable).where(eq(mealsTable.id, video.linkedMealId));
    linkedMeal = m ?? null;
  }
  return { ...video, author, group, linkedMeal };
}

router.get("/", async (req, res) => {
  const params = ListVideosQueryParams.parse(req.query);
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  let query = db.select().from(videosTable).$dynamic();
  const conditions = [];

  if (params.groupId) conditions.push(eq(videosTable.groupId, params.groupId));
  if (params.authorId) conditions.push(eq(videosTable.authorId, params.authorId));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const videos = await query.orderBy(desc(videosTable.createdAt)).limit(limit).offset(offset);
  const enriched = await Promise.all(videos.map(enrichVideo));
  res.json(enriched);
});

router.post("/", async (req, res) => {
  const body = CreateVideoBody.parse(req.body);
  const [video] = await db.insert(videosTable).values({
    authorId: body.authorId,
    linkedMealId: body.linkedMealId ?? null,
    groupId: body.groupId ?? null,
    title: body.title,
    caption: body.caption ?? null,
    videoUrl: body.videoUrl ?? null,
    thumbnailUrl: body.thumbnailUrl ?? null,
    durationSeconds: body.durationSeconds ?? null,
    tags: body.tags ?? [],
  }).returning();
  const enriched = await enrichVideo(video);
  res.status(201).json(enriched);
});

router.get("/:videoId", async (req, res) => {
  const videoId = parseInt(req.params.videoId);
  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  const enriched = await enrichVideo(video);
  res.json(enriched);
});

router.delete("/:videoId", async (req, res) => {
  const videoId = parseInt(req.params.videoId);
  await db.delete(videosTable).where(eq(videosTable.id, videoId));
  res.status(204).send();
});

export default router;
