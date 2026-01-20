'use client';

import { Item } from '@/lib/v2/items';
import Link from 'next/link';

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const primaryPhoto = item.photos?.[0];

  return (
    <Link
      href={`/marketplace/${item.id}`}
      style={{
        display: 'block',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow 0.2s',
      }}
      onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Image - Smaller */}
      <div style={{ position: 'relative', paddingBottom: '100%', background: '#f3f4f6' }}>
        {primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={item.title}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
            }}
          >
            <svg
              style={{ width: '48px', height: '48px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content - More compact */}
      <div style={{ padding: '8px' }}>
        <h3
          style={{
            fontWeight: '600',
            fontSize: '13px',
            color: '#111827',
            marginBottom: '4px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.3',
          }}
        >
          {item.title}
        </h3>
        <p style={{ fontWeight: '700', fontSize: '15px', color: '#6E56CF', margin: 0 }}>
          ${item.price.toFixed(0)}
        </p>
      </div>
    </Link>
  );
}
