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

  // School Details
  static Future<Map<String, dynamic>> getSchoolDetails() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academic/schools'),
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

