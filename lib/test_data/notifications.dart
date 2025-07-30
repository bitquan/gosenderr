// Mock notification data for GoSender delivery platform
// Contains role-specific notifications for different user types

class Notification {
  final String id;
  final String userId;
  final String userRole; // customer, courier, merchant, admin
  final String type; // order, delivery, promotion, system, review, payment, etc.
  final String title;
  final String message;
  final String? actionUrl;
  final Map<String, dynamic>? data; // additional notification data
  final bool isRead;
  final String priority; // low, medium, high, urgent
  final DateTime createdAt;
  final DateTime? readAt;
  final DateTime? expiresAt;

  const Notification({
    required this.id,
    required this.userId,
    required this.userRole,
    required this.type,
    required this.title,
    required this.message,
    this.actionUrl,
    this.data,
    this.isRead = false,
    this.priority = 'medium',
    required this.createdAt,
    this.readAt,
    this.expiresAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'userRole': userRole,
      'type': type,
      'title': title,
      'message': message,
      'actionUrl': actionUrl,
      'data': data,
      'isRead': isRead,
      'priority': priority,
      'createdAt': createdAt.toIso8601String(),
      'readAt': readAt?.toIso8601String(),
      'expiresAt': expiresAt?.toIso8601String(),
    };
  }
}

