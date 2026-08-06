# ── Stage 1: Build ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM node:20-alpine

# Python and make are sometimes needed for better-sqlite3 native rebuild if node versions differ,
# but using same node base image typically compiles fine.
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled files from builder stage
COPY --from=builder /app/dist/ ./dist/

# Create uploads directory (database is mounted to a external volume)
RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
