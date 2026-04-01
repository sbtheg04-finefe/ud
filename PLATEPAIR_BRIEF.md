# PlatePair — Project Brief
> Current as of April 1, 2026. Written for a new collaborator onboarding to the project.

---

## What is PlatePair?

PlatePair is a **full-stack community meal-sharing and cooking innovation app**. It sits at the intersection of social cooking, competitive food challenges, and community knowledge-building.

The core promise: *Don't just watch someone cook — join in, compete, and leave your mark on the community's collective knowledge.*

Three major systems power the app:

1. **Community Feed** — share meals, cooking tips, and short-form hack videos
2. **Battle Engine** — turn any meal or video into a joinable cooking challenge or tournament
3. **Hack Approval Engine** — community votes + AI evaluation determines which cooking hacks earn the permanent "Community Cookbook" seal

---

## Who Is in the App (Seed Users)

The app runs with five seeded demo users. The current logged-in user is always **Maya Chen (userId=1)** — this is hardcoded in `artifacts/platepair/src/hooks/use-current-user.ts` for dev purposes.

| ID | Name | Speciality |
|----|------|-----------|
| 1 | Maya Chen | Meal prep, Asian cuisine |
| 2 | Carlos Rivera | Family recipes, Mexican cuisine |
| 3 | Priya Sharma | Plant-based, Indian spices |
| 4 | Tom Nakamura | Japanese technique, ramen |
| 5 | Aiko Tanaka | Fusion, Japanese-Brazilian |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, TypeScript, TailwindCSS, shadcn/ui |
| Routing | wouter (lightweight client-side router) |
| Data fetching | TanStack Query (React Query) v5 |
| API client | Auto-generated from OpenAPI spec via Orval |
| Backend | Express 5, Node.js 24 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| API spec | OpenAPI 3.1 (single source of truth) |
| Monorepo | pnpm workspaces |

---

## Repository Structure

```
workspace/
├── artifacts/
│   ├── api-server/          # Express 5 API — all backend routes
│   │   └── src/
│   │       ├── routes/      # One file per resource
│   │       └── lib/         # Shared logic (e.g. hack-ai-reviewer.ts)
│   └── platepair/           # React + Vite frontend
│       └── src/
│           ├── pages/       # One file per route/page
│           ├── components/  # Shared UI components
│           └── hooks/       # Custom hooks
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml     # THE source of truth for all API contracts
│   ├── api-client-react/    # Auto-generated React Query hooks (do not edit)
│   ├── api-zod/             # Auto-generated Zod schemas (do not edit)
│   └── db/
│       └── src/schema/      # Drizzle table definitions
└── scripts/
    └── src/                 # One-off seed scripts (seed.ts, seed-battles.ts, etc.)
```

### The Code Generation Flow

> **Important:** The API spec drives everything. Never edit the generated files.

```
lib/api-spec/openapi.yaml
         │
         ▼  pnpm --filter @workspace/api-spec run codegen
         │
         ├──▶ lib/api-client-react/src/generated/api.ts     (React Query hooks)
         └──▶ lib/api-zod/src/generated/api.ts              (Zod schemas for server)
```

When you add a new endpoint:
1. Add it to `openapi.yaml` (path + schema)
2. Run codegen
3. Use the generated Zod schema in the Express route
4. Use the generated React Query hook in the frontend page

---

## Database Schema

All tables defined in `lib/db/src/schema/`. Push changes with:
```
pnpm --filter @workspace/db run push
```

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles (displayName, bio, avatarUrl, location) |
| `groups` | Cooking circles/communities |
| `group_memberships` | Many-to-many: users ↔ groups |
| `meals` | Meal posts (title, description, ingredients, instructions, shareStatus, images) |
| `videos` | Cooking hack videos + hack approval fields (see below) |
| `hack_votes` | Community votes on hacks (up/down, one per user per video) |
| `reactions` | Likes on meals or videos |
| `saves` | Bookmarks on meals or videos |
| `comments` | Comments on meals or videos |
| `battles` | Cooking challenge definitions |
| `battle_requirements` | Checklist items a battle entry must satisfy |
| `battle_entries` | User submissions to a battle |
| `battle_teams` | Team groupings for team battles |
| `battle_team_members` | Many-to-many: users ↔ battle teams |
| `battle_interest` | "I'm interested" pre-registrations |
| `battle_rounds` | Multi-round tournament bracket data |

### Key Enums / Status Values

**Meal shareStatus:** `idea` | `cooking` | `available` | `finished`

**Hack status pipeline:** `submitted` → `community_voting` → `ai_reviewing` → `approved` / `challenged` / `rejected`

**Battle status:** `open` | `live` | `judging` | `completed`