// Mock notifications data
final List<Notification> mockNotifications = [
  // Customer notifications (user_001 - John Doe)
  Notification(
    id: 'notif_001',
    userId: 'user_001',
    userRole: 'customer',
    type: 'order',
    title: 'Order Delivered!',
    message: 'Your order #order_001 from Tasty Burgers has been delivered successfully.',
    actionUrl: '/orders/order_001',
    data: {
      'orderId': 'order_001',
      'merchantName': 'Tasty Burgers Restaurant',
      'deliveryTime': DateTime(2024, 2, 15, 13, 10).toIso8601String(),
    },
    isRead: true,
    priority: 'medium',
    createdAt: DateTime(2024, 2, 15, 13, 10),
    readAt: DateTime(2024, 2, 15, 13, 25),
  ),

  Notification(
    id: 'notif_002',
    userId: 'user_001',
    userRole: 'customer',
    type: 'order',
    title: 'Order Ready for Pickup',
    message: 'Your order #order_005 from Pizza Palace is ready and will be picked up soon.',
    actionUrl: '/orders/order_005',
    data: {
      'orderId': 'order_005',
      'merchantName': 'Pizza Palace',
      'estimatedDelivery': DateTime(2024, 2, 18, 20, 15).toIso8601String(),
    },
    isRead: false,
    priority: 'medium',
    createdAt: DateTime(2024, 2, 18, 19, 45),
  ),

  Notification(
    id: 'notif_003',
    userId: 'user_001',
    userRole: 'customer',
    type: 'promotion',
    title: '20% Off Your Next Order!',
    message: 'Use code LOYAL20 to get 20% off your next order. Valid until Feb 28th.',
    actionUrl: '/promotions',
    data: {
      'promoCode': 'LOYAL20',
      'discount': 20,
      'validUntil': DateTime(2024, 2, 28).toIso8601String(),
    },
    isRead: false,
    priority: 'low',
    createdAt: DateTime(2024, 2, 18, 10, 00),
    expiresAt: DateTime(2024, 2, 28, 23, 59),
  ),

  // Customer notifications (user_002 - Sarah Wilson)
  Notification(
    id: 'notif_004',
    userId: 'user_002',
    userRole: 'customer',
    type: 'order',
    title: 'Order Confirmed',
    message: 'Your order #order_006 from Tasty Burgers has been confirmed and is being prepared.',
    actionUrl: '/orders/order_006',
    data: {
      'orderId': 'order_006',
      'merchantName': 'Tasty Burgers Restaurant',
      'estimatedDelivery': DateTime(2024, 2, 19, 12, 30).toIso8601String(),
    },
    isRead: false,
    priority: 'medium',
    createdAt: DateTime(2024, 2, 19, 11, 50),
  ),

  Notification(
    id: 'notif_005',
    userId: 'user_002',
    userRole: 'customer',
    type: 'review',
    title: 'Rate Your Recent Order',
    message: 'How was your experience with Pizza Palace? Leave a review to help other customers.',
    actionUrl: '/reviews/create?order=order_002',
    data: {
      'orderId': 'order_002',
      'merchantName': 'Pizza Palace',
    },
    isRead: true,
    priority: 'low',
    createdAt: DateTime(2024, 2, 16, 20, 00),
    readAt: DateTime(2024, 2, 16, 20, 15),
  ),

  // Customer notifications (user_003 - Mike Chen)
  Notification(
    id: 'notif_006',
    userId: 'user_003',
    userRole: 'customer',
    type: 'delivery',
    title: 'Courier on the Way',
    message: 'Your courier Alex is on the way with your groceries from Fresh Market.',
    actionUrl: '/deliveries/delivery_003',
    data: {
      'orderId': 'order_003',
      'deliveryId': 'delivery_003',
      'courierName': 'Alex Rider',
      'estimatedArrival': DateTime(2024, 2, 17, 10, 30).toIso8601String(),
    },
    isRead: false,
    priority: 'high',
    createdAt: DateTime(2024, 2, 17, 10, 15),
  ),

  Notification(
    id: 'notif_007',
    userId: 'user_003',
    userRole: 'customer',
    type: 'payment',
    title: 'Payment Pending',
    message: 'Your order #order_007 is ready for delivery. Please prepare cash payment of $226.77.',
    actionUrl: '/orders/order_007',
    data: {
      'orderId': 'order_007',
      'amount': 226.77,
      'paymentMethod': 'cash',
    },
    isRead: false,
    priority: 'high',
    createdAt: DateTime(2024, 2, 19, 16, 30),
  ),

  // Courier notifications (courier_001 - Alex Rider)
  Notification(
    id: 'notif_008',
    userId: 'courier_001',
    userRole: 'courier',
    type: 'delivery',
    title: 'New Delivery Assignment',
    message: 'You have been assigned delivery #delivery_003. Pickup from Fresh Market Groceries.',
    actionUrl: '/deliveries/delivery_003',
    data: {
      'deliveryId': 'delivery_003',
      'orderId': 'order_003',
      'pickupAddress': '999 Market Square, Commerce District, City, 12354',
      'deliveryAddress': '789 Pine St, Uptown, City, 12347',
      'estimatedDistance': 5.1,
    },
    isRead: true,
    priority: 'high',
    createdAt: DateTime(2024, 2, 17, 9, 45),
    readAt: DateTime(2024, 2, 17, 9, 50),
  ),

  Notification(
    id: 'notif_009',
    userId: 'courier_001',
    userRole: 'courier',
    type: 'earnings',
    title: 'Daily Earnings Update',
    message: 'Great job today! You\'ve completed 3 deliveries and earned $45.50.',
    actionUrl: '/earnings/today',
    data: {
      'date': DateTime(2024, 2, 15).toIso8601String(),
      'deliveries': 3,
      'earnings': 45.50,
      'tips': 8.50,
    },
    isRead: false,
    priority: 'low',
    createdAt: DateTime(2024, 2, 15, 22, 00),
  ),

  Notification(
    id: 'notif_010',
    userId: 'courier_001',
    userRole: 'courier',
    type: 'system',
    title: 'Customer Called',
    message: 'Customer for order #order_003 is trying to reach you. Please check your phone.',
    actionUrl: '/deliveries/delivery_003',
    data: {
      'orderId': 'order_003',
      'customerPhone': '+1234567892',
      'urgency': 'medium',
    },
    isRead: false,
    priority: 'high',
    createdAt: DateTime(2024, 2, 17, 10, 20),
  ),

  // Courier notifications (courier_002 - Maria Gonzalez)
  Notification(
    id: 'notif_011',
    userId: 'courier_002',
    userRole: 'courier',
    type: 'delivery',
    title: 'Pickup Ready',
    message: 'Order #order_005 is ready for pickup at Pizza Palace. Customer waiting.',
    actionUrl: '/deliveries/delivery_005',
    data: {
      'deliveryId': 'delivery_005',
      'orderId': 'order_005',
      'merchantName': 'Pizza Palace',
      'pickupAddress': '778 Italian Way, Little Italy, City, 12353',
    },
    isRead: false,
    priority: 'high',
    createdAt: DateTime(2024, 2, 18, 19, 45),
  ),

  Notification(
    id: 'notif_012',
    userId: 'courier_002',
    userRole: 'courier',
    type: 'achievement',
    title: 'Rating Milestone!',
    message: 'Congratulations! You\'ve maintained a 4.9-star rating with 200+ deliveries.',
    actionUrl: '/profile/achievements',
    data: {
      'achievement': 'top_rated_courier',
      'rating': 4.9,
      'totalDeliveries': 203,
    },
    isRead: true,
    priority: 'low',
    createdAt: DateTime(2024, 2, 16, 8, 00),
    readAt: DateTime(2024, 2, 16, 8, 30),
  ),

  // Merchant notifications (merchant_001 - Tasty Burgers)
  Notification(
    id: 'notif_013',
    userId: 'merchant_001',
    userRole: 'merchant',
    type: 'order',
    title: 'New Order Received',
    message: 'Order #order_006 received from Sarah Wilson. Please confirm and start preparation.',
    actionUrl: '/orders/order_006',
    data: {
      'orderId': 'order_006',
      'customerName': 'Sarah Wilson',
      'items': 1,
      'total': 20.18,
      'estimatedPrepTime': 12,
    },
    isRead: false,
    priority: 'high',
    createdAt: DateTime(2024, 2, 19, 11, 45),
  ),

  Notification(
    id: 'notif_014',
    userId: 'merchant_001',
    userRole: 'merchant',
    type: 'review',
    title: 'New Customer Review',
    message: 'John Doe left a 4.5-star review for your restaurant. Check it out!',
    actionUrl: '/reviews/review_001',
    data: {
      'reviewId': 'review_001',
      'customerName': 'John Doe',
      'rating': 4.5,
      'orderId': 'order_001',
    },
    isRead: true,
    priority: 'low',
    createdAt: DateTime(2024, 2, 15, 14, 30),
    readAt: DateTime(2024, 2, 15, 15, 00),
  ),

  // Merchant notifications (merchant_002 - Pizza Palace)
  Notification(
    id: 'notif_015',
    userId: 'merchant_002',
    userRole: 'merchant',
    type: 'earnings',
    title: 'Weekly Sales Report',
    message: 'This week you had 45 orders with total sales of $892.50. Great job!',
    actionUrl: '/analytics/weekly',
    data: {
      'weekStart': DateTime(2024, 2, 12).toIso8601String(),
      'weekEnd': DateTime(2024, 2, 18).toIso8601String(),
      'orders': 45,
      'revenue': 892.50,
    },
    isRead: false,
    priority: 'low',
    createdAt: DateTime(2024, 2, 19, 7, 00),
  ),

  Notification(
    id: 'notif_016',
    userId: 'merchant_002',
    userRole: 'merchant',
    type: 'system',
    title: 'Courier Assigned',
    message: 'Maria has been assigned to deliver order #order_005. ETA: 25 minutes.',
    actionUrl: '/orders/order_005',
    data: {
      'orderId': 'order_005',
      'courierName': 'Maria Gonzalez',
      'courierRating': 4.9,
      'estimatedDelivery': DateTime(2024, 2, 18, 20, 15).toIso8601String(),
    },
    isRead: false,
    priority: 'medium',
    createdAt: DateTime(2024, 2, 18, 19, 50),
  ),

  // Admin notifications (admin_001)
  Notification(
    id: 'notif_017',
    userId: 'admin_001',
    userRole: 'admin',
    type: 'system',
    title: 'Platform Daily Report',
    message: 'Daily metrics: 25 orders, 18 deliveries completed, 3 new merchants registered.',
    actionUrl: '/admin/dashboard',
    data: {
      'date': DateTime(2024, 2, 18).toIso8601String(),
      'totalOrders': 25,
      'completedDeliveries': 18,
      'newMerchants': 3,
      'newCustomers': 7,
      'revenue': 1250.75,
    },
    isRead: true,
    priority: 'medium',
    createdAt: DateTime(2024, 2, 19, 6, 00),
    readAt: DateTime(2024, 2, 19, 8, 30),
  ),

  Notification(
    id: 'notif_018',
    userId: 'admin_001',
    userRole: 'admin',
    type: 'alert',
    title: 'Delivery Failure Alert',
    message: 'Delivery #delivery_006 failed due to order cancellation. Requires review.',
    actionUrl: '/admin/deliveries/delivery_006',
    data: {
      'deliveryId': 'delivery_006',
      'orderId': 'order_008',
      'failureReason': 'Order cancelled by customer',
      'courierAffected': 'courier_001',
    },
    isRead: false,
    priority: 'high',
    createdAt: DateTime(2024, 2, 18, 8, 45),
  ),

  // Support admin notifications (admin_002)
  Notification(
    id: 'notif_019',
    userId: 'admin_002',
    userRole: 'admin',
    type: 'support',
    title: 'New Support Ticket',
    message: 'Customer user_004 submitted a support ticket about missing items in order #order_004.',
    actionUrl: '/admin/support/tickets/new',
    data: {
      'customerId': 'user_004',
      'orderId': 'order_004',
      'issue': 'missing_items',
      'priority': 'medium',
    },
    isRead: false,
    priority: 'high',
    createdAt: DateTime(2024, 2, 18, 16, 30),
  ),

  Notification(
    id: 'notif_020',
    userId: 'admin_002',
    userRole: 'admin',
    type: 'review',
    title: 'Disputed Review Alert',
    message: 'Merchant merchant_001 has disputed review #review_002. Requires moderation.',
    actionUrl: '/admin/reviews/disputes',
    data: {
      'reviewId': 'review_002',
      'merchantId': 'merchant_001',
      'disputeReason': 'factual_inaccuracy',
    },
    isRead: false,
    priority: 'medium',
    createdAt: DateTime(2024, 2, 17, 14, 20),
  ),
];

