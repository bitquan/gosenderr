import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export default function SellerApplicationPage() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [sellerStatus, setSellerStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    description: "",
    phone: "",
    website: "",
    storefront: false,
    agreeToTerms: false,
  });
  const [documents, setDocuments] = useState<{
    governmentId: File | null;
    businessLicense: File | null;
  }>({
    governmentId: null,
    businessLicense: null,
  });

  useEffect(() => {
    const loadStatus = async () => {
      if (!uid) {
        setStatusLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, `users/${uid}`));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const roles = Array.isArray(userData?.roles) ? userData.roles : [];
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
      } catch (error) {
        console.error("Failed to load seller status:", error);
      } finally {
        setStatusLoading(false);
      }
    };

    loadStatus();
  }, [uid]);

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
          `sellerDocuments/${uid}/${Date.now()}_${item.file.name}`
        );
        await uploadBytes(storageRef, item.file);
        const url = await getDownloadURL(storageRef);
        uploads.push({
          label: item.label,
          url,
          name: item.file.name,
          contentType: item.file.type || "application/octet-stream",
          uploadedAt: serverTimestamp(),
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
      return;
    }

    setLoading(true);
    try {
      const uploadedDocs = await uploadDocuments();

      // Create seller application
      await setDoc(doc(db, `sellerApplications/${uid}`), {
        ...formData,
        userId: uid,
        status: "pending",
        documents: uploadedDocs,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update user doc to mark as seller applicant
      await setDoc(
        doc(db, `users/${uid}`),
        {
          sellerApplication: {
            status: "pending",
            submittedAt: serverTimestamp(),
            documentsSubmitted: uploadedDocs.length,
            rejectionReason: null,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Application submitted! We'll review and get back to you within 24 hours.");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🏪</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Seller</h1>
              <p className="text-gray-600">
                Join our marketplace and start selling your products today
              </p>
            </div>

            {statusLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-600">Checking your application status...</p>
              </div>
            ) : sellerStatus === "approved" ? (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-center">
                <p className="font-semibold">✅ Your seller profile is approved.</p>
                <p className="text-sm mt-1">You can now create listings.</p>
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
                    {rejectionReason && (
                      <p className="text-sm mt-1">Reason: {rejectionReason}</p>
                    )}
                    <p className="text-sm mt-1">You can update your details and reapply.</p>
                  </div>
                )}
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
                  disabled={loading || uploadingDocs || !formData.agreeToTerms}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || uploadingDocs
                    ? "Submitting..."
                    : sellerStatus === "rejected"
                      ? "Resubmit Application"
                      : "Submit Application"}
                </button>

              <p className="text-xs text-gray-500 text-center">
                Your application will be reviewed within 24 hours. You'll receive an email once approved.
              </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
