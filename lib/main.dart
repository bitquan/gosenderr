import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'app.dart';
// TODO: Import firebase_options.dart when Firebase is configured
// import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // TODO: Initialize Firebase when configured
  // await Firebase.initializeApp(
  //   options: DefaultFirebaseOptions.currentPlatform,
  // );
  
  // Initialize Firebase with default options for now
  await Firebase.initializeApp();
  
  runApp(const GoSenderApp());
}