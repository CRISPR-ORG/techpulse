# syntax=docker/dockerfile:1

# ── Stage 1: build the frontend ──
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json Backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: runtime ──
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY Backend/package.json Backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev

COPY Backend/server.js Backend/server.js
COPY Backend/src Backend/src
COPY --from=builder /app/frontend/dist frontend/dist

EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/api', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "Backend/server.js"]
