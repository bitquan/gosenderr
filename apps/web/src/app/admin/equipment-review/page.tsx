'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { CourierEquipment, EquipmentItem } from '@gosenderr/shared';

type EquipmentType =
  | 'insulated_bag'
  | 'cooler'
  | 'hot_bag'
  | 'drink_carrier'
  | 'dolly'
  | 'straps'
  | 'furniture_blankets';

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  insulated_bag: 'Insulated Bag 🧊',
  cooler: 'Cooler ❄️',
  hot_bag: 'Hot Bag 🔥',
  drink_carrier: 'Drink Carrier 🥤',
  dolly: 'Dolly 🛒',
  straps: 'Straps 🪢',
  furniture_blankets: 'Furniture Blankets 🧺',
};

interface PendingEquipment {
  courierId: string;
  courierName: string;
  equipmentType: EquipmentType;
  photoUrl: string;
  submittedAt: Date;
}

export default function EquipmentReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<PendingEquipment[]>([]);
  const [selectedItem, setSelectedItem] = useState<PendingEquipment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
      if (userDoc.empty || userDoc.docs[0].data().role !== 'admin') {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      await loadPendingEquipment();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadPendingEquipment = async () => {
    try {
      // Get all users with courier profiles
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('courierProfile', '!=', null))
      );

      const pending: PendingEquipment[] = [];

      usersSnapshot.docs.forEach((userDoc) => {
        const data = userDoc.data();
        const equipment = data.courierProfile?.equipment as CourierEquipment;
        const courierName = data.displayName || 'Unknown Courier';

        if (equipment) {
          // Check each equipment type for pending approval
          (Object.keys(equipment) as EquipmentType[]).forEach((type) => {
            const item = equipment[type];
            if (item.has && !item.approved && item.photoUrl && !item.rejectedReason) {
              pending.push({
                courierId: userDoc.id,
                courierName,
                equipmentType: type,
                photoUrl: item.photoUrl,
                submittedAt: new Date(), // Would ideally track submission time
              });
            }
          });
        }
      });

      setPendingItems(pending);
    } catch (error) {
      console.error('Failed to load pending equipment:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem || !currentUser) return;

    setProcessing(true);

    try {
      const updatedItem: EquipmentItem = {
        has: true,
        photoUrl: selectedItem.photoUrl,
        approved: true,
        approvedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'users', selectedItem.courierId), {
        [`courierProfile.equipment.${selectedItem.equipmentType}`]: updatedItem,
      });

      // Update local state
      setPendingItems(pendingItems.filter((item) => item !== selectedItem));
      setSelectedItem(null);
      alert('Equipment approved successfully!');
    } catch (error) {
      console.error('Failed to approve equipment:', error);
      alert('Failed to approve equipment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !currentUser || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(true);

    try {
      const updatedItem: EquipmentItem = {
        has: true,
        photoUrl: selectedItem.photoUrl,
        approved: false,
        rejectedReason: rejectionReason,
      };

      await updateDoc(doc(db, 'users', selectedItem.courierId), {
        [`courierProfile.equipment.${selectedItem.equipmentType}`]: updatedItem,
      });

      // Update local state
      setPendingItems(pendingItems.filter((item) => item !== selectedItem));
      setSelectedItem(null);
      setRejectionReason('');
      alert('Equipment rejected. Courier has been notified.');
    } catch (error) {
      console.error('Failed to reject equipment:', error);
      alert('Failed to reject equipment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '32px', fontSize: '28px', fontWeight: '600' }}>
        Equipment Pending Review ({pendingItems.length})
      </h1>

      {pendingItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '16px' }}>No pending equipment reviews at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
          {/* List of pending items */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedItem(item);
                    setRejectionReason('');
                  }}
                  style={{
                    padding: '16px',
                    background: selectedItem === item ? '#eff6ff' : 'white',
                    border: selectedItem === item ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {item.courierName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {EQUIPMENT_LABELS[item.equipmentType]}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Submitted: {item.submittedAt.toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Review panel */}
          <div>
            {selectedItem ? (
              <div
                style={{
                  padding: '24px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                }}
              >
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  {selectedItem.courierName}
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                  Equipment: {EQUIPMENT_LABELS[selectedItem.equipmentType]}
                </p>

                {/* Photo Preview */}
                <div style={{ marginBottom: '24px' }}>
                  <img
                    src={selectedItem.photoUrl}
                    alt={selectedItem.equipmentType}
                    style={{
                      width: '100%',
                      maxHeight: '500px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                </div>

                {/* Rejection Reason Input */}
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why the equipment photo is being rejected..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: processing ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: processing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ✅ APPROVE
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processing || !rejectionReason.trim()}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background:
                        processing || !rejectionReason.trim() ? '#9ca3af' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor:
                        processing || !rejectionReason.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ❌ REJECT
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '40px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#6b7280',
                }}
              >
                <p style={{ fontSize: '16px' }}>
                  Select an item from the list to review
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
