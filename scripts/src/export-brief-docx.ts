import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, UnderlineType
} from "docx";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../../..");

const BRAND = "E05C2A";
const LIGHT_GRAY = "F5F5F5";
const DARK = "1A1A1A";
const MID_GRAY = "6B6B6B";
const GREEN = "166534";
const GREEN_BG = "DCFCE7";

function h1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
    border: { bottom: { color: BRAND, size: 12, style: BorderStyle.SINGLE, space: 4 } },
    run: { color: BRAND, bold: true, size: 36 },
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 100 },
    run: { color: DARK, bold: true, size: 28 },
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 280, after: 80 },
    run: { color: MID_GRAY, bold: true, size: 24 },
  });
}

function body(text: string, opts: { bold?: boolean; color?: string; italic?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      bold: opts.bold,
      color: opts.color ?? DARK,
      italics: opts.italic,
      size: 22,
    })],
    spacing: { before: 60, after: 60 },
  });
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: DARK })],
    bullet: { level },
    spacing: { before: 40, after: 40 },
  });
}

function code(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      font: "Courier New",
      size: 18,
      color: "B91C1C",
    })],
    shading: { type: ShadingType.CLEAR, fill: LIGHT_GRAY },
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
  });
}

function divider(): Paragraph {
  return new Paragraph({
    text: "",
    border: { bottom: { color: "E5E7EB", size: 6, style: BorderStyle.SINGLE, space: 2 } },
    spacing: { before: 200, after: 200 },
  });
}

function noteBox(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `ℹ  ${text}`, size: 20, color: "1D4ED8", italics: true })],
    shading: { type: ShadingType.CLEAR, fill: "DBEAFE" },
    spacing: { before: 80, after: 80 },
    indent: { left: 360, right: 360 },
    border: {
      left: { color: "3B82F6", size: 16, style: BorderStyle.SINGLE, space: 8 },
    },
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  const headerCells = headers.map(h =>
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 60, after: 60 },
        indent: { left: 120, right: 120 },
      })],
      shading: { type: ShadingType.CLEAR, fill: BRAND },
    })
  );

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20, color: DARK })],
            spacing: { before: 60, after: 60 },
            indent: { left: 120, right: 120 },
          })],
          shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? "FFFFFF" : LIGHT_GRAY },
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headerCells, tableHeader: true }),
      ...dataRows,
    ],
  });
}

