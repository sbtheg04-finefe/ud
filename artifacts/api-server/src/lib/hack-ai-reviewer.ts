import type { Video } from "@workspace/db/schema";

export interface HackAIResult {
  score: number;
  analysis: string;
  dimensions: {
    clarity: number;
    originality: number;
    practicality: number;
    communityResonance: number;
  };
  verdict: "approved" | "challenged" | "rejected";
  badge: string;
}

const TECHNIQUE_KEYWORDS = [
  "emulsify", "deglaze", "temper", "blooming", "caramelize", "render", "braise",
  "brine", "cure", "fold", "julienne", "chiffonade", "reduce", "emulsion",
  "par-cook", "blanch", "shock", "steep", "infuse", "marinate", "sear",
];

const SPECIFICITY_KEYWORDS = [
  "ratio", "degrees", "minutes", "seconds", "grams", "tablespoon", "teaspoon",
  "temperature", "medium-high", "low heat", "overnight", "rest",
];

const CREATIVITY_MARKERS = [
  "instead of", "swap", "substitute", "twist", "hack", "trick", "secret",
  "never", "always", "game-changer", "the reason", "why", "actually",
];

function scoreClarity(video: Video): number {
  const text = `${video.title} ${video.caption ?? ""}`.toLowerCase();
  let score = 5.0;
  if (video.caption && video.caption.length > 80) score += 1.0;
  if (video.caption && video.caption.length > 150) score += 0.5;
  if (video.thumbnailUrl) score += 0.5;
  if (video.durationSeconds && video.durationSeconds >= 15 && video.durationSeconds <= 90) score += 1.0;
  if (video.tags.length >= 2) score += 0.5;
  const specificityHits = SPECIFICITY_KEYWORDS.filter(k => text.includes(k)).length;
  score += Math.min(specificityHits * 0.4, 1.5);
  return Math.min(score, 10);
}

function scoreOriginality(video: Video): number {
  const text = `${video.title} ${video.caption ?? ""}`.toLowerCase();
  let score = 4.5;
  const techniqueHits = TECHNIQUE_KEYWORDS.filter(k => text.includes(k)).length;
  score += Math.min(techniqueHits * 0.6, 2.5);
  const creativityHits = CREATIVITY_MARKERS.filter(k => text.includes(k)).length;
  score += Math.min(creativityHits * 0.5, 2.0);
  if (video.tags.length >= 3) score += 0.5;
  if (video.linkedMealId) score += 0.5;
  return Math.min(score, 10);
}

function scorePracticality(video: Video): number {
  let score = 5.0;
  if (video.durationSeconds) {
    if (video.durationSeconds <= 45) score += 2.0;
    else if (video.durationSeconds <= 90) score += 1.0;
    else if (video.durationSeconds <= 180) score += 0.0;
    else score -= 1.0;
  }
  if (video.tags.length > 0) score += 0.5;
  if (video.linkedMealId) score += 1.0;
  return Math.min(score, 10);
}

function scoreCommunityResonance(video: Video): number {
  const upvotes = video.communityUpvotes ?? 0;
  const downvotes = video.communityDownvotes ?? 0;
  const saves = video.saveCount ?? 0;
  const likes = video.likeCount ?? 0;
  const total = upvotes + downvotes;
  let score = 5.0;
  if (total > 0) {
    const ratio = upvotes / total;
    score += (ratio - 0.5) * 6;
  }
  score += Math.min(saves * 0.1, 1.5);
  score += Math.min(likes * 0.05, 1.0);
  return Math.max(0, Math.min(score, 10));
}

function generateAnalysis(video: Video, dims: HackAIResult["dimensions"], score: number): string {
  const title = video.title;
  const lines: string[] = [];

  if (dims.clarity >= 7.5) {
    lines.push(`This hack communicates its technique with excellent clarity — the step-by-step structure makes it immediately actionable for home cooks at any level.`);
  } else if (dims.clarity >= 5.5) {
    lines.push(`The core idea is clearly presented, though additional detail on timing or quantities would make this even more replicable.`);
  } else {
    lines.push(`The concept shows promise but needs clearer instruction — consider specifying temperatures, ratios, or timing to improve reproducibility.`);
  }

  if (dims.originality >= 7.5) {
    lines.push(`Originality is a standout here. The approach challenges conventional cooking assumptions and introduces a genuinely fresh technique to the community canon.`);
  } else if (dims.originality >= 5.5) {
    lines.push(`The technique has a solid creative angle. It would benefit from highlighting what makes it distinct from standard approaches.`);
  } else {
    lines.push(`The method is reliable but closely follows established techniques. Adding a personal twist or specific insight would elevate originality.`);
  }

  if (dims.practicality >= 7.5) {
    lines.push(`Highly practical — concise, well-scoped, and immediately applicable without special equipment or advanced skill.`);
  } else if (dims.practicality >= 5.5) {
    lines.push(`Reasonably practical for most home kitchens with minor adaptation.`);
  } else {
    lines.push(`Practicality could be improved — consider trimming scope or clarifying prerequisites.`);
  }

  if (dims.communityResonance >= 7.0) {
    lines.push(`Community response is strongly positive, validating both the usefulness and accessibility of this technique.`);
  } else if (dims.communityResonance >= 5.0) {
    lines.push(`Community engagement is building steadily, with early voters finding value in this approach.`);
  }

  const verdictLine = score >= 7.5
    ? `Overall score: ${score.toFixed(1)}/10 — Approved for the Community Cookbook.`
    : score >= 6.0
    ? `Overall score: ${score.toFixed(1)}/10 — Strong contender; see improvement suggestions above.`
    : `Overall score: ${score.toFixed(1)}/10 — Needs refinement before approval.`;

  lines.push(verdictLine);
  return lines.join(" ");
}

export function runHackAIReview(video: Video): HackAIResult {
  const clarity = scoreClarity(video);
  const originality = scoreOriginality(video);
  const practicality = scorePracticality(video);
  const communityResonance = scoreCommunityResonance(video);

  const dimensions = { clarity, originality, practicality, communityResonance };

  const weights = { clarity: 0.25, originality: 0.30, practicality: 0.25, communityResonance: 0.20 };
  const score = parseFloat((
    clarity * weights.clarity +
    originality * weights.originality +
    practicality * weights.practicality +
    communityResonance * weights.communityResonance
  ).toFixed(2));

  let verdict: HackAIResult["verdict"];
  let badge: string;

  if (score >= 7.5) {
    verdict = "approved";
    badge = "Community Approved";
  } else if (score >= 5.5) {
    verdict = "challenged";
    badge = "Needs Refinement";
  } else {
    verdict = "rejected";
    badge = "Not Approved";
  }

  const analysis = generateAnalysis(video, dimensions, score);
  return { score, analysis, dimensions, verdict, badge };
}
