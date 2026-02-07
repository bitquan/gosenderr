
import { JobPackage } from '../shared/types';
import { PackageBadges } from './PackageBadges';
import { PhotoGallery } from './PhotoGallery';
import type { JobPhoto } from '../shared/types';

interface PackageDetailsPanelProps {
  package?: JobPackage | null;
  photos?: JobPhoto[] | null;
  canSeePhotos: boolean;
}

export function PackageDetailsPanel({ package: pkg, photos, canSeePhotos }: PackageDetailsPanelProps) {
  // If no package data at all, show message
  if (!pkg && (!photos || photos.length === 0)) {
    return (
      <div>
        <strong style={{ display: 'block', marginBottom: '8px' }}>📦 Package Details:</strong>
        <div style={{ fontSize: '14px', color: '#999' }}>Package details not provided</div>
      </div>
    );
  }

  return (
    <div>
      <strong style={{ display: 'block', marginBottom: '8px' }}>📦 Package Details:</strong>
      {pkg && (
        <PackageBadges 
          size={pkg.size} 
          flags={pkg.flags} 
          notes={pkg.notes}
          showNotes={true}
        />
      )}
      
      {canSeePhotos && photos && photos.length > 0 && (
        <div style={{ marginTop: pkg ? '16px' : '0' }}>
          <strong style={{ display: 'block', marginBottom: '8px' }}>
            📷 Photos ({photos.length}):
          </strong>
          <PhotoGallery photos={photos} maxThumbnails={3} />
        </div>
      )}
    </div>
  );
}
