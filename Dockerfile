# Multi-stage build for optimal image size and security
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application sources
COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public/
COPY src ./src/
COPY server ./server/

# Build client bundle (SPA)
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5002

# Copy production files and dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server

EXPOSE 5002

CMD ["npm", "start"]
