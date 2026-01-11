import 'package:flutter/material.dart';
import 'routing/app_router.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GoSenderr',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(),
      home: const AppRouter(),
    );
  }
}
