import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

const allowedOrigins = [
  "https://www.gosenderr.com",
  "https://gosenderr-6773f.web.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export const getPublicConfigHttp = functions.https.onRequest(
  {
    cors: allowedOrigins,
    minInstances: 1,
  },
  async (req, res) => {
    const origin = req.headers.origin || "";
    if (allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
    }
    res.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const stripeDoc = await admin.firestore().doc("secrets/stripe").get();
    const stripeData = stripeDoc.exists ? stripeDoc.data() : {};

    const mapboxDoc = await admin.firestore().doc("secrets/mapbox").get();
    const mapboxData = mapboxDoc.exists ? mapboxDoc.data() : {};

    const configuredMode = stripeData?.mode || "test";
    const livePublishableKey = stripeData?.livePublishableKey || "";
    const testPublishableKey =
      stripeData?.publishableKey || stripeData?.testPublishableKey || "";

    const useLive = configuredMode === "live" && !!livePublishableKey;
    const stripePublishableKey = useLive ? livePublishableKey : testPublishableKey;
    const effectiveMode = useLive ? "live" : "test";

    res.set("Cache-Control", "public, max-age=60, s-maxage=300");
    res.json({
      stripePublishableKey,
      stripeMode: effectiveMode,
      mapboxPublicToken: mapboxData?.publicToken || "",
    });
  },
);