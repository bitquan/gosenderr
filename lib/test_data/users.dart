// Mock user data for GoSender delivery platform
// Contains users with different roles: customer, courier, merchant, admin

class User {
  final String id;
  final String email;
  final String name;
  final String phone;
  final String role; // customer, courier, merchant, admin
  final String? address;
  final String? profileImage;
  final DateTime createdAt;
  final bool isActive;
  final Map<String, dynamic>? metadata;

  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.phone,
    required this.role,
    this.address,
    this.profileImage,
    required this.createdAt,
    this.isActive = true,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'phone': phone,
      'role': role,
      'address': address,
      'profileImage': profileImage,
      'createdAt': createdAt.toIso8601String(),
      'isActive': isActive,
      'metadata': metadata,
    };
  }
}

// Mock users data
final List<User> mockUsers = [
  // Customers
  User(
    id: 'user_001',
    email: 'john.doe@email.com',
    name: 'John Doe',
    phone: '+1234567890',
    role: 'customer',
    address: '123 Main St, Downtown, City, 12345',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    createdAt: DateTime(2024, 1, 15),
    metadata: {
      'preferredPayment': 'credit_card',
      'loyaltyPoints': 150,
    },
  ),
  User(
    id: 'user_002',
    email: 'sarah.wilson@email.com',
    name: 'Sarah Wilson',
    phone: '+1234567891',
    role: 'customer',
    address: '456 Oak Ave, Suburbia, City, 12346',
    profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b05c?w=150',
    createdAt: DateTime(2024, 2, 3),
    metadata: {
      'preferredPayment': 'paypal',
      'loyaltyPoints': 75,
    },
  ),
  User(
    id: 'user_003',
    email: 'mike.chen@email.com',
    name: 'Mike Chen',
    phone: '+1234567892',
    role: 'customer',
    address: '789 Pine St, Uptown, City, 12347',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: DateTime(2024, 1, 28),
    metadata: {
      'preferredPayment': 'cash',
      'loyaltyPoints': 220,
    },
  ),
  User(
    id: 'user_004',
    email: 'emma.davis@email.com',
    name: 'Emma Davis',
    phone: '+1234567893',
    role: 'customer',
    address: '321 Elm St, Riverside, City, 12348',
    profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    createdAt: DateTime(2024, 2, 12),
    metadata: {
      'preferredPayment': 'digital_wallet',
      'loyaltyPoints': 95,
    },
  ),

  // Couriers
  User(
    id: 'courier_001',
    email: 'alex.rider@email.com',
    name: 'Alex Rider',
    phone: '+1234567894',
    role: 'courier',
    address: '654 Delivery Lane, Mobile, City, 12349',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    createdAt: DateTime(2024, 1, 10),
    metadata: {
      'vehicleType': 'motorcycle',
      'licenseNumber': 'DL123456789',
      'rating': 4.8,
      'totalDeliveries': 156,
      'isOnline': true,
    },
  ),
  User(
    id: 'courier_002',
    email: 'maria.gonzalez@email.com',
    name: 'Maria Gonzalez',
    phone: '+1234567895',
    role: 'courier',
    address: '987 Speed Ave, Fast District, City, 12350',
    profileImage: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150',
    createdAt: DateTime(2024, 1, 5),
    metadata: {
      'vehicleType': 'bicycle',
      'licenseNumber': 'DL987654321',
      'rating': 4.9,
      'totalDeliveries': 203,
      'isOnline': true,
    },
  ),
  User(
    id: 'courier_003',
    email: 'david.kim@email.com',
    name: 'David Kim',
    phone: '+1234567896',
    role: 'courier',
    address: '147 Quick St, Rush Zone, City, 12351',
    profileImage: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150',
    createdAt: DateTime(2024, 1, 20),
    metadata: {
      'vehicleType': 'car',
      'licenseNumber': 'DL456789123',
      'rating': 4.6,
      'totalDeliveries': 89,
      'isOnline': false,
    },
  ),

  // Merchants
  User(
    id: 'merchant_001',
    email: 'owner@tastyburgers.com',
    name: 'Tasty Burgers Restaurant',
    phone: '+1234567897',
    role: 'merchant',
    address: '555 Food Court, Restaurant Row, City, 12352',
    profileImage: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=150',
    createdAt: DateTime(2023, 12, 1),
    metadata: {
      'businessType': 'restaurant',
      'cuisineType': 'american',
      'rating': 4.3,
      'totalOrders': 1250,
      'isOpen': true,
      'operatingHours': '10:00-22:00',
    },
  ),
  User(
    id: 'merchant_002',
    email: 'info@pizzapalace.com',
    name: 'Pizza Palace',
    phone: '+1234567898',
    role: 'merchant',
    address: '778 Italian Way, Little Italy, City, 12353',
    profileImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150',
    createdAt: DateTime(2023, 11, 15),
    metadata: {
      'businessType': 'restaurant',
      'cuisineType': 'italian',
      'rating': 4.7,
      'totalOrders': 2156,
      'isOpen': true,
      'operatingHours': '11:00-23:00',
    },
  ),
  User(
    id: 'merchant_003',
    email: 'contact@freshmarket.com',
    name: 'Fresh Market Groceries',
    phone: '+1234567899',
    role: 'merchant',
    address: '999 Market Square, Commerce District, City, 12354',
    profileImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=150',
    createdAt: DateTime(2023, 10, 30),
    metadata: {
      'businessType': 'grocery',
      'category': 'food_retail',
      'rating': 4.5,
      'totalOrders': 892,
      'isOpen': true,
      'operatingHours': '07:00-21:00',
    },
  ),
  User(
    id: 'merchant_004',
    email: 'hello@techgadgets.com',
    name: 'Tech Gadgets Store',
    phone: '+1234567900',
    role: 'merchant',
    address: '333 Tech Plaza, Innovation Hub, City, 12355',
    profileImage: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150',
    createdAt: DateTime(2023, 11, 8),
    metadata: {
      'businessType': 'electronics',
      'category': 'technology',
      'rating': 4.4,
      'totalOrders': 567,
      'isOpen': true,
      'operatingHours': '09:00-20:00',
    },
  ),

  // Admins
  User(
    id: 'admin_001',
    email: 'admin@gosenderr.com',
    name: 'GoSender Admin',
    phone: '+1234567901',
    role: 'admin',
    address: 'GoSender HQ, 100 Platform Blvd, Tech City, 12356',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: DateTime(2023, 1, 1),
    metadata: {
      'permissions': ['user_management', 'platform_analytics', 'system_config'],
      'department': 'operations',
    },
  ),
  User(
    id: 'admin_002',
    email: 'support@gosenderr.com',
    name: 'Support Team Lead',
    phone: '+1234567902',
    role: 'admin',
    address: 'GoSender HQ, 100 Platform Blvd, Tech City, 12356',
    profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    createdAt: DateTime(2023, 1, 1),
    metadata: {
      'permissions': ['customer_support', 'dispute_resolution'],
      'department': 'customer_success',
    },
  ),
];

// Helper functions
List<User> getUsersByRole(String role) {
  return mockUsers.where((user) => user.role == role).toList();
}

User? getUserById(String id) {
  try {
    return mockUsers.firstWhere((user) => user.id == id);
  } catch (e) {
    return null;
  }
}

List<User> getActiveUsers() {
  return mockUsers.where((user) => user.isActive).toList();
}