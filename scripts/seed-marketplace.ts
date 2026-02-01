import * as admin from 'firebase-admin';
import { Timestamp, GeoPoint } from 'firebase-admin/firestore';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'gosenderr-6773f',
});

const db = admin.firestore();

// Configure for emulator
db.settings({
  host: '127.0.0.1:8080',
  ssl: false,
});

// Sample sellers (regular users with seller profiles)
const sampleSellers = [
  {
    id: 'seller1',
    email: 'seller1@example.com',
    displayName: 'Sarah Johnson',
    photoURL: 'https://i.pravatar.cc/150?img=1',
    roles: ['buyer', 'seller'],
    sellerProfile: {
      isActive: true,
      activeListings: 3,
      totalSales: 45,
      totalRevenue: 2340.50,
      rating: 4.8,
      ratingCount: 42,
      responseTimeAvg: 15,
      completionRate: 98,
      joinedAsSellerAt: Timestamp.now()
    },
    isVerified: true,
    isPhoneVerified: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    id: 'seller2',
    email: 'seller2@example.com',
    displayName: 'Mike Chen',
    photoURL: 'https://i.pravatar.cc/150?img=2',
    roles: ['buyer', 'seller'],
    sellerProfile: {
      isActive: true,
      activeListings: 2,
      totalSales: 23,
      totalRevenue: 1150.00,
      rating: 4.6,
      ratingCount: 18,
      responseTimeAvg: 30,
      completionRate: 95,
      joinedAsSellerAt: Timestamp.now()
    },
    isVerified: true,
    isPhoneVerified: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    id: 'seller3',
    email: 'seller3@example.com',
    displayName: 'Emma Rodriguez',
    photoURL: 'https://i.pravatar.cc/150?img=3',
    roles: ['buyer', 'seller'],
    sellerProfile: {
      isActive: true,
      activeListings: 5,
      totalSales: 67,
      totalRevenue: 3420.75,
      rating: 4.9,
      ratingCount: 61,
      responseTimeAvg: 10,
      completionRate: 99,
      joinedAsSellerAt: Timestamp.now()
    },
    isVerified: true,
    isPhoneVerified: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

const sampleItems = [
  {
    sellerId: 'seller1',
    title: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation. 30-hour battery life, comfortable over-ear design, and crystal clear sound.',
    price: 79.99,
    category: 'electronics',
    condition: 'new',
    photos: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
    ],
    quantity: 25,
    deliveryOptions: ['courier', 'pickup'],
    status: 'active',
    isActive: true,
    views: 0,
    favorites: 0,
    soldCount: 0
  },
  {
    sellerId: 'seller2',
    title: 'Vintage Leather Jacket',
    description: 'Genuine leather jacket in excellent condition. Size M, brown color, classic style that never goes out of fashion.',
    price: 149.99,
    category: 'clothing',
    condition: 'good',
    photos: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
      'https://images.unsplash.com/photo-1520975867597-0af37a22e31e?w=800',
    ],
    quantity: 1,
    deliveryOptions: ['courier', 'pickup'],
    pickupLocation: {
      address: '123 Fashion St',
      city: 'Austin',
      state: 'TX',
      location: new GeoPoint(30.2672, -97.7431)
    },
    status: 'active',
    isActive: true,
    views: 0,
    favorites: 0,
    soldCount: 0
  },
  {
    sellerId: 'seller1',
    title: 'Modern Desk Lamp',
    description: 'LED desk lamp with adjustable brightness and color temperature. Perfect for home office or study. Energy efficient and stylish design.',
    price: 34.99,
    category: 'home',
    condition: 'new',
    photos: [
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800',
      'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800',
    ],
    quantity: 50,
    deliveryOptions: ['courier', 'pickup', 'shipping'],
    status: 'active',
    isActive: true,
    views: 0,
    favorites: 0,
    soldCount: 0
  },
  {
    sellerId: 'seller3',
    title: 'Smart Watch Series 5',
    description: 'Latest smartwatch with health tracking, GPS, and 5-day battery life. Water resistant up to 50m. Compatible with iOS and Android.',
    price: 299.99,
    category: 'electronics',
    condition: 'new',
    photos: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
    ],
    quantity: 15,
    deliveryOptions: ['courier', 'shipping'],
    status: 'active',
    isActive: true,
    views: 0,
    favorites: 0,
    soldCount: 0
  },
  {
    sellerId: 'seller3',
    title: 'Cozy Throw Blanket',
    description: 'Ultra-soft fleece blanket perfect for cold nights. Machine washable, available in grey. Size: 60" x 80".',
    price: 29.99,
    category: 'home',
    condition: 'new',
    photos: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800',
      'https://images.unsplash.com/photo-1631889993959-41b4e9c6e6c0?w=800',
    ],
    quantity: 100,
    deliveryOptions: ['courier', 'pickup', 'shipping'],
    status: 'active',
    isActive: true,
    views: 0,
    favorites: 0,
    soldCount: 0
  },
  {
    sellerId: 'seller2',
    title: 'Running Shoes - Size 10',
    description: 'Professional running shoes with excellent cushioning and support. Barely used, like new condition. Perfect for marathon training.',
    price: 89.99,
    category: 'clothing',
    condition: 'like_new',
    photos: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800',
    ],
    quantity: 2,
    deliveryOptions: ['courier', 'pickup'],
    pickupLocation: {
      address: '456 Fitness Ave',
      city: 'Austin',
      state: 'TX',
      location: new GeoPoint(30.2672, -97.7431)
    },
    status: 'active',
    isActive: true,
    views: 0,
    favorites: 0,
    soldCount: 0
  },
  {
    sellerId: 'seller1',
    title: 'iPad Pro 11-inch',
    description: 'Apple iPad Pro 11-inch with M1 chip, 128GB. Perfect for creative work and productivity. Includes Apple Pencil.',
    price: 749.99,
    category: 'electronics',
    condition: 'like_new',
    photos: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
    ],
    quantity: 1,
    deliveryOptions: ['courier', 'pickup'],
    status: 'active',
    isActive: true,
    views: 0,
    favorites: 0,
    soldCount: 0
  },
  {
    sellerId: 'seller3',
    title: 'Coffee Table Book Collection',
    description: 'Set of 5 beautiful coffee table books about art, photography, and design. Great condition, perfect for home decor.',
    price: 45.00,
    category: 'books',
    condition: 'good',
    photos: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
    ],
    quantity: 1,
    deliveryOptions: ['courier', 'pickup'],
    status: 'active',
    isActive: true,
    views: 0,
    favorites: 0,
    soldCount: 0
  }
];

