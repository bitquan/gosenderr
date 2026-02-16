import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import cors from "cors";

const allowedOrigins = [
  "https://gosenderr.com",
  "https://www.gosenderr.com",
  "https://gosenderr-6773f.web.app",
  "https://gosenderr-marketplace.web.app",
  "https://gosenderr-courier.web.app",
  "https://gosenderr-admin.web.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
];

const isAllowedOrigin = (origin: string) => {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  return origin.endsWith(".gosenderr.com");
};

const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
});

export const getPublicConfigHttp = functions.https.onRequest(
  {
    minInstances: 1,
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      const origin = req.headers.origin || "";
      if (isAllowedOrigin(origin)) {
        res.set("Access-Control-Allow-Origin", origin);
        res.set("Vary", "Origin");
      }

      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const stripeDoc = await admin.firestore().doc("secrets/stripe").get();
      const stripeData = stripeDoc.exists ? stripeDoc.data() : {};

      const mapboxDoc = await admin.firestore().doc("secrets/mapbox").get();
      const mapboxData = mapboxDoc.exists ? mapboxDoc.data() : {};

      const paymentDoc = await admin.firestore().doc("platformSettings/payment").get();
      const paymentData = paymentDoc.exists ? paymentDoc.data() : {};

      const configuredMode = stripeData?.mode || "test";
      const livePublishableKey = stripeData?.livePublishableKey || "";
      const testPublishableKey =
        stripeData?.publishableKey || stripeData?.testPublishableKey || "";

      const useLive = configuredMode === "live" && !!livePublishableKey;
      const stripePublishableKey = useLive
        ? livePublishableKey
        : testPublishableKey;
      const effectiveMode = useLive ? "live" : "test";
      const platformFeePackage =
        typeof paymentData?.platformFeePackage === "number" ? paymentData.platformFeePackage : 2.5;
      const platformFeeFood =
        typeof paymentData?.platformFeeFood === "number" ? paymentData.platformFeeFood : 1.5;
      const deliveryBaseFee =
        typeof paymentData?.deliveryBaseFee === "number" ? paymentData.deliveryBaseFee : 3.99;
      const deliveryPerMileFee =
        typeof paymentData?.deliveryPerMileFee === "number" ? paymentData.deliveryPerMileFee : 0.85;
      const deliveryPerStopFee =
        typeof paymentData?.deliveryPerStopFee === "number" ? paymentData.deliveryPerStopFee : 0.65;
      const deliveryMinimumFee =
        typeof paymentData?.deliveryMinimumFee === "number" ? paymentData.deliveryMinimumFee : 4.99;
      const orderAdFeeEnabled = Boolean(paymentData?.orderAdFeeEnabled ?? paymentData?.adFeeEnabled);
      const orderAdFeeFlat =
        typeof paymentData?.orderAdFeeFlat === "number" ? paymentData.orderAdFeeFlat : 0;
      const collectTax = Boolean(paymentData?.collectTax);
      const taxRate = typeof paymentData?.taxRate === "number" ? paymentData.taxRate : 0;

      res.set("Cache-Control", "public, max-age=60, s-maxage=300");
      res.json({
        stripePublishableKey,
        stripeMode: effectiveMode,
        mapboxPublicToken: mapboxData?.publicToken || "",
        platformFeePackage,
        platformFeeFood,
        deliveryBaseFee,
        deliveryPerMileFee,
        deliveryPerStopFee,
        deliveryMinimumFee,
        orderAdFeeEnabled,
        orderAdFeeFlat,
        collectTax,
        taxRate,
      });
    });
  },
);