// Helper functions
List<Notification> getNotificationsByUser(String userId) {
  return mockNotifications.where((notif) => notif.userId == userId).toList();
}

List<Notification> getNotificationsByRole(String userRole) {
  return mockNotifications.where((notif) => notif.userRole == userRole).toList();
}

List<Notification> getNotificationsByType(String type) {
  return mockNotifications.where((notif) => notif.type == type).toList();
}

List<Notification> getUnreadNotifications(String userId) {
  return mockNotifications
      .where((notif) => notif.userId == userId && !notif.isRead)
      .toList();
}

List<Notification> getHighPriorityNotifications(String userId) {
  return mockNotifications
      .where((notif) => notif.userId == userId && (notif.priority == 'high' || notif.priority == 'urgent'))
      .toList();
}

Notification? getNotificationById(String id) {
  try {
    return mockNotifications.firstWhere((notif) => notif.id == id);
  } catch (e) {
    return null;
  }
}

List<Notification> getRecentNotifications(String userId, {int days = 7}) {
  final cutoffDate = DateTime.now().subtract(Duration(days: days));
  return mockNotifications
      .where((notif) => notif.userId == userId && notif.createdAt.isAfter(cutoffDate))
      .toList();
}

List<Notification> getActiveNotifications() {
  final now = DateTime.now();
  return mockNotifications
      .where((notif) => notif.expiresAt == null || notif.expiresAt!.isAfter(now))
      .toList();
}

Map<String, int> getNotificationCountsByType(String userId) {
  final userNotifications = getNotificationsByUser(userId);
  final Map<String, int> counts = {};
  
  for (final notif in userNotifications) {
    counts[notif.type] = (counts[notif.type] ?? 0) + 1;
  }
  
  return counts;
}

int getUnreadCount(String userId) {
  return getUnreadNotifications(userId).length;
}

List<Notification> getPromotionalNotifications() {
  return getNotificationsByType('promotion');
}

List<Notification> getSystemAlerts() {
  return mockNotifications
      .where((notif) => notif.type == 'alert' || notif.type == 'system')
      .toList();
}