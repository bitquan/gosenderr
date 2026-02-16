import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import { HttpsError, onCall } from "firebase-functions/v2/https";

type UploadCourierAssetRequest = {
  destinationPrefix?: string;
  extension?: string;
  mimeType?: string;
  base64?: string;
};

type UploadCourierAssetResult = {
  path: string;
  url: string;
  bucket: string;
};

const sanitizePrefix = (value: string): string =>
  value
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

const sanitizeExtension = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalized) {
    return "jpg";
  }
  return normalized.slice(0, 8);
};

const normalizeMimeType = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "image/jpeg":
    case "image/jpg":
    case "image/png":
    case "image/webp":
    case "image/heic":
    case "image/heif":
      return normalized === "image/jpg" ? "image/jpeg" : normalized;
    default:
      return "image/jpeg";
  }
};

const stripDataUrlPrefix = (value: string): string => {
  const match = value.match(/^data:[^;]+;base64,(.+)$/i);
  return match && match[1] ? match[1] : value;
};

export const uploadCourierAsset = onCall<UploadCourierAssetRequest>(
  {
    cors: true,
    region: "us-central1",
  },
  async (request): Promise<UploadCourierAssetResult> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const destinationPrefixRaw =
      typeof request.data?.destinationPrefix === "string" ? request.data.destinationPrefix : "";
    const destinationPrefix = sanitizePrefix(destinationPrefixRaw);
    const allowedPrefix = `courierProfiles/${uid}/`;
    if (!destinationPrefix.startsWith(allowedPrefix)) {
      throw new HttpsError("permission-denied", "Invalid upload destination.");
    }

    const extension = sanitizeExtension(
      typeof request.data?.extension === "string" ? request.data.extension : "jpg",
    );
    const mimeType = normalizeMimeType(
      typeof request.data?.mimeType === "string" ? request.data.mimeType : "image/jpeg",
    );

    const base64Raw = typeof request.data?.base64 === "string" ? request.data.base64.trim() : "";
    if (!base64Raw) {
      throw new HttpsError("invalid-argument", "base64 payload is required.");
    }

    const payloadBase64 = stripDataUrlPrefix(base64Raw).replace(/\s+/g, "");
    let bytes: Buffer;
    try {
      bytes = Buffer.from(payloadBase64, "base64");
    } catch {
      throw new HttpsError("invalid-argument", "Invalid base64 payload.");
    }

    if (!bytes.length) {
      throw new HttpsError("invalid-argument", "Decoded upload payload is empty.");
    }
    if (bytes.length > 8 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Upload payload exceeds 8MB limit.");
    }

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const path = `${destinationPrefix}/${filename}`;
    const bucket = admin.storage().bucket();
    const file = bucket.file(path);
    const token = randomUUID();

    await file.save(bytes, {
      resumable: false,
      metadata: {
        contentType: mimeType,
        cacheControl: "public,max-age=31536000",
        metadata: {
          firebaseStorageDownloadTokens: token,
          uploadedByUid: uid,
        },
      },
    });

    const encodedPath = encodeURIComponent(path);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    return {
      path,
      url,
      bucket: bucket.name,
    };
  },
);

