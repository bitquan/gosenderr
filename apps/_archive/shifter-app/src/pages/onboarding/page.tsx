
import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useNavigate } from "react-router-dom";
import { GlassCard, LoadingSkeleton } from "@gosenderr/ui";
import { RunnerVehicleType, HubDoc } from "@gosenderr/shared";

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface VehicleFormData {
  vehicleType: RunnerVehicleType | "";
  vehicleCapacity: string;
  maxWeight: string;
  year: string;
  make: string;
  model: string;
  licensePlate: string;
  vin: string;
}

interface InsuranceFormData {
  policyNumber: string;
  carrier: string;
  coverageAmount: string;
  expiresAt: string;
  file: File | null;
}

interface DOTFormData {
  dotNumber: string;
  mcNumber: string;
}

export default function RunnerOnboardingPage() {
  const { user, loading: authLoading } = useAuthUser();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hubs, setHubs] = useState<HubDoc[]>([]);
  const [hubsLoading, setHubsLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<string | null>(null);

  // Form data
  const [vehicleData, setVehicleData] = useState<VehicleFormData>({
    vehicleType: "",
    vehicleCapacity: "",
    maxWeight: "",
    year: "",
    make: "",
    model: "",
    licensePlate: "",
    vin: "",
  });

  const [insuranceData, setInsuranceData] = useState<InsuranceFormData>({
    policyNumber: "",
    carrier: "",
    coverageAmount: "",
    expiresAt: "",
    file: null,
  });

  const [dotData, setDOTData] = useState<DOTFormData>({
    dotNumber: "",
    mcNumber: "",
  });

  const [selectedHubId, setSelectedHubId] = useState<string>("");
  const [preferredRoutes, setPreferredRoutes] = useState<
    {
      fromHubId: string;
      toHubId: string;
      frequency: "daily" | "weekly" | "on_demand";
      daysAvailable: string[];
    }[]
  >([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    // Check if user already has approved runner profile
    if (user) {
      checkOnboardingStatus();
    }
  }, [user, authLoading, navigate]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profile = userData.packageRunnerProfile;

        // If user has an approved profile, redirect to dashboard
        if (profile?.status === "approved") {
          console.log("✅ Runner already approved, redirecting to dashboard");
          navigate("/runner/dashboard");
          return;
        }

        // Track the status for UI display
        if (profile?.status) {
          setUserStatus(profile.status);
        }

        // If pending review, show a message
        if (profile?.status === "pending_review") {
          console.log("⏳ Runner application pending review");
        }
      }
    } catch (err) {
      console.error("Error checking onboarding status:", err);
    }
  };

  useEffect(() => {
    loadHubs();
  }, []);

  const loadHubs = async () => {
    try {
      setHubsLoading(true);
      const hubsSnapshot = await getDocs(collection(db, "hubs"));
      const hubsData = hubsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        hubId: doc.id,
      })) as HubDoc[];
      setHubs(hubsData);
    } catch (err) {
      console.error("Failed to load hubs:", err);
      setError("Failed to load hubs");
    } finally {
      setHubsLoading(false);
    }
  };

  const handleVehicleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (
      !vehicleData.vehicleType ||
      !vehicleData.vehicleCapacity ||
      !vehicleData.maxWeight ||
      !vehicleData.year ||
      !vehicleData.make ||
      !vehicleData.model ||
      !vehicleData.licensePlate ||
      !vehicleData.vin
    ) {
      setError("All vehicle fields are required");
      return;
    }
    setError(null);
    setCurrentStep(2);
  };

  const handleInsuranceSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (
      !insuranceData.file ||
      !insuranceData.policyNumber ||
      !insuranceData.carrier ||
      !insuranceData.coverageAmount ||
      !insuranceData.expiresAt
    ) {
      setError("All insurance fields are required");
      return;
    }
    setError(null);
    setCurrentStep(3);
  };

  const handleDOTSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCurrentStep(4);
  };

  const handleHubSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHubId) {
      setError("Please select a home hub");
      return;
    }
    setError(null);
    setCurrentStep(5);
  };

  const handleFinalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Upload insurance document
      let insurancePhotoUrl = "";
      if (insuranceData.file) {
        const storageRef = ref(
          storage,
          `insurance/${user.uid}/${Date.now()}_${insuranceData.file.name}`,
        );
        await uploadBytes(storageRef, insuranceData.file);
        insurancePhotoUrl = await getDownloadURL(storageRef);
      }

      const selectedHub = hubs.find((h) => h.hubId === selectedHubId);

      // Build profile object, only including DOT/MC numbers if they exist
      const profileData: any = {
        status: "pending_review",
        vehicleType: vehicleData.vehicleType,
        vehicleCapacity: parseInt(vehicleData.vehicleCapacity),
        maxWeight: parseInt(vehicleData.maxWeight),
        vehicleDetails: {
          year: vehicleData.year,
          make: vehicleData.make,
          model: vehicleData.model,
          licensePlate: vehicleData.licensePlate,
          vin: vehicleData.vin,
        },
        commercialInsurance: {
          photoUrl: insurancePhotoUrl,
          policyNumber: insuranceData.policyNumber,
          carrier: insuranceData.carrier,
          coverageAmount: parseFloat(insuranceData.coverageAmount),
          approved: false,
          expiresAt: new Date(insuranceData.expiresAt),
        },
        preferredRoutes,
        homeHub: {
          hubId: selectedHub?.hubId || selectedHubId,
          name: selectedHub?.name || "",
          location: selectedHub?.location || { lat: 0, lng: 0 },
        },
        totalRuns: 0,
        totalPackages: 0,
        totalMiles: 0,
        totalEarnings: 0,
        averageRating: 0,
        onTimePercentage: 0,
        availableForRuns: false,
        stripeConnectAccountId: "",
      };

      // Only add DOT/MC numbers if they exist
      if (dotData.dotNumber) {
        profileData.dotNumber = dotData.dotNumber;
      }
      if (dotData.mcNumber) {
        profileData.mcNumber = dotData.mcNumber;
      }

      // Update user document with package runner profile
      await updateDoc(doc(db, "users", user.uid), {
        role: "package_runner",
        packageRunnerProfile: profileData,
        updatedAt: serverTimestamp(),
      });

      // Redirect to dashboard which will show pending status
      navigate("/runner/dashboard");
    } catch (err) {
      console.error("Failed to submit onboarding:", err);
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addPreferredRoute = () => {
    setPreferredRoutes([
      ...preferredRoutes,
      {
        fromHubId: "",
        toHubId: "",
        frequency: "weekly",
        daysAvailable: [],
      },
    ]);
  };

  const updatePreferredRoute = (index: number, field: string, value: any) => {
    const updated = [...preferredRoutes];
    (updated[index] as any)[field] = value;
    setPreferredRoutes(updated);
  };

  const removePreferredRoute = (index: number) => {
    setPreferredRoutes(preferredRoutes.filter((_, i) => i !== index));
  };

  if (authLoading || hubsLoading) {
    return (
      <div
        className="container"
        style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}
      >
        <GlassCard>
          <LoadingSkeleton lines={5} />
        </GlassCard>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "40px" }}>
        Package Runner Onboarding
      </h1>

      {/* Status Message */}
      {userStatus === "pending_review" && (
        <GlassCard
          style={{
            marginBottom: "30px",
            backgroundColor: "#fef3c7",
            border: "2px solid #fbbf24",
          }}
        >
          <div style={{ display: "flex", alignItems: "start", gap: "16px" }}>
            <div style={{ fontSize: "32px" }}>⏳</div>
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: "8px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#92400e",
                }}
              >
                Application Under Review
              </h3>
              <p style={{ margin: 0, color: "#78350f" }}>
                Your runner application has been submitted and is currently
                being reviewed by our admin team. You'll receive a notification
                once your application is processed. Please check back or visit
                your{" "}
                <a
                  href="/runner/dashboard"
                  style={{ textDecoration: "underline", fontWeight: "600" }}
                >
                  dashboard
                </a>{" "}
                for updates.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Progress Indicator */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              style={{
                width: "18%",
                height: "4px",
                backgroundColor: step <= currentStep ? "#3b82f6" : "#e5e7eb",
                borderRadius: "2px",
              }}
            />
          ))}
        </div>
        <div
          style={{ textAlign: "center", fontSize: "14px", color: "#6b7280" }}
        >
          Step {currentStep} of 5
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Vehicle Info */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard>
              <h2 style={{ marginTop: 0 }}>Vehicle Information</h2>
              <form onSubmit={handleVehicleSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Vehicle Type <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={vehicleData.vehicleType}
                    onChange={(e) =>
                      setVehicleData({
                        ...vehicleData,
                        vehicleType: e.target.value as RunnerVehicleType,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                    required
                  >
                    <option value="">Select vehicle type</option>
                    <option value="cargo_van">Cargo Van</option>
                    <option value="sprinter">Sprinter Van</option>
                    <option value="box_truck">Box Truck</option>
                  </select>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Capacity (cubic ft){" "}
                      <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={vehicleData.vehicleCapacity}
                      onChange={(e) =>
                        setVehicleData({
                          ...vehicleData,
                          vehicleCapacity: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Max Weight (lbs){" "}
                      <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={vehicleData.maxWeight}
                      onChange={(e) =>
                        setVehicleData({
                          ...vehicleData,
                          maxWeight: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr 2fr",
                    gap: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Year <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleData.year}
                      onChange={(e) =>
                        setVehicleData({ ...vehicleData, year: e.target.value })
                      }
                      placeholder="2020"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Make <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleData.make}
                      onChange={(e) =>
                        setVehicleData({ ...vehicleData, make: e.target.value })
                      }
                      placeholder="Ford"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Model <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleData.model}
                      onChange={(e) =>
                        setVehicleData({
                          ...vehicleData,
                          model: e.target.value,
                        })
                      }
                      placeholder="Transit"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      License Plate <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleData.licensePlate}
                      onChange={(e) =>
                        setVehicleData({
                          ...vehicleData,
                          licensePlate: e.target.value,
                        })
                      }
                      placeholder="ABC1234"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      VIN <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleData.vin}
                      onChange={(e) =>
                        setVehicleData({ ...vehicleData, vin: e.target.value })
                      }
                      placeholder="17-digit VIN"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Continue
                </button>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 2: Insurance */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard>
              <h2 style={{ marginTop: 0 }}>Commercial Insurance</h2>
              <form onSubmit={handleInsuranceSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Insurance Document{" "}
                    <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setInsuranceData({
                        ...insuranceData,
                        file: e.target.files?.[0] || null,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                    required
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Upload your commercial insurance certificate
                  </p>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Policy Number <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={insuranceData.policyNumber}
                    onChange={(e) =>
                      setInsuranceData({
                        ...insuranceData,
                        policyNumber: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Insurance Carrier{" "}
                    <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={insuranceData.carrier}
                    onChange={(e) =>
                      setInsuranceData({
                        ...insuranceData,
                        carrier: e.target.value,
                      })
                    }
                    placeholder="e.g., Progressive, State Farm"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                    required
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Coverage Amount{" "}
                      <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={insuranceData.coverageAmount}
                      onChange={(e) =>
                        setInsuranceData({
                          ...insuranceData,
                          coverageAmount: e.target.value,
                        })
                      }
                      placeholder="1000000"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: 500,
                      }}
                    >
                      Expiration Date{" "}
                      <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={insuranceData.expiresAt}
                      onChange={(e) =>
                        setInsuranceData({
                          ...insuranceData,
                          expiresAt: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Continue
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 3: DOT/MC Numbers */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard>
              <h2 style={{ marginTop: 0 }}>DOT/MC Numbers (Optional)</h2>
              <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                If you have DOT and MC numbers, please provide them. These are
                optional but recommended for interstate commerce.
              </p>
              <form onSubmit={handleDOTSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    DOT Number
                  </label>
                  <input
                    type="text"
                    value={dotData.dotNumber}
                    onChange={(e) =>
                      setDOTData({ ...dotData, dotNumber: e.target.value })
                    }
                    placeholder="12345678"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    MC Number
                  </label>
                  <input
                    type="text"
                    value={dotData.mcNumber}
                    onChange={(e) =>
                      setDOTData({ ...dotData, mcNumber: e.target.value })
                    }
                    placeholder="123456"
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Continue
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 4: Home Hub */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard>
              <h2 style={{ marginTop: 0 }}>Select Home Hub</h2>
              <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                Choose your primary hub where you'll start and end most of your
                routes.
              </p>
              <form onSubmit={handleHubSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 500,
                    }}
                  >
                    Home Hub <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={selectedHubId}
                    onChange={(e) => setSelectedHubId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                    required
                  >
                    <option value="">Select a hub</option>
                    {hubs.map((hub) => (
                      <option key={hub.hubId} value={hub.hubId}>
                        {hub.name} - {hub.city}, {hub.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Continue
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Step 5: Preferred Routes */}
        {currentStep === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard>
              <h2 style={{ marginTop: 0 }}>Preferred Routes (Optional)</h2>
              <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                Add routes you're interested in running regularly. You can skip
                this and add routes later.
              </p>
              <form onSubmit={handleFinalSubmit}>
                {preferredRoutes.map((route, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "20px",
                      padding: "16px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <h4 style={{ margin: 0 }}>Route {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removePreferredRoute(index)}
                        style={{
                          padding: "4px 12px",
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "14px",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "14px",
                          }}
                        >
                          From Hub
                        </label>
                        <select
                          value={route.fromHubId}
                          onChange={(e) =>
                            updatePreferredRoute(
                              index,
                              "fromHubId",
                              e.target.value,
                            )
                          }
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                          }}
                        >
                          <option value="">Select hub</option>
                          {hubs.map((hub) => (
                            <option key={hub.hubId} value={hub.hubId}>
                              {hub.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "14px",
                          }}
                        >
                          To Hub
                        </label>
                        <select
                          value={route.toHubId}
                          onChange={(e) =>
                            updatePreferredRoute(
                              index,
                              "toHubId",
                              e.target.value,
                            )
                          }
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #d1d5db",
                            fontSize: "14px",
                          }}
                        >
                          <option value="">Select hub</option>
                          {hubs.map((hub) => (
                            <option key={hub.hubId} value={hub.hubId}>
                              {hub.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontSize: "14px",
                        }}
                      >
                        Frequency
                      </label>
                      <select
                        value={route.frequency}
                        onChange={(e) =>
                          updatePreferredRoute(
                            index,
                            "frequency",
                            e.target.value,
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                        }}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="on_demand">On Demand</option>
                      </select>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addPreferredRoute}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "1px dashed #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                    marginBottom: "20px",
                  }}
                >
                  + Add Preferred Route
                </button>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: loading ? "#9ca3af" : "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 500,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Submitting..." : "Complete Onboarding"}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
