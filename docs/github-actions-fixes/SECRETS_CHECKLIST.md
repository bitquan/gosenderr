# GitHub Actions Secrets Checklist

This checklist documents the secrets used by workflows in .github/workflows.

## Required Secrets

### Deploy (Manual) — .github/workflows/deploy.yml
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_MAPBOX_TOKEN
- GOOGLE_APPLICATION_CREDENTIALS_JSON

## Optional Secrets / Variables

### CI and Deploy (Trivy) — .github/workflows/ci-and-deploy.yml
- CODE_SCANNING_ENABLED (optional boolean flag to gate SARIF upload)

## Notes
- GOOGLE_APPLICATION_CREDENTIALS_JSON should be a service account JSON with deploy permissions.
- Values should match the target Firebase project (dev/staging/prod).
