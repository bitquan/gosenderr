"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { GlassCard, LoadingSkeleton } from "@/components/GlassCard";
import { MapboxMap } from "@/components/v2/MapboxMap";
import { motion } from "framer-motion";
import { NotFoundPage } from "@/components/ui/NotFoundPage";
import type {
  PackageDoc,
  PackageStatus,
  LegType,
  LegStatus,
  ScanType,
  PackageJourneyLeg,
  PackageScan,
} from "@gosenderr/shared";
import type { Timestamp } from "firebase/firestore";

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

const statusMap: Record<PackageStatus, StatusConfig> = {
  pickup_pending: {
    label: "Package pickup pending",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 border-yellow-300",
  },
  at_origin_hub: {
    label: "Package at origin hub",
    color: "text-blue-600",
    bgColor: "bg-blue-100 border-blue-300",
  },
  in_transit: {
    label: "Package in transit",
    color: "text-blue-600",
    bgColor: "bg-blue-100 border-blue-300",
  },
  at_destination_hub: {
    label: "Package at destination hub",
    color: "text-blue-600",
    bgColor: "bg-blue-100 border-blue-300",
  },
  out_for_delivery: {
    label: "Out for delivery",
    color: "text-purple-600",
    bgColor: "bg-purple-100 border-purple-300",
  },
  delivered: {
    label: "Delivered",
    color: "text-green-600",
    bgColor: "bg-green-100 border-green-300",
  },
};

const legTypeLabels: Record<LegType, string> = {
  local_pickup: "Local Pickup",
  long_haul: "Long Haul Transit",
  hub_transfer: "Hub Transfer",
  local_delivery: "Local Delivery",
};

const scanTypeLabels: Record<ScanType, string> = {
  picked_up: "Picked Up",
  hub_arrival: "Hub Arrival",
  hub_departure: "Hub Departure",
  hub_transfer: "Hub Transfer",
  delivered: "Delivered",
};

