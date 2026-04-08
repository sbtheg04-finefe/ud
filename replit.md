# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/platepair` (`@workspace/platepair`)

React + Vite frontend for PlatePair. Pages live in `src/pages/`, components in `src/components/`.

Key pages: Feed, Groups, Hacks (short-form cooking videos), Battles (Battle Arena), Saved, Meal Detail, Video Detail, Group Detail, Profile.

Battle Engine pages: `battles.tsx` (discover/arena with status + scope filters), `battle-detail.tsx` (join/submit flow with leaderboard), `create-battle.tsx` (4-step wizard: source → challenge type → details → confirm).

Auth + Onboarding pages: `onboarding.tsx` (4-step wizard with tier selection), `partner-dashboard.tsx`, `judge-queue.tsx`.

- Real auth via Replit OIDC; `src/hooks/use-auth.ts` fetches `/api/auth/user` (inlined to avoid multi-React instance issues)
- `src/hooks/use-current-user.ts` wraps useAuth + useGetUser; exposes `isPartner`, `isJudge`, `onboardingCompleted`
- `AuthGuard` in `App.tsx` blocks unauthenticated users and redirects incomplete onboarders to `/onboarding`
- API client hooks from `@workspace/api-client-react` (generated by Orval)
- Routing via `wouter`
- Navbar shows Partner/Judge contextual links based on user roles; logout via `/api/logout`

## PlatePair Features

**Core app:**
- Social feed with meal posts and cooking hack videos
- Groups/circles for meal sharing communities
- Short-form cooking hack videos (Hacks page)
- Saved posts collection
- User profiles with bio + posts

**Battle Engine:**
- Battle Arena discovery page (filter by status: open/live/judging/completed; scope: circle/local/public/global)
- Battle detail page (hero image, stats, join/submit CTA sidebar, battle entries, leaderboard, requirements checklist)
- Create Battle wizard (turn any meal post or cooking hack video into a community challenge)
- "Battle this dish" CTA on every meal detail page (deep-links into wizard with source pre-filled)
- Battle worthiness scoring (rule-based: ingredient count, images, saves, duration, tags → score 0-10)
- Challenge types: solo_remake, team_battle, remix_battle, speed_battle, budget_battle
- Scope types: circle, local, public, global

**Hacks / Community Approval Engine:**
- Hacks page redesigned as a community voting + AI approval system
- Status pipeline: submitted → community_voting → ai_reviewing → approved / challenged / rejected
- Upvote/downvote on each hack card; 3+ votes triggers `community_voting` status
- "Ask AI to Review" button appears once a hack reaches 2+ upvotes
- AI engine (`artifacts/api-server/src/lib/hack-ai-reviewer.ts`) scores on 4 dimensions: clarity, originality, practicality, community resonance — weighted composite 0-10
- Score ≥ 7.5 → approved and added to Community Cookbook; 5.5-7.5 → challenged; < 5.5 → rejected
- Approved hacks show AI score meter, "AI Verdict" expandable with full analysis text
- Community Cookbook showcase at top of Hacks page (top 3 approved by AI score)
- Creative engagement score tracked per video (likes + saves×2 + upvotes×3 + comments)
- New DB table: `hack_votes` (video_id, user_id, vote_type, unique constraint)
- New video fields: hackStatus, communityUpvotes, communityDownvotes, aiScore, aiAnalysis, aiReviewedAt, approvedAt, creativeEngagementScore
- New API routes: POST `/videos/:id/vote`, POST `/videos/:id/submit-for-review`, POST `/videos/:id/ai-review`

**DB tables:** battles, battle_requirements, battle_entries, battle_teams, battle_team_members, battle_interest, battle_rounds

**Seed data:** 6 demo battles, entries, interest tracking (`scripts/src/seed-battles.ts`)

**Custom Auth (No Replit account required):**
- Guest mode: All public routes browsable without any login (home/feed, battles, videos, groups, meals, profiles)
- Protected routes (require sign-in): /create, /battles/create, /saved, /partner/dashboard, /judge/queue, /profile/:id/edit
- Custom register: `POST /api/auth/register` (email, password, displayName, optional referralCode) — bcryptjs password hashing (cost 12)
- Custom login: `POST /api/auth/login` (email, password) — same session infrastructure as OIDC
- Replit OIDC login: Still available as "Continue with Replit" for existing users (GET /api/login)
- Login page: `/login` — choose flow (Create account / Sign in / Continue with Replit / Browse as guest)
- Navbar: Shows "Sign In" button for guests, avatar dropdown for authenticated users
- `useAuth` hook extended: `register()`, `emailLogin()`, `refreshUser()` functions added

