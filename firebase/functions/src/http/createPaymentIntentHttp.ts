import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getStripeClient } from "../stripe/stripeSecrets";

const allowedOrigins = [
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

interface CreatePaymentIntentBody {
  jobId: string;
  courierRate: number;
  platformFee: number;
}

export const createPaymentIntentHttp = functions.https.onRequest(
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
    res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const authHeader = req.headers.authorization || "";
      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!tokenMatch) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const decoded = await admin.auth().verifyIdToken(tokenMatch[1]);
      const body = (req.body || {}) as CreatePaymentIntentBody;
      const { jobId, courierRate, platformFee } = body;

      if (!jobId || courierRate === undefined || platformFee === undefined) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      if (typeof courierRate !== "number" || typeof platformFee !== "number") {
        res.status(400).json({ error: "Invalid numeric fields" });
        return;
      }

      if (courierRate < 0 || platformFee < 0) {
        res.status(400).json({ error: "Amounts must be non-negative" });
        return;
      }

      const totalAmount = Math.round((courierRate + platformFee) * 100);
      const stripe = await getStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        capture_method: "manual",
        metadata: {
          jobId,
          courierRate: courierRate.toString(),
          platformFee: platformFee.toString(),
          userId: decoded.uid,
        },
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Error creating payment intent (HTTP):", error);
      res.status(500).json({ error: "Internal error" });
    }
  },
);
