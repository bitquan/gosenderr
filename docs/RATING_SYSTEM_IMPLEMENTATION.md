# Rating System Implementation Summary

## Overview
This implementation adds a complete rating system to the GoSenderr delivery platform, allowing customers and couriers to rate each other after delivery completion.

## Components Implemented

### 1. RatingModal Component
**File:** `apps/web/src/components/v2/RatingModal.tsx`

A fully accessible modal component for submitting ratings with:
- **Overall star rating** (1-5 stars, required, large 48px tap targets)
- **Category ratings** (optional, 32px tap targets):
  - Professionalism (1-5)
  - Timeliness (1-5)
  - Care with item (for couriers) or Communication (for customers) (1-5)
- **Review textarea** (optional, max 500 characters with counter)
- **Accessibility features:**
  - ESC key to close
  - Focus trap within modal
  - Backdrop click to close
  - Body scroll prevention when open
- **State management:**
  - Loading states during submission
  - Error handling with user-friendly messages
  - Automatic state reset on close
  - Submit button disabled until overall rating selected

### 2. Rating Submission Logic
**File:** `apps/web/src/lib/ratings/submitRating.ts`

Client-side function to submit ratings with comprehensive validation:
- **Validation rules:**
  - Stars must be between 1-5
  - Review max 500 characters
  - Category ratings between 1-5 (if provided)
  - Prevents duplicate ratings per delivery
- **Firestore integration:**
  - Creates rating document in `ratings` collection
  - Triggers Cloud Function for aggregation

### 3. Cloud Function - enforceRatings
**File:** `firebase/functions/src/triggers/enforceRatings.ts`

Server-side trigger that runs when a rating is created:
- **Rating aggregation:**
  - Queries all ratings for the rated user
  - Calculates average rating
  - Updates user document with `averageRating` and `totalRatings`
- **Automatic courier suspension:**
  - Triggers when courier has >= 5 ratings and average < 3.5
  - Updates `courierProfile.status` to 'suspended'
  - Creates dispute document with:
    - Type: 'low_rating_suspension'
    - Status: 'open'
    - Includes average rating and count
    - Ready for admin review

### 4. Display Helpers
**File:** `apps/web/src/lib/ratings/displayRating.ts`

Utility functions for rendering ratings:
- **formatRatingDisplay()** - Full format: "★★★★☆ (4.8 • 127 ratings)"
- **getStarDisplay()** - Star symbols only: "★★★★☆"
- **renderStars()** - Data for rendering stars with custom colors/sizes

### 5. Export Index
**File:** `apps/web/src/lib/ratings/index.ts`

Central export point for all rating utilities.

### 6. Documentation
**File:** `docs/RATING_SYSTEM_USAGE.md`

Comprehensive usage guide with:
- Integration examples for customer and courier flows
- Error handling patterns
- Display examples
- Cloud function behavior explanation
- Firestore structure documentation

## Integration Points

### Customer Rating Flow
After delivery completion on tracking page:
```tsx
<RatingModal
  show={showRatingModal}
  targetUser={{ uid: courierId, displayName: courierName, role: 'courier' }}
  targetRole="customer_to_courier"
  deliveryJobId={jobId}
  onSubmit={handleSubmit}
  onClose={handleClose}
/>
```

### Courier Rating Flow
After job completion in courier app:
```tsx
<RatingModal
  show={showRatingModal}
  targetUser={{ uid: customerId, displayName: customerName, role: 'customer' }}
  targetRole="courier_to_customer"
  deliveryJobId={jobId}
  onSubmit={handleSubmit}
  onClose={handleClose}
/>
```

### Display in Listings
```tsx
import { formatRatingDisplay } from '@/lib/ratings';

<p>{formatRatingDisplay(user.averageRating, user.totalRatings)}</p>
```

## Data Flow

1. **User submits rating** → RatingModal calls onSubmit callback
2. **onSubmit handler** → Calls submitRating() with rating data
3. **submitRating()** → Validates and creates Firestore document in `ratings` collection
4. **Cloud Function triggers** → enforceRatings runs on document create
5. **Aggregation** → Function calculates average and updates user document
6. **Suspension check** → If courier meets criteria, updates status and creates dispute
7. **UI updates** → User sees updated rating, suspended courier receives notification

## Firestore Collections

### ratings
```typescript
{
  deliveryJobId: string;
  fromUserId: string;
  toUserId: string;
  role: 'customer_to_courier' | 'courier_to_customer';
  stars: number; // 1-5
  review?: string;
  categories?: {
    professionalism?: number;
    timeliness?: number;
    communication?: number;
    care?: number;
  };
  createdAt: Timestamp;
}
```

### users (updated fields)
```typescript
{
  averageRating: number; // 0-5
  totalRatings: number;
  totalDeliveries: number;
}
```

### disputes (for suspensions)
```typescript
{
  type: 'low_rating_suspension';
  courierId: string;
  averageRating: number;
  totalRatings: number;
  status: 'open';
  reason: string;
  createdAt: Timestamp;
}
```

## Security & Validation

### Client-side
- Stars validation (1-5)
- Review length (max 500 chars)
- Category ratings validation
- Duplicate rating check

### Server-side (Cloud Function)
- Runs in secure Firebase environment
- Calculates ratings from all documents (tamper-proof)
- Automatic suspension enforcement
- Creates audit trail via dispute documents

## Testing Considerations

### Unit Tests Needed
- RatingModal component rendering
- Star selection logic
- Form validation
- submitRating validation logic

### Integration Tests Needed
- Cloud Function rating aggregation
- Suspension trigger logic
- Duplicate rating prevention

### Manual Testing Scenarios
1. Submit rating as customer
2. Submit rating as courier
3. Try to submit duplicate rating
4. Submit with only required fields
5. Submit with all optional fields
6. Test courier suspension at 5 ratings < 3.5
7. Verify rating display in various contexts

## Future Enhancements
- Add reply functionality for rated users
- Show rating breakdown by category
- Add rating filters (recent, high, low)
- Enable editing ratings within time window
- Add rating reminders/prompts
- Show rating trends over time
- Add photos to reviews

## Performance Considerations
- Cloud Function uses single query per rating
- Duplicate check uses indexed query
- Minimal UI re-renders via controlled state
- Modal uses CSS for animations (no JS libraries)

## Accessibility
- ARIA labels on star buttons
- Keyboard navigation (Tab, ESC)
- Focus trap in modal
- Color contrast compliance
- 44px+ tap targets on mobile
- Screen reader friendly

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Android)
- No IE11 support needed (Next.js 15)
