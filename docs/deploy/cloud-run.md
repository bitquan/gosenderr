# Cloud Run + Firebase Hosting Deployment Guide

This document provides exact steps for deploying the GoSenderr Next.js web application to Google Cloud Run with Firebase Hosting as the CDN layer.

## Architecture Overview

- **Next.js App**: Built as a standalone Docker container
- **Cloud Run**: Hosts the SSR application (dynamic routes, API routes)
- **Firebase Hosting**: CDN layer for static assets + custom domain (www.gosenderr.com)
- **Rewrite Rule**: Firebase Hosting rewrites all requests to Cloud Run backend

## Prerequisites

### Required Tools

```bash
# Verify installations
node --version      # >= 18.0.0
pnpm --version      # >= 8.0.0
gcloud --version    # Google Cloud SDK
docker --version    # Docker for local builds
```

### Install gcloud (if needed)

**macOS:**

```bash
brew install --cask google-cloud-sdk
gcloud init
```

**Linux:**

```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Authentication

```bash
# Login to Google Cloud
gcloud auth login
gcloud config set project gosenderr-6773f

# Login to Firebase
pnpm dlx firebase-tools@15.2.1 login

# Configure Docker for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Environment Variables

The deployment script `scripts/deploy-cloudrun-web.sh` reads `apps/web/.env.local` and passes `NEXT_PUBLIC_*` values into Cloud Build as Docker build args. This is required so `next build` can embed Firebase/Mapbox configuration into the client bundle.

Ensure `apps/web/.env.local` contains:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=<your-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gosenderr-6773f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gosenderr-6773f.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>
NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token>
```

## Deployment Process

### Step 1: Deploy to Cloud Run

From repo root:

```bash
pnpm deploy:web:run
```

This script (`scripts/deploy-cloudrun-web.sh`) performs:

1. **Build the Next.js app** in standalone mode
2. **Build Docker image** using `apps/web/Dockerfile`
3. **Push image** to Google Artifact Registry
4. **Deploy to Cloud Run** with proper configuration

**Expected Output:**

```
Service [gosenderr-web] revision [gosenderr-web-00001-xxx] has been deployed
and is serving 100 percent of traffic.
Service URL: https://gosenderr-web-xxxxx-uc.a.run.app
```

### Step 2: Deploy to Firebase Hosting

Deploy the hosting configuration and rewrite rules:

```bash
pnpm deploy:web:hosting
```

This deploys the Firebase Hosting configuration defined in `firebase.json`, which includes:

- Serving static assets from `public/`
- Rewriting all dynamic routes to Cloud Run backend
- Custom domain configuration (www.gosenderr.com)

**Expected Output:**

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/gosenderr-6773f/overview
Hosting URL: https://gosenderr-6773f.web.app
```

### Step 3: Combined Deployment (Recommended)

For a complete deployment in one command:

```bash
pnpm deploy:web
```

This runs both `deploy:web:run` and `deploy:web:hosting` sequentially.

## Verification Steps

After deployment, verify everything works:

### 1. Check Cloud Run Service

```bash
# Get service details
gcloud run services describe gosenderr-web --region us-central1 --project gosenderr-6773f

# Test Cloud Run URL directly
curl https://gosenderr-web-xxxxx-uc.a.run.app/v2/login
```

### 2. Check Firebase Hosting URLs

Visit the following URLs and verify they work:

- ✅ **Firebase Hosting URL**: https://gosenderr-6773f.web.app/
- ✅ **Custom Domain**: https://www.gosenderr.com/
- ✅ **Root Redirect**: Both should redirect to `/v2/login`
- ✅ **Dynamic Routes**: Test `/v2/customer/jobs/[jobId]` (should render properly)
- ✅ **API Routes**: Test `/api/health` or similar endpoints

### 3. Verify Rewrite Rules

Check that Firebase Hosting is correctly proxying to Cloud Run:

```bash
# Should return Cloud Run response headers
curl -I https://www.gosenderr.com/v2/login
```

Look for headers like:

