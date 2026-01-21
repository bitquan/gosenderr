'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItemsBySeller, Item, updateItemStatus, deleteItem } from '@/lib/v2/items';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  sold: 'Sold',
  pending: 'Pending',
  deleted: 'Deleted',
};

export default function VendorItemsPage() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    async function loadItems() {
      if (!user) return;
      
      setLoading(true);
      try {
        const data = await getItemsBySeller(user.uid);
        setItems(data);
      } catch (error) {
        console.error('Failed to load items:', error);
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, [user, authLoading, router]);

  const handleMarkAsSold = async (itemId: string) => {
    try {
      await updateItemStatus(itemId, 'sold');
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: 'sold' } : item
        )
      );
    } catch (error) {
      console.error('Failed to mark as sold:', error);
      alert('Failed to update item');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteItem(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ padding: '30px' }}>
        <h1 style={{ margin: '0 0 30px 0' }}>My Items</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>My Items</h1>
        <Link
          href="/vendor/items/new"
          style={{
            padding: '10px 20px',
            background: '#6E56CF',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
          }}
        >
          + Create Listing
        </Link>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No items yet. Start selling by creating your first item listing.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Item
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Price
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Created
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const primaryPhoto = item.photos?.[0];
                const statusLabel = STATUS_LABELS[item.status] || item.status;

                return (
                  <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {primaryPhoto ? (
                          <img
                            src={primaryPhoto}
                            alt={item.title}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '60px',
                              height: '60px',
                              background: '#f3f4f6',
                              borderRadius: '8px',
                              flexShrink: 0,
                            }}
                          ></div>
                        )}
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        ${item.price.toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: item.status === 'available' ? '#dcfce7' : '#f3f4f6',
                          color: item.status === 'available' ? '#166534' : '#6b7280',
                          display: 'inline-block',
                        }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {item.createdAt?.toDate().toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <Link
                          href={`/marketplace/${item.id}`}
                          style={{
                            padding: '6px 12px',
                            fontSize: '14px',
                            color: '#6E56CF',
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: '500',
                          }}
                        >
                          View
                        </Link>
                        {item.status === 'available' && (
                          <button
                            onClick={() => handleMarkAsSold(item.id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '14px',
                              color: '#16a34a',
                              background: 'white',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '500',
                            }}
                          >
                            Mark Sold
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '14px',
                            color: '#dc2626',
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
