import { Router, type Request, type Response } from "express";

const router = Router();

router.post("/link/preview", async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    res.status(422).json({ error: "Invalid URL" });
    return;
  }

  const platform =
    parsed.hostname.includes("tiktok.com") ? "tiktok" :
    parsed.hostname.includes("instagram.com") ? "instagram" :
    parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be") ? "youtube" :
    parsed.hostname.includes("twitter.com") || parsed.hostname.includes("x.com") ? "x" :
    parsed.hostname.includes("pinterest.com") ? "pinterest" :
    parsed.hostname.includes("reddit.com") ? "reddit" :
    "web";

  try {
    const response = await fetch(url.trim(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PlatePair/1.0; +https://platepair.com)",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
      },
      signal: AbortSignal.timeout(7000),
    });

    const html = await response.text();

    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+property=["']og:title["']/i)?.[1];
    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,400})["']/i)?.[1]
      ?? html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i)?.[1];
    const pageTitle = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1];
    const twitterImg = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1];

    const rawTitle = (ogTitle ?? pageTitle ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    const description = (ogDesc ?? "").replace(/\s+/g, " ").trim().slice(0, 280);
    const thumbnailUrl = ogImage ?? twitterImg ?? null;

    // Derive a "theme" heuristic from title+desc text
    const combined = `${rawTitle} ${description}`.toLowerCase();
    const theme =
      combined.match(/hack|trick|tip|secret|cheat|shortcut/) ? "Cooking Hack" :
      combined.match(/battle|challenge|competition|compet/) ? "Challenge Worthy" :
      combined.match(/recipe|cook|bake|grill|roast|fry|stir/) ? "Recipe Inspo" :
      combined.match(/meal prep|prep|batch|portion/) ? "Meal Prep" :
      combined.match(/dessert|cake|cookie|sweet|pastry/) ? "Dessert & Baking" :
      combined.match(/fast|quick|easy|simple|minute/) ? "Quick & Easy" :
      combined.match(/vegan|plant.based|vegetarian/) ? "Plant-Based" :
      "Content Drop";

    const suggestedUse =
      theme === "Cooking Hack" ? "Start a battle around this technique — great for judged rounds" :
      theme === "Challenge Worthy" ? "Drop this as a battle prompt for your crew" :
      theme === "Recipe Inspo" ? "Add to your crew cookbook or use as a battle brief" :
      theme === "Meal Prep" ? "Share in a Crew session or start a prep challenge" :
      theme === "Quick & Easy" ? "Perfect for a speed-round battle or crew cook-along" :
      "Drop it in your crew feed or spark a themed battle";

    res.json({
      url: url.trim(),
      platform,
      title: rawTitle,
      description,
      thumbnailUrl,
      theme,
      suggestedUse,
    });
  } catch {
    // Fallback: return what we can from the URL itself
    res.json({
      url: url.trim(),
      platform,
      title: parsed.hostname.replace(/^www\./, ""),
      description: "",
      thumbnailUrl: null,
      theme: "Content Drop",
      suggestedUse: "Drop it in your crew feed or spark a themed battle",
    });
  }
});

export default router;
