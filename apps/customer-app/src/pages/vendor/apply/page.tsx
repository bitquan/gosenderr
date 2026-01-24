import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";

export default function VendorApplicationPage() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    description: "",
    phone: "",
    website: "",
    storefront: false,
    agreeToTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setLoading(true);
    try {
      // Create vendor application
      await setDoc(doc(db, `vendorApplications/${uid}`), {
        ...formData,
        userId: uid,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update user doc to mark as vendor applicant
      await setDoc(
        doc(db, `users/${uid}`),
        {
          vendorApplication: {
            status: "pending",
            submittedAt: serverTimestamp(),
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
    <div className="min-h-screen bg-[#F8F9FF] py-8 px-4">
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Vendor</h1>
              <p className="text-gray-600">
                Join our marketplace and start selling your products today
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  I agree to the vendor terms and conditions, including a 10% platform fee on all sales *
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !formData.agreeToTerms}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Your application will be reviewed within 24 hours. You'll receive an email once approved.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
