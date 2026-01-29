# Repository Secrets Checklist

## Firebase (E2E & Deploy)
- ✅ GOOGLE_APPLICATION_CREDENTIALS_JSON (present) — used for `gcloud`/Firebase authentication
- ✅ NEXT_PUBLIC_FIREBASE_API_KEY (present)
- ✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN (present)
- ✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID (present)
- ✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (present)
- ✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID (present)
- ✅ NEXT_PUBLIC_FIREBASE_APP_ID (present)

## Map / Third-party
- ✅ NEXT_PUBLIC_MAPBOX_TOKEN (present)
- ✅ WEB_PUSH_CERTIFICATES (present)

## Optional / New
- ❌ FIREBASE_SERVICE_ACCOUNT (missing) — not required if you use `GOOGLE_APPLICATION_CREDENTIALS_JSON` in the workflows.
- ❌ CODE_SCANNING_ENABLED — create a secret with value `true` to enable SARIF upload (optional). If not present, SARIF upload will be skipped.

## How to Add Secrets
1. Go to: https://github.com/bitquan/gosenderr/settings/secrets/actions
2. Click "New repository secret"
3. Name it (e.g. `GOOGLE_APPLICATION_CREDENTIALS_JSON`) and paste the JSON service account
4. Click "Add secret"

## Verification
- After adding or updating secrets, trigger a workflow run (e.g., create a small PR) and verify the job receives the expected secret in the logs (the actual value is never printed; instead verify steps that depend on the secret succeed).
