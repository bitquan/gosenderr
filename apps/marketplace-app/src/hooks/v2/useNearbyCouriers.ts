
import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { UserDoc, GeoPoint } from "@/lib/v2/types";
import { calcMiles, calcFee } from "@/lib/v2/pricing";
import { getEligibilityReason } from "@/lib/v2/eligibility";
import geohash from "ngeohash";

export interface NearbyCourier {
  uid: string;
  name: string;
  email?: string;
  transportMode: string;
  pickupMiles: number;
  jobMiles: number;
  estimatedFee: number;
  eligible: boolean;
  reason?: string;
  rateCard: any;
  equipmentBadges: Array<
    "dolly" | "blankets" | "straps" | "cooler" | "insulated_bag"
  >;
}

export function useNearbyCouriers(
  pickup: GeoPoint | null,
  dropoff: GeoPoint | null,
) {
  const [couriers, setCouriers] = useState<NearbyCourier[]>([]);
  const [loading, setLoading] = useState(false);
  const hashDocsRef = useRef<Map<string, Map<string, UserDoc & { email?: string }>>>(
    new Map(),
  );

  useEffect(() => {
    if (!pickup || !dropoff) {
      setCouriers([]);
      return;
    }

    setLoading(true);

    const precision = 4;
    const pickupHash = geohash.encode(pickup.lat, pickup.lng, precision);
    const neighborHashes = geohash.neighbors(pickupHash);
    const hashPrefixes = Array.from(new Set([pickupHash, ...neighborHashes]));

    const usersRef = collection(db, "users");
    const unsubscribes = hashPrefixes.map((hashPrefix) => {
      const q = query(
        usersRef,
        where("role", "==", "courier"),
        where("courierProfile.isOnline", "==", true),
        where("courierProfile.currentLocation.geohash", ">=", hashPrefix),
        where("courierProfile.currentLocation.geohash", "<=", hashPrefix + "\uf8ff"),
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const docsForHash = new Map<string, UserDoc & { email?: string }>();
          snapshot.forEach((docSnap) => {
            docsForHash.set(docSnap.id, docSnap.data() as UserDoc & { email?: string });
          });

          hashDocsRef.current.set(hashPrefix, docsForHash);

          const merged = new Map<string, UserDoc & { email?: string }>();
          hashDocsRef.current.forEach((bucket) => {
            bucket.forEach((data, id) => merged.set(id, data));
          });

          const jobMiles = calcMiles(pickup, dropoff);
          const results: NearbyCourier[] = [];

          merged.forEach((data, id) => {
            if (!data.courierProfile?.currentLocation || !data.courierProfile?.packageRateCard) return;

            const courierStatus = data.courierProfile.status as string | undefined;
            if (
              courierStatus &&
              courierStatus !== "approved" &&
              courierStatus !== "active"
            ) {
              return;
            }

            const equipmentBadges: Array<
              "dolly" | "blankets" | "straps" | "cooler" | "insulated_bag"
            > = [];
            const equipment = data.courierProfile.equipment as any;
            if (equipment?.dolly?.approved) equipmentBadges.push("dolly");
            if (equipment?.straps?.approved) equipmentBadges.push("straps");
            if (equipment?.furniture_blankets?.approved) equipmentBadges.push("blankets");
            if (equipment?.cooler?.approved) equipmentBadges.push("cooler");
            if (equipment?.insulated_bag?.approved || equipment?.hot_bag?.approved) {
              equipmentBadges.push("insulated_bag");
            }

            const courierLocation: GeoPoint = {
              lat: data.courierProfile.currentLocation.lat,
              lng: data.courierProfile.currentLocation.lng,
            };

            const pickupMiles = calcMiles(courierLocation, pickup);
            const rateCard = data.courierProfile.packageRateCard;
            const eligibilityResult = getEligibilityReason(
              rateCard,
              jobMiles,
              pickupMiles,
            );
            const eligible = eligibilityResult.eligible;
            const reason = eligibilityResult.reason;
            const estimatedFee = calcFee(
              rateCard,
              jobMiles,
              pickupMiles,
              data.courierProfile.vehicleType || "car",
            );

            const name =
              (data.courierProfile as any)?.displayName ||
              (data.courierProfile as any)?.identity?.legalName ||
              data.displayName ||
              `Senderr ${id.slice(0, 4)}`;

            results.push({
              uid: id,
              name,
              email: data.email,
              transportMode: data.courierProfile.vehicleType || "car",
              pickupMiles,
              jobMiles,
              estimatedFee,
              eligible,
              reason,
              rateCard,
              equipmentBadges,
            });
          });

          results.sort((a, b) => {
            if (a.eligible && !b.eligible) return -1;
            if (!a.eligible && b.eligible) return 1;
            return a.estimatedFee - b.estimatedFee;
          });

          setCouriers(results);
          setLoading(false);
        },
        (error) => {
          console.error("Failed to fetch nearby couriers:", error);
          setCouriers([]);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      hashDocsRef.current.clear();
    };
  }, [pickup, dropoff]);

  return { couriers, loading };
}
