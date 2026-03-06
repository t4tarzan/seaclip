# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM node:lts-slim AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests and lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY ui/package.json ./ui/
COPY cli/package.json ./cli/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──────────────────────────────────────────────────────────────
FROM deps AS build

# Copy full source
COPY . .

# Build shared package first (others depend on it)
RUN pnpm --filter @seaclip/shared build

# Build server
RUN pnpm --filter @seaclip/server build

# Build UI (Vite)
RUN pnpm --filter @seaclip/ui build

# ── Stage 3: Production image ───────────────────────────────────────────────────
FROM node:lts-slim AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app

# Copy workspace manifests for production install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from build stage
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist

# Copy compiled UI to be served by the server
COPY --from=build /app/ui/dist ./server/dist/public

# Persistent data volume for uploads, SQLite DB, etc.
VOLUME /seaclip

# Expose server port
EXPOSE 3100

# Run with dumb-init for proper signal forwarding
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server/dist/index.js"]
