# Delivery Request Flow Implementation

## Overview
This implementation creates a complete delivery request flow for the GoSenderr platform, allowing customers to request delivery for marketplace items with intelligent courier matching and pricing.

## Files Created

### 1. Helper Functions

#### `/apps/web/src/lib/pricing/isPeakHour.ts`
- `getPeakMultiplier()`: Checks if current time falls within any peak hour window
- `isPeakHour()`: Boolean check for peak hours
- Handles day-of-week and time range matching
- Used for food delivery surge pricing

#### `/apps/web/src/lib/pricing/calculateCourierRate.ts`
- `calculateCourierRate()`: Main pricing calculation function
- Handles both package and food delivery pricing
- Applies different pricing rules:
  - **Packages**: Base fare + per-mile + per-minute charges
  - **Food**: Base fare + per-mile + peak multiplier (if applicable)
- Returns detailed breakdown with courier earnings and platform fees
- Platform fees: $2.50 for packages, $1.50 for food

### 2. Components

#### `/apps/web/src/components/v2/CourierSelector.tsx`
- Reusable component for displaying available couriers
- Features:
  - Courier profile display (photo, name, rating, deliveries)
  - Vehicle type icons and details
  - Equipment badges for approved equipment
  - Rate breakdown display (base fare, per-mile, time charges, peak multipliers)
  - Distance from pickup location
  - Selection state with visual feedback
  - Mobile-responsive design
- Sorts couriers by price (cheapest first)
- Empty state when no couriers available

### 3. Main Page

#### `/apps/web/src/app/customer/request-delivery/page.tsx`
Complete delivery request flow with 6 steps:

**Step 1: Load Item**
- Reads `itemId` from URL query params
- Loads item from Firestore `items/{itemId}`
- Displays item summary with photo, title, price, pickup address
- Shows food temperature badge if applicable

**Step 2: Dropoff Address Input**
- Mapbox autocomplete address search
- Validates and stores selected address with coordinates

**Step 3: Calculate Distance & Duration**
- Uses Haversine formula (via `calcMiles()`)
- Estimates duration at 30 mph average speed
- Displays distance and estimated time

**Step 4: Find Available Couriers**
- Queries Firestore for active couriers (rating >= 3.5)
- Filters by:
  - Work mode (foodEnabled/packagesEnabled)
  - Service radius (distance from courier to pickup)
  - Equipment requirements (for food items):
    - Cooler if `requiresCooler`
    - Hot bag or insulated bag if `requiresHotBag`
    - Drink carrier if `requiresDrinkCarrier`
- Calculates rates for each eligible courier
- Sorts by total price (cheapest first)

**Step 5: Display & Select Courier**
- Shows all available couriers with details
- User selects preferred courier
- Displays "searching" state while loading

**Step 6: Confirm & Proceed**
- Shows order summary:
  - Courier earnings
  - Platform fee
  - Total delivery cost
- Stores delivery data in sessionStorage
- Navigates to payment page with itemId and courierId

## Authentication & Authorization
- Auth-gated page (redirects to login if not authenticated)
- Uses `useAuthUser()` hook
- Redirect URL preserves itemId parameter

## Technical Details

### State Management
- Uses React hooks for local state
- Session storage for payment page data handoff
- No global state required

### Data Flow
1. URL params → Item loading
2. Address selection → Distance calculation
3. Distance → Courier search & filtering
4. Courier selection → Rate calculation
5. Confirmation → Payment navigation

### Error Handling
- Loading states for async operations
- Error messages for missing/invalid data
- Empty states for no available couriers
- Firebase error handling

### Styling
- Inline styles following existing patterns
- Mobile-responsive design
- Consistent color scheme
- Interactive hover states

## Integration Points

### Existing Code Used
- `@gosenderr/shared` types: ItemDoc, UserDoc, CourierProfile, etc.
- `calcMiles()` from `/lib/v2/pricing.ts` for Haversine distance
- `AddressAutocomplete` component for Mapbox integration
- `useAuthUser()` hook for authentication
- Firebase Firestore for data queries

### Future Integration Needed
- Payment page (`/customer/checkout`) to handle payment
- Delivery job creation after successful payment
- Real-time courier location tracking

## Example Usage

1. User browses marketplace and finds item
2. Clicks "Request Delivery" button → navigates to `/customer/request-delivery?itemId={id}`
3. User enters delivery address
4. System finds and displays available couriers
5. User selects courier
6. User proceeds to payment
7. (Future) After payment, delivery job is created

## Environment Variables Required
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_MAPBOX_TOKEN` (for AddressAutocomplete)

## Security Considerations
- Authentication required before access
- Firestore security rules should validate:
  - User can only request delivery for available items
  - Courier profiles are read-only to customers
  - Rate calculations can be verified server-side before payment
- No sensitive data exposed in client-side code
- API keys are environment variables

## Testing Recommendations
1. Test with various item types (food vs packages)
2. Test equipment requirement filtering
3. Test peak hours pricing for food items
4. Test with no available couriers
5. Test service radius filtering
6. Test distance calculations
7. Test authentication redirect flow
8. Mobile responsiveness testing

## Performance Notes
- Courier query could be optimized with geohashing
- Consider caching courier data for repeat requests
- Distance calculations happen client-side (no API calls)
- Rate calculations are synchronous and fast

## Future Enhancements
- Real-time courier availability updates
- Multiple courier selection (backup couriers)
- Scheduled delivery options
- Delivery time estimates based on courier location
- Courier acceptance/rejection handling
- Tip amount selection
- Save favorite addresses
