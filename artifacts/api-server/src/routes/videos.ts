import { Router } from "express";
import { db } from "@workspace/db";
import { videosTable, usersTable, groupsTable, mealsTable, groupMembershipsTable, hackVotesTable } from "@workspace/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { CreateVideoBody, ListVideosQueryParams, VoteOnHackBody, SubmitHackForReviewBody } from "@workspace/api-zod";
import { runHackAIReview } from "../lib/hack-ai-reviewer";

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

async function recomputeCreativeEngagement(videoId: number) {
  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
  if (!video) return;
  const score = (video.likeCount ?? 0) * 1
    + (video.saveCount ?? 0) * 2
    + (video.communityUpvotes ?? 0) * 3
    + (video.commentCount ?? 0) * 1;
  await db.update(videosTable)
    .set({ creativeEngagementScore: score })
    .where(eq(videosTable.id, videoId));
}

router.get("/", async (req, res) => {
  const params = ListVideosQueryParams.parse(req.query);
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  let query = db.select().from(videosTable).$dynamic();
  const conditions = [];

  if (params.groupId) conditions.push(eq(videosTable.groupId, params.groupId));
  if (params.authorId) conditions.push(eq(videosTable.authorId, params.authorId));
  if (params.hackStatus) conditions.push(eq(videosTable.hackStatus, params.hackStatus));

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
    hackStatus: "submitted",
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

router.post("/:videoId/vote", async (req, res) => {
  const videoId = parseInt(req.params.videoId);
  const { userId, voteType } = VoteOnHackBody.parse(req.body);

  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }

  const [existing] = await db.select().from(hackVotesTable)
    .where(and(eq(hackVotesTable.videoId, videoId), eq(hackVotesTable.userId, userId)));

  if (existing) {
    if (existing.voteType === voteType) {
      await db.delete(hackVotesTable).where(eq(hackVotesTable.id, existing.id));
    } else {
      await db.update(hackVotesTable).set({ voteType }).where(eq(hackVotesTable.id, existing.id));
    }
  } else {
    await db.insert(hackVotesTable).values({ videoId, userId, voteType });
  }

  const [{ ups }] = await db.select({ ups: count() }).from(hackVotesTable)
    .where(and(eq(hackVotesTable.videoId, videoId), eq(hackVotesTable.voteType, "up")));
  const [{ downs }] = await db.select({ downs: count() }).from(hackVotesTable)
    .where(and(eq(hackVotesTable.videoId, videoId), eq(hackVotesTable.voteType, "down")));

  const upvotes = Number(ups);
  const downvotes = Number(downs);

  let newStatus = video.hackStatus;
  if (upvotes + downvotes >= 3 && newStatus === "submitted") {
    newStatus = "community_voting";
  }

  const [updated] = await db.update(videosTable)
    .set({ communityUpvotes: upvotes, communityDownvotes: downvotes, hackStatus: newStatus })
    .where(eq(videosTable.id, videoId))
    .returning();

  await recomputeCreativeEngagement(videoId);
  const enriched = await enrichVideo(updated);
  res.json({ ...enriched, userVote: existing?.voteType === voteType ? null : voteType });
});

router.post("/:videoId/ai-review", async (req, res) => {
  const videoId = parseInt(req.params.videoId);
  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }

  const result = runHackAIReview(video);

  const newStatus = result.verdict === "approved" ? "approved"
    : result.verdict === "challenged" ? "challenged"
    : "rejected";

  const [updated] = await db.update(videosTable)
    .set({
      hackStatus: newStatus,
      aiScore: String(result.score),
      aiAnalysis: result.analysis,
      aiReviewedAt: new Date(),
      approvedAt: newStatus === "approved" ? new Date() : null,
    })
    .where(eq(videosTable.id, videoId))
    .returning();

  await recomputeCreativeEngagement(videoId);
  const enriched = await enrichVideo(updated);
  res.json({ ...enriched, aiResult: result });
});

router.post("/:videoId/submit-for-review", async (req, res) => {
  const videoId = parseInt(req.params.videoId);
  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }

  if (video.communityUpvotes < 2) {
    res.status(400).json({ error: "Need at least 2 community upvotes before AI review" });
    return;
  }

  const [updated] = await db.update(videosTable)
    .set({ hackStatus: "ai_reviewing" })
    .where(eq(videosTable.id, videoId))
    .returning();

  const result = runHackAIReview(updated);
  const finalStatus = result.verdict === "approved" ? "approved"
    : result.verdict === "challenged" ? "challenged"
    : "rejected";

  const [final] = await db.update(videosTable)
    .set({
      hackStatus: finalStatus,
      aiScore: String(result.score),
      aiAnalysis: result.analysis,
      aiReviewedAt: new Date(),
      approvedAt: finalStatus === "approved" ? new Date() : null,
    })
    .where(eq(videosTable.id, videoId))
    .returning();

  await recomputeCreativeEngagement(videoId);
  const enriched = await enrichVideo(final);
  res.json({ ...enriched, aiResult: result });
});

export default router;
