import 'dart:convert';
import 'package:http/http.dart' as http;
import '../auth/constants.dart';
import '../auth/auth_service.dart';

class FinanceService {
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Overview metrics
  static Future<Map<String, dynamic>> getOverview({String? branchId}) async {
    try {
      final param = branchId != null ? '?branch_id=$branchId' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/finance/overview$param'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Class Fee Structures
  static Future<Map<String, dynamic>> getClassFees({String? branchId}) async {
    try {
      final param = branchId != null ? '?branch_id=$branchId' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/finance/class-fees$param'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Student Fee Invoices
  static Future<Map<String, dynamic>> getStudentFees({String? branchId}) async {
    try {
      final param = branchId != null ? '?branch_id=$branchId' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/finance/student-fee-maps$param'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Payments Ledger
  static Future<Map<String, dynamic>> getPayments({String? branchId}) async {
    try {
      final param = branchId != null ? '?branch_id=$branchId' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/finance/payments$param'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Penalties and Fines
  static Future<Map<String, dynamic>> getFines({String? branchId}) async {
    try {
      final param = branchId != null ? '?branch_id=$branchId' : '';
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/finance/fines$param'),
        headers: await _getHeaders(),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Create Fee Structure
  static Future<Map<String, dynamic>> createClassFee(Map<String, dynamic> data) async {
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/finance/class-fees'),
        headers: await _getHeaders(),
        body: jsonEncode(data),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Record Payment
  static Future<Map<String, dynamic>> recordPayment(Map<String, dynamic> data) async {
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/finance/payments'),
        headers: await _getHeaders(),
        body: jsonEncode(data),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Create Fine
  static Future<Map<String, dynamic>> createFine(Map<String, dynamic> data) async {
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/finance/fines'),
        headers: await _getHeaders(),
        body: jsonEncode(data),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // Batch Assign Fee Structure
  static Future<Map<String, dynamic>> batchAssign(Map<String, dynamic> data) async {
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/finance/batch-assign'),
        headers: await _getHeaders(),
        body: jsonEncode(data),
      );
      return jsonDecode(res.body);
    } catch (e) {
      return {'status': 'error', 'message': e.toString()};
    }
  }
}

