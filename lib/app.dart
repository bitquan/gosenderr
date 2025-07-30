import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// Import core modules
import 'core/theme/app_theme.dart';

// Import screens
import 'features/auth/screens/login_screen.dart';
import 'features/auth/screens/signup_screen.dart';
import 'features/customer/screens/customer_home_screen.dart';
import 'features/vendor/screens/vendor_home_screen.dart';
import 'features/delivery_agent/screens/delivery_agent_home_screen.dart';
import 'features/admin/screens/admin_home_screen.dart';

class GoSenderApp extends StatelessWidget {
  const GoSenderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'GoSender - Delivery Platform',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}

// Basic router configuration
final GoRouter _router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const SignUpScreen(),
    ),
    GoRoute(
      path: '/customer',
      builder: (context, state) => const CustomerHomeScreen(),
    ),
    GoRoute(
      path: '/vendor',
      builder: (context, state) => const VendorHomeScreen(),
    ),
    GoRoute(
      path: '/delivery-agent',
      builder: (context, state) => const DeliveryAgentHomeScreen(),
    ),
    GoRoute(
      path: '/admin',
      builder: (context, state) => const AdminHomeScreen(),
    ),
  ],
);
