/**
 * Marketplace Service
 * Handles all marketplace item operations (browse, search, create, update, delete)
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { commitTokenAction, makeIdempotencyKey, releaseTokenAction, reserveTokenAction } from '@/lib/tokens';
import type {
  MarketplaceItem,
  CreateListingInput,
  UpdateListingInput,
  ItemFilters,
  ListingStatus
} from '@/types/marketplace';

export class MarketplaceService {
  private toMillis(value: unknown): number {
    if (!value) return 0;
    if (value instanceof Timestamp) return value.toMillis();
    if (typeof (value as any)?.toMillis === 'function') return (value as any).toMillis();
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private getBoostPriority(item: MarketplaceItem): number {
    const now = Date.now();
    const anyItem = item as MarketplaceItem & {
      boostedUntil?: unknown;
      adBoost?: { endAt?: unknown; placement?: string; active?: boolean };
    };
    const boostedUntilMs = this.toMillis(anyItem.boostedUntil || anyItem.adBoost?.endAt);
    if (boostedUntilMs <= now) return 0;

    const placement = anyItem.adBoost?.placement;
    if (placement === 'featured') return 2;
    return 1;
  }

  private sortFeedItems(items: MarketplaceItem[]): MarketplaceItem[] {
    return [...items].sort((a, b) => {
      const boostDelta = this.getBoostPriority(b) - this.getBoostPriority(a);
      if (boostDelta !== 0) return boostDelta;

      const bPublished = this.toMillis(b.publishedAt || b.createdAt);
      const aPublished = this.toMillis(a.publishedAt || a.createdAt);
      if (bPublished !== aPublished) return bPublished - aPublished;

      return (b.views || 0) - (a.views || 0);
    });
  }
  
  /**
   * Browse marketplace items with filters
   */
  async getItems(filters: ItemFilters = {}): Promise<MarketplaceItem[]> {
    const constraints: QueryConstraint[] = [
      where('isActive', '==', true),
      where('status', '==', 'active')
    ];
    
    // Category filter
    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }
    
    // Price filters
    if (filters.maxPrice) {
      constraints.push(where('price', '<=', filters.maxPrice));
    }
    if (filters.minPrice) {
      constraints.push(where('price', '>=', filters.minPrice));
    }
    
    // Condition filter
    if (filters.condition) {
      constraints.push(where('condition', '==', filters.condition));
    }
    
    // Sort
    if (filters.sortBy === 'price_asc') {
      constraints.push(orderBy('price', 'asc'));
    } else if (filters.sortBy === 'price_desc') {
      constraints.push(orderBy('price', 'desc'));
    } else if (filters.sortBy === 'popular') {
      constraints.push(orderBy('views', 'desc'));
    } else {
      // Default: newest first
      constraints.push(orderBy('publishedAt', 'desc'));
    }
    
    // Limit
    constraints.push(limit(filters.limit || 20));
    
    const q = query(collection(db, 'marketplaceItems'), ...constraints);
    const snapshot = await getDocs(q);
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MarketplaceItem));
    return this.sortFeedItems(items);
  }
  
  /**
   * Search items by keyword (client-side filtering for now)
   * TODO: Integrate Algolia for production full-text search
   */
  async searchItems(searchTerm: string): Promise<MarketplaceItem[]> {
    const q = query(
      collection(db, 'marketplaceItems'),
      where('isActive', '==', true),
      where('status', '==', 'active'),
      orderBy('publishedAt', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MarketplaceItem));
    
    // Client-side search (not ideal for large datasets)
    const searchLower = searchTerm.toLowerCase();
    const filtered = items.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower)
    );
    return this.sortFeedItems(filtered);
  }
  
  /**
   * Get single item details
   */
  async getItem(itemId: string): Promise<MarketplaceItem | null> {
    const docRef = doc(db, 'marketplaceItems', itemId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    // Increment view count
    await updateDoc(docRef, {
      views: (docSnap.data().views || 0) + 1
    });
    
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as MarketplaceItem;
  }
  
  /**
   * Create new listing
   * Auto-activates seller profile if first listing
   */
  async createListing(input: CreateListingInput): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in to create listing');
    }
    
    // Get seller info
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User profile not found');
    }
    
    const userData = userSnap.data();

    const sellerApplicationStatus = userData?.sellerApplication?.status;
    const sellerProfileStatus = userData?.sellerProfile?.status;
    const sellerApproved =
      sellerApplicationStatus === 'approved' || sellerProfileStatus === 'approved';

    if (!sellerApproved) {
      throw new Error('Seller application must be approved before creating listings');
    }
    
    const sellerPayoutMode = (
      userData?.sellerProfile?.payoutMode ||
      userData?.sellerProfile?.sellerPayoutMode ||
      'stripe_connect'
    ) as 'stripe_connect' | 'external_provider' | 'manual_settlement';
    const requiresTokenGate =
      sellerPayoutMode === 'external_provider' || sellerPayoutMode === 'manual_settlement';
    const tokenIdempotencyKey = makeIdempotencyKey('seller_listing_publish');
    let tokenReservationId: string | null = null;

    if (requiresTokenGate) {
      const reserveResult = await reserveTokenAction({
        actorType: 'seller',
        action: 'listing_publish',
        referenceId: `listing:${currentUser.uid}:${input.title.slice(0, 48)}`,
        idempotencyKey: tokenIdempotencyKey,
      });

      if (reserveResult.status === 'reserved') {
        tokenReservationId = reserveResult.reservationId;
      }
    }

    // Create listing
    const normalizeUrl = (url: string) => {
      if (!url) return url;
      if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
      }
      return url;
    };

    const listing: Omit<MarketplaceItem, 'id'> = {
      sellerId: currentUser.uid,
      sellerName: userData.displayName || 'Anonymous',
      sellerPhotoURL: normalizeUrl(userData.profilePhotoUrl || ''),
      title: input.title,
      description: input.description,
      category: input.category,
      condition: input.condition,
      price: input.price,
      quantity: input.quantity,
      photos: input.photos.map(normalizeUrl),
      deliveryOptions: input.deliveryOptions,
      ...(input.pickupLocation && { pickupLocation: input.pickupLocation }),
      status: 'active' as ListingStatus,
      isActive: true,
      views: 0,
      favorites: 0,
      soldCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now()
    };
    
    try {
      const docRef = await addDoc(collection(db, 'marketplaceItems'), listing);
      
      // Activate seller profile if needed
      await this.activateSellerProfile(currentUser.uid, userData);

      if (tokenReservationId) {
        await commitTokenAction({
          reservationId: tokenReservationId,
          idempotencyKey: tokenIdempotencyKey,
        });
      }
      
      return docRef.id;
    } catch (error) {
      if (tokenReservationId) {
        try {
          await releaseTokenAction({
            reservationId: tokenReservationId,
            idempotencyKey: tokenIdempotencyKey,
          });
        } catch (releaseError) {
          console.error('Failed to release token reservation after listing failure:', releaseError);
        }
      }
      throw error;
    }
  }
  
  /**
   * Update existing listing
   */
  async updateListing(itemId: string, updates: UpdateListingInput): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in to update listing');
    }
    
    // Verify ownership
    const itemRef = doc(db, 'marketplaceItems', itemId);
    const itemSnap = await getDoc(itemRef);
    
    if (!itemSnap.exists()) {
      throw new Error('Listing not found');
    }
    
    if (itemSnap.data().sellerId !== currentUser.uid) {
      throw new Error('Not authorized to update this listing');
    }
    
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }
  
  /**
   * Delete listing (soft delete)
   */
  async deleteListing(itemId: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in to delete listing');
    }
    
    // Verify ownership
    const itemRef = doc(db, 'marketplaceItems', itemId);
    const itemSnap = await getDoc(itemRef);
    
    if (!itemSnap.exists()) {
      throw new Error('Listing not found');
    }
    
    if (itemSnap.data().sellerId !== currentUser.uid) {
      throw new Error('Not authorized to delete this listing');
    }
    
    await updateDoc(itemRef, {
      status: 'removed' as ListingStatus,
      isActive: false,
      updatedAt: Timestamp.now()
    });
    
    // Decrement seller's active listings count
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data().sellerProfile) {
      const activeListings = userSnap.data().sellerProfile.activeListings || 0;
      await updateDoc(userRef, {
        'sellerProfile.activeListings': Math.max(0, activeListings - 1)
      });
    }
  }
  
  /**
   * Get seller's listings (includes all statuses: active, sold, inactive)
   */
  async getSellerListings(sellerId: string): Promise<MarketplaceItem[]> {
    const q = query(
      collection(db, 'marketplaceItems'),
      where('sellerId', '==', sellerId),
      where('status', '!=', 'removed'), // Exclude deleted items only
      orderBy('status'), // Required for != query
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MarketplaceItem));
  }
  
  /**
   * Activate seller profile on first listing
   * Private helper method
   */
  private async activateSellerProfile(userId: string, userData: DocumentData): Promise<void> {
    const userRef = doc(db, 'users', userId);
    
    // Check if seller profile already exists
    if (!userData.sellerProfile) {
      // Create seller profile
      await updateDoc(userRef, {
        'sellerProfile': {
          isActive: true,
          activeListings: 1,
          totalSales: 0,
          totalRevenue: 0,
          rating: 0,
          ratingCount: 0,
          responseTimeAvg: 0,
          completionRate: 0,
          joinedAsSellerAt: Timestamp.now()
        },
        'roles': [...(userData.roles || ['buyer']), 'seller']
      });
    } else {
      // Increment active listings
      await updateDoc(userRef, {
        'sellerProfile.activeListings': (userData.sellerProfile.activeListings || 0) + 1
      });
    }
  }
}

// Export singleton instance
export const marketplaceService = new MarketplaceService();
