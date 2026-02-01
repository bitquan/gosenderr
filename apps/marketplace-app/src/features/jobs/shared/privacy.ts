import { Job, JobViewer, JobVisibility } from './types';

/**
 * Determine what a viewer can see about a job based on their role and relationship to the job.
 * 
 * Privacy Rules:
 * - Customer who created the job: can see everything
 * - Courier before accepting: limited access (masked addresses, may see photos for package inspection)
 * - Courier after accepting: full access to delivery details
 * - Others: no access (enforced at query level)
 */
export function getJobVisibility(job: Job, viewer: JobViewer): JobVisibility {
  // Customer who created the job sees everything
  if (viewer.role === 'customer' && job.createdByUid === viewer.uid) {
    return {
      canSeeExactAddresses: true,
      canSeePhotos: true,
      canSeeCustomerInfo: true,
    };
  }

  // Courier who has accepted the job sees everything
  if (viewer.role === 'courier' && job.courierUid === viewer.uid) {
    return {
      canSeeExactAddresses: true,
      canSeePhotos: true,
      canSeeCustomerInfo: true,
    };
  }

  // Courier viewing open job before accepting: limited access
  if (viewer.role === 'courier' && job.status === 'open') {
    return {
      canSeeExactAddresses: false, // Show masked/approximate addresses
      canSeePhotos: true,           // Allow viewing package photos for assessment
      canSeeCustomerInfo: false,
    };
  }

  // Default: no access (shouldn't reach here due to Firestore rules)
  return {
    canSeeExactAddresses: false,
    canSeePhotos: false,
    canSeeCustomerInfo: false,
  };
}

/**
 * Mask an address by showing only approximate location
 * Used for couriers viewing open jobs before acceptance
 */
export function maskAddress(address: string): string {
  // Extract approximate location (first part before comma, or just show general area)
  const parts = address.split(',');
  if (parts.length >= 2) {
    // Show city/neighborhood only, e.g., "123 Main St, San Francisco, CA" -> "San Francisco, CA"
    return parts.slice(1).join(',').trim();
  }
  return 'Approximate location';
}

/**
 * Get display address based on visibility rules
 */
export function getDisplayAddress(
  address: string | undefined,
  lat: number,
  lng: number,
  canSeeExact: boolean
): string {
  if (canSeeExact && address) {
    return address;
  }
  
  if (!canSeeExact && address) {
    return maskAddress(address);
  }

  // Fallback to coordinates
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
