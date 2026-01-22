"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { FeatureFlags } from "@gosenderr/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FeatureFlagToggle } from "@/components/FeatureFlagToggle";
import { Avatar } from "@/components/ui/Avatar";

export default function FeatureFlagsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const { flags, loading, error } = useFeatureFlags();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const checkAdmin = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        if (
          querySnapshot.empty ||
          querySnapshot.docs[0].data().role !== "admin"
        ) {
          router.push("/");
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        console.error("Error checking admin status:", err);
        router.push("/");
      }
    };

    checkAdmin();
  }, [user, authLoading, router]);

  const handleToggle = async (path: string, value: boolean) => {
    if (!flags || isSaving) return;

    setIsSaving(true);
    try {
      const flagRef = doc(db, "featureFlags", "config");
      await updateDoc(flagRef, {
        [path]: value,
      });
    } catch (err) {
      console.error("Error updating feature flag:", err);
      alert("Failed to update feature flag");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin || error || !flags) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar fallback={user?.displayName || "Admin"} size="lg" />
              <div>
                <h1 className="text-2xl font-bold">Feature Flags</h1>
                <p className="text-purple-100 text-sm">
                  Control platform features
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-4">
        {/* Marketplace Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>🛒 Marketplace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="Marketplace Enabled"
              description="Enable the marketplace feature for buying/selling items"
              enabled={flags.marketplace.enabled}
              onChange={(value) => handleToggle("marketplace.enabled", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Item Listings"
              description="Allow users to create and browse item listings"
              enabled={flags.marketplace.itemListings}
              onChange={(value) =>
                handleToggle("marketplace.itemListings", value)
              }
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Combined Payments"
              description="Enable combined payments for multiple items"
              enabled={flags.marketplace.combinedPayments}
              onChange={(value) =>
                handleToggle("marketplace.combinedPayments", value)
              }
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Delivery Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>🚚 Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="On-Demand Delivery"
              description="Enable immediate on-demand delivery service"
              enabled={flags.delivery.onDemand}
              onChange={(value) => handleToggle("delivery.onDemand", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Route Delivery"
              description="Enable scheduled route-based deliveries"
              enabled={flags.delivery.routes}
              onChange={(value) => handleToggle("delivery.routes", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Long Routes"
              description="Enable long-distance route deliveries"
              enabled={flags.delivery.longRoutes}
              onChange={(value) => handleToggle("delivery.longRoutes", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Long Haul"
              description="Enable cross-country long haul delivery"
              enabled={flags.delivery.longHaul}
              onChange={(value) => handleToggle("delivery.longHaul", value)}
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Courier Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>👤 Courier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="Rate Cards"
              description="Enable custom rate cards for couriers"
              enabled={flags.courier.rateCards}
              onChange={(value) => handleToggle("courier.rateCards", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Equipment Badges"
              description="Show equipment badges for couriers"
              enabled={flags.courier.equipmentBadges}
              onChange={(value) =>
                handleToggle("courier.equipmentBadges", value)
              }
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Work Modes"
              description="Enable different work modes for couriers"
              enabled={flags.courier.workModes}
              onChange={(value) => handleToggle("courier.workModes", value)}
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Seller Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>🏪 Seller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="Stripe Connect"
              description="Enable Stripe Connect for seller payouts"
              enabled={flags.seller.stripeConnect}
              onChange={(value) => handleToggle("seller.stripeConnect", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Multiple Photos"
              description="Allow multiple photos per listing"
              enabled={flags.seller.multiplePhotos}
              onChange={(value) => handleToggle("seller.multiplePhotos", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Food Listings"
              description="Enable food and perishable item listings"
              enabled={flags.seller.foodListings}
              onChange={(value) => handleToggle("seller.foodListings", value)}
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Customer Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>🛍️ Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="Live Tracking"
              description="Enable real-time delivery tracking"
              enabled={flags.customer.liveTracking}
              onChange={(value) => handleToggle("customer.liveTracking", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Proof Photos"
              description="Show delivery proof photos to customers"
              enabled={flags.customer.proofPhotos}
              onChange={(value) => handleToggle("customer.proofPhotos", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Route Delivery"
              description="Allow customers to use route delivery"
              enabled={flags.customer.routeDelivery}
              onChange={(value) =>
                handleToggle("customer.routeDelivery", value)
              }
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Package Shipping"
              description="Enable package shipping for customers"
              enabled={flags.customer.packageShipping}
              onChange={(value) =>
                handleToggle("customer.packageShipping", value)
              }
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Package Runner Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>📦 Package Runner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="Package Runner Enabled"
              description="Enable the package runner service"
              enabled={flags.packageRunner.enabled}
              onChange={(value) => handleToggle("packageRunner.enabled", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Hub Network"
              description="Enable hub network for package routing"
              enabled={flags.packageRunner.hubNetwork}
              onChange={(value) =>
                handleToggle("packageRunner.hubNetwork", value)
              }
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Package Tracking"
              description="Enable detailed package tracking"
              enabled={flags.packageRunner.packageTracking}
              onChange={(value) =>
                handleToggle("packageRunner.packageTracking", value)
              }
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* Admin Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>⚙️ Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="Courier Approval"
              description="Require admin approval for new couriers"
              enabled={flags.admin.courierApproval}
              onChange={(value) => handleToggle("admin.courierApproval", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Equipment Review"
              description="Enable equipment review workflow"
              enabled={flags.admin.equipmentReview}
              onChange={(value) => handleToggle("admin.equipmentReview", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Dispute Management"
              description="Enable dispute management system"
              enabled={flags.admin.disputeManagement}
              onChange={(value) =>
                handleToggle("admin.disputeManagement", value)
              }
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Analytics"
              description="Enable admin analytics dashboard"
              enabled={flags.admin.analytics}
              onChange={(value) => handleToggle("admin.analytics", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Feature Flags Control"
              description="Enable feature flags management interface"
              enabled={flags.admin.featureFlagsControl}
              onChange={(value) =>
                handleToggle("admin.featureFlagsControl", value)
              }
              disabled={true}
            />
            <p className="text-xs text-gray-500 italic mt-2">
              Note: This setting is read-only to prevent self-locking
            </p>
          </CardContent>
        </Card>

        {/* Advanced Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>🔧 Advanced</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="Push Notifications"
              description="Enable push notifications across the platform"
              enabled={flags.advanced.pushNotifications}
              onChange={(value) =>
                handleToggle("advanced.pushNotifications", value)
              }
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Rating Enforcement"
              description="Enforce minimum rating requirements"
              enabled={flags.advanced.ratingEnforcement}
              onChange={(value) =>
                handleToggle("advanced.ratingEnforcement", value)
              }
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Auto Cancel"
              description="Automatically cancel stale requests"
              enabled={flags.advanced.autoCancel}
              onChange={(value) => handleToggle("advanced.autoCancel", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Refunds"
              description="Enable refund processing"
              enabled={flags.advanced.refunds}
              onChange={(value) => handleToggle("advanced.refunds", value)}
              disabled={isSaving}
            />
          </CardContent>
        </Card>

        {/* UI Section */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>🎨 UI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureFlagToggle
              label="Modern Styling"
              description="Use modern glassmorphic UI design"
              enabled={flags.ui.modernStyling}
              onChange={(value) => handleToggle("ui.modernStyling", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Dark Mode"
              description="Enable dark mode support"
              enabled={flags.ui.darkMode}
              onChange={(value) => handleToggle("ui.darkMode", value)}
              disabled={isSaving}
            />
            <FeatureFlagToggle
              label="Animations"
              description="Enable UI animations and transitions"
              enabled={flags.ui.animations}
              onChange={(value) => handleToggle("ui.animations", value)}
              disabled={isSaving}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
