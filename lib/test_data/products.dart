// Mock product data for GoSender delivery platform
// Contains products from various merchants with different categories

class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final String currency;
  final String category;
  final String subcategory;
  final String merchantId;
  final List<String> images;
  final bool isAvailable;
  final int stockQuantity;
  final double? discountPrice;
  final Map<String, dynamic>? attributes;
  final DateTime createdAt;
  final double rating;
  final int reviewCount;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    this.currency = 'USD',
    required this.category,
    required this.subcategory,
    required this.merchantId,
    required this.images,
    this.isAvailable = true,
    this.stockQuantity = 0,
    this.discountPrice,
    this.attributes,
    required this.createdAt,
    this.rating = 0.0,
    this.reviewCount = 0,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'currency': currency,
      'category': category,
      'subcategory': subcategory,
      'merchantId': merchantId,
      'images': images,
      'isAvailable': isAvailable,
      'stockQuantity': stockQuantity,
      'discountPrice': discountPrice,
      'attributes': attributes,
      'createdAt': createdAt.toIso8601String(),
      'rating': rating,
      'reviewCount': reviewCount,
    };
  }
}

// Mock products data
final List<Product> mockProducts = [
  // Tasty Burgers Restaurant Products
  Product(
    id: 'prod_001',
    name: 'Classic Beef Burger',
    description: 'Juicy beef patty with lettuce, tomato, onion, and special sauce on a sesame bun',
    price: 12.99,
    category: 'food',
    subcategory: 'burgers',
    merchantId: 'merchant_001',
    images: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
    ],
    stockQuantity: 50,
    attributes: {
      'calories': 650,
      'allergens': ['gluten', 'dairy'],
      'preparationTime': '8-12 minutes',
      'spiceLevel': 'mild',
    },
    createdAt: DateTime(2024, 1, 15),
    rating: 4.5,
    reviewCount: 89,
  ),
  Product(
    id: 'prod_002',
    name: 'Chicken Deluxe',
    description: 'Grilled chicken breast with avocado, bacon, and ranch dressing',
    price: 14.99,
    category: 'food',
    subcategory: 'burgers',
    merchantId: 'merchant_001',
    images: [
      'https://images.unsplash.com/photo-1606755962773-d324e9eec6e8?w=400',
    ],
    stockQuantity: 35,
    attributes: {
      'calories': 720,
      'allergens': ['gluten', 'dairy'],
      'preparationTime': '10-15 minutes',
      'spiceLevel': 'mild',
    },
    createdAt: DateTime(2024, 1, 15),
    rating: 4.7,
    reviewCount: 156,
  ),
  Product(
    id: 'prod_003',
    name: 'Sweet Potato Fries',
    description: 'Crispy sweet potato fries with a hint of cinnamon',
    price: 6.99,
    category: 'food',
    subcategory: 'sides',
    merchantId: 'merchant_001',
    images: [
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
    ],
    stockQuantity: 80,
    attributes: {
      'calories': 320,
      'allergens': [],
      'preparationTime': '5-8 minutes',
      'isVegan': true,
    },
    createdAt: DateTime(2024, 1, 15),
    rating: 4.3,
    reviewCount: 67,
  ),

  // Pizza Palace Products
  Product(
    id: 'prod_004',
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella, basil, and tomato sauce',
    price: 18.99,
    category: 'food',
    subcategory: 'pizza',
    merchantId: 'merchant_002',
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
    ],
    stockQuantity: 25,
    attributes: {
      'size': 'large',
      'calories': 890,
      'allergens': ['gluten', 'dairy'],
      'preparationTime': '15-20 minutes',
      'isVegetarian': true,
    },
    createdAt: DateTime(2024, 1, 10),
    rating: 4.8,
    reviewCount: 203,
  ),
  Product(
    id: 'prod_005',
    name: 'Pepperoni Supreme',
    description: 'Loaded with pepperoni, mushrooms, bell peppers, and extra cheese',
    price: 22.99,
    category: 'food',
    subcategory: 'pizza',
    merchantId: 'merchant_002',
    images: [
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
    ],
    stockQuantity: 20,
    attributes: {
      'size': 'large',
      'calories': 1150,
      'allergens': ['gluten', 'dairy'],
      'preparationTime': '18-25 minutes',
      'spiceLevel': 'medium',
    },
    createdAt: DateTime(2024, 1, 10),
    rating: 4.6,
    reviewCount: 178,
  ),
  Product(
    id: 'prod_006',
    name: 'Caesar Salad',
    description: 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan',
    price: 11.99,
    category: 'food',
    subcategory: 'salads',
    merchantId: 'merchant_002',
    images: [
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
    ],
    stockQuantity: 40,
    attributes: {
      'calories': 420,
      'allergens': ['gluten', 'dairy'],
      'preparationTime': '5-10 minutes',
      'isVegetarian': true,
    },
    createdAt: DateTime(2024, 1, 10),
    rating: 4.2,
    reviewCount: 92,
  ),

  // Fresh Market Groceries Products
  Product(
    id: 'prod_007',
    name: 'Organic Bananas',
    description: 'Fresh organic bananas, perfect for snacking or smoothies',
    price: 3.99,
    category: 'grocery',
    subcategory: 'fruits',
    merchantId: 'merchant_003',
    images: [
      'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400',
    ],
    stockQuantity: 150,
    attributes: {
      'weight': '2 lbs',
      'organic': true,
      'origin': 'Ecuador',
      'shelfLife': '5-7 days',
    },
    createdAt: DateTime(2024, 2, 1),
    rating: 4.4,
    reviewCount: 45,
  ),
  Product(
    id: 'prod_008',
    name: 'Free-Range Eggs',
    description: 'Farm-fresh free-range eggs, dozen pack',
    price: 5.99,
    category: 'grocery',
    subcategory: 'dairy',
    merchantId: 'merchant_003',
    images: [
      'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400',
    ],
    stockQuantity: 60,
    attributes: {
      'quantity': '12 eggs',
      'freeRange': true,
      'protein': 'high',
      'shelfLife': '3-4 weeks',
    },
    createdAt: DateTime(2024, 2, 1),
    rating: 4.6,
    reviewCount: 78,
  ),
  Product(
    id: 'prod_009',
    name: 'Whole Grain Bread',
    description: 'Artisan whole grain bread, freshly baked daily',
    price: 4.49,
    category: 'grocery',
    subcategory: 'bakery',
    merchantId: 'merchant_003',
    images: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    ],
    stockQuantity: 30,
    attributes: {
      'weight': '24 oz',
      'wholeGrain': true,
      'allergens': ['gluten'],
      'shelfLife': '5-7 days',
    },
    createdAt: DateTime(2024, 2, 1),
    rating: 4.3,
    reviewCount: 34,
  ),
  Product(
    id: 'prod_010',
    name: 'Organic Milk',
    description: 'Fresh organic whole milk, locally sourced',
    price: 4.99,
    category: 'grocery',
    subcategory: 'dairy',
    merchantId: 'merchant_003',
    images: [
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
    ],
    stockQuantity: 45,
    attributes: {
      'volume': '1 gallon',
      'organic': true,
      'fatContent': 'whole',
      'shelfLife': '7-10 days',
    },
    createdAt: DateTime(2024, 2, 1),
    rating: 4.5,
    reviewCount: 67,
  ),

  // Tech Gadgets Store Products
  Product(
    id: 'prod_011',
    name: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 199.99,
    category: 'electronics',
    subcategory: 'audio',
    merchantId: 'merchant_004',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400',
    ],
    stockQuantity: 15,
    attributes: {
      'brand': 'TechSound',
      'batteryLife': '30 hours',
      'connectivity': 'Bluetooth 5.0',
      'noiseCancellation': true,
      'warranty': '2 years',
    },
    createdAt: DateTime(2024, 1, 20),
    rating: 4.4,
    reviewCount: 127,
  ),
  Product(
    id: 'prod_012',
    name: 'Smartphone Fast Charger',
    description: 'USB-C fast charger compatible with most smartphones',
    price: 29.99,
    category: 'electronics',
    subcategory: 'accessories',
    merchantId: 'merchant_004',
    images: [
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
    ],
    stockQuantity: 50,
    attributes: {
      'wattage': '65W',
      'compatibility': 'USB-C',
      'fastCharging': true,
      'warranty': '1 year',
    },
    createdAt: DateTime(2024, 1, 20),
    rating: 4.2,
    reviewCount: 89,
  ),
  Product(
    id: 'prod_013',
    name: 'Portable Power Bank',
    description: '10000mAh portable power bank with LED display',
    price: 39.99,
    category: 'electronics',
    subcategory: 'accessories',
    merchantId: 'merchant_004',
    images: [
      'https://images.unsplash.com/photo-1609592827234-0b15cb38160b?w=400',
    ],
    stockQuantity: 25,
    discountPrice: 34.99,
    attributes: {
      'capacity': '10000mAh',
      'display': 'LED',
      'ports': 'USB-A, USB-C',
      'warranty': '1 year',
    },
    createdAt: DateTime(2024, 1, 20),
    rating: 4.6,
    reviewCount: 156,
  ),
  Product(
    id: 'prod_014',
    name: 'Smart Fitness Watch',
    description: 'Feature-rich fitness tracker with heart rate monitoring',
    price: 149.99,
    category: 'electronics',
    subcategory: 'wearables',
    merchantId: 'merchant_004',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400',
    ],
    stockQuantity: 12,
    attributes: {
      'brand': 'FitTech',
      'batteryLife': '7 days',
      'waterResistant': true,
      'heartRateMonitor': true,
      'warranty': '2 years',
    },
    createdAt: DateTime(2024, 1, 20),
    rating: 4.3,
    reviewCount: 98,
  ),
];

// Helper functions
List<Product> getProductsByMerchant(String merchantId) {
  return mockProducts.where((product) => product.merchantId == merchantId).toList();
}

List<Product> getProductsByCategory(String category) {
  return mockProducts.where((product) => product.category == category).toList();
}

List<Product> getAvailableProducts() {
  return mockProducts.where((product) => product.isAvailable && product.stockQuantity > 0).toList();
}

Product? getProductById(String id) {
  try {
    return mockProducts.firstWhere((product) => product.id == id);
  } catch (e) {
    return null;
  }
}

List<Product> getDiscountedProducts() {
  return mockProducts.where((product) => product.discountPrice != null).toList();
}

List<String> getAllCategories() {
  return mockProducts.map((product) => product.category).toSet().toList();
}

List<String> getAllSubcategories() {
  return mockProducts.map((product) => product.subcategory).toSet().toList();
}