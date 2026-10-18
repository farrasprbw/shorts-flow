# Stage 1: Build TypeScript Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for native modules or build tools
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Install FFmpeg and fonts for video generation and subtitle rendering
RUN apk add --no-cache ffmpeg font-noto font-noto-cjk

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built dist from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create storage directory for rendered video files and thumbnails
RUN mkdir -p /app/storage

EXPOSE 3000

CMD ["node", "dist/index.js"]
