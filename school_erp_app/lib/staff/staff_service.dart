import 'dart:convert';
import 'package:http/http.dart' as http;
import '../auth/constants.dart';
import '../auth/auth_service.dart';

class StaffService {
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Teachers List
  static Future<Map<String, dynamic>> getTeachers({int page = 1, int limit = 50}) async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/staff/teachers?page=$page&limit=$limit'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Staff Attendance
  static Future<Map<String, dynamic>> getAttendance({String? date}) async {
    try {
      final dateParam = date != null ? '?date=$date' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/staff/attendance$dateParam'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Teacher Subject Mappings
  static Future<Map<String, dynamic>> getSubjectMappings() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/staff/mappings'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Teacher Daily Routine
  static Future<Map<String, dynamic>> getDailyRoutine() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/staff/teachers/routine'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Bulk Upload Faculty
  static Future<Map<String, dynamic>> bulkUploadTeachers(List<Map<String, dynamic>> teachers) async {
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/staff/bulk-upload'),
        headers: await _getHeaders(),
        body: jsonEncode({'teachers': teachers}),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Get Faculty Bulk Upload Template
  static Future<Map<String, dynamic>> getBulkTemplate() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/staff/bulk-template'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }
}

