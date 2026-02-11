
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { FeatureFlags } from "@gosenderr/shared";

const DEFAULT_FLAGS: FeatureFlags = {
  marketplace: {
    enabled: true,
    itemListings: true,
    combinedPayments: true,
    courierOffers: false,
  },
  delivery: {
    onDemand: true,
    routes: true,
    longRoutes: false,
    longHaul: false,
  },
  courier: {
    rateCards: true,
    equipmentBadges: true,
    workModes: true,
  },
  seller: {
    stripeConnect: true,
    multiplePhotos: true,
    foodListings: true,
  },
  customer: {
    liveTracking: true,
    proofPhotos: true,
    routeDelivery: false,
    packageShipping: true,
  },
  packageRunner: {
    enabled: true,
    hubNetwork: true,
    packageTracking: true,
  },
  admin: {
    courierApproval: true,
    equipmentReview: true,
    disputeManagement: true,
    analytics: true,
    featureFlagsControl: true,
    webPortalEnabled: true,
    systemLogs: false,
    firebaseExplorer: false,
  },
  advanced: {
    pushNotifications: true,
    ratingEnforcement: true,
    autoCancel: true,
    refunds: true,
  },
  ui: {
    modernStyling: true,
    darkMode: true,
    animations: true,
  },
  senderrplace: {
    marketplace_v2: true,
    seller_portal_v2: true,
    listing_create_v1: true,
    checkout_v2: true,
    messaging_v1: true,
  },
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadFlags = async () => {
      try {
        const snapshot = await getDoc(doc(db, "featureFlags", "config"));
        if (cancelled) return;

        if (snapshot.exists()) {
          setFlags({ ...DEFAULT_FLAGS, ...(snapshot.data() as FeatureFlags) });
        } else {
          setFlags(DEFAULT_FLAGS);
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const firestoreCode = (err as { code?: string } | null)?.code;
        if (firestoreCode === "permission-denied") {
          // Keep customer app functional when feature flag reads are restricted.
          setFlags(DEFAULT_FLAGS);
          setError(null);
        } else {
          console.error("Error loading feature flags:", err);
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadFlags();

    return () => {
      cancelled = true;
    };
  }, []);

  return { flags, loading, error };
}
