import 'package:flutter/material.dart';

/// A customizable floating card widget that can be used throughout the app
/// for displaying promotional content, notifications, or important information
class FloatingCard extends StatelessWidget {
  const FloatingCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.backgroundColor,
    this.onTap,
    this.showCloseButton = false,
    this.onClose,
    this.gradient,
    this.elevation = 4.0,
  });

  /// The main title text displayed on the card
  final String title;
  
  /// The subtitle or description text
  final String subtitle;
  
  /// The icon to display on the card
  final IconData icon;
  
  /// Background color of the card (overridden by gradient if provided)
  final Color? backgroundColor;
  
  /// Optional callback when the card is tapped
  final VoidCallback? onTap;
  
  /// Whether to show a close button
  final bool showCloseButton;
  
  /// Callback when close button is pressed
  final VoidCallback? onClose;
  
  /// Optional gradient background
  final Gradient? gradient;
  
  /// Card elevation
  final double elevation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    Widget cardChild = Container(
      decoration: BoxDecoration(
        color: gradient == null ? (backgroundColor ?? theme.colorScheme.primaryContainer) : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: elevation,
            offset: Offset(0, elevation / 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            // Icon container
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                size: 24,
                color: Colors.white,
              ),
            ),
            
            const SizedBox(width: 16),
            
            // Text content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withOpacity(0.9),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            
            // Close button (optional)
            if (showCloseButton)
              IconButton(
                onPressed: onClose,
                icon: const Icon(
                  Icons.close,
                  color: Colors.white,
                  size: 20,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(
                  minWidth: 24,
                  minHeight: 24,
                ),
              ),
          ],
        ),
      ),
    );

    // Wrap with InkWell if onTap is provided
    if (onTap != null) {
      cardChild = InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: cardChild,
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: cardChild,
    );
  }
}

/// A specialized floating card for promotions with a gradient background
class PromotionalFloatingCard extends StatelessWidget {
  const PromotionalFloatingCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.onClose,
    this.showCloseButton = false,
  });

  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final VoidCallback? onClose;
  final bool showCloseButton;

  @override
  Widget build(BuildContext context) {
    return FloatingCard(
      title: title,
      subtitle: subtitle,
      icon: Icons.local_offer,
      onTap: onTap,
      onClose: onClose,
      showCloseButton: showCloseButton,
      gradient: const LinearGradient(
        colors: [Color(0xFFFF6B6B), Color(0xFFFFE66D)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    );
  }
}

/// A specialized floating card for notifications
class NotificationFloatingCard extends StatelessWidget {
  const NotificationFloatingCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.onClose,
    this.showCloseButton = true,
  });

  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final VoidCallback? onClose;
  final bool showCloseButton;

  @override
  Widget build(BuildContext context) {
    return FloatingCard(
      title: title,
      subtitle: subtitle,
      icon: Icons.notifications,
      onTap: onTap,
      onClose: onClose,
      showCloseButton: showCloseButton,
      backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
    );
  }
}

/// A specialized floating card for success messages
class SuccessFloatingCard extends StatelessWidget {
  const SuccessFloatingCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.onClose,
    this.showCloseButton = false,
  });

  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final VoidCallback? onClose;
  final bool showCloseButton;

  @override
  Widget build(BuildContext context) {
    return FloatingCard(
      title: title,
      subtitle: subtitle,
      icon: Icons.check_circle,
      onTap: onTap,
      onClose: onClose,
      showCloseButton: showCloseButton,
      backgroundColor: Colors.green,
    );
  }
}

/// A specialized floating card for warnings
class WarningFloatingCard extends StatelessWidget {
  const WarningFloatingCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.onClose,
    this.showCloseButton = true,
  });

  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final VoidCallback? onClose;
  final bool showCloseButton;

  @override
  Widget build(BuildContext context) {
    return FloatingCard(
      title: title,
      subtitle: subtitle,
      icon: Icons.warning,
      onTap: onTap,
      onClose: onClose,
      showCloseButton: showCloseButton,
      backgroundColor: Colors.orange,
    );
  }
}