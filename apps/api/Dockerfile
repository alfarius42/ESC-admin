FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --filter @esc-admin/api... --frozen-lockfile=false

COPY apps/api ./apps/api

EXPOSE 4000

CMD ["pnpm", "--filter", "@esc-admin/api", "dev"]
