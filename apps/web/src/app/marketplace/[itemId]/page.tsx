'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getItem, Item } from '@/lib/v2/items';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { UserDoc } from '@/lib/v2/types';

const CATEGORY_LABELS: Record<string, string> = {
  furniture: 'Furniture',
  electronics: 'Electronics',
  clothing: 'Clothing',
  food: 'Food',
  other: 'Other',
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

const TEMPERATURE_LABELS: Record<string, string> = {
  hot: 'Hot',
  cold: 'Cold',
  frozen: 'Frozen',
  room_temp: 'Room Temperature',
};

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const [item, setItem] = useState<Item | null>(null);
  const [seller, setSeller] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    async function loadItem() {
      if (!itemId) return;

      setLoading(true);
      try {
        const data = await getItem(itemId);
        if (!data) {
          router.push('/marketplace');
          return;
        }
        setItem(data);

        // Load seller info
        if (data.sellerId) {
          const sellerRef = doc(db, 'users', data.sellerId);
          const sellerSnap = await getDoc(sellerRef);
          if (sellerSnap.exists()) {
            setSeller(sellerSnap.data() as UserDoc);
          }
        }
      } catch (error) {
        console.error('Failed to load item:', error);
        router.push('/marketplace');
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [itemId, router]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const photos = item.photos || [];
  const selectedPhoto = photos[selectedPhotoIndex];
  const isFoodItem = item.isFoodItem || item.category === 'food';

  return (
    <div style={{ padding: '12px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={() => router.push('/marketplace')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: '#6E56CF',
          background: 'none',
          border: 'none',
          padding: '8px 0',
          marginBottom: '12px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        ← Back to Marketplace
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Photo Gallery */}
        <div>
          {selectedPhoto ? (
            <img
              src={selectedPhoto}
              alt={item.title}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '300px',
                background: '#f3f4f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
              }}
            >
              No photo available
            </div>
          )}

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto' }}>
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhotoIndex(index)}
                  style={{
                    minWidth: '70px',
                    height: '70px',
                    border: selectedPhotoIndex === index ? '2px solid #6E56CF' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    padding: 0,
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={photo}
                    alt={`${item.title} ${index + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Item Details */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 12px 0' }}>
            {item.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#6E56CF' }}>
              ${item.price.toFixed(2)}
            </span>
            <span
              style={{
                padding: '4px 12px',
                background: '#dcfce7',
                color: '#166534',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {CONDITION_LABELS[item.condition] || item.condition}
            </span>
            <span
              style={{
                padding: '4px 12px',
                background: '#e0e7ff',
                color: '#3730a3',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {CATEGORY_LABELS[item.category] || item.category}
            </span>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Description</h2>
            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
              {item.description}
            </p>
          </div>

          {/* Seller Info */}
          {seller && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Seller</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {seller.profilePhotoUrl ? (
                  <img
                    src={seller.profilePhotoUrl}
                    alt={seller.displayName || 'Seller'}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#6b7280',
                    }}
                  >
                    {(seller.displayName || 'S')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {seller.displayName || 'Anonymous Seller'}
                  </div>
                  {seller.averageRating > 0 && (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      ⭐ {seller.averageRating.toFixed(1)} ({seller.totalRatings} ratings)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pickup Location */}
          {item.pickupLocation?.address && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Pickup Location</h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                📍 {item.pickupLocation.address}
              </p>
            </div>
          )}

          {/* Food-specific details */}
          {isFoodItem && item.foodDetails && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Food Delivery Details</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>Temperature:</span>
                  <span
                    style={{
                      padding: '4px 10px',
                      background: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {TEMPERATURE_LABELS[item.foodDetails.temperature] || item.foodDetails.temperature}
                  </span>
                </div>

                {item.foodDetails.pickupInstructions && (
                  <div>
                    <span style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Pickup Instructions:
                    </span>
                    <p style={{ fontSize: '14px', color: '#111827', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {item.foodDetails.pickupInstructions}
                    </p>
                  </div>
                )}

                {item.foodDetails.pickupPhotoUrl && (
                  <div>
                    <span style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                      Pickup Reference Photo:
                    </span>
                    <img
                      src={item.foodDetails.pickupPhotoUrl}
                      alt="Pickup reference"
                      style={{
                        width: '100%',
                        maxWidth: '200px',
                        height: 'auto',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  </div>
                )}

                {(item.foodDetails.requiresCooler || 
                  item.foodDetails.requiresHotBag || 
                  item.foodDetails.requiresDrinkCarrier) && (
                  <div>
                    <span style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                      Required Equipment:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {item.foodDetails.requiresCooler && (
                        <span
                          style={{
                            padding: '4px 10px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                        >
                          ❄️ Cooler
                        </span>
                      )}
                      {item.foodDetails.requiresHotBag && (
                        <span
                          style={{
                            padding: '4px 10px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                        >
                          🔥 Hot Bag
                        </span>
                      )}
                      {item.foodDetails.requiresDrinkCarrier && (
                        <span
                          style={{
                            padding: '4px 10px',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                        >
                          🥤 Drink Carrier
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => router.push(`/customer/request-delivery?itemId=${itemId}`)}
              style={{
                width: '100%',
                background: '#6E56CF',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Request Delivery
            </button>

            <button
              onClick={() => alert('Contact seller feature coming soon!')}
              style={{
                width: '100%',
                background: 'white',
                color: '#6E56CF',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                border: '2px solid #6E56CF',
                cursor: 'pointer',
              }}
            >
              Contact Seller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
