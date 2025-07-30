import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import 'core/theme/app_theme.dart';
import 'features/customer/screens/customer_home_screen.dart';
import 'features/vendor/screens/vendor_home_screen.dart';
import 'features/delivery_agent/screens/delivery_agent_home_screen.dart';
import 'features/admin/screens/admin_home_screen.dart';

class GoSenderApp extends StatelessWidget {
  const GoSenderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        // TODO: Add BLoC providers for authentication, user management, etc.
      ],
      child: MaterialApp.router(
        title: 'GoSender',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        routerConfig: _router,
      ),
    );
  }
}

final GoRouter _router = GoRouter(
  initialLocation: '/customer',
  routes: [
    // Customer routes
    GoRoute(
      path: '/customer',
      name: 'customer_home',
      builder: (context, state) => const CustomerHomeScreen(),
    ),
    
    // Vendor routes
    GoRoute(
      path: '/vendor',
      name: 'vendor_home',
      builder: (context, state) => const VendorHomeScreen(),
    ),
    
    // Delivery Agent routes
    GoRoute(
      path: '/delivery',
      name: 'delivery_agent_home',
      builder: (context, state) => const DeliveryAgentHomeScreen(),
    ),
    
    // Admin routes
    GoRoute(
      path: '/admin',
      name: 'admin_home',
      builder: (context, state) => const AdminHomeScreen(),
    ),
    
    // TODO: Add authentication routes
    // GoRoute(
    //   path: '/login',
    //   name: 'login',
    //   builder: (context, state) => const LoginScreen(),
    // ),
    // GoRoute(
    //   path: '/register',
    //   name: 'register',
    //   builder: (context, state) => const RegisterScreen(),
    // ),
  ],
  
  // TODO: Add authentication redirect logic
  // redirect: (context, state) {
  //   final isAuthenticated = context.read<AuthBloc>().state.isAuthenticated;
  //   if (!isAuthenticated && !state.location.startsWith('/auth')) {
  //     return '/auth/login';
  //   }
  //   return null;
  // },
);