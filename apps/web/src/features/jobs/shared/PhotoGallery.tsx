'use client';

import { useState } from 'react';
import { JobPhoto } from '../shared/types';

interface PhotoGalleryProps {
  photos: JobPhoto[];
  maxThumbnails?: number;
}

export function PhotoGallery({ photos, maxThumbnails = 3 }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null);

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maxThumbnails}, 1fr)`, gap: '8px' }}>
        {photos.slice(0, maxThumbnails).map((photo, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedPhoto(photo)}
            style={{
              aspectRatio: '1',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #ddd',
              background: '#f5f5f5',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <img
              src={photo.url}
              alt={`Package photo ${idx + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </button>
        ))}
        {photos.length > maxThumbnails && (
          <button
            onClick={() => setSelectedPhoto(photos[maxThumbnails])}
            style={{
              aspectRatio: '1',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              color: '#666',
              cursor: 'pointer',
            }}
          >
            +{photos.length - maxThumbnails} more
          </button>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img
              src={selectedPhoto.url}
              alt="Full size package photo"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhoto(null);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
