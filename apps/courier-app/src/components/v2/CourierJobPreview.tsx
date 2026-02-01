
import { useEffect } from "react";
import { calcMiles, calcFee } from "@/lib/v2/pricing";
import { getEligibilityReason } from "@/lib/v2/eligibility";
import {
  Job as LibJob,
  RateCard,
  PackageRateCard,
  FoodRateCard,
  TransportMode,
  VehicleType,
} from "@/lib/v2/types";
import { Job, JobViewer } from "@/features/jobs/shared/types";
import { getJobVisibility } from "@/features/jobs/shared/privacy";
import { AddressBlock } from "@/features/jobs/shared/AddressBlock";
import { PackageDetailsPanel } from "@/features/jobs/shared/PackageDetailsPanel";
import { MapboxMap } from "@/components/v2/MapboxMap";
import { useMapboxDirections } from "@/hooks/useMapboxDirections";

interface CourierJobPreviewProps {
  job: LibJob;
  rateCard?: RateCard | PackageRateCard | FoodRateCard | null;
  courierLocation?: { lat: number; lng: number } | null;
  transportMode: TransportMode | VehicleType;
  viewerUid?: string;
  onAccept?: (jobId: string, fee: number) => void;
  onDecline?: (job: Job) => void;
  loading?: boolean;
  showAcceptButton?: boolean;
  footer?: React.ReactNode;
  enableRoute?: boolean;
}

// Convert lib Job to features Job (they're compatible)
function convertJob(libJob: LibJob): Job {
  return libJob as unknown as Job;
}

export function CourierJobPreview({
  job: libJob,
  rateCard,
  courierLocation,
  transportMode,
  viewerUid,
  onAccept,
  onDecline,
  loading = false,
  showAcceptButton = true,
  footer,
  enableRoute = true,
}: CourierJobPreviewProps) {
  const job = convertJob(libJob);
  const jobMiles = calcMiles(job.pickup, job.dropoff);
  const pickupMiles = courierLocation
    ? calcMiles(courierLocation, job.pickup)
    : undefined;

  const { routeSegments, fetchRoute } = useMapboxDirections();

  useEffect(() => {
    if (!enableRoute) return;
    if (!job.pickup || !job.dropoff) return;
    fetchRoute([job.pickup.lng, job.pickup.lat], [job.dropoff.lng, job.dropoff.lat]);
  }, [job.pickup, job.dropoff, fetchRoute, enableRoute]);

  const hasRateCard = !!rateCard;

  const eligibilityResult =
    hasRateCard && pickupMiles !== undefined
      ? getEligibilityReason(rateCard, jobMiles, pickupMiles)
      : { eligible: true };

  const eligible = hasRateCard ? eligibilityResult.eligible : false;
  const reason = eligibilityResult.reason;
  const fee = hasRateCard ? calcFee(rateCard, jobMiles, pickupMiles, transportMode) : 0;
  const displayFee = job.agreedFee ?? fee;

  // Courier viewing open job gets limited visibility
  const viewer: JobViewer = { uid: viewerUid || "courier-preview", role: "courier" };
  const visibility = getJobVisibility(job, viewer);
  const isAssignedToViewer = viewerUid && job.courierUid === viewerUid;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">
            {isAssignedToViewer ? "Active Job" : "Job Preview"}
          </p>
          <h3 className="text-base font-semibold text-gray-900">
            {isAssignedToViewer ? "Accepted Delivery" : "Available Delivery"}
          </h3>
          <p className="text-xs text-gray-500">
            {jobMiles.toFixed(1)} mi route
            {pickupMiles !== undefined && ` • ${pickupMiles.toFixed(1)} mi to pickup`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {isAssignedToViewer ? "Agreed Earnings" : "Est. Earnings"}
          </p>
          <p className="text-lg font-bold text-emerald-600">${displayFee.toFixed(2)}</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <MapboxMap
            pickup={job.pickup}
            dropoff={job.dropoff}
            height="120px"
            routeSegments={routeSegments}
            showLabels={visibility.canSeeExactAddresses}
            showPopups={visibility.canSeeExactAddresses}
            interactive={false}
          />
        </div>

        <div className="space-y-2">
          <AddressBlock
            label="Pickup"
            location={job.pickup}
            canSeeExact={visibility.canSeeExactAddresses}
            addressOverride={(job as any).pickupAddress || job.pickup?.label}
          />
          <AddressBlock
            label="Dropoff"
            location={job.dropoff}
            canSeeExact={visibility.canSeeExactAddresses}
            icon="🎯"
            addressOverride={(job as any).deliveryAddress || job.dropoff?.label}
          />
          {!visibility.canSeeExactAddresses && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              Exact addresses appear after you accept the job.
            </div>
          )}
        </div>

        <PackageDetailsPanel
          package={job.package || null}
          photos={job.photos || null}
          canSeePhotos={visibility.canSeePhotos}
        />

        {hasRateCard ? (
          <div className="text-[11px] text-gray-500">
            Rate: $
            {("baseFee" in rateCard
              ? rateCard.baseFee
              : rateCard.baseFare
            ).toFixed(2)}{" "}
            base + ${rateCard.perMile.toFixed(2)}/mi
            {"pickupPerMile" in rateCard && rateCard.pickupPerMile && (
              <span> + ${rateCard.pickupPerMile.toFixed(2)}/mi pickup</span>
            )}
            {"perMinute" in rateCard && rateCard.perMinute && (
              <span> + ${rateCard.perMinute.toFixed(2)}/min</span>
            )}
            {"minimumFee" in rateCard && rateCard.minimumFee && (
              <span> • Min ${rateCard.minimumFee.toFixed(2)}</span>
            )}
          </div>
        ) : (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            Set your rate card to accept jobs.
          </div>
        )}

        {!eligible && reason && (
          <div className="text-xs text-red-600">Not eligible: {reason}</div>
        )}
      </div>

      {footer ? (
        <div className="p-3 border-t border-gray-100">{footer}</div>
      ) : (
        showAcceptButton &&
        onAccept && (
          <div className="p-3 border-t border-gray-100">
            {onDecline ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAccept(job.id, fee)}
                  disabled={loading || !eligible || !hasRateCard}
                  title={!eligible ? "You are not eligible for this job" : ""}
                  className={`w-full py-2.5 rounded-xl text-white font-semibold transition-colors ${
                    loading || !eligible || !hasRateCard
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {loading
                    ? "Accepting..."
                    : !hasRateCard
                      ? "Set Rate Card"
                      : !eligible
                        ? "Cannot Accept"
                        : "Accept Offer"}
                </button>
                <button
                  onClick={() => onDecline(job)}
                  className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                >
                  Decline
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAccept(job.id, fee)}
                disabled={loading || !eligible || !hasRateCard}
                title={!eligible ? "You are not eligible for this job" : ""}
                className={`w-full py-2.5 rounded-xl text-white font-semibold transition-colors ${
                  loading || !eligible || !hasRateCard
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {loading
                  ? "Accepting..."
                  : !hasRateCard
                    ? "Set Rate Card to Accept"
                    : !eligible
                      ? "Cannot Accept"
                      : "Accept Job"}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
