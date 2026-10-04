# ============================================================================
# STAGE 1: BUILDER
# ============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency manifests and install packages
COPY package*.json ./
RUN npm ci

# Explicitly copy configuration files and source code (including TypeScript configs)
COPY tsconfig.json next-env.d.ts ./
COPY . .

# Build the Next.js application with strict TypeScript checking
RUN npm run build

# ============================================================================
# STAGE 2: RUNTIME
# ============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies and compiled assets from the builder stage
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]