import 'package:cloud_firestore/cloud_firestore.dart';
import '../constants/app_constants.dart';

/// Service for handling Firestore database operations
class FirestoreService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  // User operations
  static Future<void> createUser({
    required String uid,
    required String email,
    required String name,
    required String role,
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      final userData = {
        'uid': uid,
        'email': email,
        'name': name,
        'role': role,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'isActive': true,
        ...?additionalData,
      };
      
      await _firestore
          .collection(AppConstants.usersCollection)
          .doc(uid)
          .set(userData);
    } catch (e) {
      throw Exception('Failed to create user: $e');
    }
  }
  
  static Future<DocumentSnapshot> getUser(String uid) async {
    try {
      return await _firestore
          .collection(AppConstants.usersCollection)
          .doc(uid)
          .get();
    } catch (e) {
      throw Exception('Failed to get user: $e');
    }
  }
  
  static Future<void> updateUser(String uid, Map<String, dynamic> data) async {
    try {
      data['updatedAt'] = FieldValue.serverTimestamp();
      await _firestore
          .collection(AppConstants.usersCollection)
          .doc(uid)
          .update(data);
    } catch (e) {
      throw Exception('Failed to update user: $e');
    }
  }
  
  // Order operations
  static Future<String> createOrder(Map<String, dynamic> orderData) async {
    try {
      orderData['createdAt'] = FieldValue.serverTimestamp();
      orderData['updatedAt'] = FieldValue.serverTimestamp();
      orderData['status'] = AppConstants.orderPending;
      
      final docRef = await _firestore
          .collection(AppConstants.ordersCollection)
          .add(orderData);
      
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create order: $e');
    }
  }
  
  static Future<QuerySnapshot> getOrdersByUser(String userId, {String? role}) async {
    try {
      Query query = _firestore.collection(AppConstants.ordersCollection);
      
      if (role == AppConstants.customerRole) {
        query = query.where('customerId', isEqualTo: userId);
      } else if (role == AppConstants.vendorRole) {
        query = query.where('vendorId', isEqualTo: userId);
      } else if (role == AppConstants.deliveryAgentRole) {
        query = query.where('deliveryAgentId', isEqualTo: userId);
      }
      
      return await query
          .orderBy('createdAt', descending: true)
          .limit(AppConstants.defaultPageSize)
          .get();
    } catch (e) {
      throw Exception('Failed to get orders: $e');
    }
  }
  
  static Future<void> updateOrderStatus(String orderId, String status) async {
    try {
      await _firestore
          .collection(AppConstants.ordersCollection)
          .doc(orderId)
          .update({
            'status': status,
            'updatedAt': FieldValue.serverTimestamp(),
          });
    } catch (e) {
      throw Exception('Failed to update order status: $e');
    }
  }
  
  // Product operations
  static Future<String> createProduct(Map<String, dynamic> productData) async {
    try {
      productData['createdAt'] = FieldValue.serverTimestamp();
      productData['updatedAt'] = FieldValue.serverTimestamp();
      productData['isActive'] = true;
      
      final docRef = await _firestore
          .collection(AppConstants.productsCollection)
          .add(productData);
      
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create product: $e');
    }
  }
  
  static Future<QuerySnapshot> getProductsByVendor(String vendorId) async {
    try {
      return await _firestore
          .collection(AppConstants.productsCollection)
          .where('vendorId', isEqualTo: vendorId)
          .where('isActive', isEqualTo: true)
          .orderBy('createdAt', descending: true)
          .get();
    } catch (e) {
      throw Exception('Failed to get products: $e');
    }
  }
  
  static Future<QuerySnapshot> getAllProducts({String? category}) async {
    try {
      Query query = _firestore
          .collection(AppConstants.productsCollection)
          .where('isActive', isEqualTo: true);
      
      if (category != null && category.isNotEmpty) {
        query = query.where('category', isEqualTo: category);
      }
      
      return await query
          .orderBy('createdAt', descending: true)
          .limit(AppConstants.defaultPageSize)
          .get();
    } catch (e) {
      throw Exception('Failed to get products: $e');
    }
  }
  
  // Real-time streams
  static Stream<QuerySnapshot> getOrdersStream(String userId, String role) {
    Query query = _firestore.collection(AppConstants.ordersCollection);
    
    if (role == AppConstants.customerRole) {
      query = query.where('customerId', isEqualTo: userId);
    } else if (role == AppConstants.vendorRole) {
      query = query.where('vendorId', isEqualTo: userId);
    } else if (role == AppConstants.deliveryAgentRole) {
      query = query.where('deliveryAgentId', isEqualTo: userId);
    }
    
    return query.orderBy('createdAt', descending: true).snapshots();
  }
  
  static Stream<DocumentSnapshot> getUserStream(String uid) {
    return _firestore
        .collection(AppConstants.usersCollection)
        .doc(uid)
        .snapshots();
  }
  
  // Utility methods
  static Future<bool> documentExists(String collection, String documentId) async {
    try {
      final doc = await _firestore.collection(collection).doc(documentId).get();
      return doc.exists;
    } catch (e) {
      return false;
    }
  }
  
  static Future<void> deleteDocument(String collection, String documentId) async {
    try {
      await _firestore.collection(collection).doc(documentId).delete();
    } catch (e) {
      throw Exception('Failed to delete document: $e');
    }
  }
}