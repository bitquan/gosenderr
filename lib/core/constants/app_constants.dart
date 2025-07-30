class AppConstants {
  // App Information
  static const String appName = 'GoSender';
  static const String appVersion = '1.0.0';
  
  // API Configuration
  static const String baseUrl = 'https://api.gosenderr.com';
  static const String apiVersion = 'v1';
  static const Duration timeoutDuration = Duration(seconds: 30);
  
  // Firebase Collections
  static const String usersCollection = 'users';
  static const String ordersCollection = 'orders';
  static const String restaurantsCollection = 'restaurants';
  static const String driversCollection = 'drivers';
  static const String deliveriesCollection = 'deliveries';
  static const String paymentsCollection = 'payments';
  static const String reviewsCollection = 'reviews';
  
  // Storage Buckets
  static const String profileImagesBucket = 'profile-images';
  static const String restaurantImagesBucket = 'restaurant-images';
  static const String menuItemImagesBucket = 'menu-item-images';
  static const String deliveryProofImagesBucket = 'delivery-proof-images';
  
  // User Roles
  static const String customerRole = 'customer';
  static const String driverRole = 'driver';
  static const String merchantRole = 'merchant';
  static const String adminRole = 'admin';
  
  // Order Status
  static const String orderPending = 'pending';
  static const String orderConfirmed = 'confirmed';
  static const String orderPreparing = 'preparing';
  static const String orderReady = 'ready';
  static const String orderPickedUp = 'picked_up';
  static const String orderInTransit = 'in_transit';
  static const String orderDelivered = 'delivered';
  static const String orderCancelled = 'cancelled';
  
  // Delivery Status
  static const String deliveryAvailable = 'available';
  static const String deliveryAssigned = 'assigned';
  static const String deliveryPickedUp = 'picked_up';
  static const String deliveryInTransit = 'in_transit';
  static const String deliveryCompleted = 'completed';
  static const String deliveryCancelled = 'cancelled';
  
  // Payment Methods
  static const String paymentCash = 'cash';
  static const String paymentCard = 'card';
  static const String paymentDigitalWallet = 'digital_wallet';
  
  // Validation
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 50;
  static const int maxUsernameLength = 30;
  static const int maxBioLength = 500;
  static const int maxReviewLength = 1000;
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Location
  static const double defaultLocationRadius = 10.0; // km
  static const double maxLocationRadius = 50.0; // km
  
  // Images
  static const double maxImageSizeMB = 5.0;
  static const List<String> allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  // Cache Keys
  static const String userDataCacheKey = 'user_data';
  static const String settingsCacheKey = 'app_settings';
  static const String locationCacheKey = 'last_location';
  
  // Shared Preferences Keys
  static const String isFirstLaunchKey = 'is_first_launch';
  static const String userRoleKey = 'user_role';
  static const String authTokenKey = 'auth_token';
  static const String themePreferenceKey = 'theme_preference';
  static const String languagePreferenceKey = 'language_preference';
  static const String notificationsEnabledKey = 'notifications_enabled';
  
  // Error Messages
  static const String genericErrorMessage = 'Something went wrong. Please try again.';
  static const String networkErrorMessage = 'Please check your internet connection.';
  static const String timeoutErrorMessage = 'Request timed out. Please try again.';
  static const String unauthorizedErrorMessage = 'You are not authorized to perform this action.';
  static const String notFoundErrorMessage = 'The requested resource was not found.';
  
  // Success Messages
  static const String orderPlacedSuccessMessage = 'Order placed successfully!';
  static const String deliveryCompletedSuccessMessage = 'Delivery completed successfully!';
  static const String profileUpdatedSuccessMessage = 'Profile updated successfully!';
  
  // Feature Flags
  static const bool enablePushNotifications = true;
  static const bool enableLocationTracking = true;
  static const bool enableOfflineMode = false;
  static const bool enableCrashReporting = true;
  static const bool enableAnalytics = true;
}