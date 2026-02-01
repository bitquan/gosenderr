/**
 * Orders Service
 * Handles marketplace order operations
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '@/lib/firebase';
import type {
  Order,
  CreateOrderInput,
  Address
} from '@/types/marketplace';

export class OrdersService {
  
  /**
   * Create order (calls Cloud Function for atomic transaction)
   */
  async createOrder(orderData: CreateOrderInput): Promise<Order> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Must be logged in to create order');
    }
    
    try {
      const createOrderFn = httpsCallable(functions, 'marketplace-createOrder');
      const result = await createOrderFn({
        ...orderData,
        buyerId: currentUser.uid
      });
      
      return result.data as Order;
    } catch (error: any) {
      console.error('Error creating order:', error);
      throw new Error(error.message || 'Failed to create order');
    }
  }
  
  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<Order> {
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Order not found');
    }
    
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Order;
  }
  
  /**
   * Get buyer's orders
   */
  async getBuyerOrders(buyerId?: string): Promise<Order[]> {
    const currentUser = auth.currentUser;
    const userId = buyerId || currentUser?.uid;
    
    if (!userId) {
      throw new Error('Must be logged in to view orders');
    }
    
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', userId),
      orderBy('placedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order));
  }
  
  /**
   * Get seller's orders
   */
  async getSellerOrders(sellerId?: string): Promise<Order[]> {
    const currentUser = auth.currentUser;
    const userId = sellerId || currentUser?.uid;
    
    if (!userId) {
      throw new Error('Must be logged in to view orders');
    }
    
    const q = query(
      collection(db, 'orders'),
      where('sellerId', '==', userId),
      orderBy('placedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order));
  }
  
  /**
   * Accept order (seller action)
   */
  async acceptOrder(orderId: string): Promise<void> {
    try {
      const acceptOrderFn = httpsCallable(functions, 'marketplace-acceptOrder');
      await acceptOrderFn({ orderId });
    } catch (error: any) {
      console.error('Error accepting order:', error);
      throw new Error(error.message || 'Failed to accept order');
    }
  }
  
  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason: string): Promise<void> {
    try {
      const cancelOrderFn = httpsCallable(functions, 'marketplace-cancelOrder');
      await cancelOrderFn({ orderId, reason });
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      throw new Error(error.message || 'Failed to cancel order');
    }
  }
  
  /**
   * Subscribe to real-time order updates
   */
  subscribeToOrder(orderId: string, callback: (order: Order) => void): Unsubscribe {
    const docRef = doc(db, 'orders', orderId);
    
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.id,
          ...snapshot.data()
        } as Order);
      }
    }, (error) => {
      console.error('Error subscribing to order:', error);
    });
  }
  
  /**
   * Subscribe to buyer's orders (real-time)
   */
  subscribeToBuyerOrders(
    callback: (orders: Order[]) => void,
    buyerId?: string
  ): Unsubscribe {
    const currentUser = auth.currentUser;
    const userId = buyerId || currentUser?.uid;
    
    if (!userId) {
      throw new Error('Must be logged in to subscribe to orders');
    }
    
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', userId),
      orderBy('placedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      callback(orders);
    }, (error) => {
      console.error('Error subscribing to buyer orders:', error);
    });
  }
  
  /**
   * Subscribe to seller's orders (real-time)
   */
  subscribeToSellerOrders(
    callback: (orders: Order[]) => void,
    sellerId?: string
  ): Unsubscribe {
    const currentUser = auth.currentUser;
    const userId = sellerId || currentUser?.uid;
    
    if (!userId) {
      throw new Error('Must be logged in to subscribe to orders');
    }
    
    const q = query(
      collection(db, 'orders'),
      where('sellerId', '==', userId),
      orderBy('placedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      callback(orders);
    }, (error) => {
      console.error('Error subscribing to seller orders:', error);
    });
  }
}

// Export singleton instance
export const ordersService = new OrdersService();