**Battle scope:** `circle` | `local` | `public` | `global`

**Challenge types:** `solo_remake` | `team_battle` | `remix_battle` | `speed_battle` | `budget_battle`

---

## App Pages & Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `home.tsx` | Social feed (meals + hack videos mixed) |
| `/groups` | `groups.tsx` | Browse and join cooking circles |
| `/groups/:groupId` | `group-detail.tsx` | Group page with members and posts |
| `/videos` | `videos.tsx` | **Hacks page** — community voting + approval |
| `/videos/:videoId` | *(video detail — linked from cards)* | Individual hack page |
| `/meals/:mealId` | `meal-detail.tsx` | Full meal detail with ingredients, instructions, comments |
| `/battles` | `battles.tsx` | **Battle Arena** — discover and filter challenges |
| `/battles/:battleId` | `battle-detail.tsx` | Join/submit to a specific battle |
| `/battles/create` | `create-battle.tsx` | 4-step wizard to launch a new battle |
| `/saved` | `saved.tsx` | User's bookmarked meals and videos |
| `/profile/:userId` | `profile.tsx` | User profile page |
| `/create` | `create.tsx` | Post a new meal |

---

## Feature Deep Dive: Hack Approval Engine

This is the most novel system. The idea: cooking hacks shouldn't just be a passive video feed — they should be living knowledge that the community validates and the AI certifies.

### How it works

```
User posts a hack (video)
        │
        ▼
  [submitted]  ──── Community upvotes/downvotes ────▶ [community_voting]
                                                               │
                                              Author clicks "Ask AI to Review"
                                              (requires ≥ 2 upvotes)
                                                               │
                                                        [ai_reviewing]
                                                               │
                                              AI scores on 4 dimensions:
                                              • Clarity (0-10)
                                              • Originality (0-10)
                                              • Practicality (0-10)
                                              • Community Resonance (0-10)
                                                               │
                                              ┌────────────────┼────────────────┐
                                              ▼                ▼                ▼
                                         Score ≥ 7.5      5.5 – 7.5        Score < 5.5
                                         [approved]       [challenged]      [rejected]
                                              │
                                     Joins Community Cookbook
                                     (showcased at top of Hacks page)
```

### AI Reviewer

Location: `artifacts/api-server/src/lib/hack-ai-reviewer.ts`

This is a rule-based scoring engine (no external API key needed). It analyzes:
- **Clarity**: caption length, presence of specific measurements/timing, thumbnail
- **Originality**: culinary technique keywords, "twist" framing language, unique tag combinations
- **Practicality**: video duration (15–90s is ideal), linked meal, tag specificity
- **Community Resonance**: upvote/downvote ratio, save count, like count

Weighted composite: `clarity×0.25 + originality×0.30 + practicality×0.25 + communityResonance×0.20`

The AI also writes a natural-language analysis paragraph for each hack, which appears in the "AI Verdict" expandable on approved hack cards.

### Creative Engagement Score

Each video has a `creativeEngagementScore` = `likes×1 + saves×2 + upvotes×3 + comments×1`

This score surfaces how much community impact a cook's hack has had. Future: display on user profiles.

---

## Feature Deep Dive: Battle Engine

### The Pipeline

Any meal post or cooking hack video can be turned into a battle. The "Battle this dish" button on every meal detail page deep-links into the create wizard with the source pre-filled.

**Battle worthiness score** (0–10): auto-computed from ingredient count, image presence, save count, duration, tag diversity. Displayed as a flame score on battle cards.

### Battle Classes by Score

| Score | Type |
|-------|------|
| ≥ 8.5 | Instant Battle |
| ≥ 7.0 | Circle Challenge |
| ≥ 6.0 | Skill Battle |
| ≥ 5.0 | Seasonal Showdown |
| Any | Mealkit Remix |

### Create Battle Wizard (4 steps)

1. **Source** — pick a meal post, cooking hack video, or start from scratch
2. **Challenge type** — Solo Remake / Team Battle / Remix Battle / Speed Battle / Budget Battle
3. **Details** — title, description, deadline, scope, prize description
4. **Confirm** — review and launch

---

## API Overview

All routes are under `/api`. Base URL in dev: `http://localhost:8080/api`

### Core Resources

