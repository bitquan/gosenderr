# Rating System Usage Examples

## 1. Using RatingModal in a Component

```tsx
'use client';

import { useState } from 'react';
import { RatingModal } from '@/components/v2/RatingModal';
import { submitRating } from '@/lib/ratings';
import { useAuth } from '@/hooks/useAuth'; // Assuming this exists

export function DeliveryComplete({ deliveryJob }) {
  const { user } = useAuth();
  const [showRatingModal, setShowRatingModal] = useState(false);

  const handleRatingSubmit = async (rating) => {
    await submitRating({
      deliveryJobId: deliveryJob.id,
      fromUserId: user.uid,
      toUserId: deliveryJob.courierId,
      role: 'customer_to_courier',
      stars: rating.stars,
      review: rating.review,
      categories: rating.categories,
    });
  };

  return (
    <div>
      <h2>Delivery Complete!</h2>
      <button onClick={() => setShowRatingModal(true)}>
        Rate Courier
      </button>

      <RatingModal
        show={showRatingModal}
        targetUser={{
          uid: deliveryJob.courierId,
          displayName: deliveryJob.courierName,
          role: 'courier',
        }}
        targetRole="customer_to_courier"
        deliveryJobId={deliveryJob.id}
        onSubmit={handleRatingSubmit}
        onClose={() => setShowRatingModal(false)}
      />
    </div>
  );
}
```

## 2. Displaying User Ratings

```tsx
import { formatRatingDisplay } from '@/lib/ratings';

export function CourierProfile({ courier }) {
  return (
    <div>
      <h3>{courier.displayName}</h3>
      <p>{formatRatingDisplay(courier.averageRating, courier.totalRatings)}</p>
      {/* Output: "★★★★☆ (4.8 • 127 ratings)" or "No ratings yet" */}
    </div>
  );
}
```

## 3. Courier Rating Customer (Reverse Rating)

```tsx
'use client';

import { useState } from 'react';
import { RatingModal } from '@/components/v2/RatingModal';
import { submitRating } from '@/lib/ratings';
import { useAuth } from '@/hooks/useAuth';

export function CourierJobComplete({ deliveryJob }) {
  const { user } = useAuth();
  const [showRatingModal, setShowRatingModal] = useState(false);

  const handleRatingSubmit = async (rating) => {
    await submitRating({
      deliveryJobId: deliveryJob.id,
      fromUserId: user.uid,
      toUserId: deliveryJob.customerId,
      role: 'courier_to_customer',
      stars: rating.stars,
      review: rating.review,
      categories: rating.categories,
    });
  };

  return (
    <div>
      <h2>Job Complete!</h2>
      <button onClick={() => setShowRatingModal(true)}>
        Rate Customer
      </button>

      <RatingModal
        show={showRatingModal}
        targetUser={{
          uid: deliveryJob.customerId,
          displayName: deliveryJob.customerName,
          role: 'customer',
        }}
        targetRole="courier_to_customer"
        deliveryJobId={deliveryJob.id}
        onSubmit={handleRatingSubmit}
        onClose={() => setShowRatingModal(false)}
      />
    </div>
  );
}
```

## 4. Displaying Stars Only

```tsx
import { getStarDisplay } from '@/lib/ratings';

export function StarRating({ rating }) {
  return <span style={{ color: '#fbbf24' }}>{getStarDisplay(rating)}</span>;
}

// Usage:
<StarRating rating={4.5} />
// Output: ★★★★⯨
```

## 5. Error Handling

```tsx
const handleRatingSubmit = async (rating) => {
  try {
    await submitRating({
      deliveryJobId: deliveryJob.id,
      fromUserId: user.uid,
      toUserId: deliveryJob.courierId,
      role: 'customer_to_courier',
      stars: rating.stars,
      review: rating.review,
      categories: rating.categories,
    });
    
    // Success - show success message
    alert('Rating submitted successfully!');
  } catch (error) {
    // Handle specific errors
    if (error.message.includes('already rated')) {
      alert('You have already rated this delivery');
    } else {
      alert('Failed to submit rating. Please try again.');
    }
  }
};
```

## Cloud Function Behavior

The `enforceRatings` cloud function automatically:

1. **Updates user statistics** when a rating is created
   - Calculates average rating across all ratings
   - Updates `averageRating` and `totalRatings` fields on user document

2. **Suspends low-rated couriers**
   - If courier has >= 5 ratings
   - And average rating < 3.5
   - Sets `courierProfile.status` to 'suspended'
   - Creates a dispute document for admin review

## Firestore Structure

### ratings collection
```json
{
  "deliveryJobId": "job123",
  "fromUserId": "user456",
  "toUserId": "courier789",
  "role": "customer_to_courier",
  "stars": 5,
  "review": "Great service!",
  "categories": {
    "professionalism": 5,
    "timeliness": 4,
    "care": 5
  },
  "createdAt": Timestamp
}
```

### users collection (updated fields)
```json
{
  "averageRating": 4.8,
  "totalRatings": 127,
  "totalDeliveries": 150
}
```

### disputes collection (for suspended couriers)
```json
{
  "type": "low_rating_suspension",
  "courierId": "courier789",
  "reason": "Courier suspended due to low average rating: 3.2 (5 ratings)",
  "averageRating": 3.2,
  "totalRatings": 5,
  "status": "open",
  "createdAt": Timestamp
}
```
