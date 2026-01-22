"use client";

import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useCustomerJobs } from "@/hooks/v2/useCustomerJobs";
import { JobSummaryCard } from "@/features/jobs/shared/JobSummaryCard";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export default function CustomerJobs() {
  const router = useRouter();
  const { uid } = useAuthUser();
  const { jobs, loading } = useCustomerJobs(uid || null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar fallback={uid ? "Customer" : "Guest"} size="lg" />
              <div>
                <h1 className="text-2xl font-bold">My Jobs</h1>
                <p className="text-purple-100 text-sm">
                  {jobs.length} active requests
                </p>
              </div>
            </div>
            <Link
              href="/customer/jobs/new"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-white/20 text-white font-semibold hover:bg-white/30 transition"
            >
              + New Job
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
        {jobs.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-600 text-lg mb-4">No jobs yet</p>
                <Link
                  href="/customer/jobs/new"
                  className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
                >
                  Create your first delivery
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card
                key={job.id}
                variant="elevated"
                className="hover-lift animate-fade-in"
              >
                <CardHeader>
                  <CardTitle>Job #{job.id?.slice(0, 6)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobSummaryCard
                    job={job}
                    canSeeExactAddresses={true}
                    onClick={() => router.push(`/customer/jobs/${job.id}`)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
