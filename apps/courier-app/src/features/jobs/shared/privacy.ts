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
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const cleanedParts = parts.filter((part) => {
    const lower = part.toLowerCase();
    return lower !== 'usa' && lower !== 'united states' && lower !== 'united states of america';
  });

  if (cleanedParts.length >= 3) {
    const city = cleanedParts[1];
    const stateZip = cleanedParts[2];

    if (city && stateZip) {
      return `${city}, ${stateZip}`;
    }
  }

  if (cleanedParts.length === 2) {
    return `${cleanedParts[0]}, ${cleanedParts[1]}`;
  }

  const cityStateZipMatch = address.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (cityStateZipMatch) {
    const [, city, state, zip] = cityStateZipMatch;
    return `${city}, ${state} ${zip}`;
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

  if (canSeeExact) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  return 'Approximate location';
}
