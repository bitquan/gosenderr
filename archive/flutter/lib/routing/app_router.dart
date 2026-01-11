import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/auth_state.dart';
import '../state/user_role_provider.dart';
import '../features/auth/login_screen.dart';
import '../features/driver/driver_home_screen.dart';
import '../features/customer/customer_home_screen.dart';
import '../features/auth/select_role_screen.dart';

class AppRouter extends ConsumerWidget {
  const AppRouter({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authStateProvider);
    // DEBUG: log auth state
    // ignore: avoid_print
    print('AppRouter auth state: $authAsync');

    return authAsync.when(
      data: (user) {
        // DEBUG
        // ignore: avoid_print
        print('Auth user: $user');

        if (user == null) return const LoginScreen();

        final roleAsync = ref.watch(userRoleProvider);
        // DEBUG
        // ignore: avoid_print
        print('User role provider state: $roleAsync');

        return roleAsync.when(
          data: (role) {
            // DEBUG
            // ignore: avoid_print
            print('User role: $role');
            if (role == 'driver') return const DriverHomeScreen();
            if (role == 'customer') return const CustomerHomeScreen();
            // If role is null/unknown, prompt the user to select one
            return const SelectRoleScreen();
          },
          loading: () =>
              const Scaffold(body: Center(child: CircularProgressIndicator())),
          error: (e, _) => Scaffold(body: Center(child: Text(e.toString()))),
        );
      },
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text(e.toString()))),
    );
  }
}
