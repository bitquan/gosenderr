import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app.dart';
import 'core/services/storage_service.dart';
// import 'firebase_options.dart'; // Uncomment and configure when Firebase is set up

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    // Initialize Firebase (uncomment when Firebase is configured)
    // await Firebase.initializeApp(
    //   options: DefaultFirebaseOptions.currentPlatform,
    // );
    
    // Initialize Hive
    await Hive.initFlutter();
    
    // Initialize services
    await StorageService.init();
  } catch (e) {
    // Handle initialization errors gracefully
    debugPrint('Initialization error: $e');
  }
  
  runApp(const GoSenderApp());
}