import {DeliveryJobDoc} from "@gosenderr/shared";

export interface LocationPoint {
  lat: number;
  lng: number;
}

export interface ClusterOptions {
  maxRadiusMiles: number;
  minJobs: number;
  maxJobs: number;
}

export interface JobCluster {
  jobs: DeliveryJobDoc[];
  center: LocationPoint;
  radiusMiles: number;
}

export interface CourierPayParams {
  jobCount: number;
  totalDistance: number;
  totalDuration: number;
}

/**
 * Calculate haversine distance between two lat/lng points in miles
 * @param {LocationPoint} loc1 - First location
 * @param {LocationPoint} loc2 - Second location
 * @return {number} Distance in miles
 */
export function calculateDistance(loc1: LocationPoint, loc2: LocationPoint): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(loc2.lat - loc1.lat);
  const dLng = toRadians(loc2.lng - loc1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(loc1.lat)) * Math.cos(toRadians(loc2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @return {number} Radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Cluster jobs by location using K-means clustering
 * @param {DeliveryJobDoc[]} jobs - Jobs to cluster
 * @param {ClusterOptions} options - Clustering options
 * @return {JobCluster[]} Array of job clusters
 */
export function clusterByLocation(
  jobs: DeliveryJobDoc[],
  options: ClusterOptions
): JobCluster[] {
  if (jobs.length < options.minJobs) {
    return [];
  }

  // Simple clustering: group jobs within maxRadiusMiles
  const clusters: JobCluster[] = [];
  const assignedJobs = new Set<string>();

  for (const job of jobs) {
    if (assignedJobs.has(job.itemId)) continue;

    const cluster: DeliveryJobDoc[] = [job];
    assignedJobs.add(job.itemId);

    // Find nearby jobs
    for (const otherJob of jobs) {
      if (
        assignedJobs.has(otherJob.itemId) ||
        cluster.length >= options.maxJobs
      ) {
        continue;
      }

      const distance = calculateDistance(
        {lat: job.dropoff.lat, lng: job.dropoff.lng},
        {lat: otherJob.dropoff.lat, lng: otherJob.dropoff.lng}
      );

      if (distance <= options.maxRadiusMiles) {
        cluster.push(otherJob);
        assignedJobs.add(otherJob.itemId);
      }
    }

    // Only create cluster if it meets minimum size
    if (cluster.length >= options.minJobs) {
      const center = calculateClusterCenter(cluster);
      const radius = calculateClusterRadius(cluster, center);

      clusters.push({
        jobs: cluster,
        center,
        radiusMiles: radius,
      });
    }
  }

  return clusters;
}

/**
 * Calculate center point of a cluster
 * @param {DeliveryJobDoc[]} jobs - Jobs in the cluster
 * @return {LocationPoint} Center point
 */
function calculateClusterCenter(jobs: DeliveryJobDoc[]): LocationPoint {
  const sum = jobs.reduce(
    (acc, job) => ({
      lat: acc.lat + job.dropoff.lat,
      lng: acc.lng + job.dropoff.lng,
    }),
    {lat: 0, lng: 0}
  );

  return {
    lat: sum.lat / jobs.length,
    lng: sum.lng / jobs.length,
  };
}

/**
 * Calculate radius of a cluster (max distance from center)
 * @param {DeliveryJobDoc[]} jobs - Jobs in the cluster
 * @param {LocationPoint} center - Center point
 * @return {number} Radius in miles
 */
function calculateClusterRadius(
  jobs: DeliveryJobDoc[],
  center: LocationPoint
): number {
  let maxDistance = 0;

  for (const job of jobs) {
    const distance = calculateDistance(
      center,
      {lat: job.dropoff.lat, lng: job.dropoff.lng}
    );
    maxDistance = Math.max(maxDistance, distance);
  }

  return maxDistance;
}

/**
 * Optimize route order using nearest neighbor algorithm (TSP approximation)
 * @param {DeliveryJobDoc[]} jobs - Jobs to optimize
 * @return {DeliveryJobDoc[]} Optimized job order
 */
export function optimizeRouteOrder(jobs: DeliveryJobDoc[]): DeliveryJobDoc[] {
  if (jobs.length <= 1) {
    return jobs;
  }

  const optimized: DeliveryJobDoc[] = [];
  const remaining = [...jobs];

  // Start with the first job
  const first = remaining.shift();
  if (!first) return optimized;
  
  let current = first;
  optimized.push(current);

  // Keep adding nearest neighbor
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(
        {lat: current.dropoff.lat, lng: current.dropoff.lng},
        {lat: remaining[i].dropoff.lat, lng: remaining[i].dropoff.lng}
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    current = remaining.splice(nearestIndex, 1)[0];
    optimized.push(current);
  }

  return optimized;
}

/**
 * Calculate courier pay for a route
 * Formula: max(jobCount * 1200, distance * 150 + duration * 20) in cents
 * @param {CourierPayParams} params - Parameters for calculation
 * @return {number} Courier pay in cents
 */
export function calculateCourierPay(params: CourierPayParams): number {
  const {jobCount, totalDistance, totalDuration} = params;

  const jobBasedPay = jobCount * 1200; // $12 per job
  const distanceTimePay = totalDistance * 150 + totalDuration * 20; // $1.50/mile + $0.20/min

  return Math.max(jobBasedPay, distanceTimePay);
}
