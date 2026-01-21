import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const AVERAGE_SPEED_MPH = 55; // Average highway speed for route estimation
const MIN_PACKAGES_FOR_HUB_ROUTE = 5; // Minimum packages required to create a hub-to-hub route

/**
 * Build hub-to-hub routes for interstate shipping
 * This function creates routes between distribution hubs
 */
export const buildLongHaulRoutes = functions.pubsub
  .schedule("every 30 minutes")
  .onRun(async (context) => {
    try {
      const db = admin.firestore();

      // Get all active hubs
      const hubsSnapshot = await db
        .collection("hubs")
        .where("isActive", "==", true)
        .get();

      if (hubsSnapshot.size < 2) {
        console.log("Not enough hubs for hub-to-hub routing");
        return null;
      }

      const hubs = hubsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(`Found ${hubs.length} active hubs`);

      // For each hub, check if packages need to be transferred to other hubs
      const batch = db.batch();
      let routesCreated = 0;

      for (const originHub of hubs) {
        // Get packages at this hub that need to go to other regions
        const packagesSnapshot = await db
          .collection("deliveryJobs")
          .where("status", "==", "open")
          .where("jobType", "==", "package")
          .where("currentHubId", "==", originHub.id)
          .get();

        if (packagesSnapshot.empty) continue;

        // Group packages by destination hub
        const packagesByDestHub: { [hubId: string]: any[] } = {};

        for (const packageDoc of packagesSnapshot.docs) {
          const packageData = packageDoc.data();

          // Find closest destination hub to package dropoff
          let closestHub = null;
          let minDistance = Infinity;

          for (const destHub of hubs) {
            if (destHub.id === originHub.id) continue;

            const distance = calculateDistance(
              packageData.dropoff.lat,
              packageData.dropoff.lng,
              destHub.location.lat,
              destHub.location.lng
            );

            if (distance < minDistance) {
              minDistance = distance;
              closestHub = destHub;
            }
          }

          if (closestHub && minDistance < 500) {
            // Only route if within 500 miles
            if (!packagesByDestHub[closestHub.id]) {
              packagesByDestHub[closestHub.id] = [];
            }

            packagesByDestHub[closestHub.id].push({
              id: packageDoc.id,
              data: packageData,
            });
          }
        }

        // Create hub-to-hub routes
        for (const [destHubId, packages] of Object.entries(
          packagesByDestHub
        )) {
          if (packages.length >= MIN_PACKAGES_FOR_HUB_ROUTE) {
            // Minimum packages for hub-to-hub route
            const destHub = hubs.find((h) => h.id === destHubId);
            if (!destHub) continue;

            const routeId = db.collection("longHaulRoutes").doc().id;

            const route = {
              routeId,
              type: "hub_to_hub",
              status: "available",
              origin: {
                lat: originHub.location.lat,
                lng: originHub.location.lng,
                address: originHub.location.address,
                hubId: originHub.id,
              },
              destination: {
                lat: destHub.location.lat,
                lng: destHub.location.lng,
                address: destHub.location.address,
                hubId: destHub.id,
              },
              stops: [
                {
                  hubId: originHub.id,
                  location: {
                    lat: originHub.location.lat,
                    lng: originHub.location.lng,
                    address: originHub.location.address,
                  },
                  packages: packages.map((pkg) => pkg.id),
                  stopType: "pickup",
                  sequenceNumber: 0,
                },
                {
                  hubId: destHub.id,
                  location: {
                    lat: destHub.location.lat,
                    lng: destHub.location.lng,
                    address: destHub.location.address,
                  },
                  packages: packages.map((pkg) => pkg.id),
                  stopType: "dropoff",
                  sequenceNumber: 1,
                },
              ],
              packageIds: packages.map((pkg) => pkg.id),
              estimatedDistance: calculateDistance(
                originHub.location.lat,
                originHub.location.lng,
                destHub.location.lat,
                destHub.location.lng
              ),
              estimatedDuration: Math.ceil(
                calculateDistance(
                  originHub.location.lat,
                  originHub.location.lng,
                  destHub.location.lat,
                  destHub.location.lng
                ) /
                  AVERAGE_SPEED_MPH *
                  60
              ), // Minutes, assuming average highway speed
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            const routeRef = db.collection("longHaulRoutes").doc(routeId);
            batch.set(routeRef, route);
            routesCreated++;

            console.log(
              `Created hub-to-hub route: ${originHub.name} → ${destHub.name} (${packages.length} packages)`
            );
          }
        }
      }

      if (routesCreated > 0) {
        await batch.commit();
        console.log(`Created ${routesCreated} hub-to-hub routes`);
      }

      return { success: true, routesCreated };
    } catch (error) {
      console.error("Error building hub-to-hub routes:", error);
      return null;
    }
  });

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
