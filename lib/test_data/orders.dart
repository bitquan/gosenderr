// Mock order data for GoSender delivery platform
// Contains orders linking customers, merchants, and products

class OrderItem {
  final String productId;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final Map<String, dynamic>? customizations;

  const OrderItem({
    required this.productId,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    this.customizations,
  });

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'totalPrice': totalPrice,
      'customizations': customizations,
    };
  }
}

class Order {
  final String id;
  final String customerId;
  final String merchantId;
  final List<OrderItem> items;
  final double subtotal;
  final double deliveryFee;
  final double tax;
  final double total;
  final String status; // pending, confirmed, preparing, ready, picked_up, delivered, cancelled
  final String paymentMethod;
  final String paymentStatus; // pending, paid, failed, refunded
  final String deliveryAddress;
  final String? specialInstructions;
  final DateTime createdAt;
  final DateTime? estimatedDeliveryTime;
  final DateTime? actualDeliveryTime;
  final String? courierId;
  final Map<String, dynamic>? metadata;

  const Order({
    required this.id,
    required this.customerId,
    required this.merchantId,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.tax,
    required this.total,
    required this.status,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.deliveryAddress,
    this.specialInstructions,
    required this.createdAt,
    this.estimatedDeliveryTime,
    this.actualDeliveryTime,
    this.courierId,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customerId': customerId,
      'merchantId': merchantId,
      'items': items.map((item) => item.toJson()).toList(),
      'subtotal': subtotal,
      'deliveryFee': deliveryFee,
      'tax': tax,
      'total': total,
      'status': status,
      'paymentMethod': paymentMethod,
      'paymentStatus': paymentStatus,
      'deliveryAddress': deliveryAddress,
      'specialInstructions': specialInstructions,
      'createdAt': createdAt.toIso8601String(),
      'estimatedDeliveryTime': estimatedDeliveryTime?.toIso8601String(),
      'actualDeliveryTime': actualDeliveryTime?.toIso8601String(),
      'courierId': courierId,
      'metadata': metadata,
    };
  }
}

