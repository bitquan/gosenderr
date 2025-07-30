import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import '../constants/app_constants.dart';
import 'firebase_service.dart';
import 'storage_service.dart';

enum AuthState { initial, loading, authenticated, unauthenticated, error }

class AuthService extends Cubit<AuthState> {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final Logger _logger = Logger();
  
  User? get currentUser => _auth.currentUser;
  bool get isAuthenticated => _auth.currentUser != null;

  AuthService() : super(AuthState.initial) {
    // Listen to auth state changes
    _auth.authStateChanges().listen((User? user) {
      if (user != null) {
        emit(AuthState.authenticated);
      } else {
        emit(AuthState.unauthenticated);
      }
    });
  }

  /// Sign in with email and password
  Future<UserCredential?> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      emit(AuthState.loading);
      
      UserCredential userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      
      // Cache auth token
      String? token = await userCredential.user?.getIdToken();
      if (token != null) {
        await StorageService.setAuthToken(token);
      }
      
      _logger.i('User signed in successfully: ${userCredential.user?.email}');
      emit(AuthState.authenticated);
      
      return userCredential;
    } on FirebaseAuthException catch (e) {
      _logger.e('Firebase Auth Error: ${e.code} - ${e.message}');
      emit(AuthState.error);
      rethrow;
    } catch (e) {
      _logger.e('Unexpected error during sign in: $e');
      emit(AuthState.error);
      rethrow;
    }
  }

  /// Register with email and password
  Future<UserCredential?> registerWithEmailAndPassword({
    required String email,
    required String password,
    required String role,
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      emit(AuthState.loading);
      
      UserCredential userCredential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      
      // Create user document in Firestore
      if (userCredential.user != null) {
        Map<String, dynamic> userData = {
          'email': email,
          'role': role,
          'isActive': true,
          'emailVerified': false,
          ...?additionalData,
        };
        
        await FirebaseService.createDocument(
          collection: AppConstants.usersCollection,
          documentId: userCredential.user!.uid,
          data: userData,
        );
        
        // Cache user role
        await StorageService.setUserRole(role);
        
        // Send email verification
        await userCredential.user!.sendEmailVerification();
      }
      
      // Cache auth token
      String? token = await userCredential.user?.getIdToken();
      if (token != null) {
        await StorageService.setAuthToken(token);
      }
      
      _logger.i('User registered successfully: ${userCredential.user?.email}');
      emit(AuthState.authenticated);
      
      return userCredential;
    } on FirebaseAuthException catch (e) {
      _logger.e('Firebase Auth Error: ${e.code} - ${e.message}');
      emit(AuthState.error);
      rethrow;
    } catch (e) {
      _logger.e('Unexpected error during registration: $e');
      emit(AuthState.error);
      rethrow;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      emit(AuthState.loading);
      
      await _auth.signOut();
      await StorageService.clearAuthData();
      
      _logger.i('User signed out successfully');
      emit(AuthState.unauthenticated);
    } catch (e) {
      _logger.e('Error during sign out: $e');
      emit(AuthState.error);
      rethrow;
    }
  }

  /// Reset password
  Future<void> resetPassword({required String email}) async {
    try {
      emit(AuthState.loading);
      
      await _auth.sendPasswordResetEmail(email: email);
      
      _logger.i('Password reset email sent to: $email');
      emit(AuthState.unauthenticated);
    } on FirebaseAuthException catch (e) {
      _logger.e('Firebase Auth Error: ${e.code} - ${e.message}');
      emit(AuthState.error);
      rethrow;
    } catch (e) {
      _logger.e('Unexpected error during password reset: $e');
      emit(AuthState.error);
      rethrow;
    }
  }

  /// Verify email
  Future<void> verifyEmail() async {
    try {
      User? user = _auth.currentUser;
      if (user != null && !user.emailVerified) {
        await user.sendEmailVerification();
        _logger.i('Verification email sent to: ${user.email}');
      }
    } catch (e) {
      _logger.e('Error sending verification email: $e');
      rethrow;
    }
  }

  /// Reload user to get updated email verification status
  Future<void> reloadUser() async {
    try {
      await _auth.currentUser?.reload();
      _auth.currentUser?.reload();
    } catch (e) {
      _logger.e('Error reloading user: $e');
      rethrow;
    }
  }

  /// Update user profile
  Future<void> updateProfile({
    String? displayName,
    String? photoURL,
  }) async {
    try {
      User? user = _auth.currentUser;
      if (user != null) {
        await user.updateDisplayName(displayName);
        await user.updatePhotoURL(photoURL);
        
        _logger.i('User profile updated successfully');
      }
    } catch (e) {
      _logger.e('Error updating user profile: $e');
      rethrow;
    }
  }

  /// Update password
  Future<void> updatePassword({required String newPassword}) async {
    try {
      User? user = _auth.currentUser;
      if (user != null) {
        await user.updatePassword(newPassword);
        _logger.i('Password updated successfully');
      }
    } on FirebaseAuthException catch (e) {
      _logger.e('Firebase Auth Error: ${e.code} - ${e.message}');
      rethrow;
    } catch (e) {
      _logger.e('Unexpected error during password update: $e');
      rethrow;
    }
  }

  /// Reauthenticate user (required for sensitive operations)
  Future<void> reauthenticate({
    required String email,
    required String password,
  }) async {
    try {
      User? user = _auth.currentUser;
      if (user != null) {
        AuthCredential credential = EmailAuthProvider.credential(
          email: email,
          password: password,
        );
        
        await user.reauthenticateWithCredential(credential);
        _logger.i('User reauthenticated successfully');
      }
    } on FirebaseAuthException catch (e) {
      _logger.e('Firebase Auth Error: ${e.code} - ${e.message}');
      rethrow;
    } catch (e) {
      _logger.e('Unexpected error during reauthentication: $e');
      rethrow;
    }
  }

  /// Delete user account
  Future<void> deleteAccount() async {
    try {
      emit(AuthState.loading);
      
      User? user = _auth.currentUser;
      if (user != null) {
        // Delete user document from Firestore
        await FirebaseService.deleteDocument(
          collection: AppConstants.usersCollection,
          documentId: user.uid,
        );
        
        // Delete user account
        await user.delete();
        
        // Clear local data
        await StorageService.clearAuthData();
        
        _logger.i('User account deleted successfully');
        emit(AuthState.unauthenticated);
      }
    } on FirebaseAuthException catch (e) {
      _logger.e('Firebase Auth Error: ${e.code} - ${e.message}');
      emit(AuthState.error);
      rethrow;
    } catch (e) {
      _logger.e('Unexpected error during account deletion: $e');
      emit(AuthState.error);
      rethrow;
    }
  }

  /// Get user data from Firestore
  Future<Map<String, dynamic>?> getUserData() async {
    try {
      User? user = _auth.currentUser;
      if (user != null) {
        return await FirebaseService.getDocument(
          collection: AppConstants.usersCollection,
          documentId: user.uid,
        );
      }
      return null;
    } catch (e) {
      _logger.e('Error getting user data: $e');
      rethrow;
    }
  }

  /// Update user data in Firestore
  Future<void> updateUserData(Map<String, dynamic> data) async {
    try {
      User? user = _auth.currentUser;
      if (user != null) {
        await FirebaseService.updateDocument(
          collection: AppConstants.usersCollection,
          documentId: user.uid,
          data: data,
        );
        
        _logger.i('User data updated successfully');
      }
    } catch (e) {
      _logger.e('Error updating user data: $e');
      rethrow;
    }
  }
}