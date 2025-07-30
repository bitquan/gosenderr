# GoSender - Flutter+Firebase Delivery Platform

A comprehensive delivery and marketplace platform starter built with Flutter and Firebase. GoSender supports multiple business models including food delivery, grocery delivery, and e-commerce with real-time tracking and multi-role user management.

## Features

- **Multi-Role Support**: Customers, couriers, merchants, and admins
- **Real-time Delivery Tracking**: Location tracking with live updates
- **Comprehensive Order Management**: From placement to delivery completion
- **Review & Rating System**: Customer feedback for merchants and couriers
- **Push Notifications**: Role-specific notifications and alerts
- **Payment Integration**: Multiple payment methods support
- **Admin Dashboard**: Platform management and analytics

## Supported Business Models

- 🍕 **Food Delivery**: Restaurant orders with hot delivery tracking
- 🛒 **Grocery Delivery**: Fresh market products with careful handling
- 📱 **E-commerce**: Electronics and general merchandise
- 🚚 **On-demand Delivery**: Flexible courier assignment system

## Project Structure

```
gosenderr/
├── lib/
│   └── test_data/          # Dart mock data for development
│       ├── index.dart      # Central access point
│       ├── users.dart      # User data (all roles)
│       ├── products.dart   # Product catalog
│       ├── orders.dart     # Order management
│       ├── deliveries.dart # Delivery tracking
│       ├── reviews.dart    # Review system
│       └── notifications.dart # Notification system
├── test_data/              # Firebase JSON import files
│   ├── users.json
│   ├── products.json
│   ├── orders.json
│   ├── deliveries.json
│   ├── reviews.json
│   └── notifications.json
├── TESTDATA.md            # Test data documentation
└── README.md
```

## Quick Start

### 1. Using Test Data in Development

```dart
import 'package:gosenderr/test_data/index.dart';

void main() {
  // Access comprehensive test data
  print('Users: ${GoSenderTestData.users.length}');
  print('Products: ${GoSenderTestData.products.length}');
  print('Orders: ${GoSenderTestData.orders.length}');
  
  // Get sample data for testing specific user roles
  final customerData = GoSenderTestData.getSampleDataForRole('customer');
  final courierData = GoSenderTestData.getSampleDataForRole('courier');
  final merchantData = GoSenderTestData.getSampleDataForRole('merchant');
}
```

### 2. Import Test Data to Firebase

```bash
# Using Firebase CLI
firebase firestore:import test_data/users.json --collection-id users
firebase firestore:import test_data/products.json --collection-id products
firebase firestore:import test_data/orders.json --collection-id orders
firebase firestore:import test_data/deliveries.json --collection-id deliveries
firebase firestore:import test_data/reviews.json --collection-id reviews
firebase firestore:import test_data/notifications.json --collection-id notifications
```

## Test Data Overview

The project includes comprehensive, realistic test data:

| Entity | Count | Description |
|--------|-------|-------------|
| **Users** | 13 | 4 customers, 3 couriers, 4 merchants, 2 admins |
| **Products** | 14 | Food, grocery, electronics across multiple merchants |
| **Orders** | 8 | Complete order lifecycle with realistic relationships |
| **Deliveries** | 7 | Location tracking, status updates, courier assignments |
| **Reviews** | 16 | Customer feedback for merchants and couriers |
| **Notifications** | 20 | Role-specific notifications across all user types |

### Key Features of Test Data

✅ **Realistic Relationships**: Orders reference real users and products  
✅ **Complete Workflows**: Order → Delivery → Review → Notification flows  
✅ **Multi-Business Support**: Restaurant, grocery, and e-commerce data  
✅ **Location Data**: GPS coordinates and address information  
✅ **Status Progression**: Realistic order and delivery status changes  
✅ **Role-based Notifications**: Different notification types per user role  

## User Roles & Permissions

### Customers
- Browse products and place orders
- Track deliveries in real-time
- Rate merchants and couriers
- Manage payment methods and addresses

### Couriers
- Accept and manage delivery assignments
- Update delivery status and location
- View earnings and performance metrics
- Communicate with customers

### Merchants
- Manage product catalog and inventory
- Process incoming orders
- View sales analytics and reports
- Manage business profile and hours

### Admins
- Platform oversight and management
- User and merchant onboarding
- Dispute resolution and support
- System analytics and reporting

## Sample Data Examples

### Sample Customer Order Flow
```dart
// Get a customer and their orders
final customer = getUserById('user_001'); // John Doe
final orders = getOrdersByCustomer('user_001');

// Track an active delivery
final delivery = getDeliveryByOrderId('order_003');
print('Delivery status: ${delivery.status}');
print('Current location: ${delivery.trackingPoints.last.address}');
```

### Sample Merchant Operations
```dart
// Get a merchant and their products
final merchant = getUserById('merchant_001'); // Tasty Burgers
final products = getProductsByMerchant('merchant_001');
final orders = getOrdersByMerchant('merchant_001');

// Check pending orders
final pending = orders.where((o) => o.status == 'pending').toList();
print('${merchant.name} has ${pending.length} pending orders');
```

### Sample Courier Dashboard
```dart
// Get a courier and their deliveries
final courier = getUserById('courier_001'); // Alex Rider
final deliveries = getDeliveriesByCourier('courier_001');
final active = deliveries.where((d) => d.status == 'picked_up').toList();

print('${courier.name} has ${active.length} active deliveries');
```

## Documentation

- **[TESTDATA.md](TESTDATA.md)**: Comprehensive guide to using test data
- **[Dart Documentation](lib/test_data/)**: In-line documentation for all data models
- **[Firebase Setup](#firebase-setup)**: Instructions for Firebase integration

## Firebase Setup

1. Create a new Firebase project
2. Enable Firestore Database
3. Set up Authentication (if needed)
4. Import test data using the provided JSON files
5. Configure Firebase in your Flutter app

## Development Guidelines

1. **Use Test Data**: Leverage the comprehensive test data for development
2. **Maintain Relationships**: Keep data relationships intact when modifying
3. **Validate Integrity**: Use built-in validation functions
4. **Role-based Testing**: Test features for all user roles
5. **Real-time Features**: Implement live tracking and notifications

## Contributing

When contributing to the test data:

1. Maintain realistic data relationships
2. Follow existing naming conventions
3. Update both Dart and JSON files
4. Add appropriate documentation
5. Validate data integrity before submitting

## License

This project is a starter template for delivery platforms. Feel free to use and modify for your specific needs.

---

**Ready to build your delivery platform?** Start with the comprehensive test data and scale up to your production requirements!