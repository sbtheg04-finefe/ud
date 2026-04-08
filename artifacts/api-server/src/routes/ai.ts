import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { videosTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "placeholder",
});

router.post("/hack-review/:videoId", async (req: Request, res: Response) => {
  const videoId = parseInt(req.params.videoId);
  if (isNaN(videoId)) {
    res.status(400).json({ error: "Invalid video ID" });
    return;
  }

  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
  if (!video) {
    res.status(404).json({ error: "Hack not found" });
    return;
  }

  try {
    const prompt = `You are a culinary community judge reviewing a cooking hack submission for PlatePair.

Hack title: "${video.title}"
Caption: "${video.caption ?? "No caption"}"
Tags: ${video.tags.join(", ") || "none"}
Duration: ${video.durationSeconds ? `${video.durationSeconds}s` : "unknown"}
Community upvotes: ${video.communityUpvotes ?? 0}
Community downvotes: ${video.communityDownvotes ?? 0}

Score this hack on 4 dimensions (0-10 each):
1. Clarity — how easy is it to follow and replicate?
2. Originality — how fresh or novel is the technique?
3. Practicality — can most home cooks do this without special equipment?
4. Community resonance — based on community votes, how valuable does the community find it?

Respond ONLY with valid JSON in this exact format:
{
  "dimensions": {
    "clarity": <0-10>,
    "originality": <0-10>,
    "practicality": <0-10>,
    "communityResonance": <0-10>
  },
  "analysis": "<2-3 sentence honest evaluation>",
  "verdict": "<approved|challenged|rejected>",
  "badge": "<short badge label>"
}

Rules:
- verdict is "approved" if average score >= 7.5, "challenged" if >= 5.5, "rejected" otherwise
- badge is "Community Approved ⭐", "Needs Refinement 🔧", or "Not Ready ❌" matching verdict
- analysis should be specific, actionable, and encouraging`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const dims = parsed.dimensions ?? { clarity: 5, originality: 5, practicality: 5, communityResonance: 5 };
    const weights = { clarity: 0.25, originality: 0.30, practicality: 0.25, communityResonance: 0.20 };
    const score = parseFloat((
      (dims.clarity ?? 5) * weights.clarity +
      (dims.originality ?? 5) * weights.originality +
      (dims.practicality ?? 5) * weights.practicality +
      (dims.communityResonance ?? 5) * weights.communityResonance
    ).toFixed(2));

    const verdict = parsed.verdict ?? (score >= 7.5 ? "approved" : score >= 5.5 ? "challenged" : "rejected");
    const badge = parsed.badge ?? (verdict === "approved" ? "Community Approved ⭐" : verdict === "challenged" ? "Needs Refinement 🔧" : "Not Ready ❌");

    const newStatus = verdict === "approved" ? "approved" : verdict === "challenged" ? "challenged" : "rejected";

    await db.update(videosTable)
      .set({
        hackStatus: newStatus as "approved" | "challenged" | "rejected",
        aiScore: score,
        aiAnalysis: parsed.analysis ?? "",
        aiReviewedAt: new Date(),
      })
      .where(eq(videosTable.id, videoId));

    res.json({ score, analysis: parsed.analysis ?? "", dimensions: dims, verdict, badge });
  } catch (error) {
    console.error("AI review error:", error);
    res.status(500).json({ error: "AI review failed" });
  }
});

router.post("/battle-description", async (req: Request, res: Response) => {
  const { title, sourceUrl, ingredients } = req.body as {
    title?: string;
    sourceUrl?: string;
    ingredients?: string[];
  };

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  try {
    const ingredientList = ingredients?.length ? `\nKey ingredients: ${ingredients.slice(0, 10).join(", ")}` : "";
    const sourceRef = sourceUrl ? `\nInspiration source: ${sourceUrl}` : "";

    const prompt = `You are PlatePair's battle engine. A user wants to create a cooking battle based on:

Battle title: "${title}"${sourceRef}${ingredientList}

Generate compelling battle content. Respond ONLY with valid JSON:
{
  "description": "<2-3 sentence battle description that creates excitement and explains the challenge. Be specific about what makes this battle interesting.>",
  "suggestedTags": ["<tag1>", "<tag2>", "<tag3>"],
  "challengePrompt": "<One punchy sentence prompt for contestants, e.g. 'Show us YOUR version of the perfect carbonara — no cream allowed!'>"
}

Keep tags short (1-2 words), food-relevant, and specific to this battle.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 512,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    res.json({
      description: parsed.description ?? `Battle: ${title}. Show the community your take!`,
      suggestedTags: parsed.suggestedTags ?? [],
      challengePrompt: parsed.challengePrompt ?? `Cook your best ${title} and share it!`,
    });
  } catch (error) {
    console.error("Battle description AI error:", error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

export default router;
