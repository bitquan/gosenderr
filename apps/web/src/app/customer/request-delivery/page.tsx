'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { ItemDoc, UserDoc, FoodTemperature } from '@gosenderr/shared';
import { calcMiles } from '@/lib/v2/pricing';
import { calculateCourierRate, JobInfo } from '@/lib/pricing/calculateCourierRate';
import { AddressAutocomplete } from '@/components/v2/AddressAutocomplete';
import { CourierSelector, CourierWithRate } from '@/components/v2/CourierSelector';

interface DropoffAddress {
  address: string;
  lat: number;
  lng: number;
}

interface ItemDocWithId extends ItemDoc {
  id: string;
}

export default function RequestDeliveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthUser();

  const [item, setItem] = useState<ItemDocWithId | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState<DropoffAddress | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0);
  const [availableCouriers, setAvailableCouriers] = useState<CourierWithRate[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<CourierWithRate | null>(null);
  const [searchingCouriers, setSearchingCouriers] = useState(false);

  // Step 1: Load item from URL params
  useEffect(() => {
    const id = searchParams?.get('itemId');
    if (!id) {
      setError('No item specified');
      setLoading(false);
      return;
    }
    setItemId(id);
  }, [searchParams]);

  useEffect(() => {
    if (!itemId) return;

    async function loadItem() {
      try {
        const itemRef = doc(db, 'items', itemId!);
        const itemSnap = await getDoc(itemRef);

        if (!itemSnap.exists()) {
          setError('Item not found');
          setLoading(false);
          return;
        }

        const itemData = itemSnap.data() as ItemDoc;
        const itemWithId: ItemDocWithId = { ...itemData, id: itemSnap.id };
        setItem(itemWithId);
        setLoading(false);
      } catch (err) {
        console.error('Error loading item:', err);
        setError('Failed to load item');
        setLoading(false);
      }
    }

    loadItem();
  }, [itemId]);

  // Step 2: Calculate distance and duration when dropoff changes
  useEffect(() => {
    if (!item || !dropoffAddress) return;

    const pickup = item.pickupLocation;
    const dropoff = dropoffAddress;

    // Calculate distance using Haversine
    const dist = calcMiles(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng }
    );
    setDistance(dist);

    // Estimate duration: 30 mph average speed
    const minutes = Math.round((dist / 30) * 60);
    setEstimatedMinutes(minutes);
  }, [item, dropoffAddress]);

  // Step 3: Find available couriers when distance is calculated
  useEffect(() => {
    if (!item || !dropoffAddress || distance === 0) return;

    async function findCouriers() {
      setSearchingCouriers(true);
      setAvailableCouriers([]);
      setSelectedCourier(null);

      try {
        const usersRef = collection(db, 'users');
        const courierQuery = query(
          usersRef,
          where('courierProfile.status', '==', 'active'),
          where('averageRating', '>=', 3.5)
        );

        const snapshot = await getDocs(courierQuery);
        const couriers: CourierWithRate[] = [];

        for (const docSnap of snapshot.docs) {
          const courierData = docSnap.data() as UserDoc;
          const courier: CourierWithRate = {
            ...courierData,
            id: docSnap.id,
            distance: 0, // Will be set below
            rateBreakdown: {} as any, // Will be set below
          };
          
          if (!courier.courierProfile) continue;

          // Check work mode
          const workModeEnabled = item!.isFoodItem
            ? courier.courierProfile.workModes.foodEnabled
            : courier.courierProfile.workModes.packagesEnabled;

          if (!workModeEnabled) continue;

          // Check service radius
          if (!courier.courierProfile.currentLocation) continue;
          
          const courierToPickup = calcMiles(
            { lat: courier.courierProfile.currentLocation.lat, lng: courier.courierProfile.currentLocation.lng },
            { lat: item!.pickupLocation.lat, lng: item!.pickupLocation.lng }
          );

          if (courierToPickup > courier.courierProfile.serviceRadius) continue;

          // Update courier distance
          courier.distance = courierToPickup;

          // Check equipment requirements for food items
          if (item!.isFoodItem && item!.foodDetails) {
            const equipment = courier.courierProfile.equipment;
            const foodDetails = item!.foodDetails;

            if (foodDetails.requiresCooler && !equipment.cooler?.approved) continue;
            if (foodDetails.requiresHotBag && 
                !equipment.hot_bag?.approved && 
                !equipment.insulated_bag?.approved) continue;
            if (foodDetails.requiresDrinkCarrier && !equipment.drink_carrier?.approved) continue;
          }

          // Calculate rate
          const rateCard = item!.isFoodItem
            ? courier.courierProfile.foodRateCard
            : courier.courierProfile.packageRateCard;

          const jobInfo: JobInfo = {
            distance: distance,
            estimatedMinutes: estimatedMinutes,
            isFoodItem: item!.isFoodItem,
          };

          const rateBreakdown = calculateCourierRate(rateCard, jobInfo);

          // Update courier rate breakdown
          courier.rateBreakdown = rateBreakdown;

          couriers.push(courier);
        }

        // Sort by price (cheapest first)
        couriers.sort((a, b) => 
          a.rateBreakdown.totalCustomerCharge - b.rateBreakdown.totalCustomerCharge
        );

        setAvailableCouriers(couriers);
      } catch (err) {
        console.error('Error finding couriers:', err);
        setError('Failed to find available couriers');
      } finally {
        setSearchingCouriers(false);
      }
    }

    findCouriers();
  }, [item, dropoffAddress, distance, estimatedMinutes]);

  const handleCourierSelect = (courier: CourierWithRate) => {
    setSelectedCourier(courier);
  };

  const handleProceedToPayment = () => {
    if (!selectedCourier || !itemId) return;

    // Store delivery details in sessionStorage for payment page
    const deliveryData = {
      itemId,
      courierId: selectedCourier.id,
      dropoffAddress,
      distance,
      estimatedMinutes,
      rateBreakdown: selectedCourier.rateBreakdown,
    };
    sessionStorage.setItem('deliveryRequest', JSON.stringify(deliveryData));

    // Navigate to payment page
    router.push(`/customer/checkout?itemId=${itemId}&courierId=${selectedCourier.id}`);
  };

  // Auth gate
  if (authLoading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/customer/request-delivery' + (itemId ? `?itemId=${itemId}` : ''));
    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading item...</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          {error || 'Item not found'}
        </h2>
        <button
          onClick={() => router.push('/customer/marketplace')}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>
        Request Delivery
      </h1>

      {/* Step 1: Item Summary */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Item Details
        </h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          {item.photos && item.photos[0] && (
            <img
              src={item.photos[0]}
              alt={item.title}
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              {item.title}
            </h3>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#059669', marginBottom: '8px' }}>
              ${item.price.toFixed(2)}
            </p>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              <strong>Pickup:</strong> {item.pickupLocation.address}
            </div>
            {item.isFoodItem && item.foodDetails && (
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  backgroundColor: getTemperatureColor(item.foodDetails.temperature),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  {item.foodDetails.temperature.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 2: Dropoff Address */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Delivery Address
        </h2>
        <AddressAutocomplete
          label="Where should this be delivered?"
          placeholder="Enter delivery address..."
          onSelect={(result) => setDropoffAddress(result)}
          required
        />
        {dropoffAddress && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#166534', marginBottom: '4px' }}>
              <strong>Distance:</strong> {distance.toFixed(2)} miles
            </div>
            <div style={{ fontSize: '14px', color: '#166534' }}>
              <strong>Estimated time:</strong> {estimatedMinutes} minutes
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Available Couriers */}
      {dropoffAddress && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Available Couriers
          </h2>

          {searchingCouriers ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: '#6b7280' }}>Finding available couriers...</div>
            </div>
          ) : (
            <CourierSelector
              couriers={availableCouriers}
              selectedCourierId={selectedCourier?.id || null}
              onSelect={handleCourierSelect}
              isFoodItem={item.isFoodItem}
            />
          )}
        </div>
      )}

      {/* Step 4: Selection Summary & Proceed */}
      {selectedCourier && (
        <div style={{
          backgroundColor: 'white',
          border: '2px solid #2563eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Order Summary
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Courier earnings</span>
              <span style={{ fontWeight: '500' }}>
                ${selectedCourier.rateBreakdown.courierEarnings.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: '#6b7280' }}>Platform fee</span>
              <span style={{ fontWeight: '500' }}>
                ${selectedCourier.rateBreakdown.platformFee.toFixed(2)}
              </span>
            </div>
            <div style={{
              borderTop: '2px solid #e5e7eb',
              marginTop: '12px',
              paddingTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '18px',
              fontWeight: '700',
            }}>
              <span>Total delivery cost</span>
              <span style={{ color: '#2563eb' }}>
                ${selectedCourier.rateBreakdown.totalCustomerCharge.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleProceedToPayment}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            Confirm & Proceed to Payment
          </button>

          <p style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            You'll be charged after the delivery is completed
          </p>
        </div>
      )}
    </div>
  );
}

function getTemperatureColor(temp: FoodTemperature): string {
  switch (temp) {
    case 'hot':
      return '#dc2626';
    case 'cold':
      return '#2563eb';
    case 'frozen':
      return '#06b6d4';
    case 'room_temp':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}
