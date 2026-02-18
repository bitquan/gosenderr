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
import type {
  MarketplaceItem,
  CreateListingInput,
  UpdateListingInput,
  ItemFilters,
  ListingStatus
} from '@/types/marketplace';

export class MarketplaceService {
  
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
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MarketplaceItem));
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
    return items.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower)
    );
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

    const roles = Array.isArray(userData?.roles) ? userData.roles : [];
    const hasSellerRole = userData?.role === 'seller' || roles.includes('seller');
    const sellerApprovalStatus = userData?.sellerApplication?.status || userData?.sellerProfile?.status;
    const sellerApproved = hasSellerRole || sellerApprovalStatus === 'approved' || userData?.sellerProfile?.isActive === true;

    if (!sellerApproved) {
      throw new Error('Seller application must be approved before creating listings');
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
    
    const docRef = await addDoc(collection(db, 'marketplaceItems'), listing);
    
    // Activate seller profile if needed
    await this.activateSellerProfile(currentUser.uid, userData);
    await this.syncSellerDefaultPickupLocation(currentUser.uid, userData, input.pickupLocation);
    
    return docRef.id;
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

    if (updates.pickupLocation) {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      await this.syncSellerDefaultPickupLocation(
        currentUser.uid,
        userData,
        updates.pickupLocation,
      );
    }
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

  /**
   * Persist the most recent pickup location so new listings can auto-fill it.
   */
  private async syncSellerDefaultPickupLocation(
    userId: string,
    userData: DocumentData,
    pickupLocation?: CreateListingInput['pickupLocation'],
  ): Promise<void> {
    if (!pickupLocation) return;

    const userRef = doc(db, 'users', userId);
    const existingLocalConfig = userData?.sellerProfile?.localSellingConfig || {};
    const existingShareExact =
      userData?.sellerProfile?.shareExactPickupLocation === true ||
      existingLocalConfig?.shareExactPickupLocation === true;

    await updateDoc(userRef, {
      'sellerProfile.defaultPickupLocation': pickupLocation,
      'sellerProfile.shareExactPickupLocation': existingShareExact,
      'sellerProfile.localSellingEnabled': true,
      'sellerProfile.localSellingConfig': {
        ...existingLocalConfig,
        address: pickupLocation.address,
        city: pickupLocation.city,
        state: pickupLocation.state,
        postalCode:
          pickupLocation.postalCode || existingLocalConfig.postalCode || '',
        location: pickupLocation.location,
        shareExactPickupLocation:
          existingLocalConfig.shareExactPickupLocation ?? existingShareExact,
      },
      updatedAt: Timestamp.now(),
    });
  }
}

// Export singleton instance
export const marketplaceService = new MarketplaceService();
