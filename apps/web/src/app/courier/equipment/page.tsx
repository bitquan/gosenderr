'use client';

import { useEffect, useState } from 'react';
import { auth, db, storage } from '@/lib/firebase/client';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { CourierEquipment, EquipmentItem } from '@gosenderr/shared/types/firestore';

type EquipmentType =
  | 'insulated_bag'
  | 'cooler'
  | 'hot_bag'
  | 'drink_carrier'
  | 'dolly'
  | 'straps'
  | 'furniture_blankets';

const EQUIPMENT_CONFIG: Record<
  EquipmentType,
  { label: string; icon: string; description: string; category: 'food' | 'package' }
> = {
  insulated_bag: {
    label: 'Insulated Bag',
    icon: '🧊',
    description: 'For keeping food fresh during delivery',
    category: 'food',
  },
  cooler: {
    label: 'Cooler',
    icon: '❄️',
    description: 'For cold and frozen food items',
    category: 'food',
  },
  hot_bag: {
    label: 'Hot Bag',
    icon: '🔥',
    description: 'For keeping hot food warm',
    category: 'food',
  },
  drink_carrier: {
    label: 'Drink Carrier',
    icon: '🥤',
    description: 'For safely transporting drinks',
    category: 'food',
  },
  dolly: {
    label: 'Dolly / Hand Truck',
    icon: '🛒',
    description: 'For moving heavy packages',
    category: 'package',
  },
  straps: {
    label: 'Straps',
    icon: '🪢',
    description: 'For securing items during transport',
    category: 'package',
  },
  furniture_blankets: {
    label: 'Furniture Blankets',
    icon: '🧺',
    description: 'For protecting furniture',
    category: 'package',
  },
};

function getDefaultEquipmentItem(): EquipmentItem {
  return {
    has: false,
    approved: false,
  };
}

export default function EquipmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<CourierEquipment | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [uploadingType, setUploadingType] = useState<EquipmentType | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      // Load courier equipment
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const courierProfile = data.courierProfile;

        if (courierProfile?.equipment) {
          setEquipment(courierProfile.equipment);
        } else {
          // Initialize with defaults
          const defaultEquipment: CourierEquipment = {
            insulated_bag: getDefaultEquipmentItem(),
            cooler: getDefaultEquipmentItem(),
            hot_bag: getDefaultEquipmentItem(),
            drink_carrier: getDefaultEquipmentItem(),
            dolly: getDefaultEquipmentItem(),
            straps: getDefaultEquipmentItem(),
            furniture_blankets: getDefaultEquipmentItem(),
          };
          setEquipment(defaultEquipment);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handlePhotoUpload = async (equipmentType: EquipmentType, file: File) => {
    if (!currentUser || !equipment) return;

    setUploadingType(equipmentType);

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `equipment/${currentUser.uid}/${equipmentType}.jpg`);
      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);

      // Update Firestore
      const updatedItem: EquipmentItem = {
        has: true,
        photoUrl,
        approved: false, // Pending admin review
      };

      await updateDoc(doc(db, 'users', currentUser.uid), {
        [`courierProfile.equipment.${equipmentType}`]: updatedItem,
      });

      // Update local state
      setEquipment({
        ...equipment,
        [equipmentType]: updatedItem,
      });
    } catch (error) {
      console.error('Failed to upload equipment photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingType(null);
    }
  };

  const getStatusBadge = (item: EquipmentItem | undefined) => {
    if (!item || !item.has) {
      return {
        text: '❌ Not Uploaded',
        color: '#9ca3af',
        bgColor: '#f3f4f6',
      };
    }

    if (item.approved) {
      return {
        text: '✅ Approved',
        color: '#059669',
        bgColor: '#d1fae5',
      };
    }

    if (item.rejectedReason) {
      return {
        text: '🚫 Rejected',
        color: '#dc2626',
        bgColor: '#fee2e2',
      };
    }

    return {
      text: '⏳ Pending Review',
      color: '#d97706',
      bgColor: '#fef3c7',
    };
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No equipment data found</p>
      </div>
    );
  }

  const foodEquipment: EquipmentType[] = ['insulated_bag', 'cooler', 'hot_bag', 'drink_carrier'];
  const packageEquipment: EquipmentType[] = ['dolly', 'straps', 'furniture_blankets'];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '16px', fontSize: '28px', fontWeight: '600' }}>
        Equipment & Badges
      </h1>
      <p style={{ marginBottom: '32px', color: '#6b7280', fontSize: '16px' }}>
        Upload photos of your equipment to earn badges and qualify for more delivery types.
        All equipment must be approved by our team before you can earn badges.
      </p>

      {/* Food Delivery Equipment */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          🍔 Food Delivery Equipment
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {foodEquipment.map((type) => {
            const config = EQUIPMENT_CONFIG[type];
            const item = equipment[type];
            const status = getStatusBadge(item);
            const isUploading = uploadingType === type;

            return (
              <div
                key={type}
                style={{
                  padding: '20px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '32px', marginRight: '12px' }}>{config.icon}</span>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {config.label}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>{config.description}</p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    background: status.bgColor,
                    color: status.color,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '12px',
                  }}
                >
                  {status.text}
                </div>

                {item?.rejectedReason && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '6px',
                      fontSize: '13px',
                      marginBottom: '12px',
                    }}
                  >
                    <strong>Reason:</strong> {item.rejectedReason}
                  </div>
                )}

                {item?.photoUrl && (
                  <div style={{ marginBottom: '12px' }}>
                    <img
                      src={item.photoUrl}
                      alt={config.label}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                  </div>
                )}

                <label
                  style={{
                    display: 'block',
                    padding: '12px',
                    background: isUploading ? '#9ca3af' : '#6366f1',
                    color: 'white',
                    textAlign: 'center',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUploading ? 'Uploading...' : item?.photoUrl ? 'Replace Photo' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handlePhotoUpload(type, file);
                      }
                    }}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Package Delivery Equipment */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          📦 Package Delivery Equipment
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {packageEquipment.map((type) => {
            const config = EQUIPMENT_CONFIG[type];
            const item = equipment[type];
            const status = getStatusBadge(item);
            const isUploading = uploadingType === type;

            return (
              <div
                key={type}
                style={{
                  padding: '20px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '32px', marginRight: '12px' }}>{config.icon}</span>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {config.label}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>{config.description}</p>
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    background: status.bgColor,
                    color: status.color,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '12px',
                  }}
                >
                  {status.text}
                </div>

                {item?.rejectedReason && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '6px',
                      fontSize: '13px',
                      marginBottom: '12px',
                    }}
                  >
                    <strong>Reason:</strong> {item.rejectedReason}
                  </div>
                )}

                {item?.photoUrl && (
                  <div style={{ marginBottom: '12px' }}>
                    <img
                      src={item.photoUrl}
                      alt={config.label}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                  </div>
                )}

                <label
                  style={{
                    display: 'block',
                    padding: '12px',
                    background: isUploading ? '#9ca3af' : '#6366f1',
                    color: 'white',
                    textAlign: 'center',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUploading ? 'Uploading...' : item?.photoUrl ? 'Replace Photo' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handlePhotoUpload(type, file);
                      }
                    }}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
