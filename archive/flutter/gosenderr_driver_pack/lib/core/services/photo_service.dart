import 'dart:io';
import 'package:image_picker/image_picker.dart';

class PhotoService {
  final ImagePicker _picker = ImagePicker();

  Future<File?> takePhoto() async {
    final x = await _picker.pickImage(source: ImageSource.camera, imageQuality: 80);
    if (x == null) return null;
    return File(x.path);
  }
}
