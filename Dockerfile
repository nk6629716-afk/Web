###############################################################################
# Stage 1: Builder — installs all deps and compiles TypeScript
###############################################################################
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first (layer caching)
COPY package.json package-lock.json ./
COPY packages/shared/package.json   ./packages/shared/
COPY packages/engine/package.json   ./packages/engine/
COPY packages/database/package.json ./packages/database/
COPY apps/server/package.json       ./apps/server/

# Install all dependencies
RUN npm ci --ignore-scripts

# Copy source
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Compile all packages in dependency order
RUN npm run build --workspace=packages/shared  && \
    npm run build --workspace=packages/engine  && \
    npm run build --workspace=packages/database && \
    npm run build --workspace=apps/server

###############################################################################
# Stage 2: Runner — lean production image (~120 MB)
###############################################################################
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output and production-only node_modules
COPY --from=builder /app/package.json              ./
COPY --from=builder /app/package-lock.json         ./
COPY --from=builder /app/packages/shared/          ./packages/shared/
COPY --from=builder /app/packages/engine/          ./packages/engine/
COPY --from=builder /app/packages/database/        ./packages/database/
COPY --from=builder /app/apps/server/dist/         ./apps/server/dist/
COPY --from=builder /app/apps/server/package.json  ./apps/server/

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "apps/server/dist/index.js"]
