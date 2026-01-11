import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';

class StorageService {
  final _storage = FirebaseStorage.instance;

  Future<String> uploadJobPhoto({
    required String jobId,
    required File file,
    required String kind, // 'pickup' or 'dropoff'
  }) async {
    final ref = _storage.ref('jobs/$jobId/$kind.jpg');
    await ref.putFile(file);
    return await ref.getDownloadURL();
  }
}