// Mock orders data
final List<Order> mockOrders = [
  // John Doe's orders
  Order(
    id: 'order_001',
    customerId: 'user_001',
    merchantId: 'merchant_001',
    items: [
      OrderItem(
        productId: 'prod_001',
        quantity: 2,
        unitPrice: 12.99,
        totalPrice: 25.98,
      ),
      OrderItem(
        productId: 'prod_003',
        quantity: 1,
        unitPrice: 6.99,
        totalPrice: 6.99,
      ),
    ],
    subtotal: 32.97,
    deliveryFee: 3.99,
    tax: 2.64,
    total: 39.60,
    status: 'delivered',
    paymentMethod: 'credit_card',
    paymentStatus: 'paid',
    deliveryAddress: '123 Main St, Downtown, City, 12345',
    specialInstructions: 'Please ring the doorbell',
    createdAt: DateTime(2024, 2, 15, 12, 30),
    estimatedDeliveryTime: DateTime(2024, 2, 15, 13, 15),
    actualDeliveryTime: DateTime(2024, 2, 15, 13, 10),
    courierId: 'courier_001',
    metadata: {
      'promoCode': null,
      'loyaltyPointsUsed': 0,
    },
  ),

  Order(
    id: 'order_002',
    customerId: 'user_002',
    merchantId: 'merchant_002',
    items: [
      OrderItem(
        productId: 'prod_004',
        quantity: 1,
        unitPrice: 18.99,
        totalPrice: 18.99,
      ),
      OrderItem(
        productId: 'prod_006',
        quantity: 1,
        unitPrice: 11.99,
        totalPrice: 11.99,
      ),
    ],
    subtotal: 30.98,
    deliveryFee: 4.99,
    tax: 2.48,
    total: 38.45,
    status: 'delivered',
    paymentMethod: 'paypal',
    paymentStatus: 'paid',
    deliveryAddress: '456 Oak Ave, Suburbia, City, 12346',
    specialInstructions: 'Leave at front door if no answer',
    createdAt: DateTime(2024, 2, 16, 18, 45),
    estimatedDeliveryTime: DateTime(2024, 2, 16, 19, 30),
    actualDeliveryTime: DateTime(2024, 2, 16, 19, 25),
    courierId: 'courier_002',
    metadata: {
      'promoCode': 'PIZZA20',
      'loyaltyPointsUsed': 0,
    },
  ),

  Order(
    id: 'order_003',
    customerId: 'user_003',
    merchantId: 'merchant_003',
    items: [
      OrderItem(
        productId: 'prod_007',
        quantity: 2,
        unitPrice: 3.99,
        totalPrice: 7.98,
      ),
      OrderItem(
        productId: 'prod_008',
        quantity: 1,
        unitPrice: 5.99,
        totalPrice: 5.99,
      ),
      OrderItem(
        productId: 'prod_009',
        quantity: 1,
        unitPrice: 4.49,
        totalPrice: 4.49,
      ),
      OrderItem(
        productId: 'prod_010',
        quantity: 1,
        unitPrice: 4.99,
        totalPrice: 4.99,
      ),
    ],
    subtotal: 23.45,
    deliveryFee: 2.99,
    tax: 1.88,
    total: 28.32,
    status: 'picked_up',
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    deliveryAddress: '789 Pine St, Uptown, City, 12347',
    specialInstructions: 'Call before delivery',
    createdAt: DateTime(2024, 2, 17, 9, 15),
    estimatedDeliveryTime: DateTime(2024, 2, 17, 10, 30),
    courierId: 'courier_001',
    metadata: {
      'promoCode': null,
      'loyaltyPointsUsed': 50,
    },
  ),

  Order(
    id: 'order_004',
    customerId: 'user_004',
    merchantId: 'merchant_004',
    items: [
      OrderItem(
        productId: 'prod_011',
        quantity: 1,
        unitPrice: 199.99,
        totalPrice: 199.99,
      ),
      OrderItem(
        productId: 'prod_013',
        quantity: 1,
        unitPrice: 34.99, // discounted price
        totalPrice: 34.99,
      ),
    ],
    subtotal: 234.98,
    deliveryFee: 0.00, // free delivery for orders over 100
    tax: 18.80,
    total: 253.78,
    status: 'preparing',
    paymentMethod: 'digital_wallet',
    paymentStatus: 'paid',
    deliveryAddress: '321 Elm St, Riverside, City, 12348',
    specialInstructions: 'Handle with care - electronics',
    createdAt: DateTime(2024, 2, 18, 14, 20),
    estimatedDeliveryTime: DateTime(2024, 2, 18, 16, 00),
    courierId: 'courier_003',
    metadata: {
      'promoCode': 'TECH15',
      'loyaltyPointsUsed': 0,
    },
  ),

  Order(
    id: 'order_005',
    customerId: 'user_001',
    merchantId: 'merchant_002',
    items: [
      OrderItem(
        productId: 'prod_005',
        quantity: 1,
        unitPrice: 22.99,
        totalPrice: 22.99,
        customizations: {
          'size': 'large',
          'extraToppings': ['extra_cheese', 'mushrooms'],
          'notes': 'Well done',
        },
      ),
    ],
    subtotal: 22.99,
    deliveryFee: 4.99,
    tax: 1.84,
    total: 29.82,
    status: 'ready',
    paymentMethod: 'credit_card',
    paymentStatus: 'paid',
    deliveryAddress: '123 Main St, Downtown, City, 12345',
    specialInstructions: 'Apartment 3B',
    createdAt: DateTime(2024, 2, 18, 19, 30),
    estimatedDeliveryTime: DateTime(2024, 2, 18, 20, 15),
    courierId: 'courier_002',
    metadata: {
      'promoCode': null,
      'loyaltyPointsUsed': 25,
    },
  ),

  Order(
    id: 'order_006',
    customerId: 'user_002',
    merchantId: 'merchant_001',
    items: [
      OrderItem(
        productId: 'prod_002',
        quantity: 1,
        unitPrice: 14.99,
        totalPrice: 14.99,
      ),
    ],
    subtotal: 14.99,
    deliveryFee: 3.99,
    tax: 1.20,
    total: 20.18,
    status: 'confirmed',
    paymentMethod: 'paypal',
    paymentStatus: 'paid',
    deliveryAddress: '456 Oak Ave, Suburbia, City, 12346',
    createdAt: DateTime(2024, 2, 19, 11, 45),
    estimatedDeliveryTime: DateTime(2024, 2, 19, 12, 30),
    metadata: {
      'promoCode': null,
      'loyaltyPointsUsed': 0,
    },
  ),

  Order(
    id: 'order_007',
    customerId: 'user_003',
    merchantId: 'merchant_004',
    items: [
      OrderItem(
        productId: 'prod_012',
        quantity: 2,
        unitPrice: 29.99,
        totalPrice: 59.98,
      ),
      OrderItem(
        productId: 'prod_014',
        quantity: 1,
        unitPrice: 149.99,
        totalPrice: 149.99,
      ),
    ],
    subtotal: 209.97,
    deliveryFee: 0.00, // free delivery
    tax: 16.80,
    total: 226.77,
    status: 'pending',
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    deliveryAddress: '789 Pine St, Uptown, City, 12347',
    specialInstructions: 'Office building - reception desk',
    createdAt: DateTime(2024, 2, 19, 15, 10),
    estimatedDeliveryTime: DateTime(2024, 2, 19, 17, 00),
    metadata: {
      'promoCode': 'NEWUSER',
      'loyaltyPointsUsed': 100,
    },
  ),

  Order(
    id: 'order_008',
    customerId: 'user_004',
    merchantId: 'merchant_003',
    items: [
      OrderItem(
        productId: 'prod_007',
        quantity: 3,
        unitPrice: 3.99,
        totalPrice: 11.97,
      ),
      OrderItem(
        productId: 'prod_008',
        quantity: 2,
        unitPrice: 5.99,
        totalPrice: 11.98,
      ),
    ],
    subtotal: 23.95,
    deliveryFee: 2.99,
    tax: 1.92,
    total: 28.86,
    status: 'cancelled',
    paymentMethod: 'digital_wallet',
    paymentStatus: 'refunded',
    deliveryAddress: '321 Elm St, Riverside, City, 12348',
    specialInstructions: 'Cancel - found cheaper elsewhere',
    createdAt: DateTime(2024, 2, 18, 8, 20),
    estimatedDeliveryTime: DateTime(2024, 2, 18, 9, 30),
    metadata: {
      'promoCode': null,
      'loyaltyPointsUsed': 0,
      'cancelledAt': DateTime(2024, 2, 18, 8, 45).toIso8601String(),
      'cancelReason': 'customer_request',
    },
  ),
];

