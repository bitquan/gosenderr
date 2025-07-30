// Mock review data for GoSender delivery platform
// Contains customer reviews for merchants and couriers

class Review {
  final String id;
  final String reviewerId; // customer who left the review
  final String revieweeId; // merchant or courier being reviewed
  final String revieweeType; // 'merchant' or 'courier'
  final String? orderId; // associated order
  final double rating; // 1-5 stars
  final String? title;
  final String? comment;
  final List<String>? tags; // helpful tags like 'fast', 'friendly', etc.
  final DateTime createdAt;
  final bool isVerified; // verified purchase
  final Map<String, dynamic>? metadata;

  const Review({
    required this.id,
    required this.reviewerId,
    required this.revieweeId,
    required this.revieweeType,
    this.orderId,
    required this.rating,
    this.title,
    this.comment,
    this.tags,
    required this.createdAt,
    this.isVerified = true,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reviewerId': reviewerId,
      'revieweeId': revieweeId,
      'revieweeType': revieweeType,
      'orderId': orderId,
      'rating': rating,
      'title': title,
      'comment': comment,
      'tags': tags,
      'createdAt': createdAt.toIso8601String(),
      'isVerified': isVerified,
      'metadata': metadata,
    };
  }
}

// Mock reviews data
final List<Review> mockReviews = [
  // Reviews for Tasty Burgers Restaurant (merchant_001)
  Review(
    id: 'review_001',
    reviewerId: 'user_001',
    revieweeId: 'merchant_001',
    revieweeType: 'merchant',
    orderId: 'order_001',
    rating: 4.5,
    title: 'Great burgers, fast service!',
    comment: 'The Classic Beef Burger was delicious and the sweet potato fries were amazing. Food arrived hot and fresh. Will definitely order again!',
    tags: ['delicious', 'fast', 'hot food'],
    createdAt: DateTime(2024, 2, 15, 14, 30),
    metadata: {
      'helpful_votes': 12,
      'photo_attached': false,
    },
  ),

  Review(
    id: 'review_002',
    reviewerId: 'user_003',
    revieweeId: 'merchant_001',
    revieweeType: 'merchant',
    rating: 4.0,
    title: 'Good food, could be better packaged',
    comment: 'The burger was tasty but arrived a bit soggy. Maybe better packaging would help. Still good value for money.',
    tags: ['tasty', 'packaging issue'],
    createdAt: DateTime(2024, 2, 5, 16, 45),
    metadata: {
      'helpful_votes': 8,
      'photo_attached': false,
    },
  ),

  // Reviews for Pizza Palace (merchant_002)
  Review(
    id: 'review_003',
    reviewerId: 'user_002',
    revieweeId: 'merchant_002',
    revieweeType: 'merchant',
    orderId: 'order_002',
    rating: 5.0,
    title: 'Best pizza in town!',
    comment: 'The Margherita pizza was absolutely perfect! Fresh basil, quality mozzarella, and the crust was just right. The Caesar salad was also very fresh. Highly recommend!',
    tags: ['excellent', 'fresh ingredients', 'perfect crust'],
    createdAt: DateTime(2024, 2, 16, 20, 15),
    metadata: {
      'helpful_votes': 23,
      'photo_attached': true,
    },
  ),

  Review(
    id: 'review_004',
    reviewerId: 'user_001',
    revieweeId: 'merchant_002',
    revieweeType: 'merchant',
    orderId: 'order_005',
    rating: 4.5,
    title: 'Pepperoni Supreme was great',
    comment: 'Love the extra toppings on the Pepperoni Supreme. Pizza arrived exactly as ordered with all my customizations. Good portion size.',
    tags: ['customizable', 'generous portions'],
    createdAt: DateTime(2024, 2, 18, 21, 00),
    metadata: {
      'helpful_votes': 7,
      'photo_attached': false,
    },
  ),

  Review(
    id: 'review_005',
    reviewerId: 'user_004',
    revieweeId: 'merchant_002',
    revieweeType: 'merchant',
    rating: 4.0,
    title: 'Good pizza but delivery took long',
    comment: 'The pizza itself was delicious, but it took longer than expected to arrive. Not sure if it was the restaurant or delivery issue.',
    tags: ['delicious', 'slow delivery'],
    createdAt: DateTime(2024, 2, 12, 19, 30),
    metadata: {
      'helpful_votes': 15,
      'photo_attached': false,
    },
  ),

  // Reviews for Fresh Market Groceries (merchant_003)
  Review(
    id: 'review_006',
    reviewerId: 'user_003',
    revieweeId: 'merchant_003',
    revieweeType: 'merchant',
    orderId: 'order_003',
    rating: 4.5,
    title: 'Fresh quality groceries',
    comment: 'All items were fresh and well-packaged. The organic bananas were perfectly ripe and the eggs were farm fresh as advertised. Great for grocery delivery!',
    tags: ['fresh', 'well-packaged', 'organic'],
    createdAt: DateTime(2024, 2, 17, 11, 45),
    metadata: {
      'helpful_votes': 18,
      'photo_attached': true,
    },
  ),

  Review(
    id: 'review_007',
    reviewerId: 'user_002',
    revieweeId: 'merchant_003',
    revieweeType: 'merchant',
    rating: 4.0,
    title: 'Good selection, fair prices',
    comment: 'Good variety of organic and regular products. Prices are reasonable for the quality. Would like to see more local produce options.',
    tags: ['good variety', 'fair prices'],
    createdAt: DateTime(2024, 2, 8, 10, 20),
    metadata: {
      'helpful_votes': 9,
      'photo_attached': false,
    },
  ),

  // Reviews for Tech Gadgets Store (merchant_004)
  Review(
    id: 'review_008',
    reviewerId: 'user_004',
    revieweeId: 'merchant_004',
    revieweeType: 'merchant',
    orderId: 'order_004',
    rating: 4.5,
    title: 'Quality electronics, fast shipping',
    comment: 'The Bluetooth headphones are excellent quality and the power bank works perfectly. Items were well-packaged and arrived quickly. Good tech store!',
    tags: ['quality products', 'fast shipping', 'well-packaged'],
    createdAt: DateTime(2024, 2, 18, 17, 30),
    metadata: {
      'helpful_votes': 14,
      'photo_attached': true,
    },
  ),

  Review(
    id: 'review_009',
    reviewerId: 'user_001',
    revieweeId: 'merchant_004',
    revieweeType: 'merchant',
    rating: 4.0,
    title: 'Good products, could improve descriptions',
    comment: 'The smartphone charger works great, but the product description could be more detailed about compatibility. Overall satisfied with the purchase.',
    tags: ['works well', 'improve descriptions'],
    createdAt: DateTime(2024, 2, 10, 14, 15),
    metadata: {
      'helpful_votes': 6,
      'photo_attached': false,
    },
  ),

  // Reviews for Couriers
  Review(
    id: 'review_010',
    reviewerId: 'user_001',
    revieweeId: 'courier_001',
    revieweeType: 'courier',
    orderId: 'order_001',
    rating: 5.0,
    title: 'Excellent courier service',
    comment: 'Alex was very professional and delivered my order exactly on time. He even called to confirm the delivery address. Great service!',
    tags: ['professional', 'on time', 'good communication'],
    createdAt: DateTime(2024, 2, 15, 13, 20),
    metadata: {
      'helpful_votes': 19,
      'photo_attached': false,
    },
  ),

  Review(
    id: 'review_011',
    reviewerId: 'user_003',
    revieweeId: 'courier_001',
    revieweeType: 'courier',
    orderId: 'order_003',
    rating: 4.5,
    title: 'Fast and friendly delivery',
    comment: 'Quick delivery and the courier was very friendly. Handled the groceries with care. Would request this courier again.',
    tags: ['fast', 'friendly', 'careful handling'],
    createdAt: DateTime(2024, 2, 17, 10, 35),
    metadata: {
      'helpful_votes': 11,
      'photo_attached': false,
    },
  ),

  Review(
    id: 'review_012',
    reviewerId: 'user_002',
    revieweeId: 'courier_002',
    revieweeType: 'courier',
    orderId: 'order_002',
    rating: 5.0,
    title: 'Amazing service!',
    comment: 'Maria was fantastic! She delivered the pizza faster than expected and it was still hot. Very polite and professional. Best courier experience I\'ve had!',
    tags: ['fast delivery', 'hot food', 'polite', 'professional'],
    createdAt: DateTime(2024, 2, 16, 19, 35),
    metadata: {
      'helpful_votes': 25,
      'photo_attached': false,
    },
  ),

  Review(
    id: 'review_013',
    reviewerId: 'user_001',
    revieweeId: 'courier_002',
    revieweeType: 'courier',
    orderId: 'order_005',
    rating: 4.5,
    title: 'Great courier, found apartment easily',
    comment: 'Maria navigated to my apartment complex without any issues and delivered to the right unit. Appreciate the attention to detail!',
    tags: ['good navigation', 'attention to detail'],
    createdAt: DateTime(2024, 2, 18, 20, 25),
    metadata: {
      'helpful_votes': 8,
      'photo_attached': false,
    },
  ),

  Review(
    id: 'review_014',
    reviewerId: 'user_004',
    revieweeId: 'courier_003',
    revieweeType: 'courier',
    rating: 4.0,
    title: 'Reliable delivery',
    comment: 'David delivered my electronics order safely and on time. Items were handled with care. Good experience overall.',
    tags: ['reliable', 'safe handling', 'on time'],
    createdAt: DateTime(2024, 2, 10, 15, 00),
    metadata: {
      'helpful_votes': 13,
      'photo_attached': false,
    },
  ),

  // Some older reviews for historical data
  Review(
    id: 'review_015',
    reviewerId: 'user_002',
    revieweeId: 'merchant_001',
    revieweeType: 'merchant',
    rating: 3.5,
    title: 'Average experience',
    comment: 'The food was okay but nothing special. Service was standard. Might try other options next time.',
    tags: ['average', 'standard service'],
    createdAt: DateTime(2024, 1, 28, 13, 15),
    metadata: {
      'helpful_votes': 5,
      'photo_attached': false,
    },
  ),

  Review(
    id: 'review_016',
    reviewerId: 'user_004',
    revieweeId: 'courier_001',
    revieweeType: 'courier',
    rating: 4.0,
    title: 'Good delivery but slight delay',
    comment: 'Alex delivered my order but it was about 10 minutes later than expected. Still good service and he apologized for the delay.',
    tags: ['slight delay', 'apologetic', 'good service'],
    createdAt: DateTime(2024, 1, 30, 18, 45),
    metadata: {
      'helpful_votes': 7,
      'photo_attached': false,
    },
  ),
];

