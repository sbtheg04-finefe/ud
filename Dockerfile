# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Builder — install deps and build frontend + backend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages needed for the build
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/platepair/ ./artifacts/platepair/
COPY scripts/ ./scripts/

# Install all dependencies (respects lockfile)
RUN pnpm install --frozen-lockfile

# Build the React frontend (outputs to artifacts/platepair/dist/public)
RUN pnpm --filter @workspace/platepair build

# Build the Express backend (outputs to artifacts/api-server/dist)
RUN pnpm --filter @workspace/api-server build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runner — minimal image with only what's needed to run
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy the bundled Express server
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Copy the compiled React app so Express can serve it as static files
COPY --from=builder /app/artifacts/platepair/dist/public ./dist/public

EXPOSE 3000

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
