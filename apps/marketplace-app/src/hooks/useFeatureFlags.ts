
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, isFirebaseReady } from "@/lib/firebase/client";
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
    webPortalEnabled: false,
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
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Don't hard-crash the app when env config is missing.
    if (!isFirebaseReady() || !db) {
      setFlags(DEFAULT_FLAGS);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "featureFlags", "config"),
      (snapshot) => {
        if (snapshot.exists()) {
          setFlags(snapshot.data() as FeatureFlags);
        } else {
          // Return default flags if document doesn't exist
          setFlags(DEFAULT_FLAGS);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading feature flags:", err);
        setFlags(DEFAULT_FLAGS);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { flags, loading, error };
}
