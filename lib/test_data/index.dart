// GoSender Test Data Library
// Comprehensive mock data for the GoSender delivery platform

// Export all test data modules
export 'users.dart';
export 'products.dart';
export 'orders.dart';
export 'deliveries.dart';
export 'reviews.dart';
export 'notifications.dart';

// Import all data for convenience functions
import 'users.dart' as users_data;
import 'products.dart' as products_data;
import 'orders.dart' as orders_data;
import 'deliveries.dart' as deliveries_data;
import 'reviews.dart' as reviews_data;
import 'notifications.dart' as notifications_data;

/// Convenience class to access all mock data
class GoSenderTestData {
  // Users
  static List<users_data.User> get users => users_data.mockUsers;
  static List<users_data.User> get customers => users_data.getUsersByRole('customer');
  static List<users_data.User> get couriers => users_data.getUsersByRole('courier');
  static List<users_data.User> get merchants => users_data.getUsersByRole('merchant');
  static List<users_data.User> get admins => users_data.getUsersByRole('admin');

  // Products
  static List<products_data.Product> get products => products_data.mockProducts;
  static List<products_data.Product> get availableProducts => products_data.getAvailableProducts();
  static List<String> get categories => products_data.getAllCategories();

  // Orders
  static List<orders_data.Order> get orders => orders_data.mockOrders;
  static List<orders_data.Order> get activeOrders => orders_data.getActiveOrders();
  static double get totalRevenue => orders_data.getTotalRevenue();

  // Deliveries
  static List<deliveries_data.Delivery> get deliveries => deliveries_data.mockDeliveries;
  static List<deliveries_data.Delivery> get activeDeliveries => deliveries_data.getActiveDeliveries();
  static List<deliveries_data.Delivery> get completedDeliveries => deliveries_data.getCompletedDeliveries();

  // Reviews
  static List<reviews_data.Review> get reviews => reviews_data.mockReviews;
  static List<reviews_data.Review> get merchantReviews => reviews_data.getMerchantReviews();
  static List<reviews_data.Review> get courierReviews => reviews_data.getCourierReviews();

  // Notifications
  static List<notifications_data.Notification> get notifications => notifications_data.mockNotifications;
  static List<notifications_data.Notification> get activeNotifications => notifications_data.getActiveNotifications();

  /// Get sample data for a specific user role
  static Map<String, dynamic> getSampleDataForRole(String role) {
    switch (role.toLowerCase()) {
      case 'customer':
        final customer = customers.first;
        return {
          'user': customer,
          'orders': orders_data.getOrdersByCustomer(customer.id),
          'reviews': reviews_data.getReviewsByReviewer(customer.id),
          'notifications': notifications_data.getNotificationsByUser(customer.id),
        };
      
      case 'courier':
        final courier = couriers.first;
        return {
          'user': courier,
          'deliveries': deliveries_data.getDeliveriesByCourier(courier.id),
          'orders': orders_data.getOrdersByCourier(courier.id),
          'reviews': reviews_data.getReviewsByReviewee(courier.id),
          'notifications': notifications_data.getNotificationsByUser(courier.id),
        };
      
      case 'merchant':
        final merchant = merchants.first;
        return {
          'user': merchant,
          'products': products_data.getProductsByMerchant(merchant.id),
          'orders': orders_data.getOrdersByMerchant(merchant.id),
          'reviews': reviews_data.getReviewsByReviewee(merchant.id),
          'notifications': notifications_data.getNotificationsByUser(merchant.id),
        };
      
      case 'admin':
        final admin = admins.first;
        return {
          'user': admin,
          'notifications': notifications_data.getNotificationsByUser(admin.id),
          'systemAlerts': notifications_data.getSystemAlerts(),
        };
      
      default:
        return {};
    }
  }

  /// Get platform statistics
  static Map<String, dynamic> getPlatformStats() {
    return {
      'totalUsers': users.length,
      'totalCustomers': customers.length,
      'totalCouriers': couriers.length,
      'totalMerchants': merchants.length,
      'totalProducts': products.length,
      'totalOrders': orders.length,
      'activeOrders': activeOrders.length,
      'totalDeliveries': deliveries.length,
      'activeDeliveries': activeDeliveries.length,
      'completedDeliveries': completedDeliveries.length,
      'totalReviews': reviews.length,
      'totalNotifications': notifications.length,
      'totalRevenue': totalRevenue,
      'averageDeliveryRating': deliveries_data.getAverageDeliveryRating(),
    };
  }

  /// Validate data relationships
  static Map<String, bool> validateDataIntegrity() {
    final results = <String, bool>{};
    
    // Check if all orders reference valid users and merchants
    results['ordersHaveValidUsers'] = orders.every((order) {
      final customer = users_data.getUserById(order.customerId);
      final merchant = users_data.getUserById(order.merchantId);
      return customer != null && merchant != null;
    });
    
    // Check if all order items reference valid products
    results['orderItemsHaveValidProducts'] = orders.every((order) {
      return order.items.every((item) {
        return products_data.getProductById(item.productId) != null;
      });
    });
    
    // Check if all deliveries reference valid orders and couriers
    results['deliveriesHaveValidReferences'] = deliveries.every((delivery) {
      final order = orders_data.getOrderById(delivery.orderId);
      final courier = users_data.getUserById(delivery.courierId);
      return order != null && courier != null;
    });
    
    // Check if all reviews reference valid users
    results['reviewsHaveValidUsers'] = reviews.every((review) {
      final reviewer = users_data.getUserById(review.reviewerId);
      final reviewee = users_data.getUserById(review.revieweeId);
      return reviewer != null && reviewee != null;
    });
    
    // Check if all notifications reference valid users
    results['notificationsHaveValidUsers'] = notifications.every((notification) {
      return users_data.getUserById(notification.userId) != null;
    });
    
    return results;
  }

  /// Reset all data to initial state (useful for testing)
  static void resetData() {
    // Note: Since the data is static, this would require reimporting
    // In a real implementation, you might want to implement a reset mechanism
    print('Data reset requested - restart application to reset test data');
  }
}

/// Quick access functions for common operations
class TestDataQuickAccess {
  /// Get a sample customer with related data
  static Map<String, dynamic> getSampleCustomer() {
    return GoSenderTestData.getSampleDataForRole('customer');
  }

  /// Get a sample courier with related data
  static Map<String, dynamic> getSampleCourier() {
    return GoSenderTestData.getSampleDataForRole('courier');
  }

  /// Get a sample merchant with related data
  static Map<String, dynamic> getSampleMerchant() {
    return GoSenderTestData.getSampleDataForRole('merchant');
  }

  /// Get random sample data for testing
  static Map<String, dynamic> getRandomSampleData() {
    return {
      'randomUser': (GoSenderTestData.users..shuffle()).first,
      'randomProduct': (GoSenderTestData.products..shuffle()).first,
      'randomOrder': (GoSenderTestData.orders..shuffle()).first,
      'randomDelivery': (GoSenderTestData.deliveries..shuffle()).first,
      'randomReview': (GoSenderTestData.reviews..shuffle()).first,
    };
  }
}