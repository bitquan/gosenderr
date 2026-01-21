// Call seedHubs function to initialize hub network
import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCNj3HH0FqjgTVj7ysxINB6ZEtL3g6NvKo",
  authDomain: "gosenderr-6773f.firebaseapp.com",
  projectId: "gosenderr-6773f",
  storageBucket: "gosenderr-6773f.appspot.com",
  messagingSenderId: "1045849821321",
  appId: "1:1045849821321:web:d3ef3ec12b56e892c6f384",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

console.log("Calling seedHubs function...");

try {
  const seedHubs = httpsCallable(functions, "seedHubs");
  const result = await seedHubs();
  console.log("✅ Success:", result.data);
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  if (error.details) {
    console.error("Details:", error.details);
  }
  process.exit(1);
}
