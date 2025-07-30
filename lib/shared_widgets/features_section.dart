import 'package:flutter/material.dart';

class FeaturesSection extends StatelessWidget {
  final bool isMobile;
  final bool isPortrait;

  const FeaturesSection({
    super.key,
    required this.isMobile,
    required this.isPortrait,
  });

  // Color constants
  static const Color primaryYellow = Color(0xFFFFC107);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(isMobile ? (isPortrait ? 24 : 32) : 32),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Text(
            'Why Choose GoSender?',
            style: TextStyle(
              fontSize: isMobile ? (isPortrait ? 24 : 28) : 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          SizedBox(height: isMobile ? (isPortrait ? 24 : 32) : 32),
          isMobile ? _buildMobileFeatures() : _buildDesktopFeatures(),
        ],
      ),
    );
  }

  Widget _buildDesktopFeatures() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildFeatureItem(
                Icons.flash_on_rounded,
                'Fast Delivery',
                'Quick and efficient delivery services',
              ),
            ),
            const SizedBox(width: 24),
            Expanded(
              child: _buildFeatureItem(
                Icons.security_rounded,
                'Secure',
                'Your packages are safe with us',
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: _buildFeatureItem(
                Icons.track_changes_rounded,
                'Real-time Tracking',
                'Track your orders in real-time',
              ),
            ),
            const SizedBox(width: 24),
            Expanded(
              child: _buildFeatureItem(
                Icons.support_agent_rounded,
                '24/7 Support',
                'Always here to help you',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMobileFeatures() {
    return Column(
      children: [
        _buildFeatureItem(
          Icons.flash_on_rounded,
          'Fast Delivery',
          'Quick and efficient delivery services',
        ),
        const SizedBox(height: 20),
        _buildFeatureItem(
          Icons.security_rounded,
          'Secure',
          'Your packages are safe with us',
        ),
        const SizedBox(height: 20),
        _buildFeatureItem(
          Icons.track_changes_rounded,
          'Real-time Tracking',
          'Track your orders in real-time',
        ),
        const SizedBox(height: 20),
        _buildFeatureItem(
          Icons.support_agent_rounded,
          '24/7 Support',
          'Always here to help you',
        ),
      ],
    );
  }

  Widget _buildFeatureItem(IconData icon, String title, String description) {
    return Column(
      children: [
        Container(
          padding: EdgeInsets.all(isMobile ? (isPortrait ? 12 : 16) : 16),
          decoration: BoxDecoration(
            color: primaryYellow.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: primaryYellow,
              width: 2,
            ),
          ),
          child: Icon(
            icon,
            size: isMobile ? (isPortrait ? 28 : 32) : 32,
            color: primaryYellow,
          ),
        ),
        SizedBox(height: isMobile ? (isPortrait ? 8 : 12) : 12),
        Text(
          title,
          style: TextStyle(
            fontSize: isMobile ? (isPortrait ? 16 : 18) : 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
          textAlign: TextAlign.center,
        ),
        SizedBox(height: isMobile ? (isPortrait ? 4 : 8) : 8),
        Text(
          description,
          style: TextStyle(
            fontSize: isMobile ? (isPortrait ? 12 : 14) : 14,
            color: Colors.white70,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
