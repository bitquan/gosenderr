"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  // deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface ScheduledDelivery {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  frequency: "once" | "daily" | "weekly" | "monthly";
  packageSize: string;
  status: "active" | "paused" | "cancelled";
  nextDeliveryDate: string;
  createdAt: any;
}

export default function ScheduledDeliveriesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scheduledDeliveries, setScheduledDeliveries] = useState<
    ScheduledDelivery[]
  >([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pickupAddress: "",
    dropoffAddress: "",
    scheduledDate: "",
    scheduledTime: "",
    frequency: "once" as "once" | "daily" | "weekly" | "monthly",
    packageSize: "small",
  });

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.uid);
      await fetchScheduledDeliveries(user.uid);
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchScheduledDeliveries = async (uid: string) => {
    setLoading(true);
    const q = query(
      collection(db, "scheduledDeliveries"),
      where("customerId", "==", uid),
      where("status", "!=", "cancelled"),
    );
    const snapshot = await getDocs(q);
    const deliveries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScheduledDelivery[];
    setScheduledDeliveries(deliveries);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      await addDoc(collection(db, "scheduledDeliveries"), {
        ...formData,
        customerId: userId,
        status: "active",
        nextDeliveryDate: formData.scheduledDate,
        createdAt: serverTimestamp(),
      });

      alert("Scheduled delivery created successfully!");
      setShowAddForm(false);
      setFormData({
        pickupAddress: "",
        dropoffAddress: "",
        scheduledDate: "",
        scheduledTime: "",
        frequency: "once",
        packageSize: "small",
      });
      if (userId) await fetchScheduledDeliveries(userId);
    } catch (error) {
      console.error("Error creating scheduled delivery:", error);
      alert("Failed to create scheduled delivery");
    }
  };

  const handlePause = async (deliveryId: string) => {
    await updateDoc(doc(db, "scheduledDeliveries", deliveryId), {
      status: "paused",
    });
    if (userId) await fetchScheduledDeliveries(userId);
  };

  const handleResume = async (deliveryId: string) => {
    await updateDoc(doc(db, "scheduledDeliveries", deliveryId), {
      status: "active",
    });
    if (userId) await fetchScheduledDeliveries(userId);
  };

  const handleCancel = async (deliveryId: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled delivery?"))
      return;
    await updateDoc(doc(db, "scheduledDeliveries", deliveryId), {
      status: "cancelled",
    });
    if (userId) await fetchScheduledDeliveries(userId);
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      once: "One-time",
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Scheduled Deliveries
          </h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
          >
            {showAddForm ? "Cancel" : "+ Schedule Delivery"}
          </button>
        </div>

        {showAddForm && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Schedule New Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup Address *
                  </label>
                  <input
                    type="text"
                    value={formData.pickupAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, pickupAddress: e.target.value })
                    }
                    required
                    placeholder="123 Main St, City, ST 12345"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dropoff Address *
                  </label>
                  <input
                    type="text"
                    value={formData.dropoffAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dropoffAddress: e.target.value,
                      })
                    }
                    required
                    placeholder="456 Oak Ave, City, ST 12345"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scheduledDate: e.target.value,
                        })
                      }
                      required
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scheduledTime: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        frequency: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="once">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Package Size *
                  </label>
                  <select
                    value={formData.packageSize}
                    onChange={(e) =>
                      setFormData({ ...formData, packageSize: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
                >
                  Create Scheduled Delivery
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {scheduledDeliveries.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No scheduled deliveries
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Set up recurring deliveries for convenience
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
              >
                Schedule Your First Delivery
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {scheduledDeliveries.map((delivery) => (
              <Card key={delivery.id} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            delivery.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {delivery.status === "active" ? "Active" : "Paused"}
                        </span>
                        <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                          {getFrequencyLabel(delivery.frequency)}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500">From:</span>
                          <span className="font-medium text-gray-900">
                            {delivery.pickupAddress}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500">To:</span>
                          <span className="font-medium text-gray-900">
                            {delivery.dropoffAddress}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Next delivery:</span>
                          <span className="font-medium text-gray-900">
                            {delivery.nextDeliveryDate} at{" "}
                            {delivery.scheduledTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {delivery.status === "active" ? (
                        <button
                          onClick={() => handlePause(delivery.id)}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-yellow-600 bg-yellow-50 hover:bg-yellow-100 transition"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => handleResume(delivery.id)}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 transition"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        onClick={() => handleCancel(delivery.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
