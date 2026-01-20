'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { uploadJobPhoto, UploadProgress } from '@/lib/storage/uploadJobPhoto';

export interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
  uploaded: boolean;
  url?: string;
  path?: string;
  error?: string;
}

interface PhotoUploaderProps {
  jobId: string;
  userId: string;
  maxPhotos?: number;
  onPhotosChange: (photos: PhotoFile[]) => void;
  photos: PhotoFile[];
}

export function PhotoUploader({
  jobId,
  userId,
  maxPhotos = 5,
  onPhotosChange,
  photos,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<PhotoFile[]>(photos);

  // Keep ref in sync with props
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    console.log('Files selected:', files.length);

    const newPhotos: PhotoFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      if (photos.length + newPhotos.length >= maxPhotos) {
        alert(`Maximum ${maxPhotos} photos allowed`);
        break;
      }

      const file = files[i];
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert(`${file.name}: Invalid file type. Only JPG, PNG, and WEBP are allowed.`);
        continue;
      }

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: File size exceeds 10MB limit.`);
        continue;
      }

      const photoFile: PhotoFile = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
        progress: 0,
        uploaded: false,
      };

      newPhotos.push(photoFile);
    }

    console.log('New photos to add:', newPhotos.length);

    if (newPhotos.length > 0) {
      const updatedPhotos = [...photos, ...newPhotos];
      console.log('Total photos after add:', updatedPhotos.length);
      
      // Update ref immediately before starting uploads
      photosRef.current = updatedPhotos;
      onPhotosChange(updatedPhotos);
      
      // Start uploads for each new photo
      newPhotos.forEach((photo) => {
        console.log('Starting upload for photo:', photo.id);
        startUpload(photo);
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startUpload = async (photo: PhotoFile) => {
    console.log('startUpload called for:', photo.id);
    
    // Update photo state to uploading
    const uploadingPhotos = photosRef.current.map((p) => (p.id === photo.id ? { ...p, uploading: true } : p));
    photosRef.current = uploadingPhotos;
    onPhotosChange(uploadingPhotos);

    try {
      console.log('Calling uploadJobPhoto...');
      console.log('JobId:', jobId);
      console.log('UserId:', userId);
      console.log('File:', photo.file.name, photo.file.type, photo.file.size);
      const result = await uploadJobPhoto(
        photo.file,
        jobId,
        userId,
        (progress: UploadProgress) => {
          console.log('Upload progress:', progress.progress);
          const progressPhotos = photosRef.current.map((p) => (p.id === photo.id ? { ...p, progress: progress.progress } : p));
          photosRef.current = progressPhotos;
          onPhotosChange(progressPhotos);
        }
      );

      console.log('Upload successful:', result);
      console.log('🔴 AFTER SUCCESS LOG - LINE 127');
      console.log('Current photos before update:', photosRef.current.length);
      console.log('🔴 Photo ref current:', photosRef.current);
      
      // Update photo with result
      const updatedPhotos = photosRef.current.map((p) =>
        p.id === photo.id
          ? {
              ...p,
              uploading: false,
              uploaded: true,
              url: result.url,
              path: result.path,
              progress: 100,
            }
          : p
      );
      console.log('Updated photos after success:', updatedPhotos.length);
      console.log('Updated photo:', updatedPhotos.find(p => p.id === photo.id));
      photosRef.current = updatedPhotos;
      onPhotosChange(updatedPhotos);
    } catch (error: any) {
      const errorPhotos = photosRef.current.map((p) =>
        p.id === photo.id
          ? {
              ...p,
              uploading: false,
              uploaded: false,
              error: error.message,
            }
          : p
      );
      photosRef.current = errorPhotos;
      onPhotosChange(errorPhotos);
    }
  };

  const removePhoto = (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
          Package Photos (Optional)
        </label>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          Upload up to {maxPhotos} photos. JPG, PNG, or WEBP. Max 10MB each.
        </p>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #ddd',
                background: '#f5f5f5',
              }}
            >
              <img
                src={photo.preview}
                alt="Package photo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              
              {/* Upload Progress */}
              {photo.uploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                    {Math.round(photo.progress)}%
                  </div>
                </div>
              )}

              {/* Upload Success */}
              {photo.uploaded && (
                <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#16a34a', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                  ✓
                </div>
              )}

              {/* Error */}
              {photo.error && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(220, 38, 38, 0.9)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', fontSize: '10px', textAlign: 'center' }}>
                  {photo.error}
                </div>
              )}

              {/* Remove Button */}
              <button
                onClick={() => removePhoto(photo.id)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {photos.length < maxPhotos && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '12px 20px',
              background: '#f5f5f5',
              border: '2px dashed #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666',
              width: '100%',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
              e.currentTarget.style.borderColor = '#6E56CF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
              e.currentTarget.style.borderColor = '#ddd';
            }}
          >
            📷 Add Photos ({photos.length}/{maxPhotos})
          </button>
        </div>
      )}
    </div>
  );
}
