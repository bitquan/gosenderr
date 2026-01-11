import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DialogHelpers {
  static const Color deepTeal = Color(0xFF006064);

  static void showSearchDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Row(
          children: [
            Icon(Icons.search_rounded, color: deepTeal),
            SizedBox(width: 12),
            Text('Search Services'),
          ],
        ),
        content: const Text(
          'Search functionality will be implemented in the next update. You can browse categories for now!',
        ),
        actions: [
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
            },
            child: const Text('Got it!'),
          ),
        ],
      ),
    );
  }

  static void showCategoryDialog(BuildContext context, String category) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Text('$category Services'),
        content: Text(
          '$category services will be available soon! Sign up to get notified when we launch.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
            },
            child: const Text('OK'),
          ),
          TextButton(
            onPressed: () {
              HapticFeedback.lightImpact();
              Navigator.of(context).pop();
              // Note: Would need to pass navigation callback for this to work
            },
            child: const Text('Sign Up'),
          ),
        ],
      ),
    );
  }
}
