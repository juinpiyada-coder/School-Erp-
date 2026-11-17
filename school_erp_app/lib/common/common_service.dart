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
  static Future<Map<String, dynamic>> getDashboardMetrics({String? branchId}) async {
    try {
      final query = branchId != null && branchId.isNotEmpty ? '?branch_id=$branchId' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/dashboard/overview$query'),
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

  // Reports Overview (Branch & Date aware)
  static Future<Map<String, dynamic>> getReportsOverview({String? branchId}) async {
    try {
      final query = branchId != null && branchId.isNotEmpty ? '?branch_id=$branchId' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/reports/overview$query'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Students by Branch
  static Future<Map<String, dynamic>> getStudentsByBranch() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/reports/students-by-branch'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Teachers by Branch
  static Future<Map<String, dynamic>> getTeachersByBranch() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/reports/teachers-by-branch'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Attendance Teacher Summary
  static Future<Map<String, dynamic>> getAttendanceTeacherSummary({String? date, String? branchId}) async {
    try {
      final params = <String, String>{};
      if (date != null && date.isNotEmpty) params['date'] = date;
      if (branchId != null && branchId.isNotEmpty) params['branch_id'] = branchId;
      final uri = Uri.parse('${AppConstants.baseUrl}/attendance/teacher/summary').replace(queryParameters: params.isEmpty ? null : params);
      final res = await http.get(uri, headers: await _getHeaders());
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Get White Label Settings matching Settings.jsx
  static Future<Map<String, dynamic>> getWhiteLabelSettings({String? bmnId, String? brnId}) async {
    try {
      final queryParams = <String, String>{};
      if (bmnId != null && bmnId.isNotEmpty) queryParams['bmn_id'] = bmnId;
      if (brnId != null && brnId.isNotEmpty) queryParams['brn_id'] = brnId;
      final uri = Uri.parse('${AppConstants.baseUrl}/settings/whitelabel').replace(queryParameters: queryParams.isEmpty ? null : queryParams);
      final res = await http.get(uri, headers: await _getHeaders());
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Save White Label Settings
  static Future<Map<String, dynamic>> saveWhiteLabelSettings({
    String? bmnId,
    String? brnId,
    required String appName,
    required String primaryColor,
    required String secondaryColor,
    String? logoBase64,
    String? bannerBase64,
  }) async {
    try {
      final body = {
        'bmn_id': bmnId,
        'brn_id': brnId,
        'settings': {
          'appName': appName,
          'primaryColor': primaryColor,
          'secondaryColor': secondaryColor,
        },
        'logo_base64': logoBase64,
        'banner_base64': bannerBase64,
      };

      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/settings/whitelabel'),
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // User Profile
  static Future<Map<String, dynamic>> getProfile() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/auth/me'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Update Profile
  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    try {
      final res = await http.put(
        Uri.parse('${AppConstants.baseUrl}/auth/profile'),
        headers: await _getHeaders(),
        body: jsonEncode(data),
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

