import 'package:flutter/material.dart';

/// A customizable floating card widget with shadow and rounded corners
/// Used throughout the app for consistent card styling
class FloatingCard extends StatelessWidget {
  final Widget child;
  final double elevation;
  final double borderRadius;
  final EdgeInsetsGeometry margin;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final Color? shadowColor;
  final VoidCallback? onTap;
  final double? width;
  final double? height;
  final bool isSelected;
  final Color? selectedBorderColor;
  final double selectedBorderWidth;

  const FloatingCard({
    super.key,
    required this.child,
    this.elevation = 4.0,
    this.borderRadius = 12.0,
    this.margin = const EdgeInsets.all(8.0),
    this.padding = const EdgeInsets.all(16.0),
    this.backgroundColor,
    this.shadowColor,
    this.onTap,
    this.width,
    this.height,
    this.isSelected = false,
    this.selectedBorderColor,
    this.selectedBorderWidth = 2.0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardColor = backgroundColor ?? theme.cardColor;
    final effectiveShadowColor = shadowColor ?? theme.shadowColor;

    Widget cardContent = Container(
      width: width,
      height: height,
      padding: padding,
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: isSelected
            ? Border.all(
                color: selectedBorderColor ?? theme.primaryColor,
                width: selectedBorderWidth,
              )
            : null,
        boxShadow: [
          BoxShadow(
            color: effectiveShadowColor.withOpacity(0.1),
            blurRadius: elevation,
            offset: Offset(0, elevation / 2),
          ),
        ],
      ),
      child: child,
    );

    if (onTap != null) {
      return Container(
        margin: margin,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(borderRadius),
            child: cardContent,
          ),
        ),
      );
    }

    return Container(
      margin: margin,
      child: cardContent,
    );
  }
}

/// Predefined card variations for common use cases

class ProductCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? imageUrl;
  final String? price;
  final bool isAvailable;
  final VoidCallback? onTap;
  final Widget? customBadge;

  const ProductCard({
    super.key,
    required this.title,
    this.subtitle,
    this.imageUrl,
    this.price,
    this.isAvailable = true,
    this.onTap,
    this.customBadge,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return FloatingCard(
      onTap: isAvailable ? onTap : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image section
          if (imageUrl != null)
            Stack(
              children: [
                Container(
                  height: 120,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: theme.colorScheme.surfaceVariant,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: theme.colorScheme.surfaceVariant,
                          child: Icon(
                            Icons.image_not_supported,
                            size: 48,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        );
                      },
                    ),
                  ),
                ),
                if (customBadge != null)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: customBadge!,
                  ),
                if (!isAvailable)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: Colors.black54,
                      ),
                      child: const Center(
                        child: Text(
                          'UNAVAILABLE',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          
          const SizedBox(height: 12),
          
          // Title
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: isAvailable 
                  ? theme.colorScheme.onSurface 
                  : theme.colorScheme.onSurface.withOpacity(0.6),
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          
          // Subtitle
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.7),
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          
          // Price
          if (price != null) ...[
            const SizedBox(height: 8),
            Text(
              price!,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.primaryColor,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class OrderCard extends StatelessWidget {
  final String orderId;
  final String status;
  final String customerName;
  final String? restaurantName;
  final String orderTime;
  final String? estimatedDelivery;
  final double totalAmount;
  final VoidCallback? onTap;

  const OrderCard({
    super.key,
    required this.orderId,
    required this.status,
    required this.customerName,
    this.restaurantName,
    required this.orderTime,
    this.estimatedDelivery,
    required this.totalAmount,
    this.onTap,
  });

  Color _getStatusColor(BuildContext context, String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'confirmed':
        return Colors.blue;
      case 'preparing':
        return Colors.purple;
      case 'ready':
        return Colors.green;
      case 'picked_up':
        return Colors.teal;
      case 'delivered':
        return Colors.green[700]!;
      case 'cancelled':
        return Colors.red;
      default:
        return Theme.of(context).colorScheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusColor = _getStatusColor(context, status);

    return FloatingCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with order ID and status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Order #${orderId.substring(0, 8).toUpperCase()}',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Customer info
          Row(
            children: [
              Icon(
                Icons.person_outline,
                size: 16,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              const SizedBox(width: 8),
              Text(
                customerName,
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
          
          // Restaurant info
          if (restaurantName != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.restaurant_outlined,
                  size: 16,
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                ),
                const SizedBox(width: 8),
                Text(
                  restaurantName!,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ],
          
          const SizedBox(height: 12),
          
          // Time info and amount
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ordered: $orderTime',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                  if (estimatedDelivery != null)
                    Text(
                      'ETA: $estimatedDelivery',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.7),
                      ),
                    ),
                ],
              ),
              Text(
                '\$${totalAmount.toStringAsFixed(2)}',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.primaryColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}