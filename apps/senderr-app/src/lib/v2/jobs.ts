import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { functions } from "@/lib/firebase";
import {
  GeoPoint,
  JobStatus,
  PackageInfo,
  JobPhoto,
} from "./types";

type LifecycleCommandName = "claim" | "advance" | "cancel";

type LifecycleCommandQueueItem = {
  command: LifecycleCommandName;
  jobId: string;
  agreedFee?: number;
  nextStatus?: JobStatus;
  idempotencyKey: string;
  createdAt: number;
  attempts: number;
};

type ClaimCourierJobCallableRequest = {
  jobId: string;
  agreedFee: number;
  idempotencyKey: string;
};

type AdvanceCourierJobStatusCallableRequest = {
  jobId: string;
  nextStatus: JobStatus;
  idempotencyKey: string;
};

type CancelCourierJobCallableRequest = {
  jobId: string;
  idempotencyKey: string;
};

const LIFECYCLE_QUEUE_STORAGE_KEY = "senderr.lifecycle.command.queue.v1";
let lifecycleQueueListenerInstalled = false;

function randomSuffix(length = 8): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, length);
  }
  return Math.random().toString(36).slice(2, 2 + length);
}

function createLifecycleIdempotencyKey(command: LifecycleCommandName, jobId: string): string {
  const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${command}_${safeJobId}_${Date.now()}_${randomSuffix(10)}`;
}

function readLifecycleQueue(): LifecycleCommandQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIFECYCLE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LifecycleCommandQueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeLifecycleQueue(items: LifecycleCommandQueueItem[]): void {
  if (typeof window === "undefined") return;
  if (items.length === 0) {
    window.localStorage.removeItem(LIFECYCLE_QUEUE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(LIFECYCLE_QUEUE_STORAGE_KEY, JSON.stringify(items));
}

function enqueueLifecycleCommand(item: LifecycleCommandQueueItem): void {
  const queue = readLifecycleQueue();
  const duplicate = queue.some(
    (entry) =>
      entry.idempotencyKey === item.idempotencyKey ||
      (entry.command === item.command &&
        entry.jobId === item.jobId &&
        entry.nextStatus === item.nextStatus),
  );
  if (!duplicate) {
    queue.push(item);
    writeLifecycleQueue(queue);
  }
}

function isOfflineLikeError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  const err = error as { code?: string; message?: string };
  const code = String(err?.code || "").toLowerCase();
  const message = String(err?.message || "").toLowerCase();
  return (
    code.includes("unavailable") ||
    code.includes("network") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  );
}

async function logLifecycleCommandFailure(
  command: "accept" | "status" | "cancel",
  jobId: string,
  error: unknown,
  isOffline: boolean,
): Promise<void> {
  if (!functions) return;
  try {
    const callable = httpsCallable<
      {
        command: "accept" | "status" | "cancel";
        jobId: string;
        message: string;
        code?: string;
        isOffline?: boolean;
      },
      { ok: boolean }
    >(functions, "logCommandFailure");

    const err = error as { code?: string; message?: string };
    await callable({
      command,
      jobId,
      message: String(err?.message || "Lifecycle command failed"),
      code: err?.code,
      isOffline,
    });
  } catch {
    // telemetry is best effort
  }
}

async function callClaimCourierJob(
  payload: ClaimCourierJobCallableRequest,
): Promise<void> {
  if (!functions) throw new Error("Firebase Functions not initialized");
  const callable = httpsCallable<ClaimCourierJobCallableRequest, { success: boolean }>(
    functions,
    "claimCourierJob",
  );
  await callable(payload);
}

async function callAdvanceCourierJobStatus(
  payload: AdvanceCourierJobStatusCallableRequest,
): Promise<void> {
  if (!functions) throw new Error("Firebase Functions not initialized");
  const callable = httpsCallable<AdvanceCourierJobStatusCallableRequest, { success: boolean }>(
    functions,
    "advanceCourierJobStatus",
  );
  await callable(payload);
}

async function callCancelCourierJob(
  payload: CancelCourierJobCallableRequest,
): Promise<void> {
  if (!functions) throw new Error("Firebase Functions not initialized");
  const callable = httpsCallable<CancelCourierJobCallableRequest, { success: boolean }>(
    functions,
    "cancelCourierJob",
  );
  await callable(payload);
}

export async function flushLifecycleCommandQueue(): Promise<void> {
  const queue = readLifecycleQueue();
  if (!queue.length) return;

  const remaining: LifecycleCommandQueueItem[] = [];

  for (const item of queue) {
    try {
      if (item.command === "claim") {
        if (typeof item.agreedFee !== "number") {
          continue;
        }
        await callClaimCourierJob({
          jobId: item.jobId,
          agreedFee: item.agreedFee,
          idempotencyKey: item.idempotencyKey,
        });
      } else if (item.command === "advance") {
        if (!item.nextStatus) {
          continue;
        }
        await callAdvanceCourierJobStatus({
          jobId: item.jobId,
          nextStatus: item.nextStatus,
          idempotencyKey: item.idempotencyKey,
        });
      } else if (item.command === "cancel") {
        await callCancelCourierJob({
          jobId: item.jobId,
          idempotencyKey: item.idempotencyKey,
        });
      }
    } catch (error) {
      if (isOfflineLikeError(error)) {
        remaining.push({ ...item, attempts: item.attempts + 1 });
        continue;
      }

      await logLifecycleCommandFailure(
        item.command === "claim"
          ? "accept"
          : item.command === "cancel"
            ? "cancel"
            : "status",
        item.jobId,
        error,
        false,
      );
    }
  }

  writeLifecycleQueue(remaining);
}

function ensureLifecycleQueueListener(): void {
  if (typeof window === "undefined" || lifecycleQueueListenerInstalled) return;
  window.addEventListener("online", () => {
    void flushLifecycleCommandQueue();
  });
  lifecycleQueueListenerInstalled = true;
}

export type LifecycleCommandResult = {
  queued: boolean;
};

interface CreateJobPayload {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  package: PackageInfo;
  photos: JobPhoto[];
}

export async function createJob(
  userUid: string,
  payload: CreateJobPayload,
): Promise<string> {
  const jobsRef = collection(db, "jobs");
  const docRef = await addDoc(jobsRef, {
    createdByUid: userUid,
    status: "open" as JobStatus,
    pickup: payload.pickup,
    dropoff: payload.dropoff,
    package: payload.package,
    photos: payload.photos,
    courierUid: null,
    agreedFee: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function cancelJob(jobId: string, _userUid: string): Promise<LifecycleCommandResult> {
  ensureLifecycleQueueListener();
  if (typeof navigator !== "undefined" && navigator.onLine) {
    await flushLifecycleCommandQueue();
  }

  const idempotencyKey = createLifecycleIdempotencyKey("cancel", jobId);

  try {
    await callCancelCourierJob({ jobId, idempotencyKey });
    return { queued: false };
  } catch (error) {
    const offline = isOfflineLikeError(error);
    await logLifecycleCommandFailure("cancel", jobId, error, offline);

    if (offline) {
      enqueueLifecycleCommand({
        command: "cancel",
        jobId,
        idempotencyKey,
        createdAt: Date.now(),
        attempts: 1,
      });
      return { queued: true };
    }

    throw error;
  }
}

export async function claimJob(
  jobId: string,
  _courierUid: string,
  agreedFee: number,
): Promise<LifecycleCommandResult> {
  ensureLifecycleQueueListener();
  if (typeof navigator !== "undefined" && navigator.onLine) {
    await flushLifecycleCommandQueue();
  }

  const idempotencyKey = createLifecycleIdempotencyKey("claim", jobId);

  try {
    await callClaimCourierJob({ jobId, agreedFee, idempotencyKey });
    return { queued: false };
  } catch (error) {
    const offline = isOfflineLikeError(error);
    await logLifecycleCommandFailure("accept", jobId, error, offline);

    if (offline) {
      enqueueLifecycleCommand({
        command: "claim",
        jobId,
        agreedFee,
        idempotencyKey,
        createdAt: Date.now(),
        attempts: 1,
      });
      return { queued: true };
    }

    throw error;
  }
}

export async function updateJobStatus(
  jobId: string,
  nextStatus: JobStatus,
  _actorUid?: string,
): Promise<LifecycleCommandResult> {
  ensureLifecycleQueueListener();
  if (typeof navigator !== "undefined" && navigator.onLine) {
    await flushLifecycleCommandQueue();
  }

  const idempotencyKey = createLifecycleIdempotencyKey("advance", jobId);

  try {
    await callAdvanceCourierJobStatus({
      jobId,
      nextStatus,
      idempotencyKey,
    });
    return { queued: false };
  } catch (error) {
    const offline = isOfflineLikeError(error);
    await logLifecycleCommandFailure("status", jobId, error, offline);

    if (offline) {
      enqueueLifecycleCommand({
        command: "advance",
        jobId,
        nextStatus,
        idempotencyKey,
        createdAt: Date.now(),
        attempts: 1,
      });
      return { queued: true };
    }

    throw error;
  }
}

export type TokenPolicyPack = {
  id: string;
  tokens: number;
  priceUsd: number;
};

export type TokenPolicyResponse = {
  enabled: boolean;
  costs: {
    claimJob: number;
    cancelJob: number;
    disputeJob: number;
  };
  packs: TokenPolicyPack[];
};

export type TokenWalletSummaryResponse = {
  available: number;
  reserved: number;
};

export type TokenCheckoutSessionResponse = {
  url: string;
  sessionId?: string;
  emulated?: boolean;
};

export type TokenClaimReadiness = {
  useTokenMode: boolean;
  canClaim: boolean;
  requiredTokens: number;
  availableTokens: number;
  reason?: string;
};

type TokenCheckoutSessionRequest = {
  packId: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
};

export async function getTokenPolicy(): Promise<TokenPolicyResponse> {
  if (!functions) {
    throw new Error("Firebase Functions not initialized");
  }

  const callable = httpsCallable<unknown, TokenPolicyResponse>(
    functions,
    "getTokenPolicy",
  );
  const result = await callable({});
  return result.data;
}

export async function getTokenWalletSummary(): Promise<TokenWalletSummaryResponse> {
  if (!functions) {
    throw new Error("Firebase Functions not initialized");
  }

  const callable = httpsCallable<unknown, TokenWalletSummaryResponse>(
    functions,
    "getTokenWalletSummary",
  );
  const result = await callable({});
  return result.data;
}

export async function tokenCreateCheckoutSession(
  packId: string,
  successUrl: string,
  cancelUrl: string,
  idempotencyKey: string,
): Promise<TokenCheckoutSessionResponse> {
  if (!functions) {
    throw new Error("Firebase Functions not initialized");
  }

  const callable = httpsCallable<
    TokenCheckoutSessionRequest,
    TokenCheckoutSessionResponse
  >(functions, "tokenCreateCheckoutSession");

  const result = await callable({
    packId,
    successUrl,
    cancelUrl,
    idempotencyKey,
  });

  return result.data;
}

export async function getTokenClaimReadiness(
  _uid: string,
): Promise<TokenClaimReadiness> {
  const [policy, wallet] = await Promise.all([
    getTokenPolicy(),
    getTokenWalletSummary(),
  ]);

  const requiredTokens = Math.max(policy?.costs?.claimJob ?? 0, 0);
  const availableTokens = Math.max(wallet?.available ?? 0, 0);
  const useTokenMode = Boolean(policy?.enabled) && requiredTokens > 0;
  const canClaim = !useTokenMode || availableTokens >= requiredTokens;

  return {
    useTokenMode,
    canClaim,
    requiredTokens,
    availableTokens,
    reason: canClaim
      ? undefined
      : `Insufficient tokens. Requires ${requiredTokens}, available ${availableTokens}.`,
  };
}

export async function declineCourierJobOffer(jobId: string): Promise<void> {
  if (!functions) {
    throw new Error("Firebase Functions not initialized");
  }

  const callable = httpsCallable<{ jobId: string }, { success: boolean }>(
    functions,
    "declineCourierJobOffer",
  );

  await callable({ jobId });
}
