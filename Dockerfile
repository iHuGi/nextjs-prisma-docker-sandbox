# ============================================================================
# STAGE 1: BUILDER
# ============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency manifests and install packages
COPY package*.json ./
RUN npm ci

# Copy configuration files, prisma schema/config, and source code
COPY tsconfig.json next-env.d.ts ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY . .

# CRUCIAL: Generate Prisma client before building the Next.js application
RUN npx prisma generate

# Build the Next.js application with strict TypeScript checking
RUN npm run build

# ============================================================================
# STAGE 2: RUNTIME
# ============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled assets and Next.js output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy Prisma client and schema files
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma
COPY prisma.config.ts ./

EXPOSE 3000

CMD ["npm", "start"]