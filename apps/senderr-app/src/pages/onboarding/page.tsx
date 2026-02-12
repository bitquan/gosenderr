import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { PackageRateCardBuilder } from "@/components/v2/PackageRateCardBuilder";
import { FoodRateCardBuilder } from "@/components/v2/FoodRateCardBuilder";
import { LoadingState } from "@gosenderr/ui";
import { PackageRateCard, FoodRateCard } from "@gosenderr/shared";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type VehicleType = "foot" | "bike" | "scooter" | "car" | "van" | "truck";
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type CourierProfileStatus = "pending" | "approved" | "rejected";
type CourierProfileSnapshot = {
  status?: CourierProfileStatus;
  rejectionReason?: string | null;
  vehicleType?: VehicleType;
  serviceRadius?: number;
  phone?: string;
  identity?: {
    legalName?: string;
    dateOfBirth?: string | null;
  };
  vehicleDetails?: {
    make?: string;
    model?: string;
    year?: string;
    licensePlate?: string;
  };
  insurance?: {
    provider?: string;
    policyNumber?: string;
    expiresAt?: string;
  };
  workModes?: {
    packagesEnabled?: boolean;
    foodEnabled?: boolean;
  };
  packageRateCard?: PackageRateCard;
  foodRateCard?: FoodRateCard;
};

