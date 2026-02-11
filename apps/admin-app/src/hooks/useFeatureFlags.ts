
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { FeatureFlags } from "@gosenderr/shared";

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "featureFlags", "config"),
      (snapshot) => {
        if (snapshot.exists()) {
          setFlags(snapshot.data() as FeatureFlags);
        } else {
          // Return default flags if document doesn't exist
          setFlags({
            marketplace: {
              enabled: true,
              itemListings: true,
              combinedPayments: true,
              courierOffers: false,
              messaging: true,
              ratings: true,
            },
            delivery: {
              onDemand: true,
              routes: true,
              longRoutes: false,
              longHaul: false,
              mapShell: false,
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
            senderrplace: {
              marketplace_v2: true,
              seller_portal_v2: true,
              listing_create_v1: true,
              checkout_v2: true,
              messaging_v1: true,
            },
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading feature flags:", err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { flags, loading, error };
}
