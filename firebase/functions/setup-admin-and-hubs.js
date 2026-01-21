// Set admin claim and seed hubs
const admin = require("firebase-admin");
const path = require("path");

// Initialize with the project
admin.initializeApp({
  projectId: "gosenderr-6773f",
});

const db = admin.firestore();
const auth = admin.auth();

const EMAIL = "sayquanmclaurinwork@gmail.com";

const hubs = [
  {
    name: "San Francisco Hub",
    city: "San Francisco",
    state: "CA",
    lat: 37.7749,
    lng: -122.4194,
    address: "123 Market St",
    timezone: "America/Los_Angeles",
  },
  {
    name: "Los Angeles Hub",
    city: "Los Angeles",
    state: "CA",
    lat: 34.0522,
    lng: -118.2437,
    address: "456 Olympic Blvd",
    timezone: "America/Los_Angeles",
  },
  {
    name: "Seattle Hub",
    city: "Seattle",
    state: "WA",
    lat: 47.6062,
    lng: -122.3321,
    address: "789 Pike St",
    timezone: "America/Los_Angeles",
  },
  {
    name: "Phoenix Hub",
    city: "Phoenix",
    state: "AZ",
    lat: 33.4484,
    lng: -112.074,
    address: "321 Central Ave",
    timezone: "America/Phoenix",
  },
  {
    name: "Denver Hub",
    city: "Denver",
    state: "CO",
    lat: 39.7392,
    lng: -104.9903,
    address: "654 16th St",
    timezone: "America/Denver",
  },
  {
    name: "Salt Lake City Hub",
    city: "Salt Lake City",
    state: "UT",
    lat: 40.7608,
    lng: -111.891,
    address: "987 State St",
    timezone: "America/Denver",
  },
  {
    name: "Dallas Hub",
    city: "Dallas",
    state: "TX",
    lat: 32.7767,
    lng: -96.797,
    address: "147 Main St",
    timezone: "America/Chicago",
  },
  {
    name: "Houston Hub",
    city: "Houston",
    state: "TX",
    lat: 29.7604,
    lng: -95.3698,
    address: "258 Travis St",
    timezone: "America/Chicago",
  },
  {
    name: "Chicago Hub",
    city: "Chicago",
    state: "IL",
    lat: 41.8781,
    lng: -87.6298,
    address: "369 Michigan Ave",
    timezone: "America/Chicago",
  },
  {
    name: "Minneapolis Hub",
    city: "Minneapolis",
    state: "MN",
    lat: 44.9778,
    lng: -93.265,
    address: "741 Hennepin Ave",
    timezone: "America/Chicago",
  },
  {
    name: "Detroit Hub",
    city: "Detroit",
    state: "MI",
    lat: 42.3314,
    lng: -83.0458,
    address: "852 Woodward Ave",
    timezone: "America/Detroit",
  },
  {
    name: "Atlanta Hub",
    city: "Atlanta",
    state: "GA",
    lat: 33.749,
    lng: -84.388,
    address: "963 Peachtree St",
    timezone: "America/New_York",
  },
  {
    name: "Miami Hub",
    city: "Miami",
    state: "FL",
    lat: 25.7617,
    lng: -80.1918,
    address: "159 Biscayne Blvd",
    timezone: "America/New_York",
  },
  {
    name: "Charlotte Hub",
    city: "Charlotte",
    state: "NC",
    lat: 33.749,
    lng: -84.388,
    address: "357 Trade St",
    timezone: "America/New_York",
  },
  {
    name: "Washington DC Hub",
    city: "Washington",
    state: "DC",
    lat: 38.9072,
    lng: -77.0369,
    address: "753 Pennsylvania Ave",
    timezone: "America/New_York",
  },
  {
    name: "Philadelphia Hub",
    city: "Philadelphia",
    state: "PA",
    lat: 39.9526,
    lng: -75.1652,
    address: "951 Market St",
    timezone: "America/New_York",
  },
  {
    name: "New York Hub",
    city: "New York",
    state: "NY",
    lat: 40.7128,
    lng: -74.006,
    address: "159 Broadway",
    timezone: "America/New_York",
  },
  {
    name: "Boston Hub",
    city: "Boston",
    state: "MA",
    lat: 42.3601,
    lng: -71.0589,
    address: "357 Boylston St",
    timezone: "America/New_York",
  },
];

async function setup() {
  try {
    // 1. Find user by email and set admin claim
    console.log(`\n1. Finding user: ${EMAIL}...`);
    const user = await auth.getUserByEmail(EMAIL);
    console.log(`   Found user: ${user.uid}`);

    console.log("2. Setting admin custom claim...");
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log("   ✅ Admin claim set");

    // 2. Seed hubs
    console.log("\n3. Seeding 18 hubs...");
    const batch = db.batch();

    hubs.forEach((hub) => {
      const hubRef = db.collection("hubs").doc();
      batch.set(hubRef, {
        ...hub,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`   ✅ Successfully seeded ${hubs.length} hubs\n`);

    console.log("🎉 Setup complete!");
    console.log("   - You are now an admin");
    console.log("   - 18 hubs have been created");
    console.log(
      "\nNext: Enable features via feature flags in Firestore Console",
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setup();
