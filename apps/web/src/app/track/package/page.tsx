"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function TrackPackagePage() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;
    router.push(`/track/package/${trimmed}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Track a Package</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Tracking Number
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Enter tracking number"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                Track Package
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
