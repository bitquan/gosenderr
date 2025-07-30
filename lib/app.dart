import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';
import 'core/services/auth_service.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/customer/presentation/pages/customer_home_page.dart';
import 'features/driver/presentation/pages/driver_home_page.dart';
import 'features/merchant/presentation/pages/merchant_home_page.dart';
import 'features/auth/presentation/pages/role_selection_page.dart';

class GoSenderApp extends StatelessWidget {
  const GoSenderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) => AuthService(),
        ),
      ],
      child: MaterialApp.router(
        title: 'GoSender',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        routerConfig: _router,
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('en', 'US'),
          Locale('es', 'ES'),
          Locale('fr', 'FR'),
        ],
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

final GoRouter _router = GoRouter(
  initialLocation: '/auth/login',
  routes: [
    GoRoute(
      path: '/auth/login',
      name: 'login',
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: '/auth/role-selection',
      name: 'role-selection',
      builder: (context, state) => const RoleSelectionPage(),
    ),
    GoRoute(
      path: '/customer',
      name: 'customer-home',
      builder: (context, state) => const CustomerHomePage(),
      routes: [
        GoRoute(
          path: '/orders',
          name: 'customer-orders',
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Customer Orders')),
          ),
        ),
        GoRoute(
          path: '/profile',
          name: 'customer-profile',
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Customer Profile')),
          ),
        ),
      ],
    ),
    GoRoute(
      path: '/driver',
      name: 'driver-home',
      builder: (context, state) => const DriverHomePage(),
      routes: [
        GoRoute(
          path: '/deliveries',
          name: 'driver-deliveries',
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Driver Deliveries')),
          ),
        ),
        GoRoute(
          path: '/earnings',
          name: 'driver-earnings',
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Driver Earnings')),
          ),
        ),
      ],
    ),
    GoRoute(
      path: '/merchant',
      name: 'merchant-home',
      builder: (context, state) => const MerchantHomePage(),
      routes: [
        GoRoute(
          path: '/orders',
          name: 'merchant-orders',
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Merchant Orders')),
          ),
        ),
        GoRoute(
          path: '/menu',
          name: 'merchant-menu',
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Merchant Menu')),
          ),
        ),
      ],
    ),
  ],
);