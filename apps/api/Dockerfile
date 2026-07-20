FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/license-signing/package.json ./packages/license-signing/package.json
COPY packages/license-signing/tsconfig.json ./packages/license-signing/tsconfig.json

RUN pnpm install --filter @esc-admin/api... --frozen-lockfile=false

COPY packages/license-signing ./packages/license-signing
RUN pnpm --filter @esc-admin/license-signing build

COPY apps/api ./apps/api

EXPOSE 4000

CMD ["pnpm", "--filter", "@esc-admin/api", "dev"]
