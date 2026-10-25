# Eclipse: Second Dawn for the Galaxy - Production Dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build assets
COPY . .
RUN bun run build

# Production Runner
FROM oven/bun:1-slim AS runner
WORKDIR /app

COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.html ./

# Directory for persistent tables, user accounts, and administrator hashes
RUN mkdir -p /app/server_data
VOLUME /app/server_data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "start"]
