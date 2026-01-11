# Features Module

This module contains feature-specific components organized by user roles.

## Structure

Each role has its own subdirectory containing:
- **screens/**: UI screens specific to the role
- **widgets/**: Role-specific reusable widgets (when needed)
- **bloc/**: State management for the role (when implemented)
- **models/**: Data models specific to the role (when needed)

## Roles

### Customer
**Path**: `features/customer/`
- Shopping interface
- Order management
- Product browsing
- User profile management

### Vendor
**Path**: `features/vendor/`
- Business dashboard
- Inventory management
- Order processing
- Analytics and reporting

### Delivery Agent
**Path**: `features/delivery_agent/`
- Delivery management
- Route optimization
- Earnings tracking
- Availability control

### Admin
**Path**: `features/admin/`
- Platform oversight
- User management
- System analytics
- Configuration management

## Development Guidelines

- Keep role-specific logic isolated within each feature
- Use shared widgets from the `shared_widgets` module when possible
- Implement proper state management using BLoC pattern
- Ensure consistent navigation patterns across roles
- Add comprehensive tests for each feature