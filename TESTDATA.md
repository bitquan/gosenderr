# GoSender Test Data Documentation

This document explains how to use the comprehensive test data provided for the GoSender Flutter+Firebase delivery platform.

## Overview

The test data includes realistic sample data for a complete delivery/marketplace platform with:
- **Users**: Customers, couriers, merchants, and admins
- **Products**: Food items, groceries, and electronics
- **Orders**: Complete order lifecycle with realistic relationships
- **Deliveries**: Location tracking and status progression
- **Reviews**: Customer feedback for merchants and couriers
- **Notifications**: Role-specific notifications for all user types

## File Structure

### Dart Mock Data Files (`lib/test_data/`)

```
lib/test_data/
├── index.dart          # Central access point and utility functions
├── users.dart          # User data (customers, couriers, merchants, admins)
├── products.dart       # Product catalog with categories and pricing
├── orders.dart         # Order data with item relationships
├── deliveries.dart     # Delivery tracking and location data
├── reviews.dart        # Customer reviews and ratings
└── notifications.dart  # Role-specific notifications
```

### Firebase JSON Files (`test_data/`)

```
test_data/
├── users.json          # User data for Firebase import
├── products.json       # Product catalog for Firebase import
├── orders.json         # Order data for Firebase import
├── deliveries.json     # Delivery data for Firebase import
├── reviews.json        # Review data for Firebase import
└── notifications.json  # Notification data for Firebase import
```

## Usage Guide

### 1. Using Dart Mock Data in Flutter App

#### Basic Usage

```dart
import 'package:your_app/test_data/index.dart';

void main() {
  // Access all data through the convenience class
  print('Total users: ${GoSenderTestData.users.length}');
  print('Total products: ${GoSenderTestData.products.length}');
  
  // Get role-specific data
  final customers = GoSenderTestData.customers;
  final couriers = GoSenderTestData.couriers;
  final merchants = GoSenderTestData.merchants;
}
```

#### Advanced Usage

```dart
import 'package:your_app/test_data/index.dart';

void demonstrateTestData() {
  // Get sample data for a specific role
  final customerData = GoSenderTestData.getSampleDataForRole('customer');
  print('Customer: ${customerData['user'].name}');
  print('Orders: ${customerData['orders'].length}');
  
  // Get platform statistics
  final stats = GoSenderTestData.getPlatformStats();
  print('Platform Revenue: \$${stats['totalRevenue']}');
  
  // Validate data integrity
  final validation = GoSenderTestData.validateDataIntegrity();
  print('Data validation: $validation');
}
```

#### Working with Specific Entities

```dart
import 'package:your_app/test_data/users.dart';
import 'package:your_app/test_data/orders.dart';
import 'package:your_app/test_data/products.dart';

void workWithSpecificData() {
  // Get user by ID
  final user = getUserById('user_001');
  print('User: ${user?.name}');
  
  // Get orders by customer
  final orders = getOrdersByCustomer('user_001');
  print('Customer orders: ${orders.length}');
  
  // Get products by category
  final foodProducts = getProductsByCategory('food');
  print('Food products: ${foodProducts.length}');
}
```

### 2. Importing Data to Firebase

#### Using Firebase CLI

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase in your project**:
   ```bash
   firebase init
   ```

3. **Import data using Firebase CLI**:
   ```bash
   # Import users
   firebase firestore:import test_data/users.json --collection-id users
   
   # Import products
   firebase firestore:import test_data/products.json --collection-id products
   
   # Import orders
   firebase firestore:import test_data/orders.json --collection-id orders
   
   # Import deliveries
   firebase firestore:import test_data/deliveries.json --collection-id deliveries
   
   # Import reviews
   firebase firestore:import test_data/reviews.json --collection-id reviews
   
   # Import notifications
   firebase firestore:import test_data/notifications.json --collection-id notifications
   ```

#### Using Firebase Admin SDK

