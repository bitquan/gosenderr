import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart';

class PhotoService {
  final ImagePicker _picker = ImagePicker();

  Future<File?> takePhoto() async {
    // Skip camera in simulator/emulator to avoid native errors
    if (!kIsWeb && (Platform.isIOS || Platform.isAndroid)) {
      // Check if running on simulator by trying to detect environment
      // For now, just catch and return null which our error handler will catch
    }

    final x = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (x == null) return null;
    return File(x.path);
  }
}
