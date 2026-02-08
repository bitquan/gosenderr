import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Timestamp, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import {
  ensureSellerDualRoles,
  resolveSellerOnboardingStep,
  validateLocalSellingConfig,
} from "@/lib/sellerOnboarding";
import { trackSellerOnboardingEvent } from "@/lib/onboardingEvents";

type SellerStatus = "none" | "pending" | "approved" | "rejected";

type SellerDraftForm = {
  businessName: string;
  businessType: string;
  description: string;
  phone: string;
  website: string;
  storefront: boolean;
  agreeToTerms: boolean;
  localAddress: string;
  localCity: string;
  localState: string;
  localPostalCode: string;
  operatingRadiusMiles: number;
  localComplianceConfirmed: boolean;
};

const DEFAULT_FORM_DATA: SellerDraftForm = {
  businessName: "",
  businessType: "",
  description: "",
  phone: "",
  website: "",
  storefront: false,
  agreeToTerms: false,
  localAddress: "",
  localCity: "",
  localState: "",
  localPostalCode: "",
  operatingRadiusMiles: 10,
  localComplianceConfirmed: false,
};

export default function SellerApplicationPage() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();

  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [sellerStatus, setSellerStatus] = useState<SellerStatus>("none");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [draftRoleSeed, setDraftRoleSeed] = useState<{
    role: string;
    primaryRole: string;
    roles: string[];
  }>({
    role: "customer",
    primaryRole: "customer",
    roles: ["customer"],
  });
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [submissionAttempted, setSubmissionAttempted] = useState(false);

  const [formData, setFormData] = useState<SellerDraftForm>(DEFAULT_FORM_DATA);
  const [documents, setDocuments] = useState<{
    governmentId: File | null;
    businessLicense: File | null;
  }>({
    governmentId: null,
    businessLicense: null,
  });

  const businessInfoComplete = useMemo(() => {
    return Boolean(
      formData.businessName.trim() &&
        formData.businessType.trim() &&
        formData.description.trim() &&
        formData.phone.trim() &&
        formData.agreeToTerms,
    );
  }, [formData]);

  const localConfigValidation = useMemo(() => {
    return validateLocalSellingConfig({
      address: formData.localAddress,
      city: formData.localCity,
      state: formData.localState,
      postalCode: formData.localPostalCode,
      operatingRadiusMiles: Number(formData.operatingRadiusMiles),
      contactPhone: formData.phone,
      complianceConfirmed: formData.localComplianceConfirmed,
    });
  }, [formData]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!uid) {
        setStatusLoading(false);
        setDraftHydrated(true);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, `users/${uid}`));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const roles = Array.isArray(userData?.roles) ? userData.roles : [];
        const resolvedRoles = Array.from(
          new Set(
            (
              roles.length
                ? roles
                : [userData?.role || userData?.primaryRole || "customer"]
            ).filter(Boolean),
          ),
        );
        setDraftRoleSeed({
          role: userData?.role || "customer",
          primaryRole: userData?.primaryRole || userData?.role || "customer",
          roles: resolvedRoles.length ? resolvedRoles : ["customer"],
        });
        const hasSellerRole = userData?.role === "seller" || roles.includes("seller");

        if (hasSellerRole || userData?.sellerApplication?.status === "approved") {
          setSellerStatus("approved");
          setRejectionReason(null);
        } else if (userData?.sellerApplication?.status === "pending") {
          setSellerStatus("pending");
          setRejectionReason(null);
        } else if (userData?.sellerApplication?.status === "rejected") {
          setSellerStatus("rejected");
          setRejectionReason(userData?.sellerApplication?.rejectionReason || null);
        } else {
          setSellerStatus("none");
          setRejectionReason(null);
        }

        const draft = userData?.sellerOnboardingV2?.draft;
        if (draft && typeof draft === "object") {
          setFormData((prev) => ({
            ...prev,
            ...draft,
            operatingRadiusMiles:
              Number((draft as any).operatingRadiusMiles) || prev.operatingRadiusMiles,
          }));
        }

        await trackSellerOnboardingEvent(uid, "seller_onboarding_opened", {
          status: userData?.sellerOnboardingV2?.status || "not_started",
          sellerApplicationStatus: userData?.sellerApplication?.status || "none",
        });
      } catch (error) {
        console.error("Failed to load seller status:", error);
      } finally {
        setStatusLoading(false);
        setDraftHydrated(true);
      }
    };

    loadStatus();
  }, [uid]);

  useEffect(() => {
    if (!uid || !draftHydrated) return;
    if (sellerStatus === "approved") return;

    const stepState = resolveSellerOnboardingStep(
      businessInfoComplete,
      localConfigValidation.isValid,
      false,
    );

    setDraftSaveState("saving");
    const timeout = window.setTimeout(async () => {
      try {
        await setDoc(
          doc(db, `users/${uid}`),
          {
            role: draftRoleSeed.role,
            primaryRole: draftRoleSeed.primaryRole,
            roles: draftRoleSeed.roles,
            sellerOnboardingV2: {
              version: 2,
              status: "in_progress",
              currentStep: stepState.currentStep,
              completedSteps: stepState.completedSteps,
              draft: formData,
              localConfigValidation,
              lastSavedAt: serverTimestamp(),
            },
            onboarding: {
              seller: {
                status: "in_progress",
                currentStep: stepState.currentStep,
                lastSavedAt: serverTimestamp(),
              },
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        setDraftSaveState("saved");
      } catch (error) {
        console.error("Failed to save seller onboarding draft:", error);
        setDraftSaveState("error");
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    uid,
    draftHydrated,
    formData,
    sellerStatus,
    businessInfoComplete,
    localConfigValidation,
    draftRoleSeed,
  ]);

  const uploadDocuments = async () => {
    if (!uid) throw new Error("Missing user ID");

    const uploads: Array<{
      label: string;
      url: string;
      name: string;
      contentType: string;
      uploadedAt: any;
    }> = [];

    const files = [
      { key: "governmentId", label: "Government ID", file: documents.governmentId },
      { key: "businessLicense", label: "Business License", file: documents.businessLicense },
    ].filter((item) => Boolean(item.file)) as Array<{ key: string; label: string; file: File }>;

    if (files.length === 0) return uploads;

    setUploadingDocs(true);
    try {
      for (const item of files) {
        const storageRef = ref(
          storage,
          `sellerDocuments/${uid}/${Date.now()}_${item.file.name}`,
        );
        await uploadBytes(storageRef, item.file);
        const url = await getDownloadURL(storageRef);
        uploads.push({
          label: item.label,
          url,
          name: item.file.name,
          contentType: item.file.type || "application/octet-stream",
          uploadedAt: Timestamp.now(),
        });
      }
    } finally {
      setUploadingDocs(false);
    }

    return uploads;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setSubmissionAttempted(true);

    if (sellerStatus === "pending") {
      alert("Your application is already pending review.");
      return;
    }

    if (sellerStatus === "approved") {
      alert("Your seller profile is already approved.");
      return;
    }

    if (!documents.governmentId) {
      alert("Please upload a government ID document.");
      await trackSellerOnboardingEvent(uid, "seller_onboarding_blocked", {
        reason: "missing_government_id",
      });
      return;
    }

    if (!localConfigValidation.isValid) {
      await setDoc(
        doc(db, `users/${uid}`),
        {
          sellerOnboardingV2: {
            version: 2,
            status: "in_progress",
            currentStep: "local_config",
            dropoffReason: "invalid_local_config",
            localConfigValidation,
            lastSavedAt: serverTimestamp(),
          },
          onboarding: {
            seller: {
              status: "in_progress",
              currentStep: "local_config",
              lastSavedAt: serverTimestamp(),
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await trackSellerOnboardingEvent(uid, "seller_onboarding_blocked", {
        reason: "invalid_local_config",
        errors: localConfigValidation.errors,
      });

      alert("Please complete all required local-selling fields before submitting.");
      return;
    }

    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, `users/${uid}`));
      const userData = userSnap.exists() ? userSnap.data() : {};
      const mergedRoles = ensureSellerDualRoles(userData?.roles);

      const uploadedDocs = await uploadDocuments();
      const localSellingConfig = {
        address: formData.localAddress.trim(),
        city: formData.localCity.trim(),
        state: formData.localState.trim(),
        postalCode: formData.localPostalCode.trim(),
        operatingRadiusMiles: Number(formData.operatingRadiusMiles),
        contactPhone: formData.phone.trim(),
        complianceConfirmed: formData.localComplianceConfirmed,
        complianceConfirmedAt: serverTimestamp(),
      };

      await setDoc(doc(db, `sellerApplications/${uid}`), {
        ...formData,
        userId: uid,
        status: "pending",
        localSellingConfig,
        documents: uploadedDocs,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, `users/${uid}`),
        {
          role: userData?.role || "customer",
          primaryRole: userData?.primaryRole || "customer",
          roles: mergedRoles,
          sellerApplication: {
            status: "pending",
            submittedAt: serverTimestamp(),
            documentsSubmitted: uploadedDocs.length,
            rejectionReason: null,
            localSellingConfigRequired: true,
          },
          sellerProfile: {
            ...(userData?.sellerProfile || {}),
            localSellingConfig,
            localSellingEnabled: true,
          },
          sellerOnboardingV2: {
            version: 2,
            status: "submitted",
            currentStep: "completed",
            completedSteps: ["business", "local_config", "review", "completed"],
            localConfigValidation,
            dropoffReason: null,
            submittedAt: serverTimestamp(),
            lastSavedAt: serverTimestamp(),
          },
          onboarding: {
            seller: {
              status: "submitted",
              currentStep: "completed",
              submittedAt: serverTimestamp(),
              lastSavedAt: serverTimestamp(),
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await trackSellerOnboardingEvent(uid, "seller_onboarding_submitted", {
        sellerApplicationStatus: "pending",
      });

      alert("Application submitted! We'll review and get back to you within 24 hours.");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting application:", error);
      await trackSellerOnboardingEvent(uid, "seller_onboarding_submit_failed", {
        message: (error as Error)?.message || "unknown_error",
      });
      alert("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🏪</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Seller</h1>
              <p className="text-gray-600">
                Keep your customer account and add seller mode for local selling.
              </p>
            </div>

            {statusLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-600">Checking your application status...</p>
              </div>
            ) : sellerStatus === "approved" ? (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-center">
                <p className="font-semibold">✅ Your seller profile is approved.</p>
                <p className="text-sm mt-1">You can now create listings and booking links.</p>
                <button
                  type="button"
                  onClick={() => navigate("/seller/dashboard")}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                  Go to Seller Dashboard
                </button>
              </div>
            ) : sellerStatus === "pending" ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-center">
                <p className="font-semibold">⏳ Your application is under review.</p>
                <p className="text-sm mt-1">We'll notify you once a decision is made.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {sellerStatus === "rejected" && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
                    <p className="font-semibold">❌ Your application was rejected.</p>
                    {rejectionReason && <p className="text-sm mt-1">Reason: {rejectionReason}</p>}
                    <p className="text-sm mt-1">You can update your details and reapply.</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  Draft status: {draftSaveState === "saving" ? "Saving..." : draftSaveState === "saved" ? "Saved" : draftSaveState === "error" ? "Save failed" : "Idle"}
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                    placeholder="Your Business Name"
                  />
                </div>

                {/* Business Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Type *
                  </label>
                  <select
                    required
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select a type</option>
                    <option value="individual">Individual Seller</option>
                    <option value="small_business">Small Business</option>
                    <option value="retailer">Retailer</option>
                    <option value="wholesaler">Wholesaler</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
                    placeholder="Tell us about your business and what you'll be selling..."
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                    placeholder="(555) 555-5555"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                    placeholder="https://your-website.com"
                  />
                </div>

                {/* Local Selling Setup */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">Local Selling Setup (Required)</h3>
                    <p className="text-xs text-blue-700 mt-1">
                      These fields are required before booking links can be generated.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pickup Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.localAddress}
                      onChange={(e) => setFormData({ ...formData, localAddress: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        required
                        value={formData.localCity}
                        onChange={(e) => setFormData({ ...formData, localCity: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                      <input
                        type="text"
                        required
                        value={formData.localState}
                        onChange={(e) => setFormData({ ...formData, localState: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Postal Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.localPostalCode}
                        onChange={(e) => setFormData({ ...formData, localPostalCode: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                        placeholder="ZIP"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Operating Radius (miles) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={formData.operatingRadiusMiles}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          operatingRadiusMiles: Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="localCompliance"
                      checked={formData.localComplianceConfirmed}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          localComplianceConfirmed: e.target.checked,
                        })
                      }
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="localCompliance" className="text-sm text-gray-700">
                      I confirm my pickup address, contact details, and local delivery zone are accurate. *
                    </label>
                  </div>

                  {submissionAttempted && !localConfigValidation.isValid ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-semibold text-red-700 mb-1">Fix required fields:</p>
                      <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                        {localConfigValidation.errors.map((err) => (
                          <li key={err}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {/* Physical Storefront */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="storefront"
                    checked={formData.storefront}
                    onChange={(e) => setFormData({ ...formData, storefront: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="storefront" className="text-sm text-gray-700">
                    I have a physical storefront or warehouse
                  </label>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 bg-purple-50 p-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    checked={formData.agreeToTerms}
                    onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the seller terms and conditions, including a 10% platform fee on all sales *
                  </label>
                </div>

                {/* Document Uploads */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {documents.governmentId && (
                      <p className="text-xs text-gray-500 mt-2">
                        Selected: {documents.governmentId.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Business License or Tax Document (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        setDocuments({
                          ...documents,
                          businessLicense: e.target.files?.[0] || null,
                        })
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {documents.businessLicense && (
                      <p className="text-xs text-gray-500 mt-2">
                        Selected: {documents.businessLicense.name}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    Accepted formats: JPG, PNG, WEBP, PDF. Max size 15MB.
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    loading ||
                    uploadingDocs ||
                    !formData.agreeToTerms ||
                    !formData.localComplianceConfirmed
                  }
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || uploadingDocs
                    ? "Submitting..."
                    : sellerStatus === "rejected"
                      ? "Resubmit Application"
                      : "Submit Application"}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Your application will be reviewed within 24 hours. You can keep using customer features while this is pending.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