| Method | Path | Description |
|--------|------|-------------|
| GET | `/feed` | Mixed feed of meals + videos |
| GET/POST | `/meals` | List or create meals |
| GET | `/meals/:id` | Get single meal with author |
| GET/POST | `/videos` | List (with `hackStatus` filter) or create videos |
| GET | `/videos/:id` | Single video |
| POST | `/videos/:id/vote` | Upvote or downvote a hack |
| POST | `/videos/:id/submit-for-review` | Trigger AI review (requires ≥ 2 upvotes) |
| POST | `/videos/:id/ai-review` | Admin: force AI review |
| GET/POST | `/groups` | List or create groups |
| GET | `/groups/:id` | Group detail with members |
| POST | `/engagement/reactions` | Toggle like on meal or video |
| POST | `/engagement/saves` | Toggle save on meal or video |
| GET/POST | `/engagement/comments` | Comments on meal or video |
| GET/POST | `/battles` | List (with filters) or create battles |
| GET | `/battles/:id` | Battle detail with entries |
| POST | `/battles/:id/join` | Join a battle |
| POST | `/battles/:id/submit` | Submit an entry |
| POST | `/battles/:id/interest` | Register interest |
| GET | `/battles/:id/leaderboard` | Ranked entries |
| POST | `/battles/score` | Score a meal/video for battle-worthiness |
| POST | `/battles/from-content` | Auto-generate a battle from a meal or video |
| GET | `/users/:id` | User profile |
| PUT | `/users/:id` | Update profile |

---

## Running the Project

```bash
# Install dependencies
pnpm install

# Start both servers (already configured as workflows in Replit)
pnpm --filter @workspace/api-server run dev    # API on port 8080
pnpm --filter @workspace/platepair run dev      # Frontend on Vite dev port

# Database
pnpm --filter @workspace/db run push            # Apply schema changes

# Seed data
pnpm --filter @workspace/scripts run seed                  # Core users, meals, videos, groups
pnpm --filter @workspace/scripts run seed-battles          # 6 demo battles
pnpm --filter @workspace/scripts run seed-hack-approvals   # Hack voting + AI scores

# Regenerate API types after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen
```

---

## What's Working Right Now

- [x] Social feed with mixed meals and videos
- [x] Group/circle browsing and detail pages
- [x] Meal detail with ingredients, instructions, share status, comments, likes, saves
- [x] Hacks page with community voting, AI approval pipeline, Community Cookbook showcase
- [x] Battle Arena with status + scope filters
- [x] Battle detail with join/submit flow, leaderboard, requirements checklist
- [x] Create Battle 4-step wizard (from meal, video, or scratch)
- [x] "Battle this dish" CTA on meal detail pages
- [x] User profiles
- [x] Saved page
- [x] Full API with OpenAPI spec + generated types

---

## What's Not Yet Built (Open Ideas)

- [ ] Real authentication (currently Maya Chen is always logged in as userId=1)
- [ ] User creative impact / influence score on profile page (data exists, no display)
- [ ] Notifications (battle results, hack approved, someone joined your circle)
- [ ] Real video upload and playback
- [ ] Push a new hack / video from the app (currently seeded only)
- [ ] Real-time battle leaderboard updates
- [ ] Group-scoped battle challenges (private circle battles)
- [ ] Perplexity integration ideas — see below

---

## Ideas for Perplexity Integration

This is the open space for what you're bringing in. Some directions:

1. **Ingredient sourcing** — when a meal or battle is posted, Perplexity could surface real-time sourcing info (seasonal availability, local markets, price context)

2. **Hack fact-checking** — before or after the AI approval score, Perplexity could verify the culinary science behind a hack ("does blooming spices in fat actually increase flavor compounds?")

3. **Battle idea generation** — given a trending ingredient or technique, Perplexity suggests battle prompts the community should try next

4. **Technique deep-dive** — tapping an approved hack could surface a Perplexity research card: the history of the technique, variations across cuisines, nutrition impact

5. **Community trend spotting** — what cooking techniques are trending globally right now vs. what the PlatePair community is doing

---

## Key Files to Know

| File | Why it matters |
|------|---------------|
| `lib/api-spec/openapi.yaml` | All API contracts — edit this first |
| `lib/db/src/schema/` | All DB tables |
| `artifacts/api-server/src/routes/videos.ts` | Hack voting + AI review routes |
| `artifacts/api-server/src/routes/battles.ts` | Full battle engine backend |
| `artifacts/api-server/src/lib/hack-ai-reviewer.ts` | AI scoring logic |
| `artifacts/platepair/src/pages/videos.tsx` | Hacks page (community voting UI) |
| `artifacts/platepair/src/pages/battles.tsx` | Battle Arena page |
| `artifacts/platepair/src/pages/battle-detail.tsx` | Join/submit battle flow |
| `artifacts/platepair/src/pages/create-battle.tsx` | 4-step battle creation wizard |
| `artifacts/platepair/src/pages/meal-detail.tsx` | Meal detail + "Battle this dish" CTA |
| `artifacts/platepair/src/hooks/use-current-user.ts` | Swap userId here to change active user |

---

*Last updated by Replit Agent · April 1, 2026*
