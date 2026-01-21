import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface HubData {
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  address: string;
  timezone: string;
}

/**
 * Seed major hubs across the US
 * Callable function to initialize hub network
 */
export const seedHubs = functions.https.onCall(async (data, context) => {
  console.log("Seeding major hubs");

  // Only allow admin users to seed hubs
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can seed hubs"
    );
  }

  try {
    const majorHubs: HubData[] = [
      {
        name: "San Francisco Hub",
        city: "San Francisco",
        state: "CA",
        lat: 37.7749,
        lng: -122.4194,
        address: "123 Market St, San Francisco, CA 94103",
        timezone: "America/Los_Angeles",
      },
      {
        name: "Los Angeles Hub",
        city: "Los Angeles",
        state: "CA",
        lat: 34.0522,
        lng: -118.2437,
        address: "456 S Figueroa St, Los Angeles, CA 90071",
        timezone: "America/Los_Angeles",
      },
      {
        name: "Seattle Hub",
        city: "Seattle",
        state: "WA",
        lat: 47.6062,
        lng: -122.3321,
        address: "789 Pike St, Seattle, WA 98101",
        timezone: "America/Los_Angeles",
      },
      {
        name: "Phoenix Hub",
        city: "Phoenix",
        state: "AZ",
        lat: 33.4484,
        lng: -112.074,
        address: "321 E Washington St, Phoenix, AZ 85004",
        timezone: "America/Phoenix",
      },
      {
        name: "Denver Hub",
        city: "Denver",
        state: "CO",
        lat: 39.7392,
        lng: -104.9903,
        address: "654 16th St, Denver, CO 80202",
        timezone: "America/Denver",
      },
      {
        name: "Salt Lake City Hub",
        city: "Salt Lake City",
        state: "UT",
        lat: 40.7608,
        lng: -111.891,
        address: "987 S Main St, Salt Lake City, UT 84101",
        timezone: "America/Denver",
      },
      {
        name: "Dallas Hub",
        city: "Dallas",
        state: "TX",
        lat: 32.7767,
        lng: -96.797,
        address: "147 Commerce St, Dallas, TX 75202",
        timezone: "America/Chicago",
      },
      {
        name: "Chicago Hub",
        city: "Chicago",
        state: "IL",
        lat: 41.8781,
        lng: -87.6298,
        address: "258 S Wacker Dr, Chicago, IL 60606",
        timezone: "America/Chicago",
      },
      {
        name: "Atlanta Hub",
        city: "Atlanta",
        state: "GA",
        lat: 33.749,
        lng: -84.388,
        address: "369 Peachtree St NE, Atlanta, GA 30308",
        timezone: "America/New_York",
      },
      {
        name: "New York Hub",
        city: "New York",
        state: "NY",
        lat: 40.7128,
        lng: -74.006,
        address: "741 Broadway, New York, NY 10003",
        timezone: "America/New_York",
      },
    ];

    const batch = db.batch();
    const hubIds: string[] = [];

    for (const hubData of majorHubs) {
      const hubId = db.collection("hubs").doc().id;
      const hubRef = db.collection("hubs").doc(hubId);

      const hubDoc: any = {
        hubId,
        name: hubData.name,
        location: {
          lat: hubData.lat,
          lng: hubData.lng,
          address: hubData.address,
        },
        city: hubData.city,
        state: hubData.state,
        timezone: hubData.timezone,
        type: "major",
        operatingHours: "24/7",
        amenities: ["parking", "restrooms", "wifi", "security"],
        parkingInstructions: "Use designated courier parking area",
        transferAreaDescription: "Main transfer zone on ground floor",
        hasLockers: false,
        outboundRoutes: [],
        inboundRoutes: [],
        dailyPackageVolume: 0,
        activeRunners: 0,
        createdAt: admin.firestore.Timestamp.now(),
        isActive: true,
      };

      batch.set(hubRef, hubDoc);
      hubIds.push(hubId);
    }

    await batch.commit();

    console.log(`Successfully seeded ${hubIds.length} major hubs:`, hubIds);

    return {
      success: true,
      hubsCreated: hubIds.length,
      hubIds,
    };
  } catch (error) {
    console.error("Error seeding hubs:", error);
    throw new functions.https.HttpsError("internal", "Failed to seed hubs");
  }
});
