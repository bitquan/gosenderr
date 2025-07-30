import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

class ModernAppBar extends StatelessWidget {
  final bool isMobile;
  final bool isPortrait;

  const ModernAppBar({
    super.key,
    required this.isMobile,
    required this.isPortrait,
  });

  // Color constants
  static const Color primaryYellow = Color(0xFFFFC107);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? (isPortrait ? 12 : 16) : 20,
        vertical: isMobile && isPortrait ? 12 : 16,
      ),
      child:
          isMobile ? _buildMobileAppBar(context) : _buildDesktopAppBar(context),
    );
  }

  Widget _buildDesktopAppBar(BuildContext context) {
    return Row(
      children: [
        // Logo section
        _buildLogo(),
        const Spacer(),
        // Action buttons
        _buildLoginButton(context),
        const SizedBox(width: 12),
        _buildSignUpButton(context),
      ],
    );
  }

  Widget _buildMobileAppBar(BuildContext context) {
    return Column(
      children: [
        // Logo row
        Row(
          children: [_buildLogo()],
        ),
        SizedBox(height: isPortrait ? 12 : 16),
        // Buttons row
        Row(
          children: [
            Expanded(child: _buildLoginButton(context, fullWidth: true)),
            SizedBox(width: isPortrait ? 8 : 12),
            Expanded(child: _buildSignUpButton(context, fullWidth: true)),
          ],
        ),
      ],
    );
  }

  Widget _buildLogo() {
    return Row(
      children: [
        Container(
          padding: EdgeInsets.all(isPortrait ? 8 : 10),
          decoration: BoxDecoration(
            color: primaryYellow.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: primaryYellow,
              width: 2,
            ),
          ),
          child: Icon(
            Icons.local_shipping_rounded,
            color: primaryYellow,
            size: isPortrait ? 20 : 24,
          ),
        ),
        SizedBox(width: isPortrait ? 8 : 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GoSender',
              style: TextStyle(
                fontSize: isPortrait ? 18 : 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
            Text(
              'Marketplace',
              style: TextStyle(
                fontSize: isPortrait ? 10 : 12,
                color: Colors.white70,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLoginButton(BuildContext context, {bool fullWidth = false}) {
    return Container(
      width: fullWidth ? double.infinity : null,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: TextButton.icon(
        onPressed: () {
          HapticFeedback.lightImpact();
          context.go('/login');
        },
        icon: fullWidth
            ? null
            : const Icon(
                Icons.login_rounded,
                color: Colors.white,
              ),
        label: Text(
          'Login',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: isPortrait ? 13 : 14,
          ),
        ),
        style: TextButton.styleFrom(
          padding: EdgeInsets.symmetric(
            horizontal: fullWidth ? 0 : 16,
            vertical: isPortrait ? 10 : 12,
          ),
        ),
      ),
    );
  }

  Widget _buildSignUpButton(BuildContext context, {bool fullWidth = false}) {
    return Container(
      width: fullWidth ? double.infinity : null,
      decoration: BoxDecoration(
        color: primaryYellow,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: primaryYellow.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: TextButton.icon(
        onPressed: () {
          HapticFeedback.lightImpact();
          context.go('/register');
        },
        icon: fullWidth
            ? null
            : const Icon(
                Icons.person_add_rounded,
                color: Colors.black,
              ),
        label: Text(
          'Sign Up',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: isPortrait ? 13 : 14,
          ),
        ),
        style: TextButton.styleFrom(
          padding: EdgeInsets.symmetric(
            horizontal: fullWidth ? 0 : 16,
            vertical: isPortrait ? 10 : 12,
          ),
        ),
      ),
    );
  }
}
