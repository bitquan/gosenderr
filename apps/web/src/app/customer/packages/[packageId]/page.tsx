"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { GlassCard, LoadingSkeleton } from "@/components/GlassCard";
import Link from "next/link";

export default function PackageDetailsPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = use(params);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/login");
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      loadPackage();
    }
  }, [currentUser, packageId]);

  const loadPackage = async () => {
    try {
      const packageDoc = await getDoc(doc(db, "packages", packageId));
      if (!packageDoc.exists()) {
        alert("Package not found");
        router.push("/customer/packages");
        return;
      }

      const data = { id: packageDoc.id, ...packageDoc.data() } as any;

      // Check if user owns this package
      if (data.senderId !== currentUser.uid) {
        alert("You don't have permission to view this package");
        router.push("/customer/packages");
        return;
      }

      setPackageData(data);
    } catch (error) {
      console.error("Error loading package:", error);
      alert("Failed to load package");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <GlassCard>
          <p className="text-center py-12">Package not found</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/customer/packages"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to Packages
        </Link>
        <h1 className="text-3xl font-bold mb-2">Package Details</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Tracking Number: {packageData.trackingNumber}
        </p>
      </div>

      {/* Status Card */}
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4">Current Status</h2>
        <div className="flex items-center justify-between">
          <span
            className={`px-4 py-2 rounded-full text-lg font-medium ${
              packageData.currentStatus === "delivered"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : packageData.currentStatus === "in_transit"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            }`}
          >
            {packageData.currentStatus?.replace(/_/g, " ") || "Unknown"}
          </span>
          <Link
            href={`/track/package/${packageData.trackingNumber}`}
            className="text-blue-600 hover:underline"
          >
            View Public Tracking →
          </Link>
        </div>
      </GlassCard>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="font-semibold mb-2">📍 Origin</h3>
          <p className="text-gray-700 dark:text-gray-300">
            {packageData.origin?.address || "Unknown"}
          </p>
        </GlassCard>
        <GlassCard>
          <h3 className="font-semibold mb-2">🎯 Destination</h3>
          <p className="text-gray-700 dark:text-gray-300">
            {packageData.destination?.address || "Unknown"}
          </p>
        </GlassCard>
      </div>

      {/* Package Details */}
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4">Package Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Weight</div>
            <div className="font-semibold">
              {packageData.weight || "N/A"} lbs
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Dimensions</div>
            <div className="font-semibold">
              {packageData.length && packageData.width && packageData.height
                ? `${packageData.length}×${packageData.width}×${packageData.height}`
                : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Service Level</div>
            <div className="font-semibold capitalize">
              {packageData.serviceLevel || "Standard"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Fragile</div>
            <div className="font-semibold">
              {packageData.fragile ? "Yes" : "No"}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Pricing */}
      {packageData.pricing && (
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Pricing</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Local Pickup</span>
              <span>
                ${packageData.pricing.localPickup?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Local Delivery</span>
              <span>
                ${packageData.pricing.localDelivery?.toFixed(2) || "0.00"}
              </span>
            </div>
            {packageData.pricing.longHaulLegs?.length > 0 && (
              <div className="flex justify-between">
                <span>
                  Long Haul ({packageData.pricing.longHaulLegs.length} legs)
                </span>
                <span>
                  $
                  {packageData.pricing.longHaulLegs
                    .reduce((a: number, b: number) => a + b, 0)
                    .toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Platform Fee</span>
              <span>
                ${packageData.pricing.platformFee?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-green-600 dark:text-green-400">
                ${packageData.pricing.customerPaid?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Journey */}
      {packageData.journey && packageData.journey.length > 0 && (
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Journey</h2>
          <div className="space-y-3">
            {packageData.journey.map((leg: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                  {leg.legNumber}
                </div>
                <div className="flex-1">
                  <div className="font-medium capitalize">
                    {leg.type.replace(/_/g, " ")}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Status: {leg.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
