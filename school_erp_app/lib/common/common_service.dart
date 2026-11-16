import 'dart:convert';
import 'package:http/http.dart' as http;
import '../auth/constants.dart';
import '../auth/auth_service.dart';

class CommonService {
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Dashboard Stats & Metrics
  static Future<Map<String, dynamic>> getDashboardMetrics() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/dashboard/metrics'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Notifications & Announcements
  static Future<Map<String, dynamic>> getNotifications() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/notifications'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Reports Summary
  static Future<Map<String, dynamic>> getReports() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/reports/summary'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Settings & Whitelabel Configuration
  static Future<Map<String, dynamic>> getSettings() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/settings'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }
}

