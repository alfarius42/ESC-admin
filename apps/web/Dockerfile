FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --filter @esc-admin/web... --frozen-lockfile=false

COPY apps/web ./apps/web

EXPOSE 5174

CMD ["pnpm", "--filter", "@esc-admin/web", "dev"]
