const admin = require("firebase-admin");

// Initialize if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "gosenderr-6773f",
  });
}

const db = admin.firestore();

// Update user to admin role
db.collection("users")
  .doc("YjarW1zBXscuLG04fOI3fid1gt42")
  .update({
    role: "admin",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  .then(() => {
    console.log("✅ User role updated to admin!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
