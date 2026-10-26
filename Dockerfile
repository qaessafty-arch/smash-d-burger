# Smashed Burger ordering system: build once, run anywhere that runs containers.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/restaurant.db \
    UPLOAD_DIR=/data/uploads
COPY --from=build /app /app
# Orders, menu edits and uploaded photos live here. Attach a persistent volume at /data.
VOLUME /data
EXPOSE 3000
CMD ["pnpm", "start", "-p", "3000"]
