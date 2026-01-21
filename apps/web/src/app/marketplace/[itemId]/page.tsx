'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getItem, Item } from '@/lib/v2/items';

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

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const [item, setItem] = useState<Item | null>(null);
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
        {/* Photo - Compact for mobile */}
        <div>
          {selectedPhoto ? (
            <img
              src={selectedPhoto}
              alt={item.title}
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '200px',
                background: '#f3f4f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              No photo
            </div>
          )}

          {/* Thumbnails - Smaller for mobile */}
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto' }}>
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhotoIndex(index)}
                  style={{
                    minWidth: '60px',
                    height: '60px',
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

        {/* Compact Details */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' }}>
            {item.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#6E56CF' }}>
              ${item.price.toFixed(2)}
            </span>
            <span
              style={{
                padding: '4px 10px',
                background: '#dcfce7',
                color: '#166534',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {CONDITION_LABELS[item.condition] || item.condition}
            </span>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
              {CATEGORY_LABELS[item.category] || item.category}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Description</h2>
            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5', margin: 0 }}>
              {item.description}
            </p>
          </div>

          {item.pickupLocation?.address && (
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Location</h2>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                📍 {item.pickupLocation.address}
              </p>
            </div>
          )}

          <button
            style={{
              width: '100%',
              marginTop: '12px',
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
            Contact Seller
          </button>
        </div>
      </div>
    </div>
  );
}
