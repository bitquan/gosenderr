# Courier V2 Checklist

## ✅ Completed
- Auth + feature flags gate
- Full-screen map shell + follow location
- Live jobs list + claim/advance flow
- Proof-of-delivery capture (photo + notes)
- Job detail sheet (contact + navigation)
- In-app job alerts (new job)
- Analytics/events logging (job lifecycle)
- Status sync to admin desktop
- Admin desktop Jobs realtime + job status card
- Admin trip status + courier location + ETA
- Mapbox fallback (static map) in admin desktop
- Courier location writer (Firestore)
- Online/Offline toggle + admin status updates
- Completed jobs history toggle
- Mock jobs set to Herndon area
- Bottom jobs panel collapsible

## 🔜 Next Up
1. Validate live jobs (non-mock) show when Firestore has open jobs
2. Error/empty states polish + loading skeletons
3. Cleanup: remove debug logs + finalize UI copy

## 🧪 Verification
- Claim → advance → complete updates admin desktop immediately
- Courier online/offline toggles reflect in admin desktop user detail
- Trip map displays (WebGL or static fallback)
- Location updates write to Firestore at ~5s/25m cadence