async function seedMarketplace() {
  console.log('🌱 Starting marketplace seed (Phase 2 - Unified User Model)...\n');

  try {
    // Step 1: Create sellers (users with seller profiles)
    console.log('📝 Creating seller users...');
    for (const seller of sampleSellers) {
      await db.collection('users').doc(seller.id).set(seller);
      console.log(`  ✓ Created seller: ${seller.displayName}`);
    }

    // Step 2: Create marketplace items
    console.log('\n📦 Creating marketplace items...');
    const now = Timestamp.now();
    
    for (const itemData of sampleItems) {
      // Get seller info
      const sellerDoc = await db.collection('users').doc(itemData.sellerId).get();
      const sellerData = sellerDoc.data();
      
      if (!sellerData) {
        console.error(`  ❌ Seller not found: ${itemData.sellerId}`);
        continue;
      }
      
      const itemRef = db.collection('marketplaceItems').doc();
      const item = {
        ...itemData,
        sellerName: sellerData.displayName,
        sellerPhotoURL: sellerData.photoURL,
        createdAt: now,
        updatedAt: now,
        publishedAt: now
      };

      await itemRef.set(item);
      console.log(`  ✓ Added: ${item.title} (by ${item.sellerName})`);
    }

    console.log(`\n✅ Successfully seeded:`);
    console.log(`   - ${sampleSellers.length} sellers`);
    console.log(`   - ${sampleItems.length} marketplace items`);
    console.log('\n🔗 View data at: http://127.0.0.1:4000/firestore');
    console.log('   - Users collection: http://127.0.0.1:4000/firestore/data/users');
    console.log('   - MarketplaceItems: http://127.0.0.1:4000/firestore/data/marketplaceItems');
  } catch (error) {
    console.error('❌ Error seeding marketplace:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedMarketplace();
