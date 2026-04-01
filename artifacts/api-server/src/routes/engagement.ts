import { Router } from "express";
import { db } from "@workspace/db";
import {
  reactionsTable,
  savesTable,
  commentsTable,
  mealsTable,
  videosTable,
  usersTable,
  groupsTable,
  groupMembershipsTable,
} from "@workspace/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { ToggleReactionBody, ToggleSaveBody, CreateCommentBody, ListCommentsParams } from "@workspace/api-zod";

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

router.post("/reactions", async (req, res) => {
  const body = ToggleReactionBody.parse(req.body);

  const existing = await db
    .select()
    .from(reactionsTable)
    .where(
      and(
        eq(reactionsTable.userId, body.userId),
        eq(reactionsTable.targetType, body.targetType),
        eq(reactionsTable.targetId, body.targetId)
      )
    );

  let liked: boolean;
  if (existing.length > 0) {
    await db.delete(reactionsTable).where(eq(reactionsTable.id, existing[0].id));
    liked = false;
    if (body.targetType === "meal") {
      const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, body.targetId));
      if (meal) {
        await db
          .update(mealsTable)
          .set({ likeCount: Math.max(0, meal.likeCount - 1) })
          .where(eq(mealsTable.id, body.targetId));
      }
    } else {
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, body.targetId));
      if (video) {
        await db
          .update(videosTable)
          .set({ likeCount: Math.max(0, video.likeCount - 1) })
          .where(eq(videosTable.id, body.targetId));
      }
    }
  } else {
    await db.insert(reactionsTable).values({
      userId: body.userId,
      targetType: body.targetType,
      targetId: body.targetId,
      reactionType: body.reactionType,
    });
    liked = true;
    if (body.targetType === "meal") {
      const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, body.targetId));
      if (meal) {
        await db
          .update(mealsTable)
          .set({ likeCount: meal.likeCount + 1 })
          .where(eq(mealsTable.id, body.targetId));
      }
    } else {
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, body.targetId));
      if (video) {
        await db
          .update(videosTable)
          .set({ likeCount: video.likeCount + 1 })
          .where(eq(videosTable.id, body.targetId));
      }
    }
  }

  const [{ value: likeCount }] = await db
    .select({ value: count() })
    .from(reactionsTable)
    .where(and(eq(reactionsTable.targetType, body.targetType), eq(reactionsTable.targetId, body.targetId)));

  res.json({ liked, likeCount: Number(likeCount) });
});

router.post("/saves", async (req, res) => {
  const body = ToggleSaveBody.parse(req.body);

  const existing = await db
    .select()
    .from(savesTable)
    .where(
      and(
        eq(savesTable.userId, body.userId),
        eq(savesTable.targetType, body.targetType),
        eq(savesTable.targetId, body.targetId)
      )
    );

  let saved: boolean;
  if (existing.length > 0) {
    await db.delete(savesTable).where(eq(savesTable.id, existing[0].id));
    saved = false;
    if (body.targetType === "meal") {
      const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, body.targetId));
      if (meal) {
        await db
          .update(mealsTable)
          .set({ saveCount: Math.max(0, meal.saveCount - 1) })
          .where(eq(mealsTable.id, body.targetId));
      }
    } else {
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, body.targetId));
      if (video) {
        await db
          .update(videosTable)
          .set({ saveCount: Math.max(0, video.saveCount - 1) })
          .where(eq(videosTable.id, body.targetId));
      }
    }
  } else {
    await db.insert(savesTable).values({
      userId: body.userId,
      targetType: body.targetType,
      targetId: body.targetId,
    });
    saved = true;
    if (body.targetType === "meal") {
      const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, body.targetId));
      if (meal) {
        await db
          .update(mealsTable)
          .set({ saveCount: meal.saveCount + 1 })
          .where(eq(mealsTable.id, body.targetId));
      }
    } else {
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, body.targetId));
      if (video) {
        await db
          .update(videosTable)
          .set({ saveCount: video.saveCount + 1 })
          .where(eq(videosTable.id, body.targetId));
      }
    }
  }

  const [{ value: saveCount }] = await db
    .select({ value: count() })
    .from(savesTable)
    .where(and(eq(savesTable.targetType, body.targetType), eq(savesTable.targetId, body.targetId)));

  res.json({ saved, saveCount: Number(saveCount) });
});

router.get("/users/:userId/saves", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const saves = await db.select().from(savesTable).where(eq(savesTable.userId, userId));

  const mealIds = saves.filter((s) => s.targetType === "meal").map((s) => s.targetId);
  const videoIds = saves.filter((s) => s.targetType === "video").map((s) => s.targetId);

  const savedMeals = await Promise.all(
    mealIds.map(async (id) => {
      const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, id));
      if (!meal) return null;
      return enrichMeal(meal);
    })
  );

  const savedVideos = await Promise.all(
    videoIds.map(async (id) => {
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, id));
      if (!video) return null;
      return enrichVideo(video);
    })
  );

  res.json({
    meals: savedMeals.filter(Boolean),
    videos: savedVideos.filter(Boolean),
  });
});

router.post("/comments", async (req, res) => {
  const body = CreateCommentBody.parse(req.body);
  const [comment] = await db.insert(commentsTable).values({
    userId: body.userId,
    targetType: body.targetType,
    targetId: body.targetId,
    body: body.body,
  }).returning();

  if (body.targetType === "meal") {
    const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, body.targetId));
    if (meal) {
      await db
        .update(mealsTable)
        .set({ commentCount: meal.commentCount + 1 })
        .where(eq(mealsTable.id, body.targetId));
    }
  } else {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, body.targetId));
    if (video) {
      await db
        .update(videosTable)
        .set({ commentCount: video.commentCount + 1 })
        .where(eq(videosTable.id, body.targetId));
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, body.userId));
  res.status(201).json({ ...comment, user });
});

router.get("/comments/:targetType/:targetId", async (req, res) => {
  const params = ListCommentsParams.parse(req.params);
  const targetType = params.targetType;
  const targetId = params.targetId;

  const comments = await db
    .select()
    .from(commentsTable)
    .where(and(eq(commentsTable.targetType, targetType), eq(commentsTable.targetId, targetId)))
    .orderBy(desc(commentsTable.createdAt));

  const enriched = await Promise.all(
    comments.map(async (comment) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, comment.userId));
      return { ...comment, user };
    })
  );

  res.json(enriched);
});

export default router;
