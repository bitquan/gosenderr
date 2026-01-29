import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {PackageDoc, HubDoc} from "@gosenderr/shared";
import {calculateDistance} from "../utils/routeOptimization";

const db = admin.firestore();

interface HubPair {
  originHubId: string;
  destinationHubId: string;
  packages: PackageDoc[];
}

/**
 * Build long haul routes from pending packages
 * Runs daily at midnight UTC to batch packages by hub pairs
 */
export const buildLongHaulRoutes = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("Starting long haul route building process");

    try {
      // Query packages eligible for long haul routing
      const snapshot = await db
        .collection("packages")
        .where("currentStatus", "in", ["pickup_pending", "at_origin_hub"])
        .get();

      if (snapshot.empty) {
        console.log("No packages found for long haul route building");
        return {success: true, routesCreated: 0};
      }

      const packages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        packageId: doc.id,
      })) as PackageDoc[];

      console.log(`Found ${packages.length} packages eligible for long haul routing`);

      // Group packages by origin/destination hub pairs
      const hubPairMap = new Map<string, HubPair>();

      for (const pkg of packages) {
        const key = `${pkg.origin.hubId}-${pkg.destination.hubId}`;
        
        if (!hubPairMap.has(key)) {
          hubPairMap.set(key, {
            originHubId: pkg.origin.hubId,
            destinationHubId: pkg.destination.hubId,
            packages: [],
          });
        }

        hubPairMap.get(key)!.packages.push(pkg);
      }

      console.log(`Grouped into ${hubPairMap.size} hub pairs`);

      // Filter hub pairs with 15+ packages and create routes
      const batch = db.batch();
      const routesCreated: string[] = [];

      for (const [key, hubPair] of hubPairMap.entries()) {
        if (hubPair.packages.length < 15) {
          console.log(
            `Skipping hub pair ${key}: only ${hubPair.packages.length} packages (need 15+)`
          );
          continue;
        }

        console.log(
          `Creating route for hub pair ${key} with ${hubPair.packages.length} packages`
        );

        // Fetch hub details
        const [originHubSnap, destHubSnap] = await Promise.all([
          db.collection("hubs").doc(hubPair.originHubId).get(),
          db.collection("hubs").doc(hubPair.destinationHubId).get(),
        ]);

        if (!originHubSnap.exists || !destHubSnap.exists) {
          console.error(`Hub not found for pair ${key}`);
          continue;
        }

        const originHub = originHubSnap.data() as HubDoc;
        const destinationHub = destHubSnap.data() as HubDoc;

        // Calculate route metrics
        const distance = calculateDistance(
          {lat: originHub.location.lat, lng: originHub.location.lng},
          {lat: destinationHub.location.lat, lng: destinationHub.location.lng}
        );

        const totalWeight = hubPair.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
        const totalVolume = hubPair.packages.reduce((sum, pkg) => sum + pkg.volume, 0);

        // Calculate runner earnings: $50 + max($1.00/mi × distance, $1.50/pkg × packageCount)
        const distanceEarnings = distance * 100; // $1.00/mi in cents
        const packageEarnings = hubPair.packages.length * 150; // $1.50/pkg in cents
        const runnerEarnings = 5000 + Math.max(distanceEarnings, packageEarnings);

        // Calculate estimated duration (distance / 60mph average)
        const estimatedDurationMinutes = Math.round((distance / 60) * 60);

        // Calculate platform fees and totals
        const platformFees = hubPair.packages.reduce(
          (sum, pkg) => sum + pkg.pricing.breakdown.platformFee,
          0
        );
        const totalCustomerPaid = hubPair.packages.reduce(
          (sum, pkg) => sum + pkg.pricing.customerPaid,
          0
        );

        // Schedule departure for tomorrow 6 AM at origin hub timezone
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Parse timezone to get offset (simplified - assumes format like "America/New_York")
        // For MVP, we'll use a simple approach
        const departureTime = new Date(tomorrow);
        departureTime.setHours(6, 0, 0, 0);
        
        const scheduledDeparture = admin.firestore.Timestamp.fromDate(departureTime);
        
        // Calculate arrival time
        const arrivalTime = new Date(departureTime.getTime() + estimatedDurationMinutes * 60000);
        const scheduledArrival = admin.firestore.Timestamp.fromDate(arrivalTime);

        // Create route document
        const routeId = db.collection("longHaulRoutes").doc().id;
        const routeDoc: any = {
          routeId,
          type: "long_haul",
          status: "available",
          originHub: {
            hubId: originHub.hubId,
            name: originHub.name,
            location: originHub.location,
            timezone: originHub.timezone,
          },
          destinationHub: {
            hubId: destinationHub.hubId,
            name: destinationHub.name,
            location: destinationHub.location,
            timezone: destinationHub.timezone,
          },
          distance,
          estimatedDuration: estimatedDurationMinutes,
          frequency: "on_demand",
          scheduledDeparture,
          scheduledArrival,
          packageIds: hubPair.packages.map((pkg) => pkg.packageId),
          packageCount: hubPair.packages.length,
          totalWeight,
          totalVolume,
          pricing: {
            runnerEarnings,
            platformFees,
            totalCustomerPaid,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Add route to batch
        const routeRef = db.collection("longHaulRoutes").doc(routeId);
        batch.set(routeRef, routeDoc);

        // Update packages with route assignment in journey array
        for (const pkg of hubPair.packages) {
          const packageRef = db.collection("packages").doc(pkg.packageId);
          
          // Find the appropriate journey leg to update
          const journeyLeg = pkg.journey.find(
            (leg) => 
              leg.type === "long_haul" && 
              leg.status === "pending" &&
              leg.fromHub === hubPair.originHubId &&
              leg.toHub === hubPair.destinationHubId
          );

          if (journeyLeg) {
            const legIndex = pkg.journey.indexOf(journeyLeg);
            batch.update(packageRef, {
              [`journey.${legIndex}.routeId`]: routeId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        routesCreated.push(routeId);
      }

      // Commit all changes
      if (routesCreated.length > 0) {
        await batch.commit();
        console.log(`Successfully created ${routesCreated.length} long haul routes:`, routesCreated);
      } else {
        console.log("No routes met the criteria (15+ packages per hub pair)");
      }

      return {
        success: true,
        routesCreated: routesCreated.length,
        routeIds: routesCreated,
      };
    } catch (error) {
      console.error("Error building long haul routes:", error);
      throw error;
    }
  });
