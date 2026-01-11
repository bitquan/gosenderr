import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class CategoryGrid extends StatelessWidget {
  final bool isMobile;
  final bool isPortrait;
  final Function(String) onCategoryTap;

  const CategoryGrid({
    super.key,
    required this.isMobile,
    required this.isPortrait,
    required this.onCategoryTap,
  });

  // Color constants
  static const Color accentTeal = Color(0xFF00BCD4);
  static const Color primaryYellow = Color(0xFFFFC107);

  @override
  Widget build(BuildContext context) {
    final categories = [
      {
        'title': 'Food Delivery',
        'icon': Icons.restaurant_rounded,
        'color': Colors.orange
      },
      {
        'title': 'Package Delivery',
        'icon': Icons.local_shipping_rounded,
        'color': accentTeal
      },
      {
        'title': 'Shopping',
        'icon': Icons.shopping_cart_rounded,
        'color': primaryYellow
      },
      {
        'title': 'Pharmacy',
        'icon': Icons.local_pharmacy_rounded,
        'color': Colors.green
      },
    ];

    return Column(
      children: [
        Text(
          'Popular Categories',
          style: TextStyle(
            fontSize: isMobile ? (isPortrait ? 20 : 24) : 28,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        SizedBox(height: isMobile ? (isPortrait ? 16 : 20) : 24),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: isMobile ? (isPortrait ? 8 : 12) : 16,
            mainAxisSpacing: isMobile ? (isPortrait ? 8 : 12) : 16,
            childAspectRatio: isMobile ? (isPortrait ? 1.0 : 1.1) : 1.2,
          ),
          itemCount: categories.length,
          itemBuilder: (context, index) {
            final category = categories[index];
            return _buildCategoryCard(
              category['title'] as String,
              category['icon'] as IconData,
              category['color'] as Color,
            );
          },
        ),
      ],
    );
  }

  Widget _buildCategoryCard(String title, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            HapticFeedback.lightImpact();
            onCategoryTap(title);
          },
          child: Padding(
            padding: EdgeInsets.all(isMobile ? (isPortrait ? 12 : 16) : 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding:
                      EdgeInsets.all(isMobile ? (isPortrait ? 8 : 12) : 16),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: color,
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    icon,
                    size: isMobile ? (isPortrait ? 24 : 28) : 32,
                    color: color,
                  ),
                ),
                SizedBox(height: isMobile ? (isPortrait ? 6 : 8) : 12),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: isMobile ? (isPortrait ? 12 : 14) : 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
