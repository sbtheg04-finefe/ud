import { db } from "@workspace/db";
import { videosTable, usersTable } from "@workspace/db/schema";
import { eq, ilike, or, count } from "drizzle-orm";

const MEAL_DB_BASE = "https://www.themealdb.com/api/json/v1/1";

const HACK_CATEGORIES = [
  "Chicken", "Beef", "Seafood", "Pasta", "Vegetarian",
  "Dessert", "Lamb", "Pork", "Side", "Starter", "Vegan", "Breakfast", "Goat"
];

const HACK_TRANSFORMS: Array<{
  pattern: RegExp;
  prefix: string;
  suffix: string;
  tags: string[];
}> = [
  { pattern: /air.?fry/i, prefix: "Air Fryer Hack →", suffix: "No oil, same crunch", tags: ["airfryer", "quick", "crispy"] },
  { pattern: /pasta|spaghetti|penne|linguine/i, prefix: "Pasta Hack →", suffix: "Silky sauce every time", tags: ["pasta", "technique", "italian"] },
  { pattern: /chicken/i, prefix: "Chicken Trick →", suffix: "Juicier than oven baked", tags: ["chicken", "protein", "technique"] },
  { pattern: /beef|steak|burger/i, prefix: "Beef Hack →", suffix: "Restaurant level at home", tags: ["beef", "steak", "maillard"] },
  { pattern: /salad/i, prefix: "Salad Upgrade →", suffix: "This dressing changes everything", tags: ["salad", "healthy", "quick"] },
  { pattern: /cake|dessert|bak/i, prefix: "Baking Secret →", suffix: "Bakery quality, home effort", tags: ["baking", "dessert", "technique"] },
  { pattern: /soup|stew|chili/i, prefix: "Soup Hack →", suffix: "Depth of flavor in 20 min", tags: ["soup", "umami", "technique"] },
  { pattern: /rice/i, prefix: "Rice Upgrade →", suffix: "Never mushy again", tags: ["rice", "technique", "asian"] },
  { pattern: /egg/i, prefix: "Egg Hack →", suffix: "Perfect every single time", tags: ["eggs", "technique", "breakfast"] },
  { pattern: /pizza/i, prefix: "Pizza Trick →", suffix: "Crispiest homemade crust", tags: ["pizza", "dough", "technique"] },
  { pattern: /curry/i, prefix: "Curry Shortcut →", suffix: "5-ingredient depth", tags: ["curry", "spices", "asian"] },
  { pattern: /fish|seafood|shrimp|salmon/i, prefix: "Seafood Hack →", suffix: "Never overcooked again", tags: ["seafood", "technique", "protein"] },
];

const GENERIC_TRANSFORMS = [
  { prefix: "TikTok finds →", suffix: "Game changing technique", tags: ["viral", "technique"] },
  { prefix: "Pro kitchen secret →", suffix: "Works every time", tags: ["technique", "prochef"] },
  { prefix: "Reddit cooking tip →", suffix: "Community approved", tags: ["tips", "community"] },
  { prefix: "5-minute upgrade →", suffix: "Tastes like you spent hours", tags: ["quick", "upgrade"] },
];

const BATTLE_SCORE_RANGES = [
  { minVotes: 100, score: () => (8.5 + Math.random() * 1.0) },
  { minVotes: 50, score: () => (7.5 + Math.random() * 1.0) },
  { minVotes: 20, score: () => (6.5 + Math.random() * 1.0) },
  { minVotes: 0, score: () => (5.5 + Math.random() * 1.5) },
];

interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags: string | null;
  strSource: string | null;
  strYoutube: string | null;
  [key: string]: string | null;
}

function extractIngredients(meal: MealDBMeal): string[] {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const meas = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      const measure = meas?.trim() ? `${meas.trim()} ` : "";
      ingredients.push(`${measure}${ing.trim()}`);
    }
  }
  return ingredients.slice(0, 8);
}

function generateHackTitle(meal: MealDBMeal): string {
  const mealName = meal.strMeal;
  for (const transform of HACK_TRANSFORMS) {
    if (transform.pattern.test(mealName)) {
      return `${transform.prefix} ${mealName}`.slice(0, 75);
    }
  }
  const generic = GENERIC_TRANSFORMS[Math.floor(Math.random() * GENERIC_TRANSFORMS.length)];
  return `${generic.prefix} ${mealName}`.slice(0, 75);
}

function generateHackDescription(meal: MealDBMeal): string {
  const steps = meal.strInstructions
    .split(/\r?\n/)
    .filter(s => s.trim().length > 10)
    .slice(0, 2)
    .join(" ");
  const desc = steps.slice(0, 140).trim();
  return desc || `Try this ${meal.strArea || meal.strCategory || "community"} technique. Voted up by home cooks worldwide.`;
}

function generateTags(meal: MealDBMeal): string[] {
  const tags: string[] = [];

  for (const transform of HACK_TRANSFORMS) {
    if (transform.pattern.test(meal.strMeal)) {
      tags.push(...transform.tags);
      break;
    }
  }

  if (meal.strCategory) tags.push(meal.strCategory.toLowerCase().replace(/\s+/g, ""));
  if (meal.strArea && meal.strArea !== "Unknown") tags.push(meal.strArea.toLowerCase());
  if (meal.strTags) {
    const extraTags = meal.strTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    tags.push(...extraTags.slice(0, 2));
  }

  return Array.from(new Set(tags)).slice(0, 5);
}

