# Core Module

This module contains the core components and utilities shared across the entire GoSender application.

## Structure

### `/constants`
- `app_constants.dart` - Application-wide constants, configuration values, and error messages

### `/services`
- `auth_service.dart` - Authentication service with Firebase Auth integration
- `firebase_service.dart` - Firebase Firestore and Storage service wrapper
- `storage_service.dart` - Local storage service using SharedPreferences and Hive

### `/theme`
- `app_theme.dart` - Application theme configuration with light/dark themes and role-specific colors

## Key Features

- **Centralized Configuration**: All app constants and configuration in one place
- **Authentication Management**: Complete auth flow with Firebase integration
- **Data Services**: Abstracted Firebase operations for easy database interactions
- **Local Storage**: Persistent local data storage for offline capabilities
- **Consistent Theming**: Material 3 design with custom branding

## Usage

```dart
// Authentication
final authService = AuthService();
await authService.signInWithEmailAndPassword(email: email, password: password);

// Firebase operations
await FirebaseService.createDocument(
  collection: 'orders',
  data: orderData,
);

// Local storage
await StorageService.setUserRole('customer');
String? role = StorageService.getUserRole();
```

## Dependencies

- `firebase_core` - Firebase initialization
- `firebase_auth` - Authentication
- `cloud_firestore` - Database
- `firebase_storage` - File storage
- `shared_preferences` - Simple key-value storage
- `hive` - Complex object storage
- `logger` - Logging utilities