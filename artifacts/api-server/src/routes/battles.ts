import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  battlesTable,
  battleRequirementsTable,
  battleEntriesTable,
  battleInterestTable,
  usersTable,
  mealsTable,
  videosTable,
  groupsTable,
  groupMembershipsTable,
} from "@workspace/db/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import { extractUrl } from "../lib/url-extractor";

const router = Router();

router.post("/battles/extract-url", async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }
  const result = await extractUrl(url.trim());
  if (!result.ok) {
    res.status(422).json({ error: result.error });
    return;
  }
  res.json(result.data);
});

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
}

function computeBattleWorthiness(meal: typeof mealsTable.$inferSelect | null, video: typeof videosTable.$inferSelect | null): {
  score: number;
  breakdown: {
    ingredientSimplicity: number;
    visualPayoff: number;
    timeAccessibility: number;
    toolSimplicity: number;
    noveltyFactor: number;
    socialReplayValue: number;
  };
  battleClass: "instant_battle" | "circle_challenge" | "skill_battle" | "seasonal_showdown" | "mealkit_remix";
} {
  let ingredientSimplicity = 7;
  let visualPayoff = 7;
  let timeAccessibility = 7;
  let toolSimplicity = 8;
  let noveltyFactor = 6;
  let socialReplayValue = 7;

  if (meal) {
    const ingredients = meal.ingredientsSummary || "";
    const ingredientCount = ingredients.split(",").length;
    ingredientSimplicity = ingredientCount <= 5 ? 10 : ingredientCount <= 10 ? 8 : ingredientCount <= 15 ? 6 : 4;

    visualPayoff = meal.imageUrl ? 8 : 5;
    const hasDietaryTags = meal.dietaryTags.length > 0;
    noveltyFactor = hasDietaryTags ? 8 : 6;
    socialReplayValue = meal.saveCount > 50 ? 10 : meal.saveCount > 20 ? 8 : meal.saveCount > 5 ? 6 : 5;
    timeAccessibility = meal.servings && meal.servings <= 2 ? 9 : 7;
  }

  if (video) {
    const duration = video.durationSeconds || 120;
    timeAccessibility = duration <= 30 ? 10 : duration <= 60 ? 9 : duration <= 120 ? 7 : 5;
    visualPayoff = video.thumbnailUrl ? 9 : 6;
    noveltyFactor = video.tags.length >= 3 ? 8 : 6;
    socialReplayValue = video.saveCount > 30 ? 10 : video.saveCount > 10 ? 7 : 5;
  }

  const score = (ingredientSimplicity + visualPayoff + timeAccessibility + toolSimplicity + noveltyFactor + socialReplayValue) / 6;

  let battleClass: "instant_battle" | "circle_challenge" | "skill_battle" | "seasonal_showdown" | "mealkit_remix" = "circle_challenge";
  if (score >= 8.5) battleClass = "instant_battle";
  else if (score >= 7) battleClass = "circle_challenge";
  else if (score >= 6) battleClass = "skill_battle";
  else if (score >= 5) battleClass = "seasonal_showdown";
  else battleClass = "mealkit_remix";

  return {
    score: Math.round(score * 10) / 10,
    breakdown: { ingredientSimplicity, visualPayoff, timeAccessibility, toolSimplicity, noveltyFactor, socialReplayValue },
    battleClass,
  };
}

