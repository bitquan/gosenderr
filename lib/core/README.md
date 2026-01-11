# Core Module

This module contains the foundational components of the GoSender application.

## Structure

- **constants/**: Application-wide constants and configuration values
- **services/**: Core services for Firebase integration and data management
- **theme/**: Material 3 theme configuration and styling

## Components

### Constants
- `AppConstants`: Central configuration for app settings, validation rules, and feature flags

### Services
- `FirestoreService`: Database operations and real-time data management
- `StorageService`: File upload, storage, and management

### Theme
- `AppTheme`: Material 3 theme implementation with light/dark mode support

## Usage

Import core components throughout the app:

```dart
import 'package:gosenderr/core/constants/app_constants.dart';
import 'package:gosenderr/core/services/firestore_service.dart';
import 'package:gosenderr/core/theme/app_theme.dart';
```

## Best Practices

- Keep constants organized and well-documented
- Handle errors gracefully in all services
- Maintain consistent theming across the application
- Use appropriate logging for debugging and monitoring