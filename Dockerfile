# ============================================================================
# STAGE 1: BUILDER
# ============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Prisma 7 loads prisma.config.ts during CLI execution.
# DATABASE_URL is therefore required during the build stage.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Copy dependency manifests first to maximize Docker layer caching.
COPY package*.json ./

RUN npm ci

# Copy TypeScript / Next.js configuration.
COPY tsconfig.json next-env.d.ts ./

# Copy Prisma configuration and schema.
COPY prisma.config.ts ./
COPY prisma ./prisma

# Copy application source code.
COPY . .

# Generate Prisma Client before building the Next.js application.
RUN npx prisma generate

# Build the production Next.js application.
RUN npm run build


# ============================================================================
# STAGE 2: RUNTIME
# ============================================================================

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only.
COPY package*.json ./

RUN npm ci --omit=dev

# Copy Next.js production build.
COPY --from=builder /app/.next ./.next

# Copy public assets.
COPY --from=builder /app/public ./public

# Copy generated Prisma Client.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy Prisma schema/configuration.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

EXPOSE 3000

CMD ["npm", "start"]