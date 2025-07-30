import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:gosenderr/app.dart';

void main() {
  testWidgets('App starts without crashing', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const GoSenderApp());

    // Verify that the app starts successfully
    expect(find.byType(MaterialApp), findsOneWidget);
  });

  testWidgets('Login page loads', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const GoSenderApp());
    await tester.pumpAndSettle();

    // Verify that login elements are present
    expect(find.text('GoSender'), findsAtLeastNWidget(1));
    expect(find.text('Welcome back!'), findsOneWidget);
  });
}