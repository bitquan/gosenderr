
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I start accepting deliveries?",
    answer:
      "Set your status to 'Online' from the dashboard. You'll see available jobs nearby that match your vehicle type.",
  },
  {
    category: "Getting Started",
    question: "What vehicles can I use?",
    answer:
      "You can deliver on foot, by bike, scooter, or car. Update your vehicle preference in your profile.",
  },
  {
    category: "Deliveries",
    question: "How do I accept a job?",
    answer:
      "Go to Available Jobs, find one you want, and tap 'Accept'. You'll see pickup and dropoff details immediately.",
  },
  {
    category: "Deliveries",
    question: "What if I can't complete a delivery?",
    answer:
      "Contact support immediately at support@gosenderr.com or call 1-800-SENDERR. Safety first!",
  },
  {
    category: "Deliveries",
    question: "How far are typical deliveries?",
    answer:
      "Most local deliveries are 1-5 miles. You can filter jobs by distance in the available jobs page.",
  },
  {
    category: "Earnings",
    question: "When do I get paid?",
    answer:
      "Earnings are available for withdrawal once deliveries are completed. You can cash out daily with instant payout.",
  },
  {
    category: "Earnings",
    question: "How are delivery fees calculated?",
    answer:
      "Base fee + distance + time. You see the full amount before accepting. Tips are added within 24 hours.",
  },
  {
    category: "Earnings",
    question: "Do I keep all my tips?",
    answer:
      "Yes! 100% of customer tips go directly to you. They appear in your earnings within 24 hours of delivery.",
  },
  {
    category: "Account",
    question: "How do I update my vehicle?",
    answer:
      "Go to Profile > Edit Profile. You can switch between foot, bike, scooter, or car anytime.",
  },
  {
    category: "Account",
    question: "What affects my rating?",
    answer:
      "On-time deliveries, customer feedback, and communication. Maintain 4.5+ for the best job opportunities.",
  },
];

export default function CourierSupportPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    "All",
    "Getting Started",
    "Deliveries",
    "Earnings",
    "Account",
  ];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesCategory =
      activeCategory === "All" || faq.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            How can we help you?
          </h1>
          <p className="text-lg text-gray-600">
            Find answers or contact support
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            onClick={() => window.open("tel:1-800-SENDERR")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">📱</div>
              <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
              <p className="text-sm text-gray-500">1-800-SENDERR (24/7)</p>
            </CardContent>
          </Card>

          <Card
            variant="elevated"
            className="cursor-pointer hover:shadow-lg transition"
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-1">Live Chat</h3>
              <p className="text-sm text-gray-500">Coming soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition ${
                activeCategory === category
                  ? "bg-emerald-600 text-white"
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
            <Card variant="outlined">
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
                      <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">
                        {faq.category}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Emergency Contact */}
        <Card variant="outlined" className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🚨</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Emergency Support
                </h3>
                <p className="text-sm text-red-800 mb-3">
                  If you have an urgent issue during a delivery (accident,
                  safety concern), call immediately:
                </p>
                <a
                  href="tel:1-800-SENDERR"
                  className="inline-block px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                >
                  📞 Call Emergency Line
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
