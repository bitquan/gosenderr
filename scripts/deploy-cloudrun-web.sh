#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="gosenderr-6773f"
REGION="us-central1"
SERVICE_NAME="gosenderr-web"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
ENV_FILE="apps/web/.env.local"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required but was not found."
  echo "Install: https://cloud.google.com/sdk/docs/install"
  echo "macOS (Homebrew): brew install --cask google-cloud-sdk"
  echo "Then run: gcloud init"
  exit 1
fi

# Ensure we're targeting the right project

gcloud config set project "$PROJECT_ID" >/dev/null

# Helpful sanity check (won't fail the deploy if auth is already handled elsewhere)
if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n 1 | grep -q .; then
  echo "No active gcloud auth detected. Run: gcloud auth login"
fi

# Build container image in Cloud Build using the monorepo Dockerfile

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Create it from apps/web/.env.local.example (or .env.example) before deploying."
  exit 1
fi

# Load NEXT_PUBLIC_* env vars for build-time embedding (Firebase config is public)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required_vars=(
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_PROJECT_ID
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  NEXT_PUBLIC_FIREBASE_APP_ID
)

missing=0
for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "Missing required env var in $ENV_FILE: $v"
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

substitutions=(
  "_NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}"
  "_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}"
  "_NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}"
  "_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}"
  "_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}"
  "_NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}"
  "_NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN:-}"
  "_NEXT_PUBLIC_AUTH_FALLBACK_EMAIL=${NEXT_PUBLIC_AUTH_FALLBACK_EMAIL:-false}"
)

substitutions_arg=$(IFS=, ; echo "${substitutions[*]}")

echo "Building image via Cloud Build: $IMAGE"
gcloud builds submit \
  --project "$PROJECT_ID" \
  --config cloudbuild.web.yaml \
  --substitutions "$substitutions_arg" \
  .

# Deploy to Cloud Run

echo "Deploying Cloud Run service: $SERVICE_NAME ($REGION)"
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --allow-unauthenticated

echo "Cloud Run deploy complete."