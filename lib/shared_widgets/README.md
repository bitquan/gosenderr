# Shared Widgets Module

This module contains reusable UI components that are used across different features and screens in the GoSender application.

## Components

### `FloatingCard`
A versatile card widget with customizable styling options.

**Features:**
- Configurable elevation and border radius
- Custom padding and margin
- Optional tap handling
- Selection state support
- Consistent shadow styling

**Usage:**
```dart
FloatingCard(
  onTap: () => print('Card tapped'),
  child: Text('Card content'),
)
```

### `ProductCard`
Specialized card for displaying products, menu items, and restaurant listings.

**Features:**
- Image display with error handling
- Title and subtitle text
- Price display
- Availability status
- Custom badge support
- Consistent product styling

**Usage:**
```dart
ProductCard(
  title: 'Margherita Pizza',
  subtitle: 'Fresh tomatoes, mozzarella, basil',
  price: '\$12.99',
  imageUrl: 'https://example.com/pizza.jpg',
  onTap: () => navigateToProduct(),
)
```

### `OrderCard`
Specialized card for displaying order information across different user roles.

**Features:**
- Order ID and status display
- Customer and restaurant information
- Time and delivery estimates
- Status-based color coding
- Role-appropriate information display

**Usage:**
```dart
OrderCard(
  orderId: 'order_123456',
  status: 'preparing',
  customerName: 'John Doe',
  restaurantName: 'Pizza Palace',
  orderTime: '15 min ago',
  totalAmount: 25.99,
  onTap: () => showOrderDetails(),
)
```

## Design Principles

- **Consistency**: All widgets follow the same design patterns and use the app theme
- **Flexibility**: Configurable properties to support different use cases
- **Accessibility**: Proper semantic labels and touch targets
- **Performance**: Efficient rendering and minimal rebuilds

## Theming

All shared widgets integrate with the app's theme system:
- Use `Theme.of(context)` for colors and text styles
- Support both light and dark themes
- Follow Material 3 design guidelines
- Role-specific color variations where appropriate

## Best Practices

1. **Composition over Inheritance**: Build complex widgets by composing simpler ones
2. **Parameterization**: Make widgets configurable through constructor parameters
3. **Null Safety**: Handle null values gracefully
4. **Error Handling**: Provide fallbacks for network images and data loading
5. **Testing**: Each widget should be easily testable in isolation