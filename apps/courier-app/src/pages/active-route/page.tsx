
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthSafe } from "@/lib/firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRoutes } from "@/hooks/useRoutes";
import { GlassCard, LoadingSkeleton } from "@gosenderr/ui";
import { captureGPSPhoto } from "@/lib/gpsPhoto";
import { motion } from "framer-motion";
import type { RouteDoc, RouteStop } from "@gosenderr/shared";

export default function ActiveRoutePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState<{
    url: string;
    coordinates: any;
    timestamp: Date;
  } | null>(null);
  const [completingStop, setCompletingStop] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const { routes, loading: routesLoading } = useRoutes({
    status: "in_progress",
    courierId: currentUser?.uid,
  });

  const activeRoute = routes[0]; // Get the first (and should be only) active route

  const currentStop = activeRoute?.optimizedStops.find(
    (stop) => !stop.completed,
  );
  const completedStops = activeRoute?.completedJobs || 0;
  const totalStops = activeRoute?.totalJobs || 0;
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  const upcomingStops = activeRoute?.optimizedStops
    .filter((stop) => !stop.completed)
    .slice(1, 4); // Show next 3 upcoming stops

  const handleCapturePhoto = async () => {
    if (!currentUser || !currentStop) return;

    setCapturingPhoto(true);

    try {
      const result = await captureGPSPhoto(currentUser.uid, currentStop.jobId, {
        quality: 0.7,
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
      });

      setCapturedPhoto(result);
    } catch (error) {
      console.error("Failed to capture photo:", error);
      alert("Failed to capture photo with GPS. Please try again.");
    } finally {
      setCapturingPhoto(false);
    }
  };

  const handleCompleteStop = async () => {
    if (!activeRoute || !currentStop || !capturedPhoto) return;

    setCompletingStop(true);

    try {
      const routeRef = doc(db, "routes", activeRoute.routeId);

      // Update the stop as completed
      const updatedStops = activeRoute.optimizedStops.map((stop) => {
        if (stop.jobId === currentStop.jobId) {
          return {
            ...stop,
            completed: true,
            completedAt: serverTimestamp(),
            proofOfDelivery: {
              photoUrl: capturedPhoto.url,
              coordinates: capturedPhoto.coordinates,
              timestamp: capturedPhoto.timestamp,
            },
          };
        }
        return stop;
      });

      const newCompletedJobs = completedStops + 1;
      const allCompleted = newCompletedJobs === totalStops;

      await updateDoc(routeRef, {
        optimizedStops: updatedStops,
        completedJobs: newCompletedJobs,
        currentStopIndex: activeRoute.currentStopIndex + 1,
        ...(allCompleted && {
          status: "completed",
          completedAt: serverTimestamp(),
        }),
      });

      setCapturedPhoto(null);

      if (allCompleted) {
        alert("🎉 Route completed! Great job!");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error completing stop:", error);
      alert("Failed to complete stop. Please try again.");
    } finally {
      setCompletingStop(false);
    }
  };

  const handleNavigate = () => {
    if (!currentStop) return;
    const { lat, lng } = currentStop.location;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(mapsUrl, "_blank");
  };

  if (authLoading || routesLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Active Route</h1>
        <GlassCard>
          <LoadingSkeleton lines={5} />
        </GlassCard>
      </div>
    );
  }

  if (!activeRoute) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 glass-card">
          <h2 className="text-2xl font-bold mb-4">No Active Route</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have an active route. Accept a route to get started!
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/routes")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            View Available Routes
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-y-auto pb-24 safe-top">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header with Progress */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Active Route</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {activeRoute.area.name}
        </p>
      </div>

      {/* Progress Bar */}
      <GlassCard>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-gray-600 dark:text-gray-400">
              {completedStops} / {totalStops} stops completed
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="bg-green-600 h-3 rounded-full"
            />
          </div>
        </div>
      </GlassCard>

      {/* Current Stop */}
      {currentStop && (
        <GlassCard>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold mb-1">Current Stop</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentStop.location.address}
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                {currentStop.jobType}
              </span>
            </div>

            {/* Pickup Instructions for Food */}
            {currentStop.jobType === "food" &&
              currentStop.specialRequirements && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Pickup Instructions:
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {currentStop.specialRequirements.join(", ")}
                  </p>
                </div>
              )}

            {/* Navigation Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNavigate}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>🗺️</span>
              Navigate to Stop
            </motion.button>

            {/* GPS Photo Capture */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Complete Delivery:</p>
              {!capturedPhoto ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCapturePhoto}
                  disabled={capturingPhoto}
                  className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>📸</span>
                  {capturingPhoto ? "Capturing..." : "Capture GPS Photo"}
                </motion.button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <img
                      src={capturedPhoto.url}
                      alt="Captured delivery proof"
                      className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>📍</span>
                      <span>
                        GPS: {capturedPhoto.coordinates.latitude.toFixed(6)},{" "}
                        {capturedPhoto.coordinates.longitude.toFixed(6)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        ±{capturedPhoto.coordinates.accuracy.toFixed(0)}m
                      </span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCompleteStop}
                    disabled={completingStop}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {completingStop
                      ? "Completing..."
                      : "✓ Complete Stop & Continue"}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Upcoming Stops */}
      {upcomingStops && upcomingStops.length > 0 && (
        <GlassCard>
          <h2 className="text-xl font-bold mb-4">Upcoming Stops</h2>
          <div className="space-y-3">
            {upcomingStops.map((stop, index) => (
              <div
                key={stop.jobId}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full text-sm font-medium">
                  {completedStops + index + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {stop.location.address}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stop.jobType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
      </div>
    </div>
  );
}
