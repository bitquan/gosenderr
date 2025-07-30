import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:logger/logger.dart';
import '../constants/app_constants.dart';

class FirebaseService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseStorage _storage = FirebaseStorage.instance;
  static final Logger _logger = Logger();

  // Firestore instance getter
  static FirebaseFirestore get firestore => _firestore;
  
  // Storage instance getter
  static FirebaseStorage get storage => _storage;

  // CRUD Operations for any collection
  
  /// Create a document in a collection
  static Future<String> createDocument({
    required String collection,
    required Map<String, dynamic> data,
    String? documentId,
  }) async {
    try {
      data['createdAt'] = FieldValue.serverTimestamp();
      data['updatedAt'] = FieldValue.serverTimestamp();
      
      DocumentReference docRef;
      if (documentId != null) {
        docRef = _firestore.collection(collection).doc(documentId);
        await docRef.set(data);
      } else {
        docRef = await _firestore.collection(collection).add(data);
      }
      
      _logger.i('Document created successfully in $collection with ID: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      _logger.e('Error creating document in $collection: $e');
      rethrow;
    }
  }

  /// Read a document from a collection
  static Future<Map<String, dynamic>?> getDocument({
    required String collection,
    required String documentId,
  }) async {
    try {
      DocumentSnapshot doc = await _firestore
          .collection(collection)
          .doc(documentId)
          .get();
      
      if (doc.exists) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        data['id'] = doc.id;
        return data;
      }
      return null;
    } catch (e) {
      _logger.e('Error getting document from $collection: $e');
      rethrow;
    }
  }

  /// Update a document in a collection
  static Future<void> updateDocument({
    required String collection,
    required String documentId,
    required Map<String, dynamic> data,
  }) async {
    try {
      data['updatedAt'] = FieldValue.serverTimestamp();
      
      await _firestore
          .collection(collection)
          .doc(documentId)
          .update(data);
      
      _logger.i('Document updated successfully in $collection with ID: $documentId');
    } catch (e) {
      _logger.e('Error updating document in $collection: $e');
      rethrow;
    }
  }

  /// Delete a document from a collection
  static Future<void> deleteDocument({
    required String collection,
    required String documentId,
  }) async {
    try {
      await _firestore
          .collection(collection)
          .doc(documentId)
          .delete();
      
      _logger.i('Document deleted successfully from $collection with ID: $documentId');
    } catch (e) {
      _logger.e('Error deleting document from $collection: $e');
      rethrow;
    }
  }

  /// Get multiple documents from a collection with optional filtering
  static Future<List<Map<String, dynamic>>> getDocuments({
    required String collection,
    Query? query,
    int? limit,
  }) async {
    try {
      Query baseQuery = query ?? _firestore.collection(collection);
      
      if (limit != null) {
        baseQuery = baseQuery.limit(limit);
      }
      
      QuerySnapshot querySnapshot = await baseQuery.get();
      
      return querySnapshot.docs.map((doc) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        data['id'] = doc.id;
        return data;
      }).toList();
    } catch (e) {
      _logger.e('Error getting documents from $collection: $e');
      rethrow;
    }
  }

  /// Stream documents from a collection
  static Stream<List<Map<String, dynamic>>> streamDocuments({
    required String collection,
    Query? query,
    int? limit,
  }) {
    try {
      Query baseQuery = query ?? _firestore.collection(collection);
      
      if (limit != null) {
        baseQuery = baseQuery.limit(limit);
      }
      
      return baseQuery.snapshots().map((querySnapshot) {
        return querySnapshot.docs.map((doc) {
          Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
          data['id'] = doc.id;
          return data;
        }).toList();
      });
    } catch (e) {
      _logger.e('Error streaming documents from $collection: $e');
      rethrow;
    }
  }

  // Storage Operations
  
  /// Upload a file to Firebase Storage
  static Future<String> uploadFile({
    required String path,
    required List<int> fileBytes,
    required String fileName,
    String? contentType,
  }) async {
    try {
      Reference ref = _storage.ref().child('$path/$fileName');
      
      UploadTask uploadTask = ref.putData(
        fileBytes as Uint8List,
        SettingsMetadata(contentType: contentType),
      );
      
      TaskSnapshot snapshot = await uploadTask;
      String downloadUrl = await snapshot.ref.getDownloadURL();
      
      _logger.i('File uploaded successfully to $path/$fileName');
      return downloadUrl;
    } catch (e) {
      _logger.e('Error uploading file to $path/$fileName: $e');
      rethrow;
    }
  }

  /// Delete a file from Firebase Storage
  static Future<void> deleteFile({
    required String path,
    required String fileName,
  }) async {
    try {
      Reference ref = _storage.ref().child('$path/$fileName');
      await ref.delete();
      
      _logger.i('File deleted successfully from $path/$fileName');
    } catch (e) {
      _logger.e('Error deleting file from $path/$fileName: $e');
      rethrow;
    }
  }

  // Batch Operations
  
  /// Perform multiple operations in a batch
  static Future<void> batchWrite(List<Map<String, dynamic>> operations) async {
    try {
      WriteBatch batch = _firestore.batch();
      
      for (var operation in operations) {
        String type = operation['type'];
        String collection = operation['collection'];
        String documentId = operation['documentId'];
        Map<String, dynamic>? data = operation['data'];
        
        DocumentReference docRef = _firestore.collection(collection).doc(documentId);
        
        switch (type) {
          case 'create':
            if (data != null) {
              data['createdAt'] = FieldValue.serverTimestamp();
              data['updatedAt'] = FieldValue.serverTimestamp();
              batch.set(docRef, data);
            }
            break;
          case 'update':
            if (data != null) {
              data['updatedAt'] = FieldValue.serverTimestamp();
              batch.update(docRef, data);
            }
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }
      
      await batch.commit();
      _logger.i('Batch operation completed successfully');
    } catch (e) {
      _logger.e('Error in batch operation: $e');
      rethrow;
    }
  }
}