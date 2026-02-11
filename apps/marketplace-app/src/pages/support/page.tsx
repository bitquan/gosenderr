"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: "Deliveries",
    question: "How do I track my delivery?",
    answer:
      "Go to the Jobs page and click on your active delivery. You'll see real-time tracking on a map and status updates.",
  },
  {
    category: "Deliveries",
    question: "Can I cancel a delivery?",
    answer:
      "Yes, you can cancel before the Senderr picks up your package. Go to Job Details and click Cancel.",
  },
  {
    category: "Deliveries",
    question: "How is pricing calculated?",
    answer:
      "Pricing is based on distance, package size, and delivery speed. Express deliveries cost more.",
  },
  {
    category: "Payments",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards through Stripe. You can save cards for faster checkout.",
  },
  {
    category: "Payments",
    question: "When will I be charged?",
    answer:
      "You're charged when you place the order. Refunds are issued if the delivery is cancelled before pickup.",
  },
  {
    category: "Account",
    question: "How do I update my profile?",
    answer:
      "Go to Settings > Profile Settings. You can update your name, phone, and profile photo.",
  },
  {
    category: "Account",
    question: "How do I save addresses?",
    answer:
      "Go to Settings > Saved Addresses. You can name addresses (Home, Work) and set a default.",
  },
  {
    category: "Disputes",
    question: "What if something goes wrong?",
    answer:
      "You can file a dispute from the Job Details page. Our team will review and resolve within 24-48 hours.",
  },
  {
    category: "Disputes",
    question: "How do I contact support?",
    answer:
      "Use the contact form below or email support@gosenderr.com. We typically respond within 2 hours.",
  },
];

export default function SupportPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const categories = ["All", "Deliveries", "Payments", "Account", "Disputes"];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory =
      activeCategory === "All" || faq.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const auth = getAuthSafe();
      const user = auth?.currentUser;

      await addDoc(collection(db, "supportTickets"), {
        ...formData,
        userId: user?.uid || "anonymous",
        status: "open",
        priority: "normal",
        createdAt: serverTimestamp(),
      });

      alert(
        "Support ticket submitted! We'll respond to your email within 2 hours.",
      );
      setFormData({ name: "", email: "", subject: "", message: "" });
      setShowContactForm(false);
    } catch (error) {
      console.error("Error submitting ticket:", error);
      alert("Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            How can we help you?
          </h1>
          <p className="text-lg text-gray-600">
            Search our help center or contact support
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            variant="elevated"
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => setShowContactForm(!showContactForm)}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Contact Support
              </h3>
              <p className="text-sm text-gray-500">
                Get help from our team
              </p>
            </CardContent>
          </Card>

          <Card
            variant="elevated"
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => window.open("mailto:support@gosenderr.com")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">📧</div>
              <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
              <p className="text-sm text-gray-500">support@gosenderr.com</p>
            </CardContent>
          </Card>

          <Card
            variant="elevated"
            className="cursor-pointer hover:shadow-lg transition"
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">📱</div>
              <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
              <p className="text-sm text-gray-500">1-800-SENDERR</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        {showContactForm && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Submit a Support Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* FAQ Categories */}
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition ${
                activeCategory === category
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          {filteredFAQs.length === 0 ? (
            <Card variant="elevated">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500">
                  No FAQs found matching your search
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((faq, index) => (
              <Card key={index} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">❓</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-gray-600">{faq.answer}</p>
                      <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full">
                        {faq.category}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Still Need Help */}
        <Card variant="elevated">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Still need help?
            </h3>
            <p className="text-gray-600 mb-4">
              Our support team is available 24/7 to assist you
            </p>
            <button
              onClick={() => setShowContactForm(true)}
              className="px-8 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
            >
              Contact Support Team
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
