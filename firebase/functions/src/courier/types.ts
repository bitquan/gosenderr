// firebase/functions/src/courier/types.ts
// Courier-specific types and interfaces

export interface ClaimJobRequest {
  jobId: string;
  courierId: string;
}

export interface ClaimJobResponse {
  success: boolean;
  job?: {
    id: string;
    pickup: { address: string; lat: number; lng: number };
    delivery: { address: string; lat: number; lng: number };
    price: number;
  };
  error?: string;
}

export interface CompleteJobRequest {
  jobId: string;
  courierId: string;
  photoUrls: string[];
  signature?: string;
  notes?: string;
}

export interface CompleteJobResponse {
  success: boolean;
  earnedAmount: number;
  nextJobAvailable?: any;
  error?: string;
}

export interface CourierLocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface AvailableJobsResponse {
  jobs: Array<{
    id: string;
    pickup: { address: string; lat: number; lng: number };
    delivery: { address: string; lat: number; lng: number };
    price: number;
    distance: number;
    estimatedTime: number; // minutes
  }>;
  totalCount: number;
}

export interface CourierStatsResponse {
  isOnline: boolean;
  todayEarnings: number;
  todayDeliveries: number;
  rating: number;
  totalDeliveries: number;
  activeJobs: number;
}