async function enrichBattle(battle: typeof battlesTable.$inferSelect) {
  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, battle.createdBy));
  const [requirements] = await db.select().from(battleRequirementsTable).where(eq(battleRequirementsTable.battleId, battle.id));
  
  let sourceMeal = null;
  if (battle.sourceMealId) {
    const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, battle.sourceMealId));
    if (meal) {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, meal.authorId));
      sourceMeal = { ...meal, author, group: null };
    }
  }

  let sourceVideo = null;
  if (battle.sourceVideoId) {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, battle.sourceVideoId));
    if (video) {
      const [author] = await db.select().from(usersTable).where(eq(usersTable.id, video.authorId));
      sourceVideo = { ...video, author, group: null, linkedMeal: null };
    }
  }

  const topEntries = await db
    .select()
    .from(battleEntriesTable)
    .where(and(eq(battleEntriesTable.battleId, battle.id), eq(battleEntriesTable.status, "submitted")))
    .orderBy(desc(battleEntriesTable.totalScore))
    .limit(3);

  const enrichedEntries = await Promise.all(
    topEntries.map(async (entry) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, entry.userId));
      return { ...entry, user };
    })
  );

  return {
    ...battle,
    creator,
    requirements: requirements || null,
    sourceMeal,
    sourceVideo,
    topEntries: enrichedEntries,
  };
}

router.get("/", async (req, res) => {
  const { scopeType, battleStatus, challengeType, groupId, limit = "20", offset = "0" } = req.query as Record<string, string>;

  let query = db.select().from(battlesTable).$dynamic();

  const conditions = [];
  if (scopeType) conditions.push(eq(battlesTable.scopeType, scopeType as any));
  if (battleStatus) conditions.push(eq(battlesTable.battleStatus, battleStatus as any));
  if (challengeType) conditions.push(eq(battlesTable.challengeType, challengeType as any));
  if (groupId) conditions.push(eq(battlesTable.groupId, Number(groupId)));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const battles = await query.orderBy(desc(battlesTable.battleWorthinessScore), desc(battlesTable.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  const enriched = await Promise.all(battles.map(enrichBattle));
  res.json(enriched);
});

router.post("/", async (req, res) => {
  const {
    title, description, sourceType, sourceMealId, sourceVideoId,
    sourceUrl, sourcePlatform, sourceCreator, sourceThumbnailUrl,
    challengeType = "solo_remake", scopeType = "public", groupId, createdBy,
    maxTeamSize = 4, coverImageUrl, registrationEnd, submissionDeadline,
    ingredientList = [], optionalSubstitutions = [], toolList = [],
    estimatedCostMin, estimatedCostMax, estimatedTimeMinutes, difficultyLevel = 2,
    dietaryNotes = [],
  } = req.body;

  let meal = null, video = null;
  if (sourceMealId) [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, Number(sourceMealId)));
  if (sourceVideoId) [video] = await db.select().from(videosTable).where(eq(videosTable.id, Number(sourceVideoId)));

  const { score } = computeBattleWorthiness(meal, video);
  const coverImg = coverImageUrl || sourceThumbnailUrl || meal?.imageUrl || video?.thumbnailUrl || null;

  const [battle] = await db.insert(battlesTable).values({
    title, description, sourceType: sourceType || (sourceUrl ? "external" : "meal"),
    sourceMealId: sourceMealId || null, sourceVideoId: sourceVideoId || null,
    sourceUrl: sourceUrl || null, sourcePlatform: sourcePlatform || null,
    sourceCreator: sourceCreator || null, sourceThumbnailUrl: sourceThumbnailUrl || null,
    challengeType, scopeType, groupId: groupId || null, createdBy, maxTeamSize,
    coverImageUrl: coverImg, battleWorthinessScore: score,
    slug: slugify(title),
    registrationStart: new Date(),
    registrationEnd: registrationEnd ? new Date(registrationEnd) : null,
    prepStart: new Date(),
    submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
    battleStatus: "open",
  }).returning();

  await db.insert(battleRequirementsTable).values({
    battleId: battle.id, ingredientList, optionalSubstitutions, toolList,
    estimatedCostMin: estimatedCostMin || null, estimatedCostMax: estimatedCostMax || null,
    estimatedTimeMinutes: estimatedTimeMinutes || null, difficultyLevel, dietaryNotes,
  });

  const enriched = await enrichBattle(battle);
  res.status(201).json(enriched);
});

router.get("/leaderboard", async (req, res) => {
  const { limit = "10" } = req.query as Record<string, string>;

  const entries = await db
    .select({
      userId: battleEntriesTable.userId,
      totalScore: sql<number>`sum(${battleEntriesTable.totalScore})`,
      battlesEntered: sql<number>`count(distinct ${battleEntriesTable.battleId})`,
      totalEntries: sql<number>`count(*)`,
      battlesWon: sql<number>`count(case when ${battleEntriesTable.rank} = 1 then 1 end)`,
    })
    .from(battleEntriesTable)
    .where(eq(battleEntriesTable.status, "submitted"))
    .groupBy(battleEntriesTable.userId)
    .orderBy(desc(sql`sum(${battleEntriesTable.totalScore})`))
    .limit(Number(limit));

  const result = await Promise.all(
    entries.map(async (e, i) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, e.userId));
      return {
        rank: i + 1,
        user,
        totalScore: Number(e.totalScore) || 0,
        battlesEntered: Number(e.battlesEntered) || 0,
        battlesWon: Number(e.battlesWon) || 0,
        totalEntries: Number(e.totalEntries) || 0,
      };
    })
  );

  res.json(result);
});

