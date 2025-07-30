# Shared Widgets Module

This module contains reusable UI components that can be used across different features and user roles.

## Components

### FloatingCard
A versatile card widget for displaying promotional content, notifications, and important information.

**Variants:**
- `FloatingCard`: Base implementation with customizable styling
- `PromotionalFloatingCard`: Specialized for promotions with gradient background
- `NotificationFloatingCard`: For displaying notifications
- `SuccessFloatingCard`: For success messages
- `WarningFloatingCard`: For warning messages

**Usage:**
```dart
FloatingCard(
  title: 'Special Offer!',
  subtitle: 'Get 20% off on your next order',
  icon: Icons.local_offer,
  onTap: () {
    // Handle tap
  },
)
```

## Best Practices

- Create reusable widgets that can be styled through parameters
- Follow Material 3 design guidelines
- Ensure accessibility compliance
- Add comprehensive documentation for each widget
- Write widget tests for all components
- Keep widgets focused on a single responsibility

## Future Widgets

Consider adding these shared widgets as the app grows:
- Custom buttons with loading states
- Form input components with validation
- Loading indicators and skeletons
- Empty state illustrations
- Error boundary widgets
- Navigation components