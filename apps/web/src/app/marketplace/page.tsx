'use client';

import { useEffect, useState } from 'react';
import { getAvailableItems, Item } from '@/lib/v2/items';
import { ItemCard } from '@/features/marketplace/ItemCard';
import type { ItemCategory } from '@/lib/v2/types';

const CATEGORIES: Array<{ value: ItemCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All Items' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'food', label: 'Food' },
  { value: 'other', label: 'Other' },
];

export default function MarketplacePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      try {
        const data = await getAvailableItems();
        setItems(data);
      } catch (error) {
        console.error('Failed to load items:', error);
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, []);

  const filteredItems =
    selectedCategory === 'all'
      ? items
      : items.filter((item) => item.category === selectedCategory);

  if (loading) {
    return (
      <div style={{ padding: '30px' }}>
        <h1 style={{ margin: '0 0 30px 0' }}>Marketplace</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Marketplace</h1>
        <a
          href="/vendor/items/new"
          style={{
            padding: '8px 14px',
            background: '#6E56CF',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          + List Item
        </a>
      </div>

      {/* Category Filter - Compact */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              style={{
                padding: '6px 12px',
                border: selectedCategory === category.value ? '2px solid #6E56CF' : '1px solid #ddd',
                background: selectedCategory === category.value ? '#f5f3ff' : 'white',
                color: selectedCategory === category.value ? '#6E56CF' : '#666',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: selectedCategory === category.value ? '600' : '400',
                fontSize: '13px',
              }}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p style={{ fontSize: '14px' }}>
            {selectedCategory === 'all'
              ? 'No items yet. Be the first to list an item!'
              : `No ${selectedCategory} items available yet.`}
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '12px', color: '#666', fontSize: '13px' }}>
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            {selectedCategory !== 'all' && ` in ${CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
          </div>

          {/* Grid - Compact for mobile (2-3 columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