router.post("/score-candidate", async (req, res) => {
  const { sourceType, sourceId } = req.body;

  let meal = null, video = null;
  if (sourceType === "meal") {
    const [m] = await db.select().from(mealsTable).where(eq(mealsTable.id, Number(sourceId)));
    meal = m || null;
  } else {
    const [v] = await db.select().from(videosTable).where(eq(videosTable.id, Number(sourceId)));
    video = v || null;
  }

  const result = computeBattleWorthiness(meal, video);
  res.json({
    score: result.score,
    breakdown: result.breakdown,
    recommended: result.score >= 7,
    battleClass: result.battleClass,
  });
});

router.post("/from-content", async (req, res) => {
  const { sourceType, sourceId, createdBy, scopeType = "public", groupId } = req.body;

  let meal: typeof mealsTable.$inferSelect | null = null;
  let video: typeof videosTable.$inferSelect | null = null;

  if (sourceType === "meal") {
    const [m] = await db.select().from(mealsTable).where(eq(mealsTable.id, Number(sourceId)));
    meal = m || null;
  } else {
    const [v] = await db.select().from(videosTable).where(eq(videosTable.id, Number(sourceId)));
    video = v || null;
  }

  const { score, breakdown, battleClass } = computeBattleWorthiness(meal, video);

  const sourceTitle = meal?.title || video?.title || "Food Battle";
  const ingredients = meal?.ingredientsSummary?.split(",").map((s: string) => s.trim()).filter(Boolean) || [];
  const challengeType = battleClass === "instant_battle" ? "solo_remake" : battleClass === "mealkit_remix" ? "remix_battle" : "solo_remake";

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  const [battle] = await db.insert(battlesTable).values({
    title: `${sourceTitle} Battle`,
    description: `Can you recreate this dish? Join the challenge and show your version!`,
    sourceType, sourceMealId: meal?.id || null, sourceVideoId: video?.id || null,
    challengeType, scopeType, groupId: groupId || null, createdBy,
    maxTeamSize: 4, battleWorthinessScore: score,
    coverImageUrl: meal?.imageUrl || video?.thumbnailUrl || null,
    slug: slugify(`${sourceTitle} Battle`),
    registrationStart: new Date(),
    registrationEnd: deadline,
    prepStart: new Date(),
    submissionDeadline: deadline,
    battleStatus: "open",
  }).returning();

  const toolList = ["Standard kitchen utensils", "Oven or stovetop", "Camera for photo proof"];
  const dietaryNotes = meal?.dietaryTags || [];

  await db.insert(battleRequirementsTable).values({
    battleId: battle.id,
    ingredientList: ingredients.length > 0 ? ingredients : ["Check source recipe for ingredients"],
    optionalSubstitutions: ["Substitute to fit your dietary needs", "Regional ingredient alternatives welcome"],
    toolList,
    estimatedTimeMinutes: video?.durationSeconds ? Math.ceil(video.durationSeconds / 60) * 3 : 45,
    difficultyLevel: breakdown.ingredientSimplicity > 7 ? 1 : breakdown.ingredientSimplicity > 5 ? 2 : 3,
    dietaryNotes,
  });

  const enriched = await enrichBattle(battle);
  res.status(201).json(enriched);
});