- `x-cloud-trace-context` (indicates Cloud Run backend)
- `x-powered-by: Next.js` (confirms Next.js is serving)

## Troubleshooting

### Build Errors

**Issue**: Next.js build fails with TypeScript errors

```bash
# Fix: Run lint and typecheck first
cd apps/web
pnpm lint
pnpm build
```

**Issue**: Docker build fails with dependency errors

```bash
# Fix: Clear Docker cache and rebuild
docker builder prune
cd apps/web
docker build --no-cache -t us-central1-docker.pkg.dev/gosenderr-6773f/gosenderr/web:latest .
```

### Deployment Errors

**Issue**: `gcloud run deploy` fails with permission errors

```bash
# Fix: Ensure proper IAM roles
gcloud projects add-iam-policy-binding gosenderr-6773f \
  --member="user:your-email@gmail.com" \
  --role="roles/run.admin"
```

**Issue**: Firebase Hosting deploy fails

```bash
# Fix: Re-authenticate
pnpm dlx firebase-tools@15.2.1 login --reauth
pnpm dlx firebase-tools@15.2.1 use gosenderr-6773f
```

### Runtime Errors

**Issue**: 404 errors for dynamic routes

- **Cause**: Firebase rewrite rules not configured correctly
- **Fix**: Verify `firebase.json` has proper rewrite configuration (see below)

**Issue**: Environment variables not set in Cloud Run

```bash
# Fix: Update Cloud Run service with env vars
gcloud run services update gosenderr-web \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production" \
  --project gosenderr-6773f
```

**Issue**: Cold start timeouts

```bash
# Fix: Increase Cloud Run timeout and min instances
gcloud run services update gosenderr-web \
  --region us-central1 \
  --timeout=60 \
  --min-instances=1 \
  --project gosenderr-6773f
```

## Configuration Files

### firebase.json

The hosting configuration should look like:

```json
{
  "hosting": {
    "site": "gosenderr-6773f",
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "gosenderr-web",
          "region": "us-central1"
        }
      }
    ]
  }
}
```

### package.json Scripts

Root `package.json` should contain:

```json
{
  "scripts": {
    "deploy:web:run": "bash scripts/deploy-cloudrun-web.sh",
    "deploy:web:hosting": "pnpm dlx firebase-tools@15.2.1 deploy --only hosting:gosenderr-6773f --project gosenderr-6773f --non-interactive",
    "deploy:web": "pnpm deploy:web:run && pnpm deploy:web:hosting"
  }
}
```

## Monitoring and Logs

### View Cloud Run Logs

```bash
# Stream logs
gcloud run services logs tail gosenderr-web --region us-central1 --project gosenderr-6773f

# View in Cloud Console
https://console.cloud.google.com/run/detail/us-central1/gosenderr-web/logs
```

### View Firebase Hosting Logs

Firebase Console:
https://console.firebase.google.com/project/gosenderr-6773f/hosting/sites

## Quick Reference

```bash
# Full deployment (recommended)
pnpm deploy:web

# Individual steps
pnpm deploy:web:run           # Cloud Run only
pnpm deploy:web:hosting       # Firebase Hosting only

# Check status
gcloud run services list --project gosenderr-6773f
pnpm dlx firebase-tools@15.2.1 hosting:sites:list --project gosenderr-6773f

# View logs
gcloud run services logs tail gosenderr-web --region us-central1

# Rollback (if needed)
gcloud run services update-traffic gosenderr-web \
  --to-revisions=gosenderr-web-00001-xxx=100 \
  --region us-central1
```

## Expected Behavior

After running `pnpm deploy:web`:

✅ https://gosenderr-6773f.web.app/ loads the Next app  
✅ https://www.gosenderr.com/ loads the Next app  
✅ Root redirects to `/v2/login`  
✅ Dynamic routes work (e.g., `/v2/customer/jobs/[jobId]`)  
✅ API routes respond correctly

## CI/CD Integration (Optional)

Once local deployment works, you can update GitHub Actions to automate deployments on push to `main`. See the main project documentation for GitHub Actions workflow examples.
