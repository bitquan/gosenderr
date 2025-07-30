// Mock delivery data for GoSender delivery platform
// Contains delivery tracking and status information

class Location {
  final double latitude;
  final double longitude;
  final String? address;
  final DateTime timestamp;

  const Location({
    required this.latitude,
    required this.longitude,
    this.address,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

class Delivery {
  final String id;
  final String orderId;
  final String courierId;
  final String status; // assigned, picked_up, in_transit, delivered, failed
  final Location pickupLocation;
  final Location deliveryLocation;
  final List<Location> trackingPoints;
  final DateTime assignedAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  final String? deliveryNote;
  final String? failureReason;
  final double? rating;
  final String? customerSignature;
  final Map<String, dynamic>? metadata;

  const Delivery({
    required this.id,
    required this.orderId,
    required this.courierId,
    required this.status,
    required this.pickupLocation,
    required this.deliveryLocation,
    this.trackingPoints = const [],
    required this.assignedAt,
    this.pickedUpAt,
    this.deliveredAt,
    this.deliveryNote,
    this.failureReason,
    this.rating,
    this.customerSignature,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'courierId': courierId,
      'status': status,
      'pickupLocation': pickupLocation.toJson(),
      'deliveryLocation': deliveryLocation.toJson(),
      'trackingPoints': trackingPoints.map((point) => point.toJson()).toList(),
      'assignedAt': assignedAt.toIso8601String(),
      'pickedUpAt': pickedUpAt?.toIso8601String(),
      'deliveredAt': deliveredAt?.toIso8601String(),
      'deliveryNote': deliveryNote,
      'failureReason': failureReason,
      'rating': rating,
      'customerSignature': customerSignature,
      'metadata': metadata,
    };
  }
}

// Mock deliveries data
final List<Delivery> mockDeliveries = [
  // Completed delivery for order_001
  Delivery(
    id: 'delivery_001',
    orderId: 'order_001',
    courierId: 'courier_001',
    status: 'delivered',
    pickupLocation: Location(
      latitude: 40.7128,
      longitude: -74.0060,
      address: '555 Food Court, Restaurant Row, City, 12352',
      timestamp: DateTime(2024, 2, 15, 12, 45),
    ),
    deliveryLocation: Location(
      latitude: 40.7589,
      longitude: -73.9851,
      address: '123 Main St, Downtown, City, 12345',
      timestamp: DateTime(2024, 2, 15, 13, 10),
    ),
    trackingPoints: [
      Location(
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'Starting delivery from restaurant',
        timestamp: DateTime(2024, 2, 15, 12, 45),
      ),
      Location(
        latitude: 40.7300,
        longitude: -73.9950,
        address: 'En route - Main Avenue',
        timestamp: DateTime(2024, 2, 15, 12, 55),
      ),
      Location(
        latitude: 40.7500,
        longitude: -73.9900,
        address: 'Approaching destination',
        timestamp: DateTime(2024, 2, 15, 13, 05),
      ),
      Location(
        latitude: 40.7589,
        longitude: -73.9851,
        address: 'Delivered to customer',
        timestamp: DateTime(2024, 2, 15, 13, 10),
      ),
    ],
    assignedAt: DateTime(2024, 2, 15, 12, 35),
    pickedUpAt: DateTime(2024, 2, 15, 12, 45),
    deliveredAt: DateTime(2024, 2, 15, 13, 10),
    deliveryNote: 'Delivered to customer at front door',
    rating: 4.8,
    customerSignature: 'J.Doe',
    metadata: {
      'distance': 4.2,
      'estimatedTime': 25,
      'actualTime': 25,
      'vehicle': 'motorcycle',
    },
  ),

  // Completed delivery for order_002
  Delivery(
    id: 'delivery_002',
    orderId: 'order_002',
    courierId: 'courier_002',
    status: 'delivered',
    pickupLocation: Location(
      latitude: 40.7255,
      longitude: -73.9900,
      address: '778 Italian Way, Little Italy, City, 12353',
      timestamp: DateTime(2024, 2, 16, 19, 00),
    ),
    deliveryLocation: Location(
      latitude: 40.7410,
      longitude: -73.9897,
      address: '456 Oak Ave, Suburbia, City, 12346',
      timestamp: DateTime(2024, 2, 16, 19, 25),
    ),
    trackingPoints: [
      Location(
        latitude: 40.7255,
        longitude: -73.9900,
        address: 'Pizza Palace pickup',
        timestamp: DateTime(2024, 2, 16, 19, 00),
      ),
      Location(
        latitude: 40.7330,
        longitude: -73.9895,
        address: 'Cycling through Oak Street',
        timestamp: DateTime(2024, 2, 16, 19, 12),
      ),
      Location(
        latitude: 40.7410,
        longitude: -73.9897,
        address: 'Delivered to customer',
        timestamp: DateTime(2024, 2, 16, 19, 25),
      ),
    ],
    assignedAt: DateTime(2024, 2, 16, 18, 50),
    pickedUpAt: DateTime(2024, 2, 16, 19, 00),
    deliveredAt: DateTime(2024, 2, 16, 19, 25),
    deliveryNote: 'Left at front door as requested',
    rating: 4.9,
    metadata: {
      'distance': 2.8,
      'estimatedTime': 30,
      'actualTime': 25,
      'vehicle': 'bicycle',
    },
  ),

  // In-transit delivery for order_003
  Delivery(
    id: 'delivery_003',
    orderId: 'order_003',
    courierId: 'courier_001',
    status: 'picked_up',
    pickupLocation: Location(
      latitude: 40.7180,
      longitude: -73.9950,
      address: '999 Market Square, Commerce District, City, 12354',
      timestamp: DateTime(2024, 2, 17, 10, 00),
    ),
    deliveryLocation: Location(
      latitude: 40.7831,
      longitude: -73.9712,
      address: '789 Pine St, Uptown, City, 12347',
      timestamp: DateTime.now(), // Still in progress
    ),
    trackingPoints: [
      Location(
        latitude: 40.7180,
        longitude: -73.9950,
        address: 'Fresh Market pickup completed',
        timestamp: DateTime(2024, 2, 17, 10, 00),
      ),
      Location(
        latitude: 40.7350,
        longitude: -73.9880,
        address: 'En route via Central Ave',
        timestamp: DateTime(2024, 2, 17, 10, 15),
      ),
      Location(
        latitude: 40.7600,
        longitude: -73.9800,
        address: 'Crossing downtown bridge',
        timestamp: DateTime(2024, 2, 17, 10, 25),
      ),
    ],
    assignedAt: DateTime(2024, 2, 17, 9, 45),
    pickedUpAt: DateTime(2024, 2, 17, 10, 00),
    metadata: {
      'distance': 5.1,
      'estimatedTime': 35,
      'vehicle': 'motorcycle',
    },
  ),

  // Assigned delivery for order_004
  Delivery(
    id: 'delivery_004',
    orderId: 'order_004',
    courierId: 'courier_003',
    status: 'assigned',
    pickupLocation: Location(
      latitude: 40.7205,
      longitude: -73.9830,
      address: '333 Tech Plaza, Innovation Hub, City, 12355',
      timestamp: DateTime.now(),
    ),
    deliveryLocation: Location(
      latitude: 40.7282,
      longitude: -73.9942,
      address: '321 Elm St, Riverside, City, 12348',
      timestamp: DateTime.now(),
    ),
    trackingPoints: [],
    assignedAt: DateTime(2024, 2, 18, 15, 30),
    metadata: {
      'distance': 3.2,
      'estimatedTime': 20,
      'vehicle': 'car',
      'priority': 'high', // electronics order
    },
  ),

  // Ready for pickup delivery for order_005
  Delivery(
    id: 'delivery_005',
    orderId: 'order_005',
    courierId: 'courier_002',
    status: 'assigned',
    pickupLocation: Location(
      latitude: 40.7255,
      longitude: -73.9900,
      address: '778 Italian Way, Little Italy, City, 12353',
      timestamp: DateTime.now(),
    ),
    deliveryLocation: Location(
      latitude: 40.7589,
      longitude: -73.9851,
      address: '123 Main St, Downtown, City, 12345',
      timestamp: DateTime.now(),
    ),
    trackingPoints: [],
    assignedAt: DateTime(2024, 2, 18, 19, 45),
    metadata: {
      'distance': 3.8,
      'estimatedTime': 25,
      'vehicle': 'bicycle',
      'specialInstructions': 'Apartment 3B',
    },
  ),

  // Failed delivery example
  Delivery(
    id: 'delivery_006',
    orderId: 'order_008', // cancelled order
    courierId: 'courier_001',
    status: 'failed',
    pickupLocation: Location(
      latitude: 40.7180,
      longitude: -73.9950,
      address: '999 Market Square, Commerce District, City, 12354',
      timestamp: DateTime(2024, 2, 18, 8, 30),
    ),
    deliveryLocation: Location(
      latitude: 40.7282,
      longitude: -73.9942,
      address: '321 Elm St, Riverside, City, 12348',
      timestamp: DateTime(2024, 2, 18, 8, 30),
    ),
    trackingPoints: [
      Location(
        latitude: 40.7180,
        longitude: -73.9950,
        address: 'Arrived at pickup location',
        timestamp: DateTime(2024, 2, 18, 8, 30),
      ),
    ],
    assignedAt: DateTime(2024, 2, 18, 8, 25),
    failureReason: 'Order cancelled by customer',
    metadata: {
      'distance': 2.1,
      'estimatedTime': 15,
      'vehicle': 'motorcycle',
      'failedAt': DateTime(2024, 2, 18, 8, 45).toIso8601String(),
    },
  ),

  // Historical completed delivery
  Delivery(
    id: 'delivery_007',
    orderId: 'order_002', // This could be a repeat customer order
    courierId: 'courier_003',
    status: 'delivered',
    pickupLocation: Location(
      latitude: 40.7128,
      longitude: -74.0060,
      address: '555 Food Court, Restaurant Row, City, 12352',
      timestamp: DateTime(2024, 2, 10, 14, 15),
    ),
    deliveryLocation: Location(
      latitude: 40.7410,
      longitude: -73.9897,
      address: '456 Oak Ave, Suburbia, City, 12346',
      timestamp: DateTime(2024, 2, 10, 14, 45),
    ),
    trackingPoints: [
      Location(
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'Starting delivery',
        timestamp: DateTime(2024, 2, 10, 14, 15),
      ),
      Location(
        latitude: 40.7300,
        longitude: -74.0000,
        address: 'Traffic delay on Broadway',
        timestamp: DateTime(2024, 2, 10, 14, 25),
      ),
      Location(
        latitude: 40.7410,
        longitude: -73.9897,
        address: 'Delivered successfully',
        timestamp: DateTime(2024, 2, 10, 14, 45),
      ),
    ],
    assignedAt: DateTime(2024, 2, 10, 14, 00),
    pickedUpAt: DateTime(2024, 2, 10, 14, 15),
    deliveredAt: DateTime(2024, 2, 10, 14, 45),
    deliveryNote: 'Customer met at curb',
    rating: 4.5,
    customerSignature: 'S.Wilson',
    metadata: {
      'distance': 6.2,
      'estimatedTime': 25,
      'actualTime': 30,
      'vehicle': 'car',
      'trafficDelay': 5,
    },
  ),
];

// Helper functions
List<Delivery> getDeliveriesByCourier(String courierId) {
  return mockDeliveries.where((delivery) => delivery.courierId == courierId).toList();
}

List<Delivery> getDeliveriesByStatus(String status) {
  return mockDeliveries.where((delivery) => delivery.status == status).toList();
}

Delivery? getDeliveryByOrderId(String orderId) {
  try {
    return mockDeliveries.firstWhere((delivery) => delivery.orderId == orderId);
  } catch (e) {
    return null;
  }
}

Delivery? getDeliveryById(String id) {
  try {
    return mockDeliveries.firstWhere((delivery) => delivery.id == id);
  } catch (e) {
    return null;
  }
}

List<Delivery> getActiveDeliveries() {
  final activeStatuses = ['assigned', 'picked_up', 'in_transit'];
  return mockDeliveries.where((delivery) => activeStatuses.contains(delivery.status)).toList();
}

List<Delivery> getCompletedDeliveries() {
  return mockDeliveries.where((delivery) => delivery.status == 'delivered').toList();
}

List<Delivery> getFailedDeliveries() {
  return mockDeliveries.where((delivery) => delivery.status == 'failed').toList();
}

double getAverageDeliveryRating() {
  final ratedDeliveries = mockDeliveries.where((d) => d.rating != null).toList();
  if (ratedDeliveries.isEmpty) return 0.0;
  
  final totalRating = ratedDeliveries.map((d) => d.rating!).reduce((a, b) => a + b);
  return totalRating / ratedDeliveries.length;
}

Map<String, int> getDeliveryStatusCounts() {
  final Map<String, int> counts = {};
  for (final delivery in mockDeliveries) {
    counts[delivery.status] = (counts[delivery.status] ?? 0) + 1;
  }
  return counts;
}

double getTotalDeliveryDistance() {
  return mockDeliveries
      .where((d) => d.metadata?['distance'] != null)
      .map((d) => (d.metadata!['distance'] as num).toDouble())
      .fold(0.0, (sum, distance) => sum + distance);
}