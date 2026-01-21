import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Build long-distance routes for package delivery
 * This function groups packages going in similar directions and creates optimized routes
 */
export const buildLongRoutes = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async (context) => {
    try {
      const db = admin.firestore();

      // Get all unassigned packages that are ready for long-distance delivery
      const packagesSnapshot = await db
        .collection("deliveryJobs")
        .where("status", "==", "open")
        .where("jobType", "==", "package")
        .where("estimatedDistance", ">", 100) // Long distance = > 100 miles
        .get();

      if (packagesSnapshot.empty) {
        console.log("No long-distance packages to route");
        return null;
      }

      console.log(
        `Found ${packagesSnapshot.size} long-distance packages to route`
      );

      // Group packages by general direction (simplified)
      const packagesByRegion: { [key: string]: any[] } = {};

      packagesSnapshot.docs.forEach((doc) => {
        const packageData = doc.data();
        const destinationLat = packageData.dropoff.lat;
        const destinationLng = packageData.dropoff.lng;

        // Simple regional grouping (can be enhanced with more sophisticated clustering)
        const region = `${Math.floor(destinationLat / 5)}_${Math.floor(
          destinationLng / 5
        )}`;

        if (!packagesByRegion[region]) {
          packagesByRegion[region] = [];
        }

        packagesByRegion[region].push({
          id: doc.id,
          data: packageData,
        });
      });

      // Create routes for each region
      const batch = db.batch();
      let routesCreated = 0;

      for (const [region, packages] of Object.entries(packagesByRegion)) {
        if (packages.length > 0) {
          const routeId = db.collection("longHaulRoutes").doc().id;

          // Calculate route details
          const firstPackage = packages[0].data;
          const lastPackage = packages[packages.length - 1].data;

          const route = {
            routeId,
            type: "long_haul",
            status: "available",
            origin: {
              lat: firstPackage.pickup.lat,
              lng: firstPackage.pickup.lng,
              address: firstPackage.pickup.address,
            },
            destination: {
              lat: lastPackage.dropoff.lat,
              lng: lastPackage.dropoff.lng,
              address: lastPackage.dropoff.address,
            },
            stops: [
              // Add pickup stops
              ...packages.map((pkg, index) => ({
                location: {
                  lat: pkg.data.pickup.lat,
                  lng: pkg.data.pickup.lng,
                  address: pkg.data.pickup.address,
                },
                packages: [pkg.id],
                stopType: "pickup" as const,
                sequenceNumber: index * 2,
              })),
              // Add dropoff stops
              ...packages.map((pkg, index) => ({
                location: {
                  lat: pkg.data.dropoff.lat,
                  lng: pkg.data.dropoff.lng,
                  address: pkg.data.dropoff.address,
                },
                packages: [pkg.id],
                stopType: "dropoff" as const,
                sequenceNumber: packages.length * 2 + index * 2,
              })),
            ],
            packageIds: packages.map((pkg) => pkg.id),
            estimatedDistance: packages.reduce(
              (sum, pkg) => sum + pkg.data.estimatedDistance,
              0
            ),
            estimatedDuration: packages.reduce(
              (sum, pkg) => sum + pkg.data.estimatedDuration,
              0
            ),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          const routeRef = db.collection("longHaulRoutes").doc(routeId);
          batch.set(routeRef, route);
          routesCreated++;
        }
      }

      await batch.commit();
      console.log(`Created ${routesCreated} long-distance routes`);

      return { success: true, routesCreated };
    } catch (error) {
      console.error("Error building long routes:", error);
      return null;
    }
  });
