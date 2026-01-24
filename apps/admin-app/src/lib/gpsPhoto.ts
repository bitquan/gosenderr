import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

interface CaptureOptions {
  quality?: number;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}

interface PhotoResult {
  url: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: Date;
}

export async function captureGPSPhoto(
  userId: string,
  jobId: string,
  options: CaptureOptions = {},
): Promise<PhotoResult> {
  const { quality = 0.7, maxSizeMB = 0.5, maxWidthOrHeight = 1920 } = options;

  // Get current GPS position
  const position = await getCurrentPosition();

  // Capture photo from camera
  const photoBlob = await capturePhotoFromCamera();

  // Compress image
  const compressedBlob = await imageCompression(photoBlob as File, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
  });

  // Add GPS metadata to filename
  const timestamp = Date.now();
  const filename = `${userId}/${jobId}/${timestamp}_${position.coords.latitude}_${position.coords.longitude}.jpg`;

  // Upload to Firebase Storage
  const storageRef = ref(storage, `delivery-photos/${filename}`);
  await uploadBytes(storageRef, compressedBlob, {
    contentType: "image/jpeg",
    customMetadata: {
      latitude: position.coords.latitude.toString(),
      longitude: position.coords.longitude.toString(),
      accuracy: position.coords.accuracy.toString(),
      timestamp: new Date().toISOString(),
    },
  });

  // Get download URL
  const url = await getDownloadURL(storageRef);

  return {
    url,
    coordinates: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    },
    timestamp: new Date(),
  };
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

function capturePhotoFromCamera(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Use back camera on mobile

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      resolve(file);
    };

    input.onerror = () => {
      reject(new Error("Failed to capture photo"));
    };

    input.click();
  });
}
