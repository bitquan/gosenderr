import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

type AdminJobMode = "test" | "manual";
type AdminJobType = "package" | "food";

interface AdminJobLocationInput {
  name?: string;
  address: string;
  lat: number;
  lng: number;
}

interface CreateAdminJobRequest {
  mode: AdminJobMode;
  type: AdminJobType;
  pickup: AdminJobLocationInput;
  dropoff: AdminJobLocationInput;
  estimatedFee: number;
  agreedFee?: number;
  description?: string;
  sourceJobId?: string;
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requireLocation(name: string, value: unknown): AdminJobLocationInput {
  const input = (value || {}) as Partial<AdminJobLocationInput>;
  const address = String(input.address || "").trim();
  const lat = asNumber(input.lat);
  const lng = asNumber(input.lng);

  if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `${name} must include address, lat, and lng`,
    );
  }

  return {
    name: String(input.name || "").trim(),
    address,
    lat,
    lng,
  };
}

export const createAdminJob = functions.https.onCall(
  async (data: CreateAdminJobRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const callerUid = context.auth.uid;
    const callerSnap = await admin.firestore().doc(`users/${callerUid}`).get();
    const caller = callerSnap.data() as { role?: string; fullName?: string; email?: string } | undefined;
    if (!callerSnap.exists || caller?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Admin privileges required");
    }

    const mode = data?.mode === "manual" ? "manual" : "test";
    const type = data?.type === "food" ? "food" : "package";
    const pickup = requireLocation("pickup", data?.pickup);
    const dropoff = requireLocation("dropoff", data?.dropoff);

    const estimatedFee = asNumber(data?.estimatedFee);
    const agreedFeeInput = asNumber(data?.agreedFee);
    const agreedFee = agreedFeeInput > 0 ? agreedFeeInput : estimatedFee;

    if (!Number.isFinite(estimatedFee) || estimatedFee <= 0) {
      throw new functions.https.HttpsError("invalid-argument", "estimatedFee must be a positive number");
    }

    if (!Number.isFinite(agreedFee) || agreedFee <= 0) {
      throw new functions.https.HttpsError("invalid-argument", "agreedFee must be a positive number");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const jobData = {
      type,
      status: mode === "manual" ? "pending" : "open",
      pickupAddress: pickup.address,
      deliveryAddress: dropoff.address,
      pickup: {
        label: pickup.name || pickup.address,
        address: pickup.address,
        lat: pickup.lat,
        lng: pickup.lng,
      },
      dropoff: {
        label: dropoff.name || dropoff.address,
        address: dropoff.address,
        lat: dropoff.lat,
        lng: dropoff.lng,
      },
      estimatedFee,
      agreedFee,
      vehicleType: type === "food" ? "scooter" : "car",
      description: String(data?.description || "").trim(),
      createdAt: now,
      updatedAt: now,
      createdByUid: callerUid,
      createdByEmail: caller?.email || "",
      createdByName: caller?.fullName || "Admin",
      courierUid: null,
      offerCourierUid: null,
      preferredCourierUid: null,
      offerQueue: [],
      offerStatus: "open",
      paymentStatus: "pending",
      paymentIntentId: null,
      paymentRail: "external",
      externalPaymentProvider: "token",
      tokenPayoutRequired: true,
      addressMaskedUntilClaim: true,
      testRecord: mode === "test",
      manualOrder: mode === "manual",
      createdByAdmin: true,
      sourceJobId: String(data?.sourceJobId || "").trim() || null,
    };

    const jobRef = await admin.firestore().collection("jobs").add(jobData);

    await admin.firestore().collection("adminActionLog").add({
      adminId: callerUid,
      action: "create_admin_job",
      targetUserId: null,
      metadata: {
        jobId: jobRef.id,
        mode,
        type,
        estimatedFee,
        agreedFee,
        tokenPayoutRequired: true,
      },
      timestamp: now,
    });

    return {
      success: true,
      jobId: jobRef.id,
      status: jobData.status,
    };
  },
);
