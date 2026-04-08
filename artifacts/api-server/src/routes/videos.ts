import { Router } from "express";
import { db } from "@workspace/db";
import { videosTable, usersTable, groupsTable, mealsTable, groupMembershipsTable, hackVotesTable } from "@workspace/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { CreateVideoBody, ListVideosQueryParams, VoteOnHackBody, SubmitHackForReviewBody } from "@workspace/api-zod";
import { runHackAIReview } from "../lib/hack-ai-reviewer";
import { awardPoints } from "./points";

const router = Router();

function detectPlatform(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  return "web";
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
  const sort = (req.query.sort as string) ?? "recent";
  const limit = params.limit ?? 40;
  const offset = params.offset ?? 0;

  let query = db.select().from(videosTable).$dynamic();
  const conditions = [];

  if (params.groupId) conditions.push(eq(videosTable.groupId, params.groupId));
  if (params.authorId) conditions.push(eq(videosTable.authorId, params.authorId));
  if (params.hackStatus) conditions.push(eq(videosTable.hackStatus, params.hackStatus));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  if (sort === "hot") {
    query = query.orderBy(desc(videosTable.creativeEngagementScore), desc(videosTable.communityUpvotes));
  } else if (sort === "battle_ready") {
    query = query.orderBy(desc(videosTable.communityUpvotes), desc(videosTable.creativeEngagementScore));
  } else {
    query = query.orderBy(desc(videosTable.createdAt));
  }

  const videos = await query.limit(limit).offset(offset);
  const enriched = await Promise.all(videos.map(enrichVideo));
  res.json(enriched);
});

