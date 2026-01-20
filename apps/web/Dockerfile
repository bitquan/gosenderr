# Production container for Next.js SSR on Cloud Run
# Build context is repo root (monorepo).

FROM node:20-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

# Copy only what we need for dependency graph + caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile


FROM node:20-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

# Build-time public env (embedded into the client bundle)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_AUTH_FALLBACK_EMAIL

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
	NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
	NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
	NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
	NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
	NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
	NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN \
	NEXT_PUBLIC_AUTH_FALLBACK_EMAIL=$NEXT_PUBLIC_AUTH_FALLBACK_EMAIL

COPY --from=deps /app/ /app/

# Copy source
COPY apps/web/ apps/web/
COPY packages/shared/ packages/shared/

# Build shared first, then Next
RUN pnpm -C packages/shared build
RUN pnpm -C apps/web build


FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

COPY --from=builder /app/ /app/

EXPOSE 8080
CMD ["sh", "-c", "pnpm -C apps/web start -p ${PORT:-8080}"]
