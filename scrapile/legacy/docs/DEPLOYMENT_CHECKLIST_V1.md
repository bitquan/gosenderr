# Deployment Checklist - Customer V1 Flow

## Pre-Deployment

### 1. Build Verification

```bash
cd /workspaces/gosenderr/apps/web
pnpm build
```

Expected: Build completes without errors

### 2. Type Check

```bash
pnpm run type-check  # if available
# OR manually check
npx tsc --noEmit
```

Expected: No TypeScript errors

### 3. Environment Variables

Verify these are set in Cloud Build / Firebase environment:

- ✅ `NEXT_PUBLIC_MAPBOX_TOKEN` - Required for address autocomplete
- ✅ Firebase config variables (already configured)

## Deployment Steps

### Option 1: Cloud Run (Recommended)

```bash
cd /workspaces/gosenderr
./scripts/deploy-cloudrun-web.sh
```

### Option 2: Firebase Hosting with Cloud Run

```bash
# Deploy Cloud Run first
./scripts/deploy-cloudrun-web.sh

# Then deploy Firestore rules
firebase deploy --only firestore:rules

# Optionally redeploy hosting (if firebase.json changed)
pnpm dlx firebase-tools@13.24.1 deploy --only hosting
```

## Post-Deployment Verification

### 1. Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Expected output: `✔  firestore: released rules firestore.rules to cloud.firestore`

### 2. Smoke Test - Address Autocomplete

1. Navigate to: https://gosenderr.com/customer/jobs/new
2. Type "1600 Pennsylvania" in pickup field
3. Verify dropdown appears with suggestions
4. Select an address
5. Verify "✓ Address selected" appears
6. Repeat for dropoff
7. Submit job
8. Verify redirect to job details

### 3. Smoke Test - Job Cancellation

1. Create a new job (from step 2 above)
2. On job details page, verify "Cancel Job" button appears
3. Click "Cancel Job"
4. Confirm in dialog
5. Verify redirect to `/customer/jobs`
6. Re-open job, verify status shows "Cancelled"
7. Verify "Cancel Job" button no longer appears

### 4. Smoke Test - Job List

1. Navigate to: https://gosenderr.com/customer/jobs
2. Verify all jobs created by current user appear
3. Verify jobs show human-readable addresses (not lat/lng)
4. Click on a job → verify details page loads
5. Verify cancelled jobs show appropriate status pill

## Rollback Plan

If issues occur:

### 1. Revert Firestore Rules (if needed)

```bash
cd /workspaces/gosenderr
git log firebase/firestore.rules
# Copy previous version
git show <commit-hash>:firebase/firestore.rules > firebase/firestore.rules
firebase deploy --only firestore:rules
```

### 2. Revert Code Deployment

Cloud Run keeps previous revisions:

```bash
gcloud run services list
gcloud run revisions list --service gosenderr-web --region us-central1
gcloud run services update-traffic gosenderr-web \
  --to-revisions=<previous-revision-id>=100 \
  --region us-central1
```

Then redeploy Firebase Hosting to point to old revision:

```bash
pnpm dlx firebase-tools@13.24.1 deploy --only hosting
```

## Known Issues & Solutions

### Issue: "Mapbox token not found"

**Cause**: NEXT_PUBLIC_MAPBOX_TOKEN not set in build environment
**Solution**: Add to Cloud Build substitutions in `cloudbuild.web.yaml`

### Issue: Firestore permission denied on cancel

**Cause**: Rules not deployed or user not authenticated
**Solution**:

1. Verify `firebase deploy --only firestore:rules` succeeded
2. Check browser console for auth state
3. Verify token refresh if logged in for extended period

### Issue: Address autocomplete doesn't show

**Cause**: Network issue or Mapbox API down
**Solution**:

1. Check browser network tab for 401/403 errors (invalid token)
2. Check Mapbox dashboard for API quotas
3. Verify CORS if self-hosting

### Issue: Cancelled job still shows "Cancel Job" button

**Cause**: Cache issue or real-time listener not updating
**Solution**: Hard refresh (Ctrl+Shift+R) or check Firestore console for actual status

## Monitoring

After deployment, monitor:

1. **Firebase Console → Firestore**

   - Check for new jobs with `label` field in pickup/dropoff
   - Verify cancelled jobs have `status: 'cancelled'`

2. **Cloud Run Logs**

   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gosenderr-web" --limit 50 --format json
   ```

   - Look for any runtime errors in job creation/cancellation

3. **Mapbox Dashboard**
   - Monitor geocoding API usage
   - Verify no unusual spike in requests (indicates potential abuse)

## Success Criteria

- [ ] Build completes without errors
- [ ] Cloud Run deployment succeeds (revision 00005 or higher)
- [ ] Firestore rules deployed successfully
- [ ] Address autocomplete works on live site
- [ ] Job creation with addresses stores labels in Firestore
- [ ] Job cancellation works and enforces status rules
- [ ] Job list shows human-readable addresses
- [ ] No console errors on any customer pages
- [ ] Firestore security rules prevent unauthorized cancellation

## Contact

If deployment issues occur:

- Check logs: Cloud Run → Logs tab
- Check Firestore: Firebase Console → Firestore Database
- Review recent commits: `git log --oneline -10`