// Helper functions
List<Order> getOrdersByCustomer(String customerId) {
  return mockOrders.where((order) => order.customerId == customerId).toList();
}

List<Order> getOrdersByMerchant(String merchantId) {
  return mockOrders.where((order) => order.merchantId == merchantId).toList();
}

List<Order> getOrdersByCourier(String courierId) {
  return mockOrders.where((order) => order.courierId == courierId).toList();
}

List<Order> getOrdersByStatus(String status) {
  return mockOrders.where((order) => order.status == status).toList();
}

Order? getOrderById(String id) {
  try {
    return mockOrders.firstWhere((order) => order.id == id);
  } catch (e) {
    return null;
  }
}

List<Order> getActiveOrders() {
  final activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up'];
  return mockOrders.where((order) => activeStatuses.contains(order.status)).toList();
}

List<Order> getRecentOrders({int days = 7}) {
  final cutoffDate = DateTime.now().subtract(Duration(days: days));
  return mockOrders.where((order) => order.createdAt.isAfter(cutoffDate)).toList();
}

double getTotalRevenue() {
  return mockOrders
      .where((order) => order.paymentStatus == 'paid')
      .map((order) => order.total)
      .fold(0.0, (sum, total) => sum + total);
}

Map<String, int> getOrderStatusCounts() {
  final Map<String, int> counts = {};
  for (final order in mockOrders) {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
  }
  return counts;
}