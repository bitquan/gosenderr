'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { createItem } from '@/lib/v2/items';
import type { ItemCategory, ItemCondition } from '@/lib/v2/types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/client';

const CATEGORIES: Array<{ value: ItemCategory; label: string }> = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'food', label: 'Food' },
  { value: 'other', label: 'Other' },
];

const CONDITIONS: Array<{ value: ItemCondition; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

interface PhotoPreview {
  file: File;
  preview: string;
}

export default function CreateItemPage() {
  const { user } = useAuthUser();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ItemCategory>('other');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoPreview[] = [];
    for (let i = 0; i < Math.min(files.length, 5 - photos.length); i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('You must be logged in to create a listing');
      return;
    }

    if (!title || !description || !price || !address) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      // Upload photos
      const uploadedPhotoUrls = await Promise.all(
        photos.map(async (photo) => {
          const timestamp = Date.now();
          const fileName = `items/${user.uid}/${timestamp}_${photo.file.name}`;
          const storageRef = ref(storage, fileName);
          
          await uploadBytes(storageRef, photo.file);
          const url = await getDownloadURL(storageRef);
          
          return url; // Return just the URL string
        })
      );

      // Create item
      const itemId = await createItem({
        title,
        description,
        category,
        condition,
        price: parseFloat(price),
        pickupLocation: {
          address,
          lat: 0, // TODO: Geocode address
          lng: 0,
        },
        photos: uploadedPhotoUrls,
        sellerId: user.uid,
      });

      // Clean up preview URLs
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));

      router.push(`/marketplace/${itemId}`);
    } catch (error) {
      console.error('Failed to create item:', error);
      alert('Failed to create listing. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 8px 0' }}>Create New Listing</h1>
        <p style={{ color: '#666', margin: 0 }}>
          List your item and connect with buyers
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '30px' }}>
        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Item Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., iPhone 13 Pro Max 256GB"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
            }}
            required
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your item in detail..."
            rows={6}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
            }}
            required
          />
        </div>

        {/* Category & Condition */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ItemCategory)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
              }}
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              Condition *
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ItemCondition)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
              }}
              required
            >
              {CONDITIONS.map((cond) => (
                <option key={cond.value} value={cond.value}>
                  {cond.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Price (USD) *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontWeight: '600' }}>$</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: '12px',
                paddingTop: '10px',
                paddingBottom: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              required
            />
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Pickup Location *
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="City, State or Full Address"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
            }}
            required
          />
        </div>

        {/* Photos */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
            Photos (up to 5)
          </label>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '12px' }}>
            {photos.map((photo, index) => (
              <div key={index} style={{ position: 'relative', aspectRatio: '1/1' }}>
                <img
                  src={photo.preview}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <svg
                    style={{ width: '14px', height: '14px' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}

            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  aspectRatio: '1/1',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  background: 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  cursor: 'pointer',
                }}
              >
                <svg
                  style={{ width: '32px', height: '32px', marginBottom: '4px' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span style={{ fontSize: '12px' }}>Add</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={() => router.push('/vendor/items')}
            style={{
              flex: 1,
              padding: '12px 24px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontWeight: '600',
              background: 'white',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.5 : 1,
            }}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              background: '#6E56CF',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '700',
              border: 'none',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.5 : 1,
            }}
            disabled={uploading}
          >
            {uploading ? 'Creating Listing...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
