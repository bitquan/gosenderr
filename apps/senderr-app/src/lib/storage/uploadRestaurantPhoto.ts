import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/lib/firebase";

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB

const getSecureRandomId = () => {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Secure random generator unavailable");
  }
  const bytes = new Uint32Array(4);
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(36)).join("");
};

export async function uploadRestaurantPhoto(
  file: File,
  courierId: string,
  restaurantId: string,
): Promise<{ url: string; path: string }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Invalid file type. Only JPG, PNG, and WEBP are allowed.");
  }
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error("File size exceeds the 10MB limit.");
  }

  const extension = file.name.split(".").pop() || "jpg";
  const filename = `${Date.now()}_${getSecureRandomId()}.${extension}`;
  const storagePath = `food-pickups/${courierId}/${restaurantId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      () => {},
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(storageRef);
          resolve({ url, path: storagePath });
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}
