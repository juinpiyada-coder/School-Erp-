import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'constants.dart';
import 'user_model.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();

  /// Perform login request to the School ERP backend
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse(AppConstants.loginEndpoint),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'email': email.trim(),
          'password': password,
        }),
      );

      final dynamic responseData = jsonDecode(response.body);
      final isSuccess = response.statusCode == 200 &&
          (responseData['status'] == 'success' || responseData['success'] == true);

      if (isSuccess) {
        final data = responseData['data'] ?? responseData;
        final accessToken = data['access_token'] ?? '';
        final userData = data['user'] ?? {};

        // Persist token and user details
        await _storage.write(key: AppConstants.tokenKey, value: accessToken);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.userKey, jsonEncode(userData));

        return {
          'success': true,
          'user': UserModel.fromJson(userData),
          'token': accessToken,
          'message': responseData['message'] ?? 'Login successful',
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Invalid credentials. Please verify your email and password.',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Unable to connect to school server. Please check your internet connection.',
      };
    }
  }

  /// Get currently logged in user
  static Future<UserModel?> getCurrentUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userString = prefs.getString(AppConstants.userKey);
      if (userString != null) {
        return UserModel.fromJson(jsonDecode(userString));
      }
    } catch (_) {}
    return null;
  }

  /// Get active authentication token
  static Future<String?> getToken() async {
    return await _storage.read(key: AppConstants.tokenKey);
  }

  /// Logout and clear saved session
  static Future<void> logout() async {
    await _storage.delete(key: AppConstants.tokenKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.userKey);
  }
}

