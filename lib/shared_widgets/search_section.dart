import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class SearchSection extends StatelessWidget {
  final TextEditingController searchController;
  final bool isMobile;
  final bool isPortrait;
  final VoidCallback onSearch;

  const SearchSection({
    super.key,
    required this.searchController,
    required this.isMobile,
    required this.isPortrait,
    required this.onSearch,
  });

  // Color constants
  static const Color primaryYellow = Color(0xFFFFC107);
  static const Color deepTeal = Color(0xFF006064);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(isMobile ? (isPortrait ? 16 : 20) : 24),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Text(
            'What are you looking for?',
            style: TextStyle(
              fontSize: isMobile ? (isPortrait ? 18 : 20) : 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          SizedBox(height: isMobile ? (isPortrait ? 12 : 16) : 20),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: TextField(
              controller: searchController,
              decoration: InputDecoration(
                hintText: isMobile && isPortrait
                    ? 'Search...'
                    : isMobile
                        ? 'Search products, services...'
                        : 'Search for products, restaurants, services...',
                hintStyle:
                    TextStyle(fontSize: isMobile ? (isPortrait ? 13 : 14) : 16),
                prefixIcon: Icon(
                  Icons.search_rounded,
                  color: deepTeal,
                  size: isMobile && isPortrait ? 20 : 24,
                ),
                suffixIcon: Container(
                  margin: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: primaryYellow,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: IconButton(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      onSearch();
                    },
                    icon: const Icon(
                      Icons.arrow_forward_rounded,
                      color: Colors.black,
                    ),
                  ),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.white,
                contentPadding:
                    EdgeInsets.all(isMobile ? (isPortrait ? 14 : 16) : 20),
              ),
              onSubmitted: (value) => onSearch(),
            ),
          ),
        ],
      ),
    );
  }
}
