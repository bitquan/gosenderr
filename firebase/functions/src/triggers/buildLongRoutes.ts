import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { calculateDistance } from "../utils/routeOptimization";

const db = admin.firestore();

/**
 * Build long routes (regional 50-200 miles)
 * Runs every 2 hours to group packages going between cities
 */
export const buildLongRoutes = functions.pubsub
  .schedule("every 2 hours")
  .onRun(async (context) => {
    console.log("Starting long route building...");

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowTimestamp = admin.firestore.Timestamp.fromDate(tomorrow);

      // Get pending long route jobs for tomorrow
      const jobsSnapshot = await db
        .collection("deliveryJobs")
        .where("deliveryType", "==", "long_route")
        .where("status", "==", "pending_route")
        .where("scheduledDate", "==", tomorrowTimestamp)
        .get();

      if (jobsSnapshot.empty) {
        console.log("No long route jobs to process");
        return null;
      }

      console.log(`Found ${jobsSnapshot.size} long route jobs`);

      // Group by origin/destination city pairs
      const cityPairs = new Map<string, any[]>();

      jobsSnapshot.docs.forEach((doc) => {
        const job = doc.data();
        const originCity = job.pickup.city || "Unknown";
        const destCity = job.dropoff.city || "Unknown";
        const key = `${originCity}_${destCity}`;

        if (!cityPairs.has(key)) {
          cityPairs.set(key, []);
        }
        cityPairs.get(key)!.push({ id: doc.id, ...job });
      });

      const routesCreated = [];

      // Create long routes for each city pair with at least 3 jobs
      for (const [cityKey, jobs] of cityPairs) {
        if (jobs.length < 3) {
          console.log(`Skipping ${cityKey} - only ${jobs.length} jobs`);
          continue;
        }

        const [originCity, destCity] = cityKey.split("_");
        const firstJob = jobs[0];

        const distance = calculateDistance(
          { lat: firstJob.pickup.lat, lng: firstJob.pickup.lng },
          { lat: firstJob.dropoff.lat, lng: firstJob.dropoff.lng }
        );

        // Only create route if distance is 50-200 miles
        if (distance < 50 || distance > 200) {
          console.log(`Skipping ${cityKey} - distance ${distance} mi out of range`);
          continue;
        }

        const estimatedDuration = Math.ceil((distance / 55) * 60); // 55 mph avg
        const jobCount = jobs.length;

        // Calculate courier earnings
        const courierEarnings = Math.max(
          jobCount * 2500, // $25 per job
          distance * 200 + estimatedDuration * 20 // $2/mi + $0.20/min
        );

        const platformFees = jobCount * 300; // $3 per job
        const totalCustomerPaid = courierEarnings + platformFees;

        const routeId = `long_route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const routeData = {
          routeId,
          type: "long",
          status: "available",
          scheduledDate: tomorrowTimestamp,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          originCity: {
            name: originCity,
            state: firstJob.pickup.state || "Unknown",
            location: {
              lat: firstJob.pickup.lat,
              lng: firstJob.pickup.lng,
            },
          },
          destinationCity: {
            name: destCity,
            state: firstJob.dropoff.state || "Unknown",
            location: {
              lat: firstJob.dropoff.lat,
              lng: firstJob.dropoff.lng,
            },
          },
          distance: Math.round(distance * 10) / 10,
          estimatedDuration,
          jobIds: jobs.map((j) => j.id),
          totalJobs: jobCount,
          pricing: {
            courierEarnings,
            platformFees,
            totalCustomerPaid,
          },
          requiredEquipment: [],
          vehicleType: "car",
        };

        await db.collection("longRoutes").doc(routeId).set(routeData);

        // Update jobs with route assignment
        const batch = db.batch();
        jobs.forEach((job) => {
          const jobRef = db.collection("deliveryJobs").doc(job.id);
          batch.update(jobRef, {
            routeId,
            status: "pending_pickup",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();

        routesCreated.push(routeId);
        console.log(`Created long route ${routeId} with ${jobCount} jobs (${distance} mi)`);
      }

      console.log(`Successfully created ${routesCreated.length} long routes`);

      return {
        success: true,
        routesCreated: routesCreated.length,
        routes: routesCreated,
      };
    } catch (error) {
      console.error("Error building long routes:", error);
      throw error;
    }
  });
