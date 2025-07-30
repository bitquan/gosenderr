class AppConstants {
  // App Information
  static const String appName = 'GoSender';
  static const String appVersion = '1.0.0';
  
  // API Configuration
  static const String baseUrl = 'https://api.gosenderr.com'; // TODO: Replace with actual API endpoint
  static const int apiTimeoutSeconds = 30;
  
  // Firebase Collections
  static const String usersCollection = 'users';
  static const String ordersCollection = 'orders';
  static const String productsCollection = 'products';
  static const String vendorsCollection = 'vendors';
  static const String deliveryAgentsCollection = 'delivery_agents';
  static const String categoriesCollection = 'categories';
  static const String reviewsCollection = 'reviews';
  static const String notificationsCollection = 'notifications';
  
  // User Roles
  static const String customerRole = 'customer';
  static const String vendorRole = 'vendor';
  static const String deliveryAgentRole = 'delivery_agent';
  static const String adminRole = 'admin';
  
  // Order Status
  static const String orderPending = 'pending';
  static const String orderConfirmed = 'confirmed';
  static const String orderPreparing = 'preparing';
  static const String orderReady = 'ready';
  static const String orderPickedUp = 'picked_up';
  static const String orderDelivering = 'delivering';
  static const String orderDelivered = 'delivered';
  static const String orderCancelled = 'cancelled';
  
  // Delivery Status
  static const String deliveryAvailable = 'available';
  static const String deliveryBusy = 'busy';
  static const String deliveryOffline = 'offline';
  
  // Validation Constants
  static const int minPasswordLength = 8;
  static const int maxNameLength = 50;
  static const int maxDescriptionLength = 500;
  static const int maxAddressLength = 200;
  
  // UI Constants
  static const double defaultPadding = 16.0;
  static const double smallPadding = 8.0;
  static const double largePadding = 24.0;
  static const double defaultBorderRadius = 8.0;
  static const double cardBorderRadius = 12.0;
  
  // Map Configuration
  static const double defaultZoom = 15.0;
  static const double maxDeliveryRadius = 10.0; // kilometers
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // File Upload
  static const int maxImageSizeBytes = 5 * 1024 * 1024; // 5MB
  static const List<String> allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  // SharedPreferences Keys
  static const String keyUserRole = 'user_role';
  static const String keyUserID = 'user_id';
  static const String keyUserName = 'user_name';
  static const String keyUserEmail = 'user_email';
  static const String keyIsFirstLaunch = 'is_first_launch';
  static const String keyLanguageCode = 'language_code';
  static const String keyThemeMode = 'theme_mode';
  
  // Error Messages
  static const String genericErrorMessage = 'Something went wrong. Please try again.';
  static const String networkErrorMessage = 'Network error. Please check your connection.';
  static const String authErrorMessage = 'Authentication failed. Please login again.';
  static const String validationErrorMessage = 'Please check your input and try again.';
  
  // Success Messages
  static const String orderPlacedSuccessMessage = 'Order placed successfully!';
  static const String orderUpdatedSuccessMessage = 'Order updated successfully!';
  static const String profileUpdatedSuccessMessage = 'Profile updated successfully!';
  
  // Feature Flags
  static const bool enablePushNotifications = true;
  static const bool enableLocationTracking = true;
  static const bool enableOfflineMode = false;
  static const bool enableAnalytics = true;
}