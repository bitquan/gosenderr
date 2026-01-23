# Firebase Hosting Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the GoSenderR web app to Firebase Hosting from the command line. **No git automation or Vercel is required** - all deployments are done manually via CLI.

## Prerequisites

1. **Node.js** version 18+ installed
2. **pnpm** version 8+ installed  
3. **Firebase CLI** installed globally: `npm install -g firebase-tools`
4. **Firebase project access**: Must be authenticated with `firebase login`

## Current Configuration

### Project Structure
```
apps/web/          # Next.js web application
  ├── src/         # Application source code  
  ├── package.json # Dependencies
  ├── package-lock.json # NPM lock file (required for Firebase)
  ├── .npmrc       # Package manager config (commented out for deploy)
  └── next.config.js

firebase.json      # Firebase hosting configuration
```

### Firebase Configuration (`firebase.json`)
```json
{
  "hosting": {
    "site": "gosenderr-6773f",
    "source": "apps/web",
    "ignore": ["firebase.json", "**/node_modules/**"],
    "frameworksBackend": {
      "region": "us-central1",
      "runtime": "nodejs20"
    }
  }
}
```

## Known Issues & Fixes

### Issue: `npm ci` requires package-lock.json

**Problem**: Firebase's Cloud Functions build uses `npm ci` which requires a `package-lock.json` file, but the project uses pnpm.

**Solution**:
1. Generate `package-lock.json` in `apps/web/`:
   ```bash
   cd apps/web
   npm install --lockfile-version=2 --ignore-scripts --package-lock-only
   ```

2. Comment out `package-manager=pnpm` in `apps/web/.npmrc`:
   ```properties
   # package-manager=pnpm
   # Commented out for Firebase Hosting deployment
   ```

3. Keep the ignore pattern minimal in `firebase.json` (don't ignore `**/.*` which would ignore `.npmrc`)

### Issue: SWC Dependencies Missing

**Warning**: You may see `Failed to patch lockfile, please try uninstalling and reinstalling next in this workspace`. This is a warning and won't prevent deployment.

## Deployment Steps

### 1. Ensure You're Logged In
```bash
firebase login
```

### 2. Navigate to Project Root
```bash
cd /path/to/gosenderr
```

### 3. Build Locally (Optional - Firebase will rebuild)
```bash
cd apps/web
pnpm build
cd ../..
```

### 4. Deploy to Firebase Hosting
```bash
# From project root
pnpm deploy:web:hosting
```

Or directly:
```bash
firebase deploy --only hosting:gosenderr-6773f --project gosenderr-6773f --non-interactive
```

### 5. Monitor Deployment
The deployment process includes:
1. **Local build** (if not already built)
2. **Upload to Cloud Storage** (~75MB function package)
3. **Cloud Build** (Cloud Functions for SSR)
4. **Static file upload** (~167 files)
5. **Function deployment** (2-3 minutes)

**Expected output**:
```
✓ Compiled successfully
✓ Generating static pages
✓ hosting[gosenderr-6773f]: file upload complete
✓ functions[ssrgosenderr6773f]: Successful update operation
```

### 6. Verify Deployment
Check your site at:
- Firebase URL: `https://gosenderr-6773f.web.app`
- Firebase URL (alt): `https://gosenderr-6773f.firebaseapp.com`

## Troubleshooting

### Build Fails with "lockfileVersion >= 1" Error
- Ensure `package-lock.json` exists in `apps/web/`
- Verify `lockfileVersion` is 2 or higher:
  ```bash
  head -5 apps/web/package-lock.json
  ```
- Regenerate if needed:
  ```bash
  cd apps/web
  rm package-lock.json
  npm install --lockfile-version=2 --ignore-scripts --package-lock-only
  ```

### Deployment Takes Too Long
Firebase's Next.js SSR deployment can take 5-10 minutes due to Cloud Functions. For faster deploys, consider migrating to Vite (see `VITE_MIGRATION_PLAN.md`).

### Function Deployment Fails
- Check Cloud Build logs in the error output URL
- Verify Node version compatibility (currently nodejs20)
- Check Cloud Functions quotas in Firebase Console

### Static Files Not Updating
- Clear Firebase Hosting cache:
  ```bash
  firebase hosting:channel:delete preview
  ```
- Force refresh browser cache (Cmd+Shift+R on Mac)

## Deployment Scripts

### Available Commands (from project root):
```bash
# Deploy only hosting
pnpm deploy:web:hosting

# Deploy Cloud Run (if needed)
pnpm deploy:web:run

# Deploy both Cloud Run and Hosting
pnpm deploy:web
```

## Maintenance

### Updating Dependencies
```bash
cd apps/web
pnpm update
npm install --package-lock-only  # Regenerate lock file
```

### Updating Firebase Configuration
Edit `firebase.json` in project root. Changes take effect on next deploy.

### Rolling Back
Firebase Hosting keeps previous versions. To rollback:
```bash
firebase hosting:clone gosenderr-6773f:PREVIOUS_VERSION_ID gosenderr-6773f:live
```

## Next Steps: Vite Migration

For faster builds and simpler deployments, consider migrating from Next.js to Vite. See `VITE_MIGRATION_PLAN.md` for detailed migration strategy.

### Benefits of Vite:
- ⚡ 10x faster build times (30s vs 5min)
- 📦 Simpler static export (no Cloud Functions)
- 🎯 Better control over bundle size
- 🔧 Easier to debug and maintain

---

**Last Updated**: January 23, 2026
**Maintained By**: Dev Team
