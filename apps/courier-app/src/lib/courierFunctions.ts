import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export interface ClaimJobRequest {
  jobId: string;
  courierId?: string;
}

export interface ClaimJobResponse {
  success: boolean;
  job?: {
    id: string;
    pickup: { address: string; lat: number; lng: number };
    delivery: { address: string; lat: number; lng: number };
    price: number;
    description?: string;
    claimedAt?: string;
  };
  error?: string;
}

export interface StartDeliveryRequest {
  jobId: string;
}

export interface StartDeliveryResponse {
  success: boolean;
  job?: {
    id: string;
    status: string;
    startedAt: string;
    estimatedDuration: number;
  };
  error?: string;
}

export interface CompleteDeliveryRequest {
  jobId: string;
  photoUrls: string[];
  signature?: string;
  notes?: string;
}

export interface CompleteDeliveryResponse {
  success: boolean;
  earnedAmount?: number;
  totalEarningsToday?: number;
  error?: string;
}

export interface CourierLocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface UpdateLocationResponse {
  success: boolean;
  error?: string;
}

export interface GetAvailableJobsRequest {
  lat: number;
  lng: number;
  limit?: number;
  maxDistance?: number;
}

export interface AvailableJob {
  id: string;
  pickup: { address: string; lat: number; lng: number };
  delivery: { address: string; lat: number; lng: number };
  price: number;
  distance: number;
  estimatedTime: number;
}

export interface GetAvailableJobsResponse {
  success: boolean;
  jobs?: AvailableJob[];
  totalCount?: number;
  error?: string;
}

export interface GetEarningsResponse {
  success: boolean;
  earnings?: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    lifetime: number;
    todayDeliveries: number;
    weekDeliveries: number;
    monthDeliveries: number;
    totalDeliveries: number;
    rating: number;
    status: "online" | "offline";
    averagePerDelivery: number;
  };
  error?: string;
}

const claimJobFn = httpsCallable<ClaimJobRequest, ClaimJobResponse>(
  functions,
  "claimJob",
);

const startDeliveryFn = httpsCallable<StartDeliveryRequest, StartDeliveryResponse>(
  functions,
  "startDelivery",
);

const completeDeliveryFn = httpsCallable<
  CompleteDeliveryRequest,
  CompleteDeliveryResponse
>(functions, "completeDelivery");

const updateLocationFn = httpsCallable<CourierLocationUpdate, UpdateLocationResponse>(
  functions,
  "updateLocation",
);

const getAvailableJobsFn = httpsCallable<
  GetAvailableJobsRequest,
  GetAvailableJobsResponse
>(functions, "getAvailableJobs");

const getEarningsFn = httpsCallable<undefined, GetEarningsResponse>(
  functions,
  "getEarnings",
);

export async function claimJob(
  data: ClaimJobRequest,
): Promise<ClaimJobResponse> {
  try {
    const result = await claimJobFn(data);
    return result.data;
  } catch (error: any) {
    console.error("Error calling claimJob:", error);
    throw new Error(error?.message || "Failed to claim job");
  }
}

export async function startDelivery(
  data: StartDeliveryRequest,
): Promise<StartDeliveryResponse> {
  try {
    const result = await startDeliveryFn(data);
    return result.data;
  } catch (error: any) {
    console.error("Error calling startDelivery:", error);
    throw new Error(error?.message || "Failed to start delivery");
  }
}

export async function completeDelivery(
  data: CompleteDeliveryRequest,
): Promise<CompleteDeliveryResponse> {
  try {
    const result = await completeDeliveryFn(data);
    return result.data;
  } catch (error: any) {
    console.error("Error calling completeDelivery:", error);
    throw new Error(error?.message || "Failed to complete delivery");
  }
}

export async function updateLocation(
  data: CourierLocationUpdate,
): Promise<UpdateLocationResponse> {
  try {
    const result = await updateLocationFn(data);
    return result.data;
  } catch (error: any) {
    console.error("Error calling updateLocation:", error);
    throw new Error(error?.message || "Failed to update location");
  }
}

export async function getAvailableJobs(
  data: GetAvailableJobsRequest,
): Promise<GetAvailableJobsResponse> {
  try {
    const result = await getAvailableJobsFn(data);
    return result.data;
  } catch (error: any) {
    console.error("Error calling getAvailableJobs:", error);
    throw new Error(error?.message || "Failed to fetch available jobs");
  }
}

export async function getEarnings(): Promise<GetEarningsResponse> {
  try {
    const result = await getEarningsFn(undefined);
    return result.data;
  } catch (error: any) {
    console.error("Error calling getEarnings:", error);
    throw new Error(error?.message || "Failed to fetch earnings");
  }
}
