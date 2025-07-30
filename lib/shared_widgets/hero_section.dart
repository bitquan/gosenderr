import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

class HeroSection extends StatelessWidget {
  final Animation<Offset> slideAnimation;
  final bool isMobile;
  final bool isPortrait;
  final VoidCallback onBrowseServices;

  const HeroSection({
    super.key,
    required this.slideAnimation,
    required this.isMobile,
    required this.isPortrait,
    required this.onBrowseServices,
  });

  // Color constants
  static const Color primaryYellow = Color(0xFFFFC107);

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: slideAnimation,
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(isMobile ? (isPortrait ? 16 : 24) : 32),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.3),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          children: [
            _buildIcon(),
            SizedBox(height: isMobile ? (isPortrait ? 16 : 20) : 24),
            _buildTitle(),
            SizedBox(height: isMobile ? (isPortrait ? 8 : 12) : 16),
            _buildDescription(),
            SizedBox(height: isMobile ? (isPortrait ? 20 : 24) : 32),
            _buildButtons(context),
          ],
        ),
      ),
    );
  }

  Widget _buildIcon() {
    return Container(
      padding: EdgeInsets.all(isMobile ? (isPortrait ? 12 : 16) : 20),
      decoration: BoxDecoration(
        color: primaryYellow.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: primaryYellow,
          width: 2,
        ),
      ),
      child: Icon(
        Icons.rocket_launch_rounded,
        size: isMobile ? (isPortrait ? 32 : 40) : 48,
        color: primaryYellow,
      ),
    );
  }

  Widget _buildTitle() {
    return Text(
      'Your One-Stop Delivery Marketplace',
      style: TextStyle(
        fontSize: isMobile ? (isPortrait ? 20 : 24) : 32,
        fontWeight: FontWeight.bold,
        color: Colors.white,
        letterSpacing: -1,
        height: 1.2,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildDescription() {
    return Text(
      'Connect with vendors, customers, and delivery agents in one seamless platform. Fast, reliable, and secure delivery solutions.',
      style: TextStyle(
        fontSize: isMobile ? (isPortrait ? 14 : 16) : 18,
        color: Colors.white70,
        height: 1.5,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildButtons(BuildContext context) {
    if (isMobile) {
      return Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: _buildHeroButton(
              'Start Delivering',
              Icons.delivery_dining_rounded,
              () {
                HapticFeedback.lightImpact();
                context.go('/register');
              },
              isPrimary: true,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: _buildHeroButton(
              'Browse Services',
              Icons.search_rounded,
              onBrowseServices,
              isPrimary: false,
            ),
          ),
        ],
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildHeroButton(
          'Start Delivering',
          Icons.delivery_dining_rounded,
          () {
            HapticFeedback.lightImpact();
            context.go('/register');
          },
          isPrimary: true,
        ),
        const SizedBox(width: 16),
        _buildHeroButton(
          'Browse Services',
          Icons.search_rounded,
          onBrowseServices,
          isPrimary: false,
        ),
      ],
    );
  }

  Widget _buildHeroButton(String text, IconData icon, VoidCallback onPressed,
      {required bool isPrimary}) {
    return Container(
      decoration: BoxDecoration(
        color: isPrimary ? primaryYellow : Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color:
              isPrimary ? primaryYellow : Colors.white.withValues(alpha: 0.3),
          width: 1,
        ),
        boxShadow: isPrimary
            ? [
                BoxShadow(
                  color: primaryYellow.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: TextButton.icon(
        onPressed: onPressed,
        icon: Icon(
          icon,
          color: isPrimary ? Colors.black : Colors.white,
        ),
        label: Text(
          text,
          style: TextStyle(
            color: isPrimary ? Colors.black : Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        ),
      ),
    );
  }
}
