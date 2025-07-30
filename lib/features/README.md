# Features Module

This module contains all feature-specific implementations organized by user roles and functionality.

## Structure

### `/auth`
Authentication-related features including login, registration, and role selection.

**Pages:**
- `login_page.dart` - User login with email/password
- `role_selection_page.dart` - Role selection after authentication

**Models:**
- User authentication models
- Session management

### `/customer`
Customer-facing features for ordering food and managing deliveries.

**Pages:**
- `customer_home_page.dart` - Main dashboard with restaurant browsing and order management

**Features:**
- Restaurant browsing
- Food ordering
- Order tracking
- Profile management
- Address management
- Payment methods

### `/driver`
Driver-specific features for managing deliveries and earnings.

**Pages:**
- `driver_home_page.dart` - Driver dashboard with delivery requests and status management

**Features:**
- Online/offline status toggle
- Delivery request management
- Earnings tracking
- Performance analytics
- Route optimization
- Vehicle information

### `/merchant`
Restaurant/merchant features for managing orders and menu items.

**Pages:**
- `merchant_home_page.dart` - Restaurant dashboard with order management and business analytics

**Features:**
- Order management
- Menu item management
- Business analytics
- Operating hours
- Promotions and offers
- Inventory management

## Architecture

Each feature follows a clean architecture pattern:
- **Presentation Layer**: Pages, widgets, and UI components
- **Data Layer**: Models, repositories, and data sources
- **Business Logic**: State management and business rules

## Navigation

Features are integrated with GoRouter for declarative navigation:
- `/auth/*` - Authentication flows
- `/customer/*` - Customer features
- `/driver/*` - Driver features  
- `/merchant/*` - Merchant features

## State Management

Each feature uses appropriate state management solutions:
- BLoC pattern for complex state
- Provider for simple state sharing
- Local state for UI-only interactions