type UploadedDocument = {
  label: string;
  url: string;
  name: string;
  contentType: string;
  uploadedAt: Date;
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { uid, loading: authLoading } = useAuthUser();
  const { userDoc, loading: userLoading } = useUserDoc();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [courierStatus, setCourierStatus] =
    useState<CourierProfileStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Step 1: Vehicle Type
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [serviceRadius, setServiceRadius] = useState(15);

  // Step 2: Identity & Contact
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Step 3: Vehicle Details
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  // Step 4: Insurance
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [policyExpiresAt, setPolicyExpiresAt] = useState("");

  const [documents, setDocuments] = useState<{
    governmentId: File | null;
    vehicleRegistration: File | null;
    insurance: File | null;
  }>({
    governmentId: null,
    vehicleRegistration: null,
    insurance: null,
  });

  // Step 2: Work Modes
  const [packagesEnabled, setPackagesEnabled] = useState(false);
  const [foodEnabled, setFoodEnabled] = useState(false);

  // Step 3 & 4: Rate Cards
  const [packageRateCard, setPackageRateCard] =
    useState<PackageRateCard | null>(null);
  const [foodRateCard, setFoodRateCard] = useState<FoodRateCard | null>(null);

  useEffect(() => {
    if (authLoading || userLoading) {
      setStatusLoading(true);
      return;
    }

    if (!uid) {
      setCourierStatus(null);
      setRejectionReason(null);
      setStatusLoading(false);
      return;
    }

    const profile = userDoc?.courierProfile as
      | CourierProfileSnapshot
      | undefined;
    const profileStatus = profile?.status ?? null;
    setCourierStatus(profileStatus);
    setRejectionReason(profile?.rejectionReason ?? null);

    if (profile && !prefilled) {
      setVehicleType(profile.vehicleType ?? "car");
      setServiceRadius(profile.serviceRadius ?? 15);
      setPhone(profile.phone ?? "");
      setLegalName(profile.identity?.legalName ?? "");
      setDateOfBirth(profile.identity?.dateOfBirth ?? "");
      setVehicleMake(profile.vehicleDetails?.make ?? "");
      setVehicleModel(profile.vehicleDetails?.model ?? "");
      setVehicleYear(profile.vehicleDetails?.year ?? "");
      setLicensePlate(profile.vehicleDetails?.licensePlate ?? "");
      setInsuranceProvider(profile.insurance?.provider ?? "");
      setPolicyNumber(profile.insurance?.policyNumber ?? "");
      setPolicyExpiresAt(profile.insurance?.expiresAt ?? "");
      setPackagesEnabled(Boolean(profile.workModes?.packagesEnabled));
      setFoodEnabled(Boolean(profile.workModes?.foodEnabled));
      setPackageRateCard(profile.packageRateCard ?? null);
      setFoodRateCard(profile.foodRateCard ?? null);
      setPrefilled(true);
    }

    setStatusLoading(false);
  }, [
    authLoading,
    userLoading,
    uid,
    userDoc,
    prefilled,
    setPackageRateCard,
    setFoodRateCard,
  ]);

  if (authLoading || userLoading || statusLoading) {
    return <LoadingState fullPage message="Loading your profile..." />;
  }

  if (!uid) {
    navigate("/login");
    return null;
  }

  const handleNext = () => {
    if (step === 2) {
      if (!legalName.trim() || !phone.trim() || !documents.governmentId) {
        alert(
          "Please provide your legal name, phone, and upload a government ID.",
        );
        return;
      }
    }

    if (step === 3) {
      if (
        !vehicleMake.trim() ||
        !vehicleModel.trim() ||
        !vehicleYear.trim() ||
        !licensePlate.trim()
      ) {
        alert("Please complete your vehicle details.");
        return;
      }
      if (!documents.vehicleRegistration) {
        alert("Please upload your vehicle registration.");
        return;
      }
    }

    if (step === 4) {
      if (
        !insuranceProvider.trim() ||
        !policyNumber.trim() ||
        !policyExpiresAt.trim() ||
        !documents.insurance
      ) {
        alert(
          "Please provide your insurance details and upload proof of insurance.",
        );
        return;
      }
    }

    if (step === 5 && !packagesEnabled && !foodEnabled) {
      alert("Please select at least one delivery type");
      return;
    }

    if (step === 5) {
      if (packagesEnabled) {
        setStep(6);
        return;
      }
      if (foodEnabled) {
        setStep(7);
        return;
      }
      setStep(8);
      return;
    }

    if (step === 6) {
      if (foodEnabled) {
        setStep(7);
        return;
      }
      setStep(8);
      return;
    }

    if (step === 7) {
      setStep(8);
      return;
    }

    setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step === 8) {
      if (foodEnabled) return setStep(7);
      if (packagesEnabled) return setStep(6);
      return setStep(5);
    }
    if (step === 7) {
      if (packagesEnabled) return setStep(6);
      return setStep(5);
    }
    if (step === 6) return setStep(5);
    if (step === 5) return setStep(4);
    if (step === 4) return setStep(3);
    if (step === 3) return setStep(2);
    if (step === 2) return setStep(1);
    setStep((step - 1) as Step);
  };

  const uploadDocuments = async () => {
    if (!uid) throw new Error("Missing user ID");

    const uploads: UploadedDocument[] = [];

    const files = [
      { label: "Government ID", file: documents.governmentId },
      { label: "Vehicle Registration", file: documents.vehicleRegistration },
      { label: "Insurance", file: documents.insurance },
    ].filter((item) => Boolean(item.file)) as Array<{
      label: string;
      file: File;
    }>;

    for (const item of files) {
      const storageRef = ref(
        storage,
        `courierDocuments/${uid}/${Date.now()}_${item.file.name}`,
      );
      await uploadBytes(storageRef, item.file);
      const url = await getDownloadURL(storageRef);
      uploads.push({
        label: item.label,
        url,
        name: item.file.name,
        contentType: item.file.type || "application/octet-stream",
        uploadedAt: new Date(),
      });
    }

    return uploads;
  };

  const handleSubmit = async () => {
    if (!uid) return;

    if (courierStatus === "pending") {
      alert("Your courier application is already pending review.");
      return;
    }

    if (courierStatus === "approved") {
      alert("Your courier profile is already approved.");
      return;
    }

    setSubmitting(true);

    try {
      console.log("📝 Starting onboarding submission for user:", uid);
      console.log("Package rate card:", packageRateCard);
      console.log("Food rate card:", foodRateCard);

      const uploadedDocs = await uploadDocuments();

      const courierProfile: CourierProfileSnapshot & {
        isOnline: boolean;
        documents: UploadedDocument[];
        status: CourierProfileStatus;
        appliedAt: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
        rejectionReason: null;
      } = {
        vehicleType,
        serviceRadius,
        isOnline: false,
        phone,
        workModes: {
          packagesEnabled,
          foodEnabled,
        },
        identity: {
          legalName,
          dateOfBirth: dateOfBirth || null,
        },
        vehicleDetails: {
          make: vehicleMake,
          model: vehicleModel,
          year: vehicleYear,
          licensePlate,
        },
        insurance: {
          provider: insuranceProvider,
          policyNumber,
          expiresAt: policyExpiresAt,
        },
        documents: uploadedDocs,
        status: "pending" as CourierProfileStatus,
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rejectionReason: null,
        packageRateCard: packageRateCard || undefined,
        foodRateCard: foodRateCard || undefined,
      };

      if (packageRateCard) {
        console.log("✅ Added package rate card to profile");
      }

      if (foodRateCard) {
        console.log("✅ Added food rate card to profile");
      }

      console.log("📤 Saving to Firestore...", {
        courierProfile,
        role: "courier",
      });

      await setDoc(
        doc(db, "users", uid),
        {
          courierProfile,
          role: "courier",
          phone,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      console.log("✅ Onboarding data saved successfully!");
      console.log("🚀 Navigating to Stripe onboarding...");

      // Redirect to Stripe onboarding page
      navigate("/onboarding/stripe");
    } catch (error) {
      console.error("❌ Failed to submit onboarding:", error);
      alert("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  const vehicleOptions = [
    {
      value: "foot" as VehicleType,
      label: "🚶 Walking",
      description: "~3 mph",
    },
    {
      value: "bike" as VehicleType,
      label: "🚴 Bicycle",
      description: "~12 mph",
    },
    {
      value: "scooter" as VehicleType,
      label: "🛴 Scooter",
      description: "~15 mph",
    },
    { value: "car" as VehicleType, label: "🚗 Car", description: "~25 mph" },
    {
      value: "van" as VehicleType,
      label: "🚐 Van",
      description: "Large capacity",
    },
    {
      value: "truck" as VehicleType,
      label: "🚚 Truck",
      description: "Extra large",
    },
  ];

  return (
    <div
      className="min-h-screen w-full bg-[#F8F9FF]"
      style={{ padding: "20px" }}
    >
      <div
        style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "40px" }}
      >
        {/* Progress Bar */}
        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: "4px",
                  background: s <= step ? "#3b82f6" : "#e5e7eb",
                  marginRight: s < 8 ? "8px" : 0,
                  borderRadius: "2px",
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
            Step {step} of 8
          </p>
        </div>

        {courierStatus === "approved" && (
          <div
            style={{
              padding: "16px",
              background: "#ecfdf3",
              border: "1px solid #a7f3d0",
              borderRadius: "12px",
              marginBottom: "20px",
              color: "#065f46",
              fontSize: "14px",
            }}
          >
            ✅ Your courier profile is approved. You can start accepting jobs.
          </div>
        )}

        {courierStatus === "pending" && (
          <div
            style={{
              padding: "16px",
              background: "#fef3c7",
              border: "1px solid #fbbf24",
              borderRadius: "12px",
              marginBottom: "20px",
              color: "#92400e",
              fontSize: "14px",
            }}
          >
            ⏳ Your courier application is under review.
          </div>
        )}

        {courierStatus === "rejected" && (
          <div
            style={{
              padding: "16px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              marginBottom: "20px",
              color: "#991b1b",
              fontSize: "14px",
            }}
          >
            ❌ Your application was rejected.{" "}
            {rejectionReason
              ? `Reason: ${rejectionReason}`
              : "Please update your details and reapply."}
          </div>
        )}

        {/* Step 1: Vehicle Type */}
        {step === 1 && (
          <div>
            <h1 style={{ marginBottom: "8px", fontSize: "24px" }}>
              Choose Your Vehicle
            </h1>
            <p
              style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}
            >
              Select the vehicle you'll use for deliveries
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {vehicleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setVehicleType(option.value)}
                  style={{
                    padding: "16px",
                    border: `2px solid ${
                      vehicleType === option.value ? "#3b82f6" : "#e5e7eb"
                    }`,
                    borderRadius: "12px",
                    background:
                      vehicleType === option.value ? "#eff6ff" : "white",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "6px" }}>
                    {option.label.split(" ")[0]}
                  </div>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    {option.label.split(" ")[1]}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {option.description}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginBottom: "30px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontWeight: "600",
                }}
              >
                Service Radius: {serviceRadius} miles
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={serviceRadius}
                onChange={(e) => setServiceRadius(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#666",
                  marginTop: "4px",
                }}
              >
                <span>5 miles</span>
                <span>50 miles</span>
              </div>
            </div>

            <button
              onClick={handleNext}
              style={{
                width: "100%",
                padding: "14px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Identity & Contact */}
        {step === 2 && (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Identity Verification</h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Provide your legal details and upload a government ID.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginBottom: "30px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  Legal Name *
                </label>
                <input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Full legal name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  Phone Number *
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  Government ID *
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setDocuments({
                      ...documents,
                      governmentId: e.target.files?.[0] || null,
                    })
                  }
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {documents.governmentId && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {documents.governmentId.name}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Vehicle Details */}
        {step === 3 && (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Vehicle Details</h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Provide your vehicle details and registration document.
            </p>

            <div style={{ display: "grid", gap: "14px", marginBottom: "30px" }}>
              <input
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="Make (e.g. Toyota)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Model (e.g. Corolla)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder="Year (e.g. 2022)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="License Plate"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  Vehicle Registration (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setDocuments({
                      ...documents,
                      vehicleRegistration: e.target.files?.[0] || null,
                    })
                  }
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {documents.vehicleRegistration && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {documents.vehicleRegistration.name}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Insurance */}
        {step === 4 && (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Insurance Details</h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Upload proof of insurance and provide policy details.
            </p>

            <div style={{ display: "grid", gap: "14px", marginBottom: "30px" }}>
              <input
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                placeholder="Insurance Provider"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="Policy Number"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  Policy Expiration Date *
                </label>
                <input
                  type="date"
                  value={policyExpiresAt}
                  onChange={(e) => setPolicyExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  Proof of Insurance *
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setDocuments({
                      ...documents,
                      insurance: e.target.files?.[0] || null,
                    })
                  }
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {documents.insurance && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {documents.insurance.name}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Work Modes */}
        {step === 5 && (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Delivery Types</h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Choose which types of deliveries you want to accept (select at
              least one)
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "30px",
              }}
            >
              <label
                style={{
                  padding: "24px",
                  border: `2px solid ${
                    packagesEnabled ? "#3b82f6" : "#e5e7eb"
                  }`,
                  borderRadius: "12px",
                  background: packagesEnabled ? "#eff6ff" : "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={packagesEnabled}
                  onChange={(e) => setPackagesEnabled(e.target.checked)}
                  style={{
                    width: "24px",
                    height: "24px",
                    marginRight: "16px",
                    cursor: "pointer",
                  }}
                />
                <div>
                  <div style={{ fontSize: "24px", marginBottom: "4px" }}>
                    📦
                  </div>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    Package Deliveries
                  </div>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Deliver packages, documents, and general items
                  </div>
                </div>
              </label>

              <label
                style={{
                  padding: "24px",
                  border: `2px solid ${foodEnabled ? "#3b82f6" : "#e5e7eb"}`,
                  borderRadius: "12px",
                  background: foodEnabled ? "#eff6ff" : "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={foodEnabled}
                  onChange={(e) => setFoodEnabled(e.target.checked)}
                  style={{
                    width: "24px",
                    height: "24px",
                    marginRight: "16px",
                    cursor: "pointer",
                  }}
                />
                <div>
                  <div style={{ fontSize: "24px", marginBottom: "4px" }}>
                    🍔
                  </div>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                    Food Deliveries
                  </div>
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Deliver restaurant orders and food items (requires
                    equipment)
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Package Rate Card */}
        {step === 6 && packagesEnabled && (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Package Delivery Rates</h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Set your pricing for package deliveries
            </p>

            <div style={{ marginBottom: "30px" }}>
              <PackageRateCardBuilder
                currentRateCard={packageRateCard || undefined}
                onSave={async (rateCard) => {
                  setPackageRateCard(rateCard);
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              {packageRateCard ? (
                <button
                  onClick={handleNext}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => {
                    setPackagesEnabled(false);
                    if (foodEnabled) {
                      setStep(7);
                    } else {
                      alert("You must enable at least one delivery type");
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Skip Packages
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 7: Food Rate Card */}
        {step === 7 && foodEnabled && (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Food Delivery Rates</h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Set your pricing for food deliveries
            </p>

            <div style={{ marginBottom: "30px" }}>
              <FoodRateCardBuilder
                currentRateCard={foodRateCard || undefined}
                onSave={async (rateCard) => {
                  setFoodRateCard(rateCard);
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              {foodRateCard ? (
                <button
                  onClick={handleNext}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => {
                    setFoodEnabled(false);
                    if (packagesEnabled && packageRateCard) {
                      setStep(8);
                    } else {
                      alert("You must enable at least one delivery type");
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Skip Food
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 8: Review & Submit */}
        {step === 8 && (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Review Your Setup</h1>
            <p style={{ color: "#666", marginBottom: "30px" }}>
              Review your configuration before submitting for approval
            </p>

            <div style={{ marginBottom: "30px" }}>
              {/* Vehicle Summary */}
              <div
                style={{
                  padding: "20px",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  marginBottom: "16px",
                }}
              >
                <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>
                  Vehicle & Service Area
                </h3>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  <p style={{ margin: "8px 0" }}>
                    <strong>Vehicle:</strong>{" "}
                    {vehicleOptions.find((v) => v.value === vehicleType)?.label}
                  </p>
                  <p style={{ margin: "8px 0" }}>
                    <strong>Service Radius:</strong> {serviceRadius} miles
                  </p>
                  <p style={{ margin: "8px 0" }}>
                    <strong>Vehicle Details:</strong> {vehicleYear}{" "}
                    {vehicleMake} {vehicleModel}
                  </p>
                  <p style={{ margin: "8px 0" }}>
                    <strong>License Plate:</strong> {licensePlate}
                  </p>
                </div>
              </div>

              {/* Identity Summary */}
              <div
                style={{
                  padding: "20px",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  marginBottom: "16px",
                }}
              >
                <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>
                  Identity & Insurance
                </h3>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  <p style={{ margin: "8px 0" }}>
                    <strong>Legal Name:</strong> {legalName}
                  </p>
                  <p style={{ margin: "8px 0" }}>
                    <strong>Phone:</strong> {phone}
                  </p>
                  {dateOfBirth && (
                    <p style={{ margin: "8px 0" }}>
                      <strong>Date of Birth:</strong> {dateOfBirth}
                    </p>
                  )}
                  <p style={{ margin: "8px 0" }}>
                    <strong>Insurance Provider:</strong> {insuranceProvider}
                  </p>
                  <p style={{ margin: "8px 0" }}>
                    <strong>Policy Number:</strong> {policyNumber}
                  </p>
                  <p style={{ margin: "8px 0" }}>
                    <strong>Policy Expiration:</strong> {policyExpiresAt}
                  </p>
                </div>
              </div>

              {/* Work Modes Summary */}
              <div
                style={{
                  padding: "20px",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  marginBottom: "16px",
                }}
              >
                <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>
                  Delivery Types
                </h3>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {packagesEnabled && packageRateCard && (
                    <p style={{ margin: "8px 0" }}>
                      ✓ <strong>Package Deliveries:</strong> Base $
                      {packageRateCard.baseFare} + ${packageRateCard.perMile}
                      /mile
                    </p>
                  )}
                  {foodEnabled && foodRateCard && (
                    <p style={{ margin: "8px 0" }}>
                      ✓ <strong>Food Deliveries:</strong> Base $
                      {foodRateCard.baseFare} + ${foodRateCard.perMile}/mile
                    </p>
                  )}
                </div>
              </div>

              {/* Status Notice */}
              <div
                style={{
                  padding: "20px",
                  background: "#fef3c7",
                  border: "2px solid #fbbf24",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    fontWeight: "600",
                    color: "#92400e",
                    marginBottom: "8px",
                  }}
                >
                  ⏳ Admin Review Required
                </div>
                <div style={{ fontSize: "14px", color: "#78350f" }}>
                  Your courier profile will be reviewed by our admin team.
                  You'll receive a notification once approved and can start
                  accepting deliveries.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBack}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: submitting ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting..." : "Submit for Review ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
