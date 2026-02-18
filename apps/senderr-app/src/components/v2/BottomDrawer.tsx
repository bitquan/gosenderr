import React from "react";
import type { Job } from "@/lib/v2/types";
import type { TokenClaimReadiness } from "@/lib/v2/jobs";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { Link } from "react-router-dom";

interface Props {
  mapInstance?: any;
  activeJob: Job | null;
  availableJobs: Job[];
  activeJobs: Job[];
  historyJobs: Job[];
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  acceptingJobId: string | null;
  decliningJobId: string | null;
  onAccept: (job: Job) => void;
  onDecline: (job: Job) => void;
  tokenClaimReadiness: TokenClaimReadiness | null;
}

export function BottomDrawer({
  mapInstance,
  activeJob,
  availableJobs,
  activeJobs,
  historyJobs,
  selectedJobId,
  setSelectedJobId,
  acceptingJobId,
  decliningJobId,
  onAccept,
  onDecline,
  tokenClaimReadiness,
}: Props) {
  const {
    drawerTab,
    setDrawerTab,
    drawerSnap,
    setDrawerSnap,
    isCompactScreen,
    handlePointerDown,
    handlePointerUp,
    drawerHeights,
  } = useBottomSheet({ mapInstance });

  const selectedJob = [...activeJobs, ...availableJobs].find((j) => j.id === selectedJobId) || null;

  const canClaim = !(tokenClaimReadiness?.useTokenMode && !tokenClaimReadiness?.canClaim);

  return (
    <div
      data-testid="bottom-drawer"
      className="pointer-events-auto rounded-t-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90 border-t border-white/10 shadow-2xl text-white backdrop-blur transition-all duration-200"
      style={{ height: drawerHeights[drawerSnap], minHeight: isCompactScreen ? "140px" : "180px" }}
    >
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-20 bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-purple-950/95 border-b border-white/10 px-4 pt-2 pb-3">
          <div className="flex justify-center mb-2">
            <button
              data-testid="drawer-handle"
              aria-label="Resize queue drawer"
              onPointerDown={(e) => handlePointerDown(e.clientY)}
              onPointerUp={(e) => handlePointerUp(e.clientY)}
              className="h-5 w-24 rounded-full flex items-center justify-center"
            >
              <span className="h-1.5 w-12 rounded-full bg-white/40" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Map Shell Queue</h2>
            <div className="flex items-center gap-2 text-xs">
              <Link to="/settings" className="text-blue-200 font-semibold hover:text-white">Settings</Link>
              <span className="text-white/30">•</span>
              <Link to="/earnings" className="text-blue-200 font-semibold hover:text-white">Earnings</Link>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { id: "offers", label: `Offers (${availableJobs.length})` },
              { id: "active", label: `Active (${activeJobs.length})` },
              { id: "history", label: `History (${historyJobs.length})` },
            ].map((tab) => {
              const isActive = drawerTab === (tab.id as any);
              return (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id as "offers" | "active" | "history")}
                  className={`rounded-lg px-2 py-1.5 text-[11px] sm:text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white"
                      : "bg-white/10 text-blue-100 hover:bg-white/20"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeJob && (
          <div className="px-4 pt-3 pb-2 border-b border-white/10 bg-slate-950/35">
            <div className="rounded-xl border border-blue-300/30 bg-blue-600/20 p-3">
              <p className="text-xs text-blue-100 font-semibold">Current Job</p>
              <p className="text-sm font-semibold text-white mt-1">{activeJob.status}</p>
              <p className="text-xs text-blue-100 mt-1">Pickup: {activeJob.pickup?.label || "Pickup point"}</p>
              <p className="text-xs text-blue-100">Dropoff: {activeJob.dropoff?.label || "Dropoff point"}</p>
              <div className="mt-2">
                <Link
                  to={`/jobs/${activeJob.id}`}
                  className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Open active job
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {drawerTab === "offers" && (
            <div className="space-y-2">
              {availableJobs.length === 0 && (
                <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-blue-100">
                  No open offers right now. Stay online and refresh shortly.
                </div>
              )}

              {availableJobs.map((job) => {
                const selected = selectedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    className={`rounded-xl border p-3 ${selected ? "border-blue-300/40 bg-blue-600/20" : "border-white/15 bg-white/10"}`}
                  >
                    <button onClick={() => setSelectedJobId(job.id)} className="w-full text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{job.package?.size ? `${job.package.size} package` : "Delivery offer"}</p>
                        <span className="text-xs font-semibold text-emerald-300">${(job.agreedFee || 0).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-blue-100 mt-1">{job.pickup?.label || "Pickup"} → {job.dropoff?.label || "Dropoff"}</p>
                    </button>

                    {selected && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onAccept(job)}
                          disabled={acceptingJobId === job.id || !canClaim}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${acceptingJobId === job.id || !canClaim ? "bg-gray-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
                        >
                          {acceptingJobId === job.id ? "Claiming..." : !canClaim ? "Top-up required" : "Claim from map"}
                        </button>

                        <button
                          onClick={() => onDecline(job)}
                          disabled={decliningJobId === job.id}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold border ${decliningJobId === job.id ? "bg-white/10 text-white/40 border-white/15 cursor-not-allowed" : "bg-transparent text-blue-100 border-white/25 hover:bg-white/10"}`}
                        >
                          {decliningJobId === job.id ? "Declining..." : "Decline"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {drawerTab === "active" && (
            <div className="space-y-2">
              {activeJobs.length === 0 && (
                <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-blue-100">No active jobs right now.</div>
              )}

              {activeJobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-white/15 bg-white/10 p-3">
                  <p className="text-sm font-semibold text-white">{job.status}</p>
                  <p className="text-xs text-blue-100 mt-1">{job.pickup?.label || "Pickup"} → {job.dropoff?.label || "Dropoff"}</p>
                  <div className="mt-2">
                    <Link to={`/jobs/${job.id}`} className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white">Open active job</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {drawerTab === "history" && (
            <div className="space-y-2">
              {historyJobs.length === 0 && (
                <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-blue-100">No completed or cancelled jobs yet.</div>
              )}

              {historyJobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-white/15 bg-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{job.status}</p>
                    <span className="text-xs font-semibold text-emerald-300">${(job.agreedFee || 0).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-blue-100 mt-1">{job.pickup?.label || "Pickup"} → {job.dropoff?.label || "Dropoff"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BottomDrawer;
