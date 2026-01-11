import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/driver_profile_provider.dart';
import 'driver_onboarding_screen.dart';
import 'driver_dashboard_screen.dart';

class DriverHomeScreen extends ConsumerWidget {
  const DriverHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(driverProfileProvider);

    return profileAsync.when(
      data: (doc) {
        if (doc == null || !doc.exists) {
          return const DriverOnboardingScreen();
        }
        return const DriverDashboardScreen();
      },
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text(e.toString()))),
    );
  }
}
