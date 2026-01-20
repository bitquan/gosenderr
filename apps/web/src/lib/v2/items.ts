import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { ItemDoc, ItemStatus, ItemCategory, ItemCondition } from './types';

// Client-side item with ID
export interface Item extends Omit<ItemDoc, 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Get all available items
export async function getAvailableItems(): Promise<Item[]> {
  const itemsRef = collection(db, 'items');
  const q = query(
    itemsRef,
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Item[];
}

// Get items by category
export async function getItemsByCategory(
  category: ItemCategory
): Promise<Item[]> {
  const itemsRef = collection(db, 'items');
  const q = query(
    itemsRef,
    where('category', '==', category),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Item[];
}

// Get items by seller
export async function getItemsBySeller(sellerId: string): Promise<Item[]> {
  const itemsRef = collection(db, 'items');
  const q = query(
    itemsRef,
    where('sellerId', '==', sellerId)
  );

  const snapshot = await getDocs(q);
  const items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Item[];
  
  // Sort in memory instead of in query (avoids need for index)
  return items.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

// Get single item by ID
export async function getItem(itemId: string): Promise<Item | null> {
  const itemRef = doc(db, 'items', itemId);
  const snapshot = await getDoc(itemRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Item;
}

// Create new item listing
export interface CreateItemInput {
  title: string;
  description: string;
  category: ItemCategory;
  condition: ItemCondition;
  price: number;
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  photos?: string[];
  sellerId: string;
}

export async function createItem(
  input: CreateItemInput
): Promise<string> {
  const itemsRef = collection(db, 'items');

  const itemData = {
    sellerId: input.sellerId,
    title: input.title,
    description: input.description,
    category: input.category,
    condition: input.condition,
    price: input.price,
    pickupLocation: input.pickupLocation,
    photos: input.photos || [],
    itemDetails: {
      requiresHelp: false,
    },
    isFoodItem: input.category === 'food',
    status: 'available' as ItemStatus,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(itemsRef, itemData);
  return docRef.id;
}

// Update item status
export async function updateItemStatus(
  itemId: string,
  status: ItemStatus
): Promise<void> {
  const itemRef = doc(db, 'items', itemId);
  await updateDoc(itemRef, {
    status,
  });
}

// Delete item (mark as deleted)
export async function deleteItem(itemId: string): Promise<void> {
  const itemRef = doc(db, 'items', itemId);
  await updateDoc(itemRef, {
    status: 'sold' as ItemStatus, // Mark as sold since 'deleted' is not in ItemStatus type
  });
}
