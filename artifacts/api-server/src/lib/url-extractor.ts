export interface ExtractedContent {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  platform: string;
  creator: string | null;
  sourceUrl: string;
  suggestedIngredients: string[];
  suggestedTools: string[];
  estimatedTimeMinutes: number | null;
  battleTitle: string;
  battleWorthinessScore: number;
}

const PLATFORM_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /tiktok\.com/i, name: "tiktok" },
  { pattern: /instagram\.com/i, name: "instagram" },
  { pattern: /youtube\.com|youtu\.be/i, name: "youtube" },
  { pattern: /twitter\.com|x\.com/i, name: "twitter" },
  { pattern: /pinterest\.com/i, name: "pinterest" },
  { pattern: /facebook\.com|fb\.com/i, name: "facebook" },
  { pattern: /reddit\.com/i, name: "reddit" },
];

const TRUSTED_DOMAINS = [
  "tiktok.com", "instagram.com", "youtube.com", "youtu.be",
  "twitter.com", "x.com", "pinterest.com", "facebook.com",
  "fb.com", "reddit.com", "vimeo.com",
];

const FOOD_INGREDIENTS = [
  "chicken", "beef", "pork", "salmon", "tuna", "shrimp", "tofu",
  "pasta", "rice", "noodles", "bread", "flour", "egg", "eggs",
  "garlic", "onion", "tomato", "potato", "avocado", "mushroom",
  "butter", "oil", "olive oil", "cream", "cheese", "milk",
  "lemon", "lime", "vinegar", "honey", "sugar", "salt", "pepper",
  "basil", "cilantro", "parsley", "rosemary", "thyme", "cumin",
  "paprika", "chili", "ginger", "soy sauce", "sesame",
  "broccoli", "spinach", "kale", "carrot", "zucchini", "bell pepper",
  "coconut", "peanut", "almond", "walnut", "bacon", "ham",
  "mozzarella", "parmesan", "feta", "cheddar", "brie",
  "tortilla", "pita", "flatbread", "sourdough",
];

const COOKING_TOOLS = [
  "pan", "skillet", "wok", "pot", "oven", "air fryer", "instant pot",
  "blender", "food processor", "mixer", "knife", "cutting board",
  "baking sheet", "cast iron", "pressure cooker", "slow cooker",
];

const TIME_PATTERNS = [
  /(\d+)\s*(?:min(?:ute)?s?)/i,
  /(\d+)\s*(?:hour|hr)s?/i,
];

function detectPlatform(url: string): string {
  for (const { pattern, name } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return name;
  }
  return "web";
}

function isTrustedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return TRUSTED_DOMAINS.some(d => hostname.endsWith(d));
  } catch {
    return false;
  }
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractIngredients(text: string): string[] {
  const lower = text.toLowerCase();
  return FOOD_INGREDIENTS.filter(ing => lower.includes(ing)).slice(0, 10);
}

function extractTools(text: string): string[] {
  const lower = text.toLowerCase();
  return COOKING_TOOLS.filter(tool => lower.includes(tool)).slice(0, 5);
}

function extractTime(text: string): number | null {
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const n = parseInt(match[1]);
      if (pattern.source.includes("hour")) return n * 60;
      return n;
    }
  }
  return null;
}

function generateBattleTitle(originalTitle: string, platform: string): string {
  const clean = originalTitle
    .replace(/\s*[-|].*$/, "") // Remove site suffix
    .replace(/^(Recipe|How to make|How to cook|Easy|Quick)\s*/i, "")
    .trim();

  const suffixes = [
    "Remake Battle", "Remix Challenge", "Copycat Battle",
    "Community Challenge", "Speed Challenge",
  ];

  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return clean ? `${clean} — ${suffix}` : `Viral ${platform} Recipe Battle`;
}

function scoreBattleWorthiness(extracted: Partial<ExtractedContent>): number {
  let score = 50;
  if (extracted.thumbnailUrl) score += 15;
  if ((extracted.suggestedIngredients?.length ?? 0) >= 3) score += 15;
  if ((extracted.suggestedIngredients?.length ?? 0) >= 6) score += 5;
  if (extracted.estimatedTimeMinutes && extracted.estimatedTimeMinutes <= 60) score += 10;
  if (extracted.platform === "tiktok" || extracted.platform === "instagram") score += 10;
  if (extracted.creator) score += 5;
  return Math.min(score, 100);
}

export async function extractUrl(rawUrl: string): Promise<{ ok: true; data: ExtractedContent } | { ok: false; error: string }> {
  if (!isTrustedUrl(rawUrl)) {
    return { ok: false, error: "Only URLs from TikTok, Instagram, YouTube, Twitter, Pinterest, and Facebook are supported." };
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PlatePairBot/1.0; +https://platepair.app)",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, error: `Could not fetch the content (HTTP ${res.status}). The platform may require login.` };
    }

    html = await res.text();
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return { ok: false, error: "Request timed out. The platform may be blocking automated access." };
    }
    return { ok: false, error: "Could not reach that URL. Try copying the video title and using 'Start from scratch'." };
  }

  const platform = detectPlatform(rawUrl);

  const title = extractMetaContent(html, "og:title")
    || extractMetaContent(html, "twitter:title")
    || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    || "Untitled Video";

  const description = extractMetaContent(html, "og:description")
    || extractMetaContent(html, "twitter:description")
    || extractMetaContent(html, "description")
    || "";

  const thumbnailUrl = extractMetaContent(html, "og:image")
    || extractMetaContent(html, "twitter:image")
    || null;

  const creator = extractMetaContent(html, "og:site_name")
    || extractMetaContent(html, "article:author")
    || null;

  const fullText = `${title} ${description}`;
  const suggestedIngredients = extractIngredients(fullText);
  const suggestedTools = extractTools(fullText);
  const estimatedTimeMinutes = extractTime(fullText);
  const battleTitle = generateBattleTitle(title, platform);
  const battleWorthinessScore = scoreBattleWorthiness({ thumbnailUrl, suggestedIngredients, estimatedTimeMinutes, platform, creator });

  return {
    ok: true,
    data: {
      title,
      description,
      thumbnailUrl,
      platform,
      creator,
      sourceUrl: rawUrl,
      suggestedIngredients,
      suggestedTools,
      estimatedTimeMinutes,
      battleTitle,
      battleWorthinessScore,
    }
  };
}
