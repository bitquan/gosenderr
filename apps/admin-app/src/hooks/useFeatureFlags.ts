
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { FeatureFlags } from "@gosenderr/shared";

function getDefaultFlags(): FeatureFlags {
  return {
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
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    getDoc(doc(db, "featureFlags", "config"))
      .then((snapshot) => {
        if (!mounted) return;
        if (snapshot.exists()) {
          setFlags(snapshot.data() as FeatureFlags);
        } else {
          setFlags(getDefaultFlags());
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Error loading feature flags:", err);
        setError(err as Error);
        // Permission errors should not crash admin shell.
        setFlags(getDefaultFlags());
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { flags, loading, error };
}
