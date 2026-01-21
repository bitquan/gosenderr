import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {DeliveryJobDoc} from "@gosenderr/shared";
import {
  clusterByLocation,
  optimizeRouteOrder,
  calculateDistance,
  calculateCourierPay,
} from "../utils/routeOptimization";

const db = admin.firestore();

/**
 * Build local routes from pending jobs
 * Runs every 30 minutes to batch jobs scheduled for tomorrow
 */
export const buildRoutes = functions.pubsub
  .schedule("every 30 minutes")
  .onRun(async (context) => {
    console.log("Starting route building process");

    try {
      // Calculate tomorrow's date range
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const tomorrowStart = admin.firestore.Timestamp.fromDate(tomorrow);
      const tomorrowEndTs = admin.firestore.Timestamp.fromDate(tomorrowEnd);

      console.log(`Looking for jobs scheduled for ${tomorrow.toDateString()}`);

      // Query jobs eligible for routing
      const snapshot = await db
        .collection("deliveryJobs")
        .where("deliveryType", "==", "route")
        .where("status", "==", "pending_route")
        .where("scheduledDate", ">=", tomorrowStart)
        .where("scheduledDate", "<=", tomorrowEndTs)
        .get();

      if (snapshot.empty) {
        console.log("No jobs found for route building");
        return {success: true, routesCreated: 0};
      }

      const jobs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        itemId: doc.id,
      })) as DeliveryJobDoc[];

      console.log(`Found ${jobs.length} jobs eligible for routing`);

      // Cluster jobs by location
      const clusters = clusterByLocation(jobs, {
        maxRadiusMiles: 5,
        minJobs: 5,
        maxJobs: 10,
      });

      console.log(`Created ${clusters.length} job clusters`);

      const batch = db.batch();
      const routesCreated: string[] = [];

      // Create route for each cluster
      for (const cluster of clusters) {
        // Optimize stop order
        const optimizedJobs = optimizeRouteOrder(cluster.jobs);

        // Calculate route metrics
        let totalDistance = 0;
        for (let i = 0; i < optimizedJobs.length - 1; i++) {
          const dist = calculateDistance(
            {lat: optimizedJobs[i].dropoff.lat, lng: optimizedJobs[i].dropoff.lng},
            {lat: optimizedJobs[i + 1].dropoff.lat, lng: optimizedJobs[i + 1].dropoff.lng}
          );
          totalDistance += dist;
        }

        // Estimate 3 minutes per stop + travel time (30 mph average)
        const estimatedDuration = Math.round(
          optimizedJobs.length * 3 + (totalDistance / 30) * 60
        );

        // Calculate courier earnings
        const courierEarnings = calculateCourierPay({
          jobCount: optimizedJobs.length,
          totalDistance,
          totalDuration: estimatedDuration,
        });

        // Calculate platform fees and customer totals
        const platformFees = optimizedJobs.length * 250; // $2.50 per job
        const totalCustomerPaid = optimizedJobs.reduce(
          (sum, job) => sum + job.pricing.totalCustomerCharge,
          0
        );

        // Create optimized stops
        const optimizedStops = optimizedJobs.map((job, index) => ({
          jobId: job.itemId,
          sequence: index + 1,
          location: {
            lat: job.dropoff.lat,
            lng: job.dropoff.lng,
            address: job.dropoff.address,
          },
          estimatedArrival: admin.firestore.Timestamp.fromDate(
            new Date(tomorrow.getTime() + (index * 10 + 480) * 60000) // Start at 8am, 10 min per stop
          ) as any,
          jobType: job.jobType,
          specialRequirements: getSpecialRequirements(job),
          completed: false,
        }));

        // Determine required equipment and vehicle type
        const requiredEquipment = getRequiredEquipment(optimizedJobs);
        const vehicleTypeRequired = getRequiredVehicleType(optimizedJobs);

        // Create route document
        const routeId = db.collection("routes").doc().id;
        const routeDoc: any = {
          routeId,
          type: "local",
          status: "available",
          scheduledDate: tomorrowStart,
          createdAt: admin.firestore.Timestamp.now(),
          area: {
            name: `Route ${routeId.substring(0, 6)}`,
            centerLat: cluster.center.lat,
            centerLng: cluster.center.lng,
            radiusMiles: cluster.radiusMiles,
          },
          jobIds: optimizedJobs.map((j) => j.itemId),
          totalJobs: optimizedJobs.length,
          optimizedStops,
          totalDistance,
          estimatedDuration,
          pricing: {
            courierEarnings,
            platformFees,
            totalCustomerPaid,
          },
          completedJobs: 0,
          currentStopIndex: 0,
          requiredEquipment,
          vehicleType_required: vehicleTypeRequired,
        };

        // Add route to batch
        const routeRef = db.collection("routes").doc(routeId);
        batch.set(routeRef, routeDoc);

        // Update jobs with route assignment
        for (let i = 0; i < optimizedJobs.length; i++) {
          const jobRef = db.collection("deliveryJobs").doc(optimizedJobs[i].itemId);
          batch.update(jobRef, {
            routeId,
            routePosition: i + 1,
            status: "assigned",
            updatedAt: admin.firestore.Timestamp.now(),
          });
        }

        routesCreated.push(routeId);
      }

      // Commit all changes
      await batch.commit();

      console.log(`Successfully created ${routesCreated.length} routes:`, routesCreated);

      return {
        success: true,
        routesCreated: routesCreated.length,
        routeIds: routesCreated,
      };
    } catch (error) {
      console.error("Error building routes:", error);
      throw error;
    }
  });

/**
 * Extract special requirements from a job
 */
function getSpecialRequirements(job: DeliveryJobDoc): string[] {
  const requirements: string[] = [];

  if (job.foodDeliveryDetails) {
    const temp = job.foodDeliveryDetails.temperature;
    if (temp === "hot") requirements.push("hot_bag");
    if (temp === "cold" || temp === "frozen") requirements.push("cooler");
  }

  return requirements;
}

/**
 * Determine required equipment for all jobs in route
 */
function getRequiredEquipment(jobs: DeliveryJobDoc[]): string[] {
  const equipment = new Set<string>();

  for (const job of jobs) {
    const requirements = getSpecialRequirements(job);
    requirements.forEach((req) => equipment.add(req));
  }

  return Array.from(equipment);
}

/**
 * Determine required vehicle type for route
 */
function getRequiredVehicleType(jobs: DeliveryJobDoc[]): "any" | "car" | "van" | "truck" {
  // Check if any job has heavy items or special requirements
  for (const job of jobs) {
    if (job.jobType === "package") {
      // Simple logic: require car for package routes
      return "car";
    }
  }

  return "any";
}