function formatTimestamp(timestamp: Timestamp | undefined): string {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate();
  return (
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}

function getStatusLabel(pkg: PackageDoc): string {
  const status = pkg.currentStatus;
  const config = statusMap[status];

  if (status === "at_origin_hub" || status === "at_destination_hub") {
    const currentLeg = pkg.journey[pkg.currentLeg];
    if (currentLeg?.hubId) {
      return `${config.label} - ${currentLeg.hubId}`;
    }
  }

  if (status === "in_transit") {
    const currentLeg = pkg.journey[pkg.currentLeg];
    if (currentLeg?.toHub) {
      return `${config.label} to ${currentLeg.toHub}`;
    }
  }

  return config.label;
}

export default function PackageTrackingPage() {
  const params = useParams();
  const trackingNumber = params.trackingNumber as string;
  const [packageData, setPackageData] = useState<PackageDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!db || !trackingNumber) return;

    const packagesRef = collection(db, "packages");
    const q = query(packagesRef, where("trackingNumber", "==", trackingNumber));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const doc = snapshot.docs[0];
        setPackageData({ ...doc.data(), packageId: doc.id } as PackageDoc);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching package:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [trackingNumber]);

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-6xl mx-auto space-y-6">
          <GlassCard>
            <LoadingSkeleton lines={4} />
          </GlassCard>
          <GlassCard>
            <LoadingSkeleton lines={6} />
          </GlassCard>
        </div>
      </div>
    );
  }

  if (notFound || !packageData) {
    return (
      <NotFoundPage
        title="Package not found"
        description={`We couldn't find a package with tracking number ${trackingNumber}. Double-check it and try again.`}
        actionHref="/track/package"
        actionLabel="Try Another Tracking Number"
        emoji="📦"
      />
    );
  }

  const statusConfig = statusMap[packageData.currentStatus];
  const statusLabel = getStatusLabel(packageData);
  const estimatedDelivery =
    packageData.estimatedDeliveryAt?.toDate?.() ||
    (packageData.createdAt?.toDate
      ? new Date(
          packageData.createdAt.toDate().getTime() + 2 * 24 * 60 * 60 * 1000,
        )
      : null);

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Status Banner */}
        <GlassCard className={`border-2 ${statusConfig.bgColor}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📦</span>
                <div>
                  <h1 className={`text-2xl font-bold ${statusConfig.color}`}>
                    {statusLabel}
                  </h1>
                  <p className="text-gray-600 font-mono text-sm">
                    Tracking: {packageData.trackingNumber}
                  </p>
                </div>
              </div>
              {packageData.currentStatus !== "delivered" &&
                estimatedDelivery && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-1">
                      Estimated Delivery Window
                    </p>
                    <p className="text-lg font-semibold">
                      {estimatedDelivery.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {estimatedDelivery.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              {packageData.currentStatus === "delivered" &&
                packageData.deliveredAt && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-1">Delivered On</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatTimestamp(packageData.deliveredAt)}
                    </p>
                  </div>
                )}
            </div>
          </div>
        </GlassCard>

        {/* Live Map */}
        {packageData.currentLocation && (
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Current Location</h2>
            <MapboxMap
              pickup={{
                lat: packageData.origin.location.lat,
                lng: packageData.origin.location.lng,
                label: packageData.origin.address,
              }}
              dropoff={{
                lat: packageData.destination.location.lat,
                lng: packageData.destination.location.lng,
                label: packageData.destination.address,
              }}
              courierLocation={packageData.currentLocation}
              height="400px"
            />
            <p className="text-sm text-gray-500 mt-2">
              Last updated:{" "}
              {formatTimestamp(packageData.currentLocation.updatedAt)}
            </p>
          </GlassCard>
        )}

        {/* Journey Timeline */}
        <GlassCard>
          <h2 className="text-xl font-bold mb-6">Journey Timeline</h2>
          <div className="space-y-6">
            {packageData.journey.map((leg, index) => {
              const isCompleted = leg.status === "completed";
              const isInProgress = leg.status === "in_progress";
              const isPending = leg.status === "pending";

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isInProgress
                            ? "bg-blue-500 border-blue-500 text-white animate-pulse"
                            : "bg-gray-200 border-gray-300 text-gray-400"
                      }`}
                    >
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    {index < packageData.journey.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-[40px] ${
                          isCompleted ? "bg-green-300" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>

                  {/* Leg details */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">
                        {legTypeLabels[leg.type]}
                      </h3>
                      {isInProgress && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          Currently in progress
                        </span>
                      )}
                    </div>

                    {leg.type === "local_pickup" && (
                      <p className="text-sm text-gray-600">
                        {packageData.origin.address}
                      </p>
                    )}

                    {leg.type === "long_haul" && (
                      <p className="text-sm text-gray-600">
                        {leg.fromHub} → {leg.toHub}
                      </p>
                    )}

                    {leg.type === "hub_transfer" && (
                      <p className="text-sm text-gray-600">
                        Transfer at {leg.hubId}
                      </p>
                    )}

                    {leg.type === "local_delivery" && (
                      <p className="text-sm text-gray-600">
                        {packageData.destination.address}
                      </p>
                    )}

                    {isCompleted && leg.completedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Completed: {formatTimestamp(leg.completedAt)}
                      </p>
                    )}

                    {isInProgress && leg.startedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Started: {formatTimestamp(leg.startedAt)}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Package Details */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Package Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Weight</p>
                <p className="font-semibold">{packageData.weight} lbs</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dimensions</p>
                <p className="font-semibold">
                  {packageData.dimensions.length}" ×{" "}
                  {packageData.dimensions.width}" ×{" "}
                  {packageData.dimensions.height}"
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Volume</p>
                <p className="font-semibold">{packageData.volume} cu ft</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Declared Value</p>
                <p className="font-semibold">
                  ${packageData.declaredValue.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Service Level</p>
                <p className="font-semibold capitalize">
                  {packageData.serviceLevel}
                </p>
              </div>
              {packageData.fragile && (
                <div className="flex items-center gap-2 text-orange-600">
                  <span>⚠️</span>
                  <p className="font-semibold">Fragile - Handle with care</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Scan History */}
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Scan History</h2>
            {packageData.scans.length === 0 ? (
              <p className="text-gray-500 text-sm">No scans recorded yet</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {[...packageData.scans]
                  .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
                  .map((scan, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-l-2 border-gray-300 pl-3 py-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {scanTypeLabels[scan.type]}
                          </p>
                          <p className="text-xs text-gray-600">
                            {scan.location}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {formatTimestamp(scan.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Origin & Destination */}
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Origin</h2>
            <p className="text-gray-700">{packageData.origin.address}</p>
            <p className="text-sm text-gray-500 mt-2">
              Hub: {packageData.origin.hubId}
            </p>
            <p className="text-sm text-gray-500">
              Distance to hub: {packageData.origin.hubDistance.toFixed(1)} miles
            </p>
          </GlassCard>

          <GlassCard>
            <h2 className="text-xl font-bold mb-4">Destination</h2>
            <p className="text-gray-700">{packageData.destination.address}</p>
            <p className="text-sm text-gray-500 mt-2">
              Hub: {packageData.destination.hubId}
            </p>
            <p className="text-sm text-gray-500">
              Distance to hub: {packageData.destination.hubDistance.toFixed(1)}{" "}
              miles
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