router.get("/:battleId", async (req, res) => {
  const [battle] = await db.select().from(battlesTable).where(eq(battlesTable.id, Number(req.params.battleId)));
  if (!battle) {
    res.status(404).json({ error: "Battle not found" });
    return;
  }
  const enriched = await enrichBattle(battle);
  res.json(enriched);
});

router.get("/:battleId/entries", async (req, res) => {
  const entries = await db
    .select()
    .from(battleEntriesTable)
    .where(eq(battleEntriesTable.battleId, Number(req.params.battleId)))
    .orderBy(desc(battleEntriesTable.totalScore), desc(battleEntriesTable.submittedAt));

  const enriched = await Promise.all(
    entries.map(async (entry) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, entry.userId));
      return { ...entry, user };
    })
  );
  res.json(enriched);
});

router.post("/:battleId/entries", async (req, res) => {
  const { userId, teamId, photoUrl, videoUrl, caption, journalNote, substitutionsUsed = [] } = req.body;
  const battleId = Number(req.params.battleId);

  const completionScore = (photoUrl || videoUrl) ? 8 : 5;
  const journalBonus = journalNote ? 1 : 0;
  const creativityScore = 6 + journalBonus;
  const presentationScore = photoUrl ? 7 : 5;
  const totalScore = (completionScore + creativityScore + presentationScore) / 3;

  const [entry] = await db.insert(battleEntriesTable).values({
    battleId, userId, teamId: teamId || null, photoUrl, videoUrl, caption, journalNote,
    substitutionsUsed, status: "submitted",
    completionScore, creativityScore, presentationScore, totalScore,
  }).returning();

  await db.update(battlesTable)
    .set({ entryCount: sql`${battlesTable.entryCount} + 1` })
    .where(eq(battlesTable.id, battleId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...entry, user });
});

router.post("/:battleId/join", async (req, res) => {
  const { userId } = req.body;
  const battleId = Number(req.params.battleId);

  await db.update(battlesTable)
    .set({ participantCount: sql`${battlesTable.participantCount} + 1` })
    .where(eq(battlesTable.id, battleId));

  await db.insert(battleInterestTable).values({
    battleId, userId, intentType: "wants_to_join",
  });

  const [battle] = await db.select().from(battlesTable).where(eq(battlesTable.id, battleId));
  res.json({ ok: true, participantCount: battle.participantCount });
});

router.post("/:battleId/interest", async (req, res) => {
  const { userId, intentType } = req.body;
  const battleId = Number(req.params.battleId);

  await db.insert(battleInterestTable).values({
    battleId, userId, intentType,
  });

  res.status(201).json({ ok: true });
});

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["open"],
  open: ["live", "archived"],
  live: ["judging", "archived"],
  judging: ["completed", "archived"],
  completed: [],
  archived: [],
};

router.patch("/:battleId/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const battleId = Number(req.params.battleId);
  const { status } = req.body as { status: string };

  const [battle] = await db.select().from(battlesTable).where(eq(battlesTable.id, battleId));
  if (!battle) {
    res.status(404).json({ error: "Battle not found" });
    return;
  }
  if (battle.createdBy !== req.user.id) {
    res.status(403).json({ error: "Only the battle creator can change status" });
    return;
  }
  const allowed = STATUS_TRANSITIONS[battle.battleStatus] ?? [];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `Cannot transition from ${battle.battleStatus} to ${status}` });
    return;
  }

  const [updated] = await db.update(battlesTable)
    .set({ battleStatus: status as typeof battle.battleStatus })
    .where(eq(battlesTable.id, battleId))
    .returning();

  res.json(updated);
});

export default router;