function generateBattleScore(): number {
  const base = 5.5 + Math.random() * 4.0;
  return Math.round(base * 10) / 10;
}

function generateVotes(): number {
  return Math.floor(Math.random() * 45) + 5;
}

function detectPlatform(url: string | null): string | null {
  if (!url) return null;
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  return "web";
}

function hackStatus(votes: number): string {
  if (votes >= 30) return "approved";
  if (votes >= 10) return "community_voting";
  return "submitted";
}

async function fetchMealsByCategory(category: string): Promise<MealDBMeal[]> {
  try {
    const listRes = await fetch(`${MEAL_DB_BASE}/filter.php?c=${encodeURIComponent(category)}`);
    const listData = await listRes.json() as { meals: Array<{ idMeal: string }> | null };
    if (!listData.meals) return [];

    const sample = listData.meals.sort(() => Math.random() - 0.5).slice(0, 8);
    const details: MealDBMeal[] = [];

    for (const m of sample) {
      try {
        const res = await fetch(`${MEAL_DB_BASE}/lookup.php?i=${m.idMeal}`);
        const data = await res.json() as { meals: MealDBMeal[] | null };
        if (data.meals?.[0]) details.push(data.meals[0]);
        await new Promise(r => setTimeout(r, 80));
      } catch (_) {}
    }

    return details;
  } catch (_) {
    return [];
  }
}

async function fetchRandomMeals(count: number): Promise<MealDBMeal[]> {
  const meals: MealDBMeal[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const res = await fetch(`${MEAL_DB_BASE}/random.php`);
      const data = await res.json() as { meals: MealDBMeal[] | null };
      if (data.meals?.[0]) meals.push(data.meals[0]);
      await new Promise(r => setTimeout(r, 60));
    } catch (_) {}
  }
  return meals;
}

async function titleExists(title: string): Promise<boolean> {
  const base = title.slice(0, 40);
  const [row] = await db.select({ value: count() }).from(videosTable)
    .where(ilike(videosTable.title, `%${base}%`));
  return Number(row.value) > 0;
}

async function getSystemUserId(): Promise<number> {
  const [user] = await db.select().from(usersTable).limit(1);
  return user?.id ?? 1;
}

export interface PopulateResult {
  fetched: number;
  inserted: number;
  skipped: number;
  total: number;
  categories: string[];
  ranAt: string;
}

export async function populateHacks(targetCount = 30): Promise<PopulateResult> {
  const authorId = await getSystemUserId();
  const categoriesToFetch = HACK_CATEGORIES.sort(() => Math.random() - 0.5).slice(0, 4);
  const allMeals: MealDBMeal[] = [];

  for (const cat of categoriesToFetch) {
    const meals = await fetchMealsByCategory(cat);
    allMeals.push(...meals);
  }

  const randomMeals = await fetchRandomMeals(Math.max(0, targetCount - allMeals.length));
  allMeals.push(...randomMeals);

  const uniqueMeals = Array.from(new Map(allMeals.map(m => [m.idMeal, m])).values());
  const shuffled = uniqueMeals.sort(() => Math.random() - 0.5).slice(0, targetCount + 10);

  let inserted = 0;
  let skipped = 0;

  for (const meal of shuffled) {
    if (inserted >= targetCount) break;

    const title = generateHackTitle(meal);
    const exists = await titleExists(title);
    if (exists) { skipped++; continue; }

    const ingredients = extractIngredients(meal);
    const caption = generateHackDescription(meal);
    const tags = generateTags(meal);
    const votes = generateVotes();
    const battleScore = generateBattleScore();
    const status = hackStatus(votes);
    const sourceUrl = meal.strYoutube || meal.strSource || null;
    const sourcePlatform = detectPlatform(sourceUrl);
    const aiScore = status === "approved" ? String((battleScore + Math.random() * 0.5).toFixed(1)) : null;
    const engagementScore = votes * 3 + Math.floor(Math.random() * 50);

    try {
      await db.insert(videosTable).values({
        authorId,
        title,
        caption,
        thumbnailUrl: meal.strMealThumb || null,
        sourceUrl,
        sourcePlatform,
        tags,
        ingredients,
        hackStatus: status as any,
        communityUpvotes: votes,
        communityDownvotes: Math.floor(votes * 0.05),
        aiScore,
        battleScore: String(battleScore),
        aiAnalysis: status === "approved"
          ? `${meal.strArea || meal.strCategory} technique with strong community backing. Ingredients are accessible and the method is reproducible. Good battle candidate.`
          : null,
        approvedAt: status === "approved" ? new Date() : null,
        creativeEngagementScore: engagementScore,
        isDemo: 1,
        populatedAt: new Date(),
      });
      inserted++;
    } catch (_) {
      skipped++;
    }
  }

  const [{ value: total }] = await db.select({ value: count() }).from(videosTable);

  return {
    fetched: shuffled.length,
    inserted,
    skipped,
    total: Number(total),
    categories: categoriesToFetch,
    ranAt: new Date().toISOString(),
  };
}

export let lastPopulateResult: PopulateResult | null = null;
export let nextScheduledRun: string | null = null;

export function setLastPopulateResult(r: PopulateResult) { lastPopulateResult = r; }
export function setNextScheduledRun(d: string) { nextScheduledRun = d; }
