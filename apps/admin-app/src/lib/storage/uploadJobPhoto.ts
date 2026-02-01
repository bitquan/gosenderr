import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/client';
import { serverTimestamp } from 'firebase/firestore';

const getSecureRandomId = () => {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  if (!cryptoObj?.getRandomValues) {
    throw new Error('Secure random generator unavailable');
  }
  const bytes = new Uint32Array(4);
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(36)).join('');
};

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface UploadResult {
  url: string;
  path: string;
  uploadedAt: any; // serverTimestamp()
  uploadedBy: string;
}

/**
 * Upload a photo to Firebase Storage for a job
 * @param file - The image file to upload
 * @param jobId - The job ID
 * @param userId - The user ID uploading the photo
 * @param onProgress - Optional callback for upload progress
 * @returns Promise with download URL and storage path
 */
export async function uploadJobPhoto(
  file: File,
  jobId: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, and WEBP images are allowed.');
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit.');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const random = getSecureRandomId();
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}_${random}.${extension}`;
  
  // Storage path
  const storagePath = `jobs/${jobId}/photos/${filename}`;
  const storageRef = ref(storage, storagePath);

  // Create resumable upload
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Progress callback
        if (onProgress) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress,
          });
        }
      },
      (error) => {
        // Error callback
        console.error('Upload error:', error);
        reject(new Error(`Upload failed: ${error.message}`));
      },
      async () => {
        // Success callback
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: storagePath,
            uploadedAt: serverTimestamp(),
            uploadedBy: userId,
          });
        } catch (error: any) {
          reject(new Error(`Failed to get download URL: ${error.message}`));
        }
      }
    );
  });
}

/**
 * Delete a photo from Firebase Storage
 * @param storagePath - The storage path of the photo to delete
 */
export async function deleteJobPhoto(storagePath: string): Promise<void> {
  const { deleteObject } = await import('firebase/storage');
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