```javascript
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

async function importTestData() {
  const collections = [
    'users', 'products', 'orders', 
    'deliveries', 'reviews', 'notifications'
  ];
  
  for (const collection of collections) {
    const data = JSON.parse(fs.readFileSync(`test_data/${collection}.json`));
    const batch = db.batch();
    
    data[collection].forEach(doc => {
      const docRef = db.collection(collection).doc(doc.id);
      batch.set(docRef, doc);
    });
    
    await batch.commit();
    console.log(`Imported ${collection} data`);
  }
}

importTestData();
```

#### Using Firestore REST API

```bash
# Example using curl to import users
curl -X POST \
  "https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test_data/users.json
```

### 3. Development Scenarios

#### Testing Customer Flow

```dart
// Get a sample customer and their data
final customerData = TestDataQuickAccess.getSampleCustomer();
final customer = customerData['user'];
final orders = customerData['orders'];
final reviews = customerData['reviews'];

// Simulate customer placing an order
void simulateCustomerOrder() {
  final availableProducts = GoSenderTestData.availableProducts;
  final randomProduct = availableProducts.first;
  
  // Create test order logic here
  print('Customer ${customer.name} ordering ${randomProduct.name}');
}
```

#### Testing Courier Flow

```dart
// Get a sample courier and their data
final courierData = TestDataQuickAccess.getSampleCourier();
final courier = courierData['user'];
final deliveries = courierData['deliveries'];

// Simulate courier accepting delivery
void simulateCourierDelivery() {
  final activeDeliveries = GoSenderTestData.activeDeliveries;
  final delivery = activeDeliveries.first;
  
  print('Courier ${courier.name} accepting delivery ${delivery.id}');
}
```

#### Testing Merchant Flow

```dart
// Get a sample merchant and their data
final merchantData = TestDataQuickAccess.getSampleMerchant();
final merchant = merchantData['user'];
final products = merchantData['products'];
final orders = merchantData['orders'];

// Simulate merchant managing orders
void simulateMerchantOperations() {
  final pendingOrders = orders.where((o) => o.status == 'pending').toList();
  print('Merchant ${merchant.name} has ${pendingOrders.length} pending orders');
}
```

## Data Relationships

The test data maintains realistic relationships:

- **Orders** reference valid users (customers) and merchants
- **Order items** reference valid products from the correct merchant
- **Deliveries** reference valid orders and couriers
- **Reviews** reference valid users and reviewees (merchants/couriers)
- **Notifications** are role-specific and reference relevant entities

## Data Statistics

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 13 | 4 customers, 3 couriers, 4 merchants, 2 admins |
| Products | 14 | Food, grocery, electronics categories |
| Orders | 8 | Various statuses and payment methods |
| Deliveries | 7 | Including completed, active, and failed |
| Reviews | 16 | Both merchant and courier reviews |
| Notifications | 20 | Role-specific across all user types |

## Customization

### Adding New Test Data

1. **Extend existing files**: Add new entries to the existing arrays
2. **Maintain relationships**: Ensure new data references existing entities
3. **Update JSON files**: Keep Firebase import files in sync
4. **Validate**: Use `GoSenderTestData.validateDataIntegrity()` to check

### Modifying for Your Use Case

1. **Update IDs**: Change entity IDs to match your system
2. **Adjust data**: Modify values to fit your business requirements
3. **Add metadata**: Include additional fields specific to your needs
4. **Update helper functions**: Modify utility functions as needed

## Best Practices

1. **Use for Development**: Perfect for local development and testing
2. **Reset Regularly**: Use fresh data for consistent testing
3. **Validate Relationships**: Always check data integrity
4. **Version Control**: Keep test data in version control
5. **Document Changes**: Update this document when modifying data

## Security Notes

- Test data includes only dummy information
- Email addresses and phone numbers are fictional
- Images use placeholder URLs from Unsplash
- No real personal or payment information is included

## Support

For questions about the test data structure or usage, refer to:
- Individual Dart files for entity-specific documentation
- Helper functions in `index.dart` for utility operations
- Firebase documentation for import procedures