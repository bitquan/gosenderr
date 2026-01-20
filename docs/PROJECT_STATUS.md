# Project Status

## Current
- Web app: Next.js (App Router) in `apps/web`
- Firebase: Auth/Firestore/Storage in project `gosenderr-6773f`
- Hosting: Firebase Hosting (custom domain) proxies to Cloud Run

## Deploy
- Cloud Run service: `gosenderr-web` (region `us-central1`)
- Firebase Hosting site: `gosenderr-6773f`

## Local commands
- Deploy Cloud Run: `pnpm deploy:web:run`
- Deploy Hosting: `pnpm deploy:web:hosting`
- Deploy both: `pnpm deploy:web`

