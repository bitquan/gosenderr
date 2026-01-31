import * as admin from "firebase-admin";
import Stripe from "stripe";

let cachedSecretKey: string | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getStripeSecretKey(): Promise<string> {
  const now = Date.now();
  if (cachedSecretKey && now - cacheAt < CACHE_TTL_MS) {
    return cachedSecretKey;
  }

  const doc = await admin.firestore().doc("secrets/stripe").get();
  const data = doc.exists ? doc.data() : {};

  const mode = data?.mode || "test";
  const liveSecretKey = data?.liveSecretKey;
  const testSecretKey = data?.secretKey || data?.testSecretKey;

  const secretKey =
    mode === "live" && liveSecretKey
      ? liveSecretKey
      : testSecretKey || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }

  cachedSecretKey = secretKey;
  cacheAt = now;
  return secretKey;
}

export async function getStripeClient(): Promise<Stripe> {
  const apiKey = await getStripeSecretKey();
  return new Stripe(apiKey, {
    apiVersion: "2025-02-24.acacia",
  });
}