// Helper functions
List<Review> getReviewsByReviewee(String revieweeId) {
  return mockReviews.where((review) => review.revieweeId == revieweeId).toList();
}

List<Review> getReviewsByReviewer(String reviewerId) {
  return mockReviews.where((review) => review.reviewerId == reviewerId).toList();
}

List<Review> getReviewsByType(String revieweeType) {
  return mockReviews.where((review) => review.revieweeType == revieweeType).toList();
}

List<Review> getMerchantReviews() {
  return getReviewsByType('merchant');
}

List<Review> getCourierReviews() {
  return getReviewsByType('courier');
}

Review? getReviewById(String id) {
  try {
    return mockReviews.firstWhere((review) => review.id == id);
  } catch (e) {
    return null;
  }
}

double getAverageRatingForReviewee(String revieweeId) {
  final reviews = getReviewsByReviewee(revieweeId);
  if (reviews.isEmpty) return 0.0;
  
  final totalRating = reviews.map((r) => r.rating).reduce((a, b) => a + b);
  return totalRating / reviews.length;
}

Map<String, double> getAverageRatingsByMerchant() {
  final Map<String, double> ratings = {};
  final merchantReviews = getMerchantReviews();
  
  for (final review in merchantReviews) {
    if (!ratings.containsKey(review.revieweeId)) {
      ratings[review.revieweeId] = getAverageRatingForReviewee(review.revieweeId);
    }
  }
  
  return ratings;
}

Map<String, double> getAverageRatingsByCourier() {
  final Map<String, double> ratings = {};
  final courierReviews = getCourierReviews();
  
  for (final review in courierReviews) {
    if (!ratings.containsKey(review.revieweeId)) {
      ratings[review.revieweeId] = getAverageRatingForReviewee(review.revieweeId);
    }
  }
  
  return ratings;
}

List<Review> getHighRatedReviews({double minRating = 4.0}) {
  return mockReviews.where((review) => review.rating >= minRating).toList();
}

List<Review> getRecentReviews({int days = 7}) {
  final cutoffDate = DateTime.now().subtract(Duration(days: days));
  return mockReviews.where((review) => review.createdAt.isAfter(cutoffDate)).toList();
}

List<String> getMostCommonTags() {
  final Map<String, int> tagCounts = {};
  
  for (final review in mockReviews) {
    if (review.tags != null) {
      for (final tag in review.tags!) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
  }
  
  final sortedTags = tagCounts.entries.toList()
    ..sort((a, b) => b.value.compareTo(a.value));
  
  return sortedTags.map((entry) => entry.key).toList();
}