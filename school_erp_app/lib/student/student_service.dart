import 'dart:convert';
import 'package:http/http.dart' as http;
import '../auth/constants.dart';
import '../auth/auth_service.dart';

class StudentService {
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Students Directory
  static Future<Map<String, dynamic>> getStudents({int page = 1, int limit = 50}) async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/student/students?page=$page&limit=$limit'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Parents Directory
  static Future<Map<String, dynamic>> getParents() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/student/parents'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Student Attendance
  static Future<Map<String, dynamic>> getAttendance({String? date}) async {
    try {
      final dateParam = date != null ? '?date=$date' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/student/attendance$dateParam'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }
}

