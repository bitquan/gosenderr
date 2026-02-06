import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

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

  // Capture photo from camera (must be triggered by user gesture)
  const photoBlob = await capturePhotoFromCamera();

  // Get current GPS position after photo capture
  const position = await getCurrentPosition();

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
    const tryPosition = (
      options: PositionOptions,
      onError: (error: GeolocationPositionError) => void,
    ) => {
      navigator.geolocation.getCurrentPosition(resolve, onError, options);
    };

    // Attempt 1: high accuracy, longer timeout
    tryPosition(
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      },
      (error) => {
        if (error.code !== error.TIMEOUT) {
          reject(error);
          return;
        }

        // Attempt 2: lower accuracy, allow cached position
        tryPosition(
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000,
          },
          (fallbackError) => {
            if (fallbackError.code !== fallbackError.TIMEOUT) {
              reject(fallbackError);
              return;
            }

            // Attempt 3: accept older cached position if available
            tryPosition(
              {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 300000,
              },
              reject,
            );
          },
        );
      },
    );
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
