'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { DeliveryJobDoc, JobStatus } from '@gosenderr/shared';

interface Order extends DeliveryJobDoc {
  id: string;
}

export default function VendorOrdersPage() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    // Real-time listener for orders where user is the seller
    const ordersQuery = query(
      collection(db, 'deliveryJobs'),
      where('sellerId', '==', user.uid),
      where('isMarketplaceOrder', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router]);

  async function handleMarkReadyForPickup(orderId: string) {
    try {
      await updateDoc(doc(db, 'deliveryJobs', orderId), {
        sellerReadyForPickup: true,
        sellerReadyAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // In production, this would trigger a notification to the courier
      alert('Order marked as ready! Courier will be notified.');
    } catch (err: any) {
      console.error('Error marking order ready:', err);
      alert('Failed to mark order as ready: ' + err.message);
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading orders...</p>
      </div>
    );
  }

  const filteredOrders = orders.filter((order) => {
    if (filter === 'pending') {
      return order.status !== JobStatus.COMPLETED && order.status !== JobStatus.CANCELLED;
    }
    if (filter === 'completed') {
      return order.status === JobStatus.COMPLETED || order.status === JobStatus.CANCELLED;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <Link
          href="/vendor/items"
          style={{
            color: '#6E56CF',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          ← Back to My Items
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>My Orders</h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <FilterButton
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
          >
            Pending ({orders.filter(o => o.status !== JobStatus.COMPLETED && o.status !== JobStatus.CANCELLED).length})
          </FilterButton>
          <FilterButton
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
          >
            Completed ({orders.filter(o => o.status === JobStatus.COMPLETED || o.status === JobStatus.CANCELLED).length})
          </FilterButton>
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All ({orders.length})
          </FilterButton>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#F9F9F9',
            borderRadius: '12px',
          }}
        >
          <p style={{ color: '#999', fontSize: '16px' }}>
            No {filter === 'all' ? '' : filter} orders found
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onMarkReady={handleMarkReadyForPickup}
          />
        ))}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        backgroundColor: active ? '#6E56CF' : '#FFF',
        color: active ? '#FFF' : '#666',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: active ? '600' : '400',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function OrderCard({
  order,
  onMarkReady,
}: {
  order: Order;
  onMarkReady: (orderId: string) => void;
}) {
  const isPending = order.status !== JobStatus.COMPLETED && order.status !== JobStatus.CANCELLED;
  const needsPreparation = !order.sellerReadyForPickup && order.status === JobStatus.OPEN;
  
  return (
    <div
      style={{
        backgroundColor: '#FFF',
        border: '1px solid #E0E0E0',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Order #{order.id.slice(-8)}</h3>
            <StatusBadge status={order.status} />
          </div>
          <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
            {new Date(order.createdAt.toDate()).toLocaleString()}
          </p>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#6E56CF' }}>
            ${order.pricing.itemPrice?.toFixed(2) || '0.00'}
          </p>
          <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
            Item Price
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '15px',
      }}>
        <div>
          <p style={{ color: '#999', fontSize: '12px', margin: '0 0 5px 0' }}>PICKUP ADDRESS</p>
          <p style={{ margin: 0, fontSize: '14px' }}>{order.pickup.address}</p>
        </div>
        
        <div>
          <p style={{ color: '#999', fontSize: '12px', margin: '0 0 5px 0' }}>DELIVERY ADDRESS</p>
          <p style={{ margin: 0, fontSize: '14px' }}>{order.dropoff.address}</p>
        </div>
        
        {order.courierId && (
          <div>
            <p style={{ color: '#999', fontSize: '12px', margin: '0 0 5px 0' }}>COURIER</p>
            <p style={{ margin: 0, fontSize: '14px' }}>Assigned</p>
          </div>
        )}
      </div>

      {order.sellerReadyForPickup && (
        <div
          style={{
            padding: '10px',
            backgroundColor: '#E8F5E9',
            border: '1px solid #A5D6A7',
            borderRadius: '8px',
            marginBottom: '15px',
          }}
        >
          <p style={{ margin: 0, color: '#2E7D32', fontSize: '14px' }}>
            ✓ Marked as ready for pickup
          </p>
        </div>
      )}

      {needsPreparation && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onMarkReady(order.id)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#4CAF50',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Mark as Ready for Pickup
          </button>
          <Link
            href={`/customer/jobs/${order.id}`}
            style={{
              padding: '12px 20px',
              backgroundColor: '#FFF',
              color: '#6E56CF',
              border: '1px solid #6E56CF',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            View Details
          </Link>
        </div>
      )}

      {!needsPreparation && isPending && (
        <Link
          href={`/customer/jobs/${order.id}`}
          style={{
            display: 'block',
            padding: '12px',
            backgroundColor: '#FFF',
            color: '#6E56CF',
            border: '1px solid #6E56CF',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          View Details
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.OPEN:
        return '#2196F3';
      case JobStatus.ASSIGNED:
        return '#FF9800';
      case JobStatus.ENROUTE_PICKUP:
        return '#FF9800';
      case JobStatus.PICKED_UP:
        return '#9C27B0';
      case JobStatus.ENROUTE_DROPOFF:
        return '#9C27B0';
      case JobStatus.COMPLETED:
        return '#4CAF50';
      case JobStatus.CANCELLED:
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: JobStatus) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const color = getStatusColor(status);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        backgroundColor: `${color}20`,
        color: color,
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
}
