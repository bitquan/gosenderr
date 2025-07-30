import 'package:shared_preferences/shared_preferences.dart';
import 'package:hive/hive.dart';
import 'package:logger/logger.dart';
import '../constants/app_constants.dart';

class StorageService {
  static SharedPreferences? _prefs;
  static Box? _box;
  static final Logger _logger = Logger();

  /// Initialize the storage service
  static Future<void> init() async {
    try {
      _prefs = await SharedPreferences.getInstance();
      _box = await Hive.openBox('app_storage');
      _logger.i('Storage service initialized successfully');
    } catch (e) {
      _logger.e('Error initializing storage service: $e');
      rethrow;
    }
  }

  // SharedPreferences methods for simple key-value storage

  /// Save a string value
  static Future<bool> setString(String key, String value) async {
    try {
      return await _prefs?.setString(key, value) ?? false;
    } catch (e) {
      _logger.e('Error saving string for key $key: $e');
      return false;
    }
  }

  /// Get a string value
  static String? getString(String key, {String? defaultValue}) {
    try {
      return _prefs?.getString(key) ?? defaultValue;
    } catch (e) {
      _logger.e('Error getting string for key $key: $e');
      return defaultValue;
    }
  }

  /// Save an integer value
  static Future<bool> setInt(String key, int value) async {
    try {
      return await _prefs?.setInt(key, value) ?? false;
    } catch (e) {
      _logger.e('Error saving int for key $key: $e');
      return false;
    }
  }

  /// Get an integer value
  static int? getInt(String key, {int? defaultValue}) {
    try {
      return _prefs?.getInt(key) ?? defaultValue;
    } catch (e) {
      _logger.e('Error getting int for key $key: $e');
      return defaultValue;
    }
  }

  /// Save a boolean value
  static Future<bool> setBool(String key, bool value) async {
    try {
      return await _prefs?.setBool(key, value) ?? false;
    } catch (e) {
      _logger.e('Error saving bool for key $key: $e');
      return false;
    }
  }

  /// Get a boolean value
  static bool? getBool(String key, {bool? defaultValue}) {
    try {
      return _prefs?.getBool(key) ?? defaultValue;
    } catch (e) {
      _logger.e('Error getting bool for key $key: $e');
      return defaultValue;
    }
  }

  /// Save a double value
  static Future<bool> setDouble(String key, double value) async {
    try {
      return await _prefs?.setDouble(key, value) ?? false;
    } catch (e) {
      _logger.e('Error saving double for key $key: $e');
      return false;
    }
  }

  /// Get a double value
  static double? getDouble(String key, {double? defaultValue}) {
    try {
      return _prefs?.getDouble(key) ?? defaultValue;
    } catch (e) {
      _logger.e('Error getting double for key $key: $e');
      return defaultValue;
    }
  }

  /// Save a list of strings
  static Future<bool> setStringList(String key, List<String> value) async {
    try {
      return await _prefs?.setStringList(key, value) ?? false;
    } catch (e) {
      _logger.e('Error saving string list for key $key: $e');
      return false;
    }
  }

  /// Get a list of strings
  static List<String>? getStringList(String key, {List<String>? defaultValue}) {
    try {
      return _prefs?.getStringList(key) ?? defaultValue;
    } catch (e) {
      _logger.e('Error getting string list for key $key: $e');
      return defaultValue;
    }
  }

  /// Remove a key from SharedPreferences
  static Future<bool> remove(String key) async {
    try {
      return await _prefs?.remove(key) ?? false;
    } catch (e) {
      _logger.e('Error removing key $key: $e');
      return false;
    }
  }

  /// Clear all SharedPreferences data
  static Future<bool> clear() async {
    try {
      return await _prefs?.clear() ?? false;
    } catch (e) {
      _logger.e('Error clearing SharedPreferences: $e');
      return false;
    }
  }

  /// Check if a key exists in SharedPreferences
  static bool containsKey(String key) {
    try {
      return _prefs?.containsKey(key) ?? false;
    } catch (e) {
      _logger.e('Error checking if key $key exists: $e');
      return false;
    }
  }

  // Hive methods for complex object storage

  /// Save an object to Hive
  static Future<void> putObject(String key, dynamic value) async {
    try {
      await _box?.put(key, value);
      _logger.d('Object saved to Hive with key: $key');
    } catch (e) {
      _logger.e('Error saving object to Hive for key $key: $e');
      rethrow;
    }
  }

  /// Get an object from Hive
  static T? getObject<T>(String key, {T? defaultValue}) {
    try {
      return _box?.get(key, defaultValue: defaultValue) as T?;
    } catch (e) {
      _logger.e('Error getting object from Hive for key $key: $e');
      return defaultValue;
    }
  }

  /// Delete an object from Hive
  static Future<void> deleteObject(String key) async {
    try {
      await _box?.delete(key);
      _logger.d('Object deleted from Hive with key: $key');
    } catch (e) {
      _logger.e('Error deleting object from Hive for key $key: $e');
      rethrow;
    }
  }

  /// Check if a key exists in Hive
  static bool containsObjectKey(String key) {
    try {
      return _box?.containsKey(key) ?? false;
    } catch (e) {
      _logger.e('Error checking if object key $key exists in Hive: $e');
      return false;
    }
  }

  /// Clear all Hive data
  static Future<void> clearHive() async {
    try {
      await _box?.clear();
      _logger.i('Hive storage cleared successfully');
    } catch (e) {
      _logger.e('Error clearing Hive storage: $e');
      rethrow;
    }
  }

  // Convenience methods for common app data

  /// Save user role
  static Future<bool> setUserRole(String role) {
    return setString(AppConstants.userRoleKey, role);
  }

  /// Get user role
  static String? getUserRole() {
    return getString(AppConstants.userRoleKey);
  }

  /// Save auth token
  static Future<bool> setAuthToken(String token) {
    return setString(AppConstants.authTokenKey, token);
  }

  /// Get auth token
  static String? getAuthToken() {
    return getString(AppConstants.authTokenKey);
  }

  /// Clear auth data
  static Future<void> clearAuthData() async {
    await remove(AppConstants.authTokenKey);
    await remove(AppConstants.userRoleKey);
    await deleteObject(AppConstants.userDataCacheKey);
  }

  /// Save app settings
  static Future<void> saveAppSettings(Map<String, dynamic> settings) {
    return putObject(AppConstants.settingsCacheKey, settings);
  }

  /// Get app settings
  static Map<String, dynamic>? getAppSettings() {
    return getObject<Map<String, dynamic>>(AppConstants.settingsCacheKey);
  }

  /// Check if this is first launch
  static bool isFirstLaunch() {
    return getBool(AppConstants.isFirstLaunchKey, defaultValue: true) ?? true;
  }

  /// Mark app as launched
  static Future<bool> setFirstLaunchComplete() {
    return setBool(AppConstants.isFirstLaunchKey, false);
  }
}