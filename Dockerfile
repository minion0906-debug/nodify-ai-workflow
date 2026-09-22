# ═══════════════════════════════════════════════════════════════
# NODIFY DOCKERFILE
# ═══════════════════════════════════════════════════════════════
#
# Multi-stage build for optimized production image
#
# Build: docker build -t nodify:latest .
# Run: docker-compose up
#
# ═══════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────
# Stage 1: Base
# ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# ───────────────────────────────────────────────────────────────
# Stage 2: Dependencies
# ───────────────────────────────────────────────────────────────
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# ───────────────────────────────────────────────────────────────
# Stage 3: Builder
# ───────────────────────────────────────────────────────────────
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN npm run build

# ───────────────────────────────────────────────────────────────
# Stage 4: Runner (Production)
# ───────────────────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=9003
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy node definitions (required for runtime)
COPY --from=builder --chown=nextjs:nodejs /app/src/nodes ./src/nodes

# Copy credentials definitions (required for runtime)
COPY --from=builder --chown=nextjs:nodejs /app/src/credentials ./src/credentials

# Copy AI flows (required for Genkit)
COPY --from=builder --chown=nextjs:nodejs /app/src/ai ./src/ai

# Create data directory with proper permissions for SQLite
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Create upload directory
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 9003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9003/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