const doc = new Document({
  creator: "PlatePair Team",
  title: "PlatePair — Project Brief",
  description: "Full project brief for new team members",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22, color: DARK },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
      },
    },
    children: [

      // ── Cover ──────────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: "PlatePair", bold: true, size: 72, color: BRAND, font: "Calibri" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 160 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Project Brief", size: 36, color: MID_GRAY, font: "Calibri" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "For new team members — current as of April 1, 2026", size: 22, color: MID_GRAY, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
      }),

      divider(),

      // ── What is PlatePair ──────────────────────────────────────────────────
      h1("What is PlatePair?"),
      body("PlatePair is a full-stack community meal-sharing and cooking innovation app. It sits at the intersection of social cooking, competitive food challenges, and community knowledge-building."),
      body("The core promise:", { bold: true }),
      body("Don't just watch someone cook — join in, compete, and leave your mark on the community's collective knowledge.", { italic: true, color: BRAND }),

      h2("Three Core Systems"),
      bullet("Community Feed — share meals, cooking tips, and short-form hack videos"),
      bullet("Battle Engine — turn any meal or video into a joinable cooking challenge or tournament"),
      bullet("Hack Approval Engine — community votes + AI evaluation determines which hacks earn the permanent Community Cookbook seal"),

      divider(),

      // ── Seed Users ─────────────────────────────────────────────────────────
      h1("Demo Users"),
      noteBox("The current logged-in user is always Maya Chen (userId = 1). This is hardcoded during development in artifacts/platepair/src/hooks/use-current-user.ts"),

      new Paragraph({ children: [], spacing: { before: 120, after: 120 } }),

      makeTable(
        ["ID", "Name", "Speciality"],
        [
          ["1", "Maya Chen", "Meal prep, Asian cuisine (active user)"],
          ["2", "Carlos Rivera", "Family recipes, Mexican cuisine"],
          ["3", "Priya Sharma", "Plant-based, Indian spices"],
          ["4", "Tom Nakamura", "Japanese technique, ramen"],
          ["5", "Aiko Tanaka", "Fusion, Japanese-Brazilian"],
        ]
      ),

      divider(),

      // ── Tech Stack ─────────────────────────────────────────────────────────
      h1("Tech Stack"),

      makeTable(
        ["Layer", "Technology"],
        [
          ["Frontend", "React 18 + Vite, TypeScript, TailwindCSS, shadcn/ui"],
          ["Routing", "wouter (lightweight client-side router)"],
          ["Data fetching", "TanStack Query (React Query) v5"],
          ["API client", "Auto-generated from OpenAPI spec via Orval"],
          ["Backend", "Express 5, Node.js 24"],
          ["Database", "PostgreSQL + Drizzle ORM"],
          ["Validation", "Zod v4 + drizzle-zod"],
          ["API spec", "OpenAPI 3.1 (single source of truth)"],
          ["Monorepo", "pnpm workspaces"],
        ]
      ),

      new Paragraph({ children: [], spacing: { before: 200 } }),
      h2("Code Generation Flow"),
      noteBox("The API spec drives everything. Never edit the generated files directly."),
      new Paragraph({ children: [], spacing: { before: 80 } }),
      code("lib/api-spec/openapi.yaml   (edit here)"),
      code("        │"),
      code("        ▼   pnpm --filter @workspace/api-spec run codegen"),
      code("        ├──▶ lib/api-client-react/src/generated/   (React Query hooks)"),
      code("        └──▶ lib/api-zod/src/generated/            (Zod schemas for server)"),

      divider(),

      // ── Database ───────────────────────────────────────────────────────────
      h1("Database Schema"),

      makeTable(
        ["Table", "Purpose"],
        [
          ["users", "User profiles (displayName, bio, avatarUrl, location)"],
          ["groups", "Cooking circles / communities"],
          ["group_memberships", "Many-to-many: users ↔ groups"],
          ["meals", "Meal posts (title, description, ingredients, images, shareStatus)"],
          ["videos", "Cooking hack videos + hack approval fields"],
          ["hack_votes", "Community votes on hacks (up/down, one per user per video)"],
          ["reactions", "Likes on meals or videos"],
          ["saves", "Bookmarks on meals or videos"],
          ["comments", "Comments on meals or videos"],
          ["battles", "Cooking challenge definitions"],
          ["battle_requirements", "Checklist items a battle entry must satisfy"],
          ["battle_entries", "User submissions to a battle"],
          ["battle_teams", "Team groupings for team battles"],
          ["battle_team_members", "Many-to-many: users ↔ battle teams"],
          ["battle_interest", "Pre-registrations / 'I'm interested'"],
          ["battle_rounds", "Multi-round tournament bracket data"],
        ]
      ),

      new Paragraph({ children: [], spacing: { before: 200 } }),
      h2("Key Status Values"),

      h3("Meal shareStatus"),
      bullet("idea — concept only, not cooked yet"),
      bullet("cooking — in progress right now"),
      bullet("available — ready to share / pick up"),
      bullet("finished — done and gone"),

      h3("Hack Status Pipeline"),
      bullet("submitted → community_voting → ai_reviewing → approved / challenged / rejected"),

      h3("Battle Status"),
      bullet("open  |  live  |  judging  |  completed"),

      h3("Battle Scope"),
      bullet("circle  |  local  |  public  |  global"),

      h3("Challenge Types"),
      bullet("solo_remake  |  team_battle  |  remix_battle  |  speed_battle  |  budget_battle"),

      divider(),

      // ── Pages ──────────────────────────────────────────────────────────────
      h1("App Pages"),

      makeTable(
        ["Route", "Page", "Description"],
        [
          ["/", "home.tsx", "Social feed — mixed meals and hack videos"],
          ["/groups", "groups.tsx", "Browse and join cooking circles"],
          ["/groups/:id", "group-detail.tsx", "Group page with members and posts"],
          ["/videos", "videos.tsx", "Hacks — community voting + AI approval"],
          ["/meals/:id", "meal-detail.tsx", "Full meal with ingredients, comments, Battle CTA"],
          ["/battles", "battles.tsx", "Battle Arena — discover and filter challenges"],
          ["/battles/:id", "battle-detail.tsx", "Join or submit to a specific battle"],
          ["/battles/create", "create-battle.tsx", "4-step wizard to launch a new battle"],
          ["/saved", "saved.tsx", "User's bookmarked meals and videos"],
          ["/profile/:id", "profile.tsx", "User profile page"],
          ["/create", "create.tsx", "Post a new meal"],
        ]
      ),

      divider(),

      // ── Hack Engine ────────────────────────────────────────────────────────
      h1("Feature: Hack Approval Engine"),
      body("The Hacks page is a living community knowledge base, not a passive video feed. Hacks move through a pipeline from community voting to AI certification."),

      h2("Approval Pipeline"),
      code("User posts a hack"),
      code("        │"),
      code("  [submitted]  ── community votes ──▶ [community_voting]"),
      code("                                               │"),
      code("                          Author clicks 'Ask AI to Review'"),
      code("                          (requires ≥ 2 upvotes)"),
      code("                                               │"),
      code("                                      [ai_reviewing]"),
      code("                                               │"),
      code("                         ┌─────────────────────┼─────────────────────┐"),
      code("                         ▼                     ▼                     ▼"),
      code("                    Score ≥ 7.5           5.5 – 7.5            Score < 5.5"),
      code("                    [approved]            [challenged]          [rejected]"),
      code("                         │"),
      code("                Joins Community Cookbook"),

      h2("AI Scoring Dimensions"),
      makeTable(
        ["Dimension", "Weight", "What it measures"],
        [
          ["Clarity", "25%", "Caption detail, timing specifics, thumbnail, tag richness"],
          ["Originality", "30%", "Technique keywords, creative framing, unexpected angle"],
          ["Practicality", "25%", "Duration (15–90s ideal), scope, linked meal"],
          ["Community Resonance", "20%", "Upvote ratio, save count, like count"],
        ]
      ),

      new Paragraph({ children: [], spacing: { before: 120 } }),
      noteBox("AI reviewer lives at: artifacts/api-server/src/lib/hack-ai-reviewer.ts — rule-based, no external API key required."),

      h2("Creative Engagement Score"),
      body("Each video tracks: likes×1 + saves×2 + upvotes×3 + comments×1"),
      body("This score measures how much community impact a cook's hack has had. Future plan: surface on user profiles."),

      divider(),

      // ── Battle Engine ──────────────────────────────────────────────────────
      h1("Feature: Battle Engine"),
      body("Any meal post or cooking hack video can become a battle. The 'Battle this dish' button on every meal detail page deep-links into the creation wizard with the source pre-filled."),

      h2("Battle Worthiness Score"),
      makeTable(
        ["Score", "Battle Class"],
        [
          ["≥ 8.5", "Instant Battle"],
          ["≥ 7.0", "Circle Challenge"],
          ["≥ 6.0", "Skill Battle"],
          ["≥ 5.0", "Seasonal Showdown"],
          ["Any", "Mealkit Remix"],
        ]
      ),

      new Paragraph({ children: [], spacing: { before: 120 } }),
      h2("Create Battle Wizard (4 Steps)"),
      bullet("1. Source — pick a meal post, cooking hack video, or start from scratch"),
      bullet("2. Challenge type — Solo Remake / Team Battle / Remix Battle / Speed Battle / Budget Battle"),
      bullet("3. Details — title, description, deadline, scope, prize description"),
      bullet("4. Confirm — review and launch"),

      divider(),

      // ── API ────────────────────────────────────────────────────────────────
      h1("API Overview"),
      body("All routes under /api. Dev base URL: http://localhost:8080/api"),

      makeTable(
        ["Method", "Path", "Description"],
        [
          ["GET", "/feed", "Mixed feed of meals + videos"],
          ["GET / POST", "/meals", "List or create meals"],
          ["GET", "/meals/:id", "Single meal with author"],
          ["GET / POST", "/videos", "List (hackStatus filter) or create videos"],
          ["POST", "/videos/:id/vote", "Upvote or downvote a hack"],
          ["POST", "/videos/:id/submit-for-review", "Trigger AI review (requires ≥ 2 upvotes)"],
          ["POST", "/videos/:id/ai-review", "Force AI review (admin)"],
          ["GET / POST", "/groups", "List or create groups"],
          ["POST", "/engagement/reactions", "Toggle like"],
          ["POST", "/engagement/saves", "Toggle save"],
          ["GET / POST", "/engagement/comments", "Comments on meal or video"],
          ["GET / POST", "/battles", "List or create battles"],
          ["GET", "/battles/:id", "Battle detail with entries"],
          ["POST", "/battles/:id/join", "Join a battle"],
          ["POST", "/battles/:id/submit", "Submit an entry"],
          ["GET", "/battles/:id/leaderboard", "Ranked entries"],
          ["POST", "/battles/score", "Score a meal/video for battle-worthiness"],
          ["POST", "/battles/from-content", "Auto-generate a battle from content"],
          ["GET / PUT", "/users/:id", "Profile read / update"],
        ]
      ),

      divider(),

      // ── Status ─────────────────────────────────────────────────────────────
      h1("What's Working"),
      bullet("Social feed with mixed meals and videos"),
      bullet("Group / circle browsing and detail pages"),
      bullet("Meal detail with ingredients, instructions, share status, comments, likes, saves"),
      bullet("Hacks page with community voting, AI approval pipeline, Community Cookbook showcase"),
      bullet("Battle Arena with status + scope filters"),
      bullet("Battle detail with join / submit flow, leaderboard, requirements checklist"),
      bullet("Create Battle 4-step wizard (from meal, video, or scratch)"),
      bullet("'Battle this dish' CTA on meal detail pages"),
      bullet("User profiles and saved page"),
      bullet("Full API with OpenAPI spec + generated types"),

      h1("What's Not Yet Built"),
      bullet("Real authentication (currently Maya Chen is always logged in as userId=1)"),
      bullet("User creative impact / influence score displayed on profile"),
      bullet("Notifications (battle results, hack approved, someone joined your circle)"),
      bullet("Real video upload and playback"),
      bullet("Submit a new hack from within the app (currently seeded only)"),
      bullet("Real-time battle leaderboard updates"),
      bullet("Group-scoped private battle challenges"),

      divider(),

      // ── Perplexity ─────────────────────────────────────────────────────────
      h1("Ideas for Perplexity Integration"),

      h2("1. Ingredient Sourcing"),
      body("When a meal or battle is posted, surface real-time sourcing info — seasonal availability, local markets, price context."),

      h2("2. Hack Fact-Checking"),
      body("Before or after the AI approval score, Perplexity verifies the culinary science: does blooming spices in fat actually increase flavor compound release?"),

      h2("3. Battle Idea Generation"),
      body("Given a trending ingredient or technique, Perplexity suggests battle prompts the community should try next."),

      h2("4. Technique Deep-Dive"),
      body("Tapping an approved hack surfaces a research card: history of the technique, variations across cuisines, nutrition impact."),

      h2("5. Community Trend Spotting"),
      body("What cooking techniques are trending globally right now vs. what the PlatePair community is doing — surface the gap as conversation starters."),

      divider(),

      // ── Key Files ──────────────────────────────────────────────────────────
      h1("Key Files to Know"),

      makeTable(
        ["File", "Why it matters"],
        [
          ["lib/api-spec/openapi.yaml", "All API contracts — edit this first"],
          ["lib/db/src/schema/", "All database table definitions"],
          ["artifacts/api-server/src/routes/videos.ts", "Hack voting + AI review routes"],
          ["artifacts/api-server/src/routes/battles.ts", "Full battle engine backend"],
          ["artifacts/api-server/src/lib/hack-ai-reviewer.ts", "AI scoring logic (rule-based)"],
          ["artifacts/platepair/src/pages/videos.tsx", "Hacks page — community voting UI"],
          ["artifacts/platepair/src/pages/battles.tsx", "Battle Arena discovery page"],
          ["artifacts/platepair/src/pages/battle-detail.tsx", "Join / submit battle flow"],
          ["artifacts/platepair/src/pages/create-battle.tsx", "4-step battle creation wizard"],
          ["artifacts/platepair/src/pages/meal-detail.tsx", "Meal detail + 'Battle this dish'"],
          ["artifacts/platepair/src/hooks/use-current-user.ts", "Swap userId here to change active user"],
        ]
      ),

      new Paragraph({ children: [], spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: "Last updated by PlatePair Team · April 1, 2026", size: 18, color: MID_GRAY, italics: true })],
        alignment: AlignmentType.CENTER,
      }),
    ],
  }],
});

const outPath = join(root, "PLATEPAIR_BRIEF.docx");
const buffer = await Packer.toBuffer(doc);
writeFileSync(outPath, buffer);
console.log(`Written to ${outPath}`);