router.post("/seed", async (req, res) => {
  const existing = await db.select({ value: count() }).from(videosTable);
  if (Number(existing[0].value) >= 10) {
    res.json({ message: "Already seeded", count: Number(existing[0].value) });
    return;
  }

  const seed = [
    {
      title: "Air Fryer Wings → Oven Remix (20 min at 400°F)",
      caption: "Used frozen wings straight from bag. No defrost needed. Crispier than expected.",
      thumbnailUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@cookingwithtara/video/123456",
      sourcePlatform: "tiktok",
      tags: ["airfryer", "wings", "remix"],
      hackStatus: "approved",
      communityUpvotes: 84,
      aiScore: "8.7",
      aiAnalysis: "Excellent practical remix. Saves time without sacrificing crispiness. Highly reproducible.",
      creativeEngagementScore: 210,
    },
    {
      title: "Pasta Water = Secret Sauce Binder",
      caption: "Never drain all the pasta water. Save 1 cup — it makes every sauce silky.",
      thumbnailUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&q=80",
      sourceUrl: "https://www.instagram.com/p/pasta_hack_2024",
      sourcePlatform: "instagram",
      tags: ["pasta", "technique", "sauces"],
      hackStatus: "approved",
      communityUpvotes: 127,
      aiScore: "9.2",
      aiAnalysis: "Classic technique with strong practical merit. The starchy water emulsification is scientifically sound.",
      creativeEngagementScore: 340,
    },
    {
      title: "Frozen Butter Grated on Pizza = Flaky Crust",
      caption: "Freeze a stick of butter, grate it on raw dough before baking. Game changer.",
      thumbnailUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@pizzalife/video/789",
      sourcePlatform: "tiktok",
      tags: ["pizza", "butter", "crust"],
      hackStatus: "community_voting",
      communityUpvotes: 41,
      communityDownvotes: 3,
      creativeEngagementScore: 88,
    },
    {
      title: "Microwave Garlic = Skin Peels Instantly",
      caption: "10 seconds per clove. The skin slides right off. No more sticky fingers.",
      thumbnailUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
      sourceUrl: "https://www.youtube.com/watch?v=garlic-hack",
      sourcePlatform: "youtube",
      tags: ["garlic", "prep", "shortcut"],
      hackStatus: "approved",
      communityUpvotes: 92,
      aiScore: "8.1",
      aiAnalysis: "Simple and widely applicable. Slightly reduces flavor intensity but saves significant prep time.",
      creativeEngagementScore: 186,
    },
    {
      title: "Soy Sauce + Butter = Instant Umami Bomb",
      caption: "1 tbsp butter + 1 tbsp soy at the end of any pan sauce. Crazy depth.",
      thumbnailUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
      sourceUrl: "https://www.instagram.com/p/umami_sauce_2024",
      sourcePlatform: "instagram",
      tags: ["umami", "sauce", "technique"],
      hackStatus: "approved",
      communityUpvotes: 156,
      aiScore: "9.4",
      aiAnalysis: "Outstanding flavor combination with strong culinary basis. The maillard + fermentation combo is brilliant.",
      creativeEngagementScore: 412,
    },
    {
      title: "Resting Steak in Butter Brown = 🔥",
      caption: "After searing, baste in browned butter for 60 seconds. Rest 5 min. Perfect every time.",
      thumbnailUrl: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@steakhousesecrets/video/456",
      sourcePlatform: "tiktok",
      tags: ["steak", "butter", "technique"],
      hackStatus: "community_voting",
      communityUpvotes: 63,
      communityDownvotes: 2,
      creativeEngagementScore: 140,
    },
    {
      title: "Rice Cooker Cake — No Oven Needed",
      caption: "Pour batter into rice cooker, press cook twice. Moist, dense cake. No oven.",
      thumbnailUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@asianfoodhacks/video/999",
      sourcePlatform: "tiktok",
      tags: ["baking", "ricecooker", "hack"],
      hackStatus: "approved",
      communityUpvotes: 78,
      aiScore: "7.8",
      aiAnalysis: "Creative use of equipment. Results vary by cooker model — needs clearer instructions for best results.",
      creativeEngagementScore: 178,
    },
    {
      title: "Cold Pan + Cold Oil = No Sticking Eggs",
      caption: "Start eggs in cold pan, cold oil. Medium heat only. Slides right out. Zero sticking.",
      thumbnailUrl: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&q=80",
      sourceUrl: "https://www.youtube.com/watch?v=eggs-no-stick",
      sourcePlatform: "youtube",
      tags: ["eggs", "technique", "nonstick"],
      hackStatus: "community_voting",
      communityUpvotes: 38,
      communityDownvotes: 5,
      creativeEngagementScore: 74,
    },
    {
      title: "Blender Hollandaise = 3 Minutes Flat",
      caption: "Hot butter + egg yolks + lemon in blender = perfect emulsification every time.",
      thumbnailUrl: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80",
      sourceUrl: "https://www.instagram.com/p/hollandaise_blender",
      sourcePlatform: "instagram",
      tags: ["brunch", "sauce", "blender"],
      hackStatus: "submitted",
      communityUpvotes: 12,
      communityDownvotes: 0,
      creativeEngagementScore: 18,
    },
    {
      title: "Dill Wings Battle Prep — Lemon Zest Secret",
      caption: "From battle #37: Add lemon zest to dill sauce AFTER cooking. Keeps brightness.",
      thumbnailUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@platepair_dill_battle/video/37",
      sourcePlatform: "tiktok",
      tags: ["wings", "dill", "battlelesson"],
      hackStatus: "approved",
      communityUpvotes: 44,
      aiScore: "8.3",
      aiAnalysis: "Battle-tested technique. Lemon zest timing is a genuine insight that most recipes miss.",
      creativeEngagementScore: 122,
    },
    {
      title: "Vodka in Pie Crust = Impossibly Flaky",
      caption: "Replace half the water with vodka. Alcohol evaporates, no gluten forms. Flakiest crust ever.",
      thumbnailUrl: "https://images.unsplash.com/photo-1488474904584-b483fef1f5e3?w=600&q=80",
      sourceUrl: "https://www.youtube.com/watch?v=vodka-pie-crust",
      sourcePlatform: "youtube",
      tags: ["baking", "pastry", "science"],
      hackStatus: "community_voting",
      communityUpvotes: 55,
      communityDownvotes: 4,
      creativeEngagementScore: 118,
    },
    {
      title: "Caramelized Onions in 10 Min (Not 45)",
      caption: "Pinch of baking soda + high heat for 3 min then medium. Done in 10. Same result.",
      thumbnailUrl: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@kitchenshortcuts/video/onions",
      sourcePlatform: "tiktok",
      tags: ["onions", "shortcut", "technique"],
      hackStatus: "approved",
      communityUpvotes: 211,
      aiScore: "9.0",
      aiAnalysis: "High-value time hack with solid chemistry behind it. Baking soda accelerates Maillard reactions effectively.",
      creativeEngagementScore: 558,
    },
    {
      title: "Tortilla as Dumpling Wrapper",
      caption: "Use small flour tortilla halves as dumpling wrappers. Pan-fry. Incredible texture.",
      thumbnailUrl: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&q=80",
      sourceUrl: "https://www.instagram.com/p/tortilla_dumplings",
      sourcePlatform: "instagram",
      tags: ["fusion", "dumplings", "remix"],
      hackStatus: "community_voting",
      communityUpvotes: 29,
      communityDownvotes: 7,
      creativeEngagementScore: 58,
    },
    {
      title: "Miso + Mayo = Best Burger Spread",
      caption: "2:1 mayo to white miso. Spread on both buns. Life-changing umami.",
      thumbnailUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@burgerhacks/video/miso",
      sourcePlatform: "tiktok",
      tags: ["burger", "miso", "sauce"],
      hackStatus: "submitted",
      communityUpvotes: 8,
      communityDownvotes: 0,
      creativeEngagementScore: 12,
    },
    {
      title: "Freeze Fresh Herbs in Olive Oil = No Waste",
      caption: "Chop herbs, pack into ice cube tray, cover with olive oil, freeze. Use from frozen.",
      thumbnailUrl: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=80",
      sourceUrl: "https://www.youtube.com/watch?v=herb-ice-cubes",
      sourcePlatform: "youtube",
      tags: ["herbs", "storage", "prep"],
      hackStatus: "approved",
      communityUpvotes: 167,
      aiScore: "9.1",
      aiAnalysis: "Brilliant preservation technique. Maintains flavor integrity better than dried herbs.",
      creativeEngagementScore: 398,
    },
    {
      title: "Reverse Sear = Never Overcooked Chicken",
      caption: "275°F oven for 25 min, then 2 min blast at 450°F. Juicy center, crispy outside.",
      thumbnailUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c8?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@chefsecrets/video/reverse_sear",
      sourcePlatform: "tiktok",
      tags: ["chicken", "technique", "reversesear"],
      hackStatus: "community_voting",
      communityUpvotes: 73,
      communityDownvotes: 1,
      creativeEngagementScore: 158,
    },
    {
      title: "Coconut Milk Rice in Rice Cooker",
      caption: "Replace half water with coconut milk. Add pinch of salt. Transforms plain rice forever.",
      thumbnailUrl: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&q=80",
      sourceUrl: "https://www.instagram.com/p/coconut_rice_hack",
      sourcePlatform: "instagram",
      tags: ["rice", "coconut", "upgrade"],
      hackStatus: "community_voting",
      communityUpvotes: 46,
      communityDownvotes: 2,
      creativeEngagementScore: 98,
    },
    {
      title: "Brown Butter Popcorn > Butter Popcorn",
      caption: "Brown the butter first. Pour over popcorn. The nuttiness is unreal.",
      thumbnailUrl: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&q=80",
      sourceUrl: "https://www.tiktok.com/@snackhacks/video/popcorn",
      sourcePlatform: "tiktok",
      tags: ["popcorn", "butter", "snacks"],
      hackStatus: "submitted",
      communityUpvotes: 5,
      communityDownvotes: 0,
      creativeEngagementScore: 8,
    },
    {
      title: "Soup Dumpling Hack — Ice Cube Method",
      caption: "Freeze broth in ice cube tray, wrap cube in pork filling, steam. Perfect soup inside.",
      thumbnailUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80",
      sourceUrl: "https://www.youtube.com/watch?v=soup-dumpling-hack",
      sourcePlatform: "youtube",
      tags: ["dumplings", "chinese", "technique"],
      hackStatus: "community_voting",
      communityUpvotes: 89,
      communityDownvotes: 3,
      creativeEngagementScore: 196,
    },
    {
      title: "Avocado Ripening in Oven (Emergency Hack)",
      caption: "Wrap in foil, bake at 200°F for 10 min. Ethylene gas ripens it fast. Works!",
      thumbnailUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=600&q=80",
      sourceUrl: "https://www.instagram.com/p/avocado_oven_hack",
      sourcePlatform: "instagram",
      tags: ["avocado", "hack", "emergency"],
      hackStatus: "submitted",
      communityUpvotes: 6,
      communityDownvotes: 1,
      creativeEngagementScore: 10,
    },
  ];

  const [firstUser] = await db.select().from(usersTable).limit(1);
  const authorId = firstUser?.id ?? 1;

  for (const hack of seed) {
    await db.insert(videosTable).values({
      authorId,
      title: hack.title,
      caption: hack.caption,
      thumbnailUrl: hack.thumbnailUrl,
      sourceUrl: hack.sourceUrl,
      sourcePlatform: hack.sourcePlatform,
      tags: hack.tags,
      hackStatus: hack.hackStatus as any,
      communityUpvotes: hack.communityUpvotes ?? 0,
      communityDownvotes: hack.communityDownvotes ?? 0,
      aiScore: hack.aiScore ?? null,
      aiAnalysis: hack.aiAnalysis ?? null,
      aiReviewedAt: hack.aiScore ? new Date() : null,
      approvedAt: hack.hackStatus === "approved" ? new Date() : null,
      creativeEngagementScore: hack.creativeEngagementScore ?? 0,
    });
  }

  const [{ value: finalCount }] = await db.select({ value: count() }).from(videosTable);
  res.status(201).json({ seeded: seed.length, total: Number(finalCount) });
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

router.post("/:videoId/try", async (req, res) => {
  const videoId = parseInt(req.params.videoId);
  const { userId } = req.body;
  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }
  const [updated] = await db.update(videosTable)
    .set({ saveCount: (video.saveCount ?? 0) + 1 })
    .where(eq(videosTable.id, videoId))
    .returning();
  await recomputeCreativeEngagement(videoId);
  res.json({ saved: true, saveCount: updated.saveCount });
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
    if (voteType === "up") {
      try { await awardPoints(userId, "hack_reaction", 1); } catch (_) {}
    }
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

router.post("/", async (req, res) => {
  const body = CreateVideoBody.parse(req.body);
  const sourceUrl = req.body.sourceUrl ?? null;
  const sourcePlatform = req.body.sourcePlatform ?? detectPlatform(sourceUrl);
  const photoUrl = req.body.photoUrl ?? null;

  const [video] = await db.insert(videosTable).values({
    authorId: body.authorId,
    linkedMealId: body.linkedMealId ?? null,
    groupId: body.groupId ?? null,
    title: body.title,
    caption: body.caption ?? null,
    videoUrl: body.videoUrl ?? null,
    thumbnailUrl: body.thumbnailUrl ?? null,
    photoUrl,
    sourceUrl,
    sourcePlatform,
    durationSeconds: body.durationSeconds ?? null,
    tags: body.tags ?? [],
    hackStatus: "submitted",
  }).returning();

  try { await awardPoints(body.authorId, "hack_created", 2); } catch (_) {}

  const enriched = await enrichVideo(video);
  res.status(201).json(enriched);
});

export default router;
