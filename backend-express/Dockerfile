# Stage 1: Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only dependency files first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dev dependencies for build
RUN npm ci

# Generate Prisma client for build
RUN npx prisma generate

# Copy entire source
COPY . .

# Build TypeScript (ensure dist folder exists)
RUN npm run build


# Stage 2: Production Stage
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependency defs
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built output and prisma client from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Ownership: security
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/server.js"]