**4-Tier Onboarding System:**
- Tiers: Just Cook (user) / Bring Your Brand (partner+user) / Become a Judge (judge+user) / Full Package (all)
- Auth: Real Replit OIDC via `openid-client`; sessions stored in `sessions` DB table; cookie `sid`
- Auth routes: `GET /api/login` (PKCE flow), `GET /api/callback` (upserts user, creates session), `GET /api/logout` (OIDC end session), `GET /api/auth/user` (returns session user or null)
- Middleware: `authMiddleware` reads `sid` cookie → populates `req.user` + `req.isAuthenticated()`
- New DB tables: `sessions`, `partner_profiles`, `judge_profiles`, `judge_assignments`, `battle_sponsorships`
- Extended `users` table: `replitUserId`, `roles[]`, `referralCode`, `referredById`, `onboardingCompleted`
- New API routes: `GET/POST /api/onboarding/*`, `GET/POST /api/partner/*`, `GET/POST /api/judge/*`
- Incentive design: non-gatekeeping (all tiers work independently), judge involvement drives 3× battle visibility
- Referral mechanic: 8-char hex referral code per user, tracked via `referredById` on users table

**Object Storage + Real Image Uploads:**
- Replit Object Storage provisioned; `objectStorage.ts`, `objectAcl.ts` in api-server lib
- `GET/PUT /api/storage/objects/:path` — upload and serve files via object storage
- `ImageUpload` component (`artifacts/platepair/src/components/shared/image-upload.tsx`) — drag-and-drop, progress bar, preview, clear button
- Wired into: battle entry submission (replaces URL text input), meal creation form
- Path convention: object storage returns `/objects/uploads/<uuid>`; serving URL is `/api/storage/objects/<uuid>`; component handles prefix conversion automatically
- Display fix: all `img` tags for user-uploaded content check `src.startsWith("/objects/")` and prepend `/api/storage`

**Real AI Hack Review + Battle Description:**
- `artifacts/api-server/src/routes/ai.ts`: two endpoints using GPT via Replit OpenAI integration
- `POST /api/ai/hack-review/:videoId` — scores hack on Clarity, Originality, Practicality, CommunityResonance (JSON mode); writes AI score + analysis to DB; updates hackStatus
- `POST /api/ai/battle-description` — generates battle description + tags from title + theme
- AI Write button in create-battle.tsx calls battle-description endpoint; "Ask AI to Review" in videos.tsx calls hack-review endpoint

**Hack→Battle Conversion:**
- "Make a Battle" button on all AI-approved hacks in `/videos`
- Navigates to `/battles/create?fromHackId=<id>` pre-populating title and description
- `generateAIDescription()` in create-battle.tsx auto-calls AI endpoint when hackId is present
- AI Write (Sparkles) button available in Scratch and Confirm steps of battle creation flow

**Battle Slot-Fill & Tournament Flow System:**
- DB: `battles` table extended with `minParticipants`, `isHot`, `isFeatured`, `inviteCode`, `affinityTags`
- DB: `battle_entries` extended with `judgeScore`, `timingScore`
- API: GET `/battles` — now exposes `slotsOpen` (derived), `isHot`, `isFeatured`, `isBookmarked` per user, `maxParticipants`, `minParticipants`; orders hot/featured first
- API: GET `/battles/hot` — battles with `isHot = true`, ordered by fill rate
- API: GET `/battles/recommended` — open battles not yet full, ordered by featured/worthiness score
- API: POST `/battles/:id/bookmark` — toggle bookmark (battle_interest "saved" intent); returns `{ bookmarked: bool }`
- API: GET `/battles/:id/invite-link` — generates unique invite code + full invite URL; code stored in DB
- Auto hot-marking: when a battle joins reach ≥50% fill rate with ≥4 participants, `isHot` flips to `true`
- Battle size tiers enforced via `minParticipants`: 4 (private/quick), 8 (standard), 16 (featured/large)
- Blended scoring model (7 dimensions): Completion 20%, Creativity 20%, Presentation 20%, Judge Score 20%, Timing 10%, Community votes 7%, Journal Bonus +0.5 pts
- Timing score: 10 (on-time), 6 (≤30 min late), 2 (late) — computed on entry submission
- UI: Battles page redesigned with "Hot Right Now" section at top (3 hot battles), slot progress bars on all cards, Hot/Featured/Almost-Full badges, "Closing Soon" filter tab, "Closes in Xh" countdown badges, bookmark button on each card
- UI: Battle detail page shows: Hot/Featured labels, slot fill progress bar (color-coded: green/amber/red), "Save" + "Invite" action buttons, invite link display with copy button, "How Scoring Works" sidebar card explaining all 7 dimensions
- UI: Entry leaderboard shows per-entry scoring breakdown (Completion, Creativity, Presentation mini-tiles) plus journal bonus indicator

**Growth Event Tracking:**
- DB table: `growth_events` (id, userId, sessionId, eventType, metadata JSONB, createdAt)
- API: `POST /api/events` — fire-and-forget, returns 204, never throws at the user
- Frontend hook: `useTrack()` at `artifacts/platepair/src/hooks/use-track.ts` — typed event enum, anonymous session ID stored in localStorage
- Tracked events: `landing_viewed`, `login_clicked`, `onboarding_started`, `onboarding_step_viewed`, `onboarding_intent_selected`, `onboarding_completed`, `onboarding_skipped`, `battle_viewed`, `battle_joined`, `group_created`, `group_joined`, `invite_sent`, `invite_code_copied`, `hack_upvoted`, `hack_ai_review_requested`, `partner_dashboard_viewed`, `judge_queue_viewed`, `feed_filtered`, `meal_shared`
- Wired: landing page (landing_viewed, login_clicked), onboarding (started, step_viewed, completed)
