import * as admin from 'firebase-admin';
import { MarketplaceItem } from '@gosenderr/shared';

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

const sampleItems: Partial<MarketplaceItem>[] = [
  {
    title: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation. 30-hour battery life, comfortable over-ear design, and crystal clear sound.',
    price: 79.99,
    category: 'Electronics',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
    ],
    stock: 25,
    vendorId: 'vendor1',
    vendorName: 'TechGear Store',
    status: 'active',
    featured: true,
    tags: ['audio', 'wireless', 'bluetooth', 'headphones'],
    rating: 4.5,
    reviewCount: 128,
  },
  {
    title: 'Vintage Leather Jacket',
    description: 'Genuine leather jacket in excellent condition. Size M, brown color, classic style that never goes out of fashion.',
    price: 149.99,
    category: 'Clothing',
    condition: 'used',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
      'https://images.unsplash.com/photo-1520975867597-0af37a22e31e?w=800',
    ],
    stock: 1,
    vendorId: 'vendor2',
    vendorName: 'Vintage Fashion',
    status: 'active',
    featured: false,
    tags: ['clothing', 'leather', 'jacket', 'vintage'],
    rating: 4.8,
    reviewCount: 42,
  },
  {
    title: 'Modern Desk Lamp',
    description: 'LED desk lamp with adjustable brightness and color temperature. Perfect for home office or study. Energy efficient and stylish design.',
    price: 34.99,
    category: 'Home',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800',
      'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800',
    ],
    stock: 50,
    vendorId: 'vendor1',
    vendorName: 'TechGear Store',
    status: 'active',
    featured: true,
    tags: ['home', 'lighting', 'desk', 'led'],
    rating: 4.3,
    reviewCount: 89,
  },
  {
    title: 'Smart Watch Series 5',
    description: 'Latest smartwatch with health tracking, GPS, and 5-day battery life. Water resistant up to 50m. Compatible with iOS and Android.',
    price: 299.99,
    category: 'Electronics',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
    ],
    stock: 15,
    vendorId: 'vendor3',
    vendorName: 'Smart Devices Co',
    status: 'active',
    featured: true,
    tags: ['electronics', 'smartwatch', 'fitness', 'wearable'],
    rating: 4.6,
    reviewCount: 234,
  },
  {
    title: 'Cozy Throw Blanket',
    description: 'Ultra-soft fleece blanket perfect for cold nights. Machine washable, available in grey. Size: 60" x 80".',
    price: 29.99,
    category: 'Home',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800',
      'https://images.unsplash.com/photo-1631889993959-41b4e9c6e6c0?w=800',
    ],
    stock: 100,
    vendorId: 'vendor4',
    vendorName: 'Home Comfort',
    status: 'active',
    featured: false,
    tags: ['home', 'blanket', 'cozy', 'fleece'],
    rating: 4.7,
    reviewCount: 156,
  },
  {
    title: 'Running Shoes - Size 10',
    description: 'Professional running shoes with excellent cushioning and support. Barely used, like new condition. Perfect for marathon training.',
    price: 89.99,
    category: 'Clothing',
    condition: 'like_new',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800',
    ],
    stock: 2,
    vendorId: 'vendor2',
    vendorName: 'Vintage Fashion',
    status: 'active',
    featured: false,
    tags: ['clothing', 'shoes', 'running', 'athletic'],
    rating: 4.4,
    reviewCount: 67,
  },
];

async function seedMarketplace() {
  console.log('🌱 Starting marketplace seed...');

  try {
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    for (const item of sampleItems) {
      const itemRef = db.collection('marketplaceItems').doc();
      const itemData: MarketplaceItem = {
        ...item,
        id: itemRef.id,
        createdAt: now,
        updatedAt: now,
      } as MarketplaceItem;

      batch.set(itemRef, itemData);
      console.log(`  ✓ Added: ${item.title}`);
    }

    await batch.commit();
    console.log(`\n✅ Successfully seeded ${sampleItems.length} marketplace items!`);
    console.log('🔗 View items at: http://127.0.0.1:4000/firestore');
  } catch (error) {
    console.error('❌ Error seeding marketplace:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedMarketplace();
