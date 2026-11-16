import 'dart:convert';
import 'package:http/http.dart' as http;
import '../auth/constants.dart';
import '../auth/auth_service.dart';

class AcademicService {
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // School Details & Schools Roster
  static Future<Map<String, dynamic>> getSchoolDetails() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/auth/school'),
        headers: await _getHeaders(),
      );
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
      // Fallback endpoint if /auth/school fails
      final fallback = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/schools'),
        headers: await _getHeaders(),
      );
      return jsonDecode(fallback.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Save / Update School Center
  static Future<Map<String, dynamic>> saveSchool(Map<String, dynamic> data, {String? schoolId}) async {
    try {
      final isEdit = schoolId != null && schoolId.isNotEmpty;
      final url = isEdit
          ? '${AppConstants.baseUrl}/auth/school/$schoolId'
          : '${AppConstants.baseUrl}/auth/school';
      final res = isEdit
          ? await http.put(Uri.parse(url), headers: await _getHeaders(), body: jsonEncode(data))
          : await http.post(Uri.parse(url), headers: await _getHeaders(), body: jsonEncode(data));
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Delete School Center
  static Future<Map<String, dynamic>> deleteSchool(String schoolId) async {
    try {
      final res = await http.delete(
        Uri.parse('${AppConstants.baseUrl}/auth/school/$schoolId'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Boards Catalog
  static Future<Map<String, dynamic>> getBoards() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/boards'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Branches
  static Future<Map<String, dynamic>> getBranches() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/branches'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Classes
  static Future<Map<String, dynamic>> getClasses() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/classes'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Class Sessions & Sections
  static Future<Map<String, dynamic>> getClassSessions() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/class-sessions'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Subjects
  static Future<Map<String, dynamic>> getSubjects() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/subjects'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Rooms
  static Future<Map<String, dynamic>> getRooms() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/rooms'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Class Schedule Routine
  static Future<Map<String, dynamic>> getSchedule() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/schedule'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Class Schedule Matrix
  static Future<Map<String, dynamic>> getMatrix() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/matrix'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }
}

