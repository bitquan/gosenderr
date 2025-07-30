import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:uuid/uuid.dart';
import '../constants/app_constants.dart';

/// Service for handling Firebase Storage operations
class StorageService {
  static final FirebaseStorage _storage = FirebaseStorage.instance;
  static const Uuid _uuid = Uuid();
  
  /// Upload a file to Firebase Storage
  static Future<String> uploadFile({
    required File file,
    required String folder,
    String? fileName,
  }) async {
    try {
      // Validate file size
      final fileSize = await file.length();
      if (fileSize > AppConstants.maxImageSizeBytes) {
        throw Exception('File size exceeds maximum allowed size');
      }
      
      // Generate unique filename if not provided
      final String finalFileName = fileName ?? '${_uuid.v4()}.${_getFileExtension(file.path)}';
      
      // Validate file extension
      final extension = _getFileExtension(file.path);
      if (!AppConstants.allowedImageExtensions.contains(extension.toLowerCase())) {
        throw Exception('File type not supported');
      }
      
      // Create reference
      final ref = _storage.ref().child('$folder/$finalFileName');
      
      // Upload file
      final uploadTask = ref.putFile(file);
      final snapshot = await uploadTask;
      
      // Get download URL
      final downloadUrl = await snapshot.ref.getDownloadURL();
      return downloadUrl;
    } catch (e) {
      throw Exception('Failed to upload file: $e');
    }
  }
  
  /// Upload user profile image
  static Future<String> uploadProfileImage({
    required File imageFile,
    required String userId,
  }) async {
    return uploadFile(
      file: imageFile,
      folder: 'profile_images',
      fileName: '${userId}_${DateTime.now().millisecondsSinceEpoch}.${_getFileExtension(imageFile.path)}',
    );
  }
  
  /// Upload product image
  static Future<String> uploadProductImage({
    required File imageFile,
    required String vendorId,
    required String productId,
  }) async {
    return uploadFile(
      file: imageFile,
      folder: 'product_images/$vendorId',
      fileName: '${productId}_${DateTime.now().millisecondsSinceEpoch}.${_getFileExtension(imageFile.path)}',
    );
  }
  
  /// Upload multiple product images
  static Future<List<String>> uploadProductImages({
    required List<File> imageFiles,
    required String vendorId,
    required String productId,
  }) async {
    try {
      final List<String> downloadUrls = [];
      
      for (int i = 0; i < imageFiles.length; i++) {
        final downloadUrl = await uploadFile(
          file: imageFiles[i],
          folder: 'product_images/$vendorId',
          fileName: '${productId}_${i}_${DateTime.now().millisecondsSinceEpoch}.${_getFileExtension(imageFiles[i].path)}',
        );
        downloadUrls.add(downloadUrl);
      }
      
      return downloadUrls;
    } catch (e) {
      throw Exception('Failed to upload product images: $e');
    }
  }
  
  /// Upload vendor logo
  static Future<String> uploadVendorLogo({
    required File logoFile,
    required String vendorId,
  }) async {
    return uploadFile(
      file: logoFile,
      folder: 'vendor_logos',
      fileName: '${vendorId}_logo.${_getFileExtension(logoFile.path)}',
    );
  }
  
  /// Upload delivery proof image
  static Future<String> uploadDeliveryProof({
    required File imageFile,
    required String orderId,
    required String deliveryAgentId,
  }) async {
    return uploadFile(
      file: imageFile,
      folder: 'delivery_proofs',
      fileName: '${orderId}_${deliveryAgentId}_${DateTime.now().millisecondsSinceEpoch}.${_getFileExtension(imageFile.path)}',
    );
  }
  
  /// Delete file from Firebase Storage
  static Future<void> deleteFile(String downloadUrl) async {
    try {
      final ref = _storage.refFromURL(downloadUrl);
      await ref.delete();
    } catch (e) {
      throw Exception('Failed to delete file: $e');
    }
  }
  
  /// Delete multiple files from Firebase Storage
  static Future<void> deleteFiles(List<String> downloadUrls) async {
    try {
      final List<Future<void>> deleteTasks = downloadUrls
          .map((url) => deleteFile(url))
          .toList();
      
      await Future.wait(deleteTasks);
    } catch (e) {
      throw Exception('Failed to delete files: $e');
    }
  }
  
  /// Get file metadata
  static Future<FullMetadata> getFileMetadata(String downloadUrl) async {
    try {
      final ref = _storage.refFromURL(downloadUrl);
      return await ref.getMetadata();
    } catch (e) {
      throw Exception('Failed to get file metadata: $e');
    }
  }
  
  /// Get file extension from path
  static String _getFileExtension(String path) {
    return path.split('.').last.toLowerCase();
  }
  
  /// Check if file is an image
  static bool isImageFile(String path) {
    final extension = _getFileExtension(path);
    return AppConstants.allowedImageExtensions.contains(extension);
  }
  
  /// Get storage reference for a path
  static Reference getReference(String path) {
    return _storage.ref().child(path);
  }
  
  /// Upload file with progress tracking
  static UploadTask uploadFileWithProgress({
    required File file,
    required String folder,
    String? fileName,
  }) {
    final String finalFileName = fileName ?? '${_uuid.v4()}.${_getFileExtension(file.path)}';
    final ref = _storage.ref().child('$folder/$finalFileName');
    return ref.putFile(file);
  }
}