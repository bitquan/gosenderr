'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { UserDoc, GeoPoint } from '@/lib/v2/types';
import { calcMiles, calcFee, isEligible } from '@/lib/v2/pricing';
import geohash from 'ngeohash';

export interface NearbyCourier {
  uid: string;
  email: string;
  transportMode: string;
  pickupMiles: number;
  jobMiles: number;
  estimatedFee: number;
  eligible: boolean;
  rateCard: any;
}

export function useNearbyCouriers(pickup: GeoPoint | null, dropoff: GeoPoint | null) {
  const [couriers, setCouriers] = useState<NearbyCourier[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setCouriers([]);
      return;
    }

    const fetchNearbyCouriers = async () => {
      setLoading(true);
      try {
        // Get geohash prefix for pickup location (precision 5 for broader area)
        const pickupHash = geohash.encode(pickup.lat, pickup.lng, 5);

        // Query online couriers within geohash range
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('role', '==', 'courier'),
          where('courier.isOnline', '==', true),
          where('location.geohash', '>=', pickupHash),
          where('location.geohash', '<=', pickupHash + '\uf8ff')
        );

        const snapshot = await getDocs(q);
        const jobMiles = calcMiles(pickup, dropoff);

        const results: NearbyCourier[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data() as UserDoc & { email?: string };
          
          // Skip if no location or rate card
          if (!data.location || !data.courier?.rateCard) return;

          const courierLocation: GeoPoint = {
            lat: data.location.lat,
            lng: data.location.lng,
          };

          const pickupMiles = calcMiles(courierLocation, pickup);
          const rateCard = data.courier.rateCard;
          
          // Check eligibility
          const eligible = isEligible(rateCard, jobMiles, pickupMiles);
          
          // Calculate estimated fee
          const estimatedFee = calcFee(
            rateCard,
            jobMiles,
            pickupMiles,
            data.courier.transportMode
          );

          results.push({
            uid: doc.id,
            email: data.email || 'Courier',
            transportMode: data.courier.transportMode,
            pickupMiles,
            jobMiles,
            estimatedFee,
            eligible,
            rateCard,
          });
        });

        // Sort: eligible first, then by lowest fee
        results.sort((a, b) => {
          if (a.eligible && !b.eligible) return -1;
          if (!a.eligible && b.eligible) return 1;
          return a.estimatedFee - b.estimatedFee;
        });

        setCouriers(results);
      } catch (error) {
        console.error('Failed to fetch nearby couriers:', error);
        setCouriers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyCouriers();
  }, [pickup, dropoff]);

  return { couriers, loading };
}
