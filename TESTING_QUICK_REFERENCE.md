# Quick Test Links

**Dev Server:** http://localhost:3000

## Test Flow URLs (in order)

1. **Start Here** (will redirect to login):  
   http://localhost:3000/customer/jobs

2. **Login Page:**  
   http://localhost:3000/login

3. **Select Role** (after signup):  
   http://localhost:3000/select-role

4. **Jobs List** (customer home):  
   http://localhost:3000/customer/jobs

5. **Create New Job:**  
   http://localhost:3000/customer/jobs/new

6. **Job Detail** (replace {jobId} with actual ID):  
   http://localhost:3000/customer/jobs/{jobId}

---

## Test Coordinates

Use these coordinates in San Francisco area:

### Pickup
```
Latitude: 37.7749
Longitude: -122.4194
Label: Downtown SF
```

### Dropoff
```
Latitude: 37.8044
Longitude: -122.2712
Label: Oakland
```

### Driver Location (for Firebase Console testing)
```json
{
  "lat": 37.7849,
  "lng": -122.4094
}
```

---

## Firebase Console

**Project:** gosenderr-6773f  
**Console URL:** https://console.firebase.google.com/project/gosenderr-6773f

### Collections to Check
1. **users** - Check user role after signup
2. **jobs** - View created jobs, manually update for testing

### Test Updates (in jobs/{jobId}):
```json
{
  "assignedDriverUid": "test_driver_123",
  "status": "assigned",
  "driverLocation": {
    "lat": 37.7849,
    "lng": -122.4094
  }
}
```

---

## Expected Behavior

### Before Login
- Any `/customer/*` route → redirects to `/login`

### After Login (no role)
- Redirects to `/select-role`

### After Selecting "Customer"
- Redirects to `/customer/jobs`
- Can create jobs
- Can view job details
- Real-time updates work

### After Selecting "Driver"
- Redirects to `/driver-not-implemented`

---

## Status Colors

- 🟠 **Orange** - open, idle
- 🔵 **Blue** - assigned, enroute, arrived
- 🟢 **Green** - completed

---

## Quick Troubleshooting

### "Mapbox token not configured"
- Check `apps/web/.env.local` has `NEXT_PUBLIC_MAPBOX_TOKEN`

### "Firestore composite index required"
- Click the link in the error message to auto-create index
- Or manually create index: collection=jobs, fields=[createdByUid ASC, createdAt DESC]

### "Job not found" on detail page
- Verify job ID in URL matches Firestore document ID
- Check Firestore console for actual job documents

### Auth redirects not working
- Clear browser storage: DevTools → Application → Clear site data
- Restart dev server: `pnpm dev`

---

## Keyboard Shortcuts (Browser DevTools)

- **Open DevTools:** `Cmd+Option+I` (Mac) / `F12` (Windows)
- **Clear Storage:** DevTools → Application → Storage → Clear site data
- **Network Tab:** See Firestore API calls
- **Console:** Check for errors

---

## Next Steps After Testing

1. ✅ Verify auth flow works
2. ✅ Verify job creation works
3. ✅ Verify realtime updates work
4. ✅ Verify map displays correctly
5. ✅ Verify driver marker updates in realtime
6. 📝 Document any issues found
7. 🚀 Ready for staging deployment!
