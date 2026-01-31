# Customer V1 Flow - Implementation Complete

## ✅ Completed Features

### 1. **Address-Based Job Creation**

- **Before**: Manual lat/lng input via text fields
- **After**: User-friendly address autocomplete with Mapbox Geocoding API
- **Files Updated**:
  - [apps/web/src/app/customer/jobs/new/page.tsx](apps/web/src/app/customer/jobs/new/page.tsx) - Replaced JobForm with AddressAutocomplete components
  - [apps/web/src/components/v2/AddressAutocomplete.tsx](apps/web/src/components/v2/AddressAutocomplete.tsx) ✨ NEW - Autocomplete dropdown with debounced search
  - [apps/web/src/lib/mapbox/geocode.ts](apps/web/src/lib/mapbox/geocode.ts) ✨ NEW - Mapbox Geocoding API helper

**Features**:

- 300ms debounced address search
- Dropdown with up to 5 suggestions
- Click-outside handling
- Visual feedback when address selected
- Preserves human-readable address in `label` field of GeoPoint

### 2. **Job Cancellation**

- **Capability**: Customers can cancel jobs if status is `open` or `assigned`
- **Files Updated**:
  - [apps/web/src/lib/v2/jobs.ts](apps/web/src/lib/v2/jobs.ts) - Added `cancelJob(jobId, userUid)` function
  - [apps/web/src/app/customer/jobs/[jobId]/page.tsx](apps/web/src/app/customer/jobs/[jobId]/page.tsx) - Added "Cancel Job" button with confirmation
  - [firebase/firestore.rules](firebase/firestore.rules) - Updated to enforce cancel rules server-side

**Validation**:

- Client-side: Only shows button if `status === 'open' || status === 'assigned'` AND user is creator
- Server-side (Firestore rules): Enforces same validation + updates `updatedAt` timestamp
- Requires confirmation dialog before cancelling

### 3. **Customer Jobs Hook**

- **Purpose**: Query all jobs created by the current customer
- **File Created**: [apps/web/src/hooks/v2/useCustomerJobs.ts](apps/web/src/hooks/v2/useCustomerJobs.ts) ✨ NEW
- **Usage**: Real-time subscription to jobs where `createdByUid == uid`, ordered by `createdAt desc`
- **File Updated**: [apps/web/src/app/customer/jobs/page.tsx](apps/web/src/app/customer/jobs/page.tsx) - Now uses `useCustomerJobs` instead of `useMyJobs`

### 4. **Type Safety Improvements**

- **GeoPoint type**: Already had optional `label?: string` field - now properly utilized for human-readable addresses
- **JobStatus type**: Already included `'cancelled'` status

## 📁 Files Modified

### Created (3 files)

1. `apps/web/src/lib/mapbox/geocode.ts` - Mapbox Geocoding API integration
2. `apps/web/src/components/v2/AddressAutocomplete.tsx` - Address search UI component
3. `apps/web/src/hooks/v2/useCustomerJobs.ts` - Customer job query hook

### Updated (5 files)

1. `apps/web/src/lib/v2/jobs.ts` - Added `cancelJob` function
2. `apps/web/src/app/customer/jobs/new/page.tsx` - Replaced manual coordinates with address autocomplete
3. `apps/web/src/app/customer/jobs/[jobId]/page.tsx` - Added cancel button with confirmation
4. `apps/web/src/app/customer/jobs/page.tsx` - Switched to `useCustomerJobs` hook
5. `firebase/firestore.rules` - Tightened cancellation rules (only `open` or `assigned`)

## 🔒 Security

### Firestore Rules

- Customers can **only cancel** their own jobs (enforced by `isCreator()` check)
- Cancellation **only allowed** when `status == 'open' || status == 'assigned'`
- Cannot modify other fields during cancellation (only `status` and `updatedAt`)
- Rule excerpt:
  ```
  (
    isCreator()
    && request.resource.data.status == 'cancelled'
    && (resource.data.status == 'open' || resource.data.status == 'assigned')
  )
  ```

### Client-Side Validation

- `cancelJob()` function checks:
  - Job exists
  - User is the creator (`createdByUid === userUid`)
  - Status is `'open'` or `'assigned'`
- Cancel button only visible when all conditions met
- Confirmation dialog prevents accidental cancellation

## 🧪 Testing Checklist

### Job Creation Flow

- [ ] Open `/customer/jobs/new`
- [ ] Type pickup address (e.g., "1600 Pennsylvania Ave")
- [ ] Select suggestion from dropdown
- [ ] See "✓ Address selected" confirmation
- [ ] Repeat for dropoff address
- [ ] Verify "Create Job" button enabled
- [ ] Submit form
- [ ] Verify redirect to job details page
- [ ] Check Firebase: Job document has `pickup.label` and `dropoff.label` fields

### Job Cancellation Flow

- [ ] Navigate to an **open** job details page
- [ ] Verify "Cancel Job" button appears next to status pill
- [ ] Click "Cancel Job"
- [ ] Verify confirmation dialog appears
- [ ] Cancel dialog → button remains
- [ ] Confirm cancellation → redirects to `/customer/jobs`
- [ ] Check Firebase: Job status updated to `'cancelled'`
- [ ] Re-open cancelled job → "Cancel Job" button should NOT appear

### Edge Cases

- [ ] Try cancelling job with `status === 'completed'` → button should not appear
- [ ] Try cancelling job created by another user → button should not appear
- [ ] Try cancelling job with `status === 'enroute_pickup'` → button should not appear

## 🚀 Next Steps (Not Implemented)

### Suggested Enhancements

1. **Job Pricing Display**: Show estimated fee on creation page (already has courier estimates panel)
2. **Push Notifications**: Notify customers when job status changes
3. **Job History Filtering**: Filter by status (completed, cancelled, etc.) in job list
4. **Edit Job Before Assignment**: Allow editing pickup/dropoff if status is still `open`
5. **Courier Rating**: Add rating system after job completion
6. **Multiple Items**: Support multiple pickup/dropoff locations in single job
7. **Scheduled Deliveries**: Add time picker for future pickup/delivery

## 📊 Database Impact

### Firestore Schema

No breaking changes. All updates are additive:

- `GeoPoint.label` - optional field, backward compatible
- `JobStatus === 'cancelled'` - already supported in type definition

### Index Requirements

Current query requires composite index (may already exist):

- Collection: `jobs`
- Fields: `createdByUid (Ascending)`, `createdAt (Descending)`
- Status: Auto-created on first query

If missing, Firebase will show error in console with auto-creation link.

## 🔑 Environment Variables

### Required

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

Already configured in `.env.local` for development and Cloud Build for production.

## 📝 Notes

- Address autocomplete requires active internet connection to Mapbox API
- Geocoding limited to 5 results per search to keep UI clean
- 300ms debounce prevents excessive API calls during typing
- Address labels stored as-is from Mapbox (includes full formatted address with city, state, zip)
- Cancel button uses `#dc2626` red to indicate destructive action
- Cancellation requires explicit confirmation to prevent accidents
