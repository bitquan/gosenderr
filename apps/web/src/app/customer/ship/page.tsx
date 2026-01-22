"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function CustomerShipPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Ship a Package</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Start by selecting an item to ship from the marketplace.
            </p>
            <div className="mt-4">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                Browse Marketplace
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
