'use client';

import { Item } from '@/lib/v2/items';
import Link from 'next/link';

interface ItemCardProps {
  item: Item;
}

const CATEGORY_LABELS: Record<string, string> = {
  furniture: 'Furniture',
  electronics: 'Electronics',
  clothing: 'Clothing',
  books: 'Books',
  sports: 'Sports & Outdoors',
  home: 'Home & Garden',
  toys: 'Toys & Games',
  other: 'Other',
};

const CONDITION_COLORS: Record<string, string> = {
  new: 'bg-green-100 text-green-800',
  like_new: 'bg-blue-100 text-blue-800',
  good: 'bg-yellow-100 text-yellow-800',
  fair: 'bg-orange-100 text-orange-800',
  poor: 'bg-red-100 text-red-800',
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export function ItemCard({ item }: ItemCardProps) {
  const primaryPhoto = item.photos?.[0]; // string URL
  const conditionColor = CONDITION_COLORS[item.condition] || 'bg-gray-100 text-gray-800';
  const conditionLabel = CONDITION_LABELS[item.condition] || item.condition;
  const categoryLabel = CATEGORY_LABELS[item.category] || item.category;

  return (
    <Link
      href={`/marketplace/${item.id}`}
      className="block bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100">
        {primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg
              className="w-16 h-16"
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

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">{item.title}</h3>
        <p className="font-semibold text-base text-gray-900">${item.price.toFixed(0)}</p>
        
        {item.pickupLocation?.address && (
          <p className="text-xs text-gray-500 line-clamp-1 mt-1">
            {item.pickupLocation.address}
          </p>
        )}
      </div>
    </Link>
  );
}
