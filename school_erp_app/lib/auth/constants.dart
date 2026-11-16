import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConstants {
  // Reads the base API URL dynamically from .env.production
  // Key in .env.production: VITE_API_BASE_URL=https://myskool.co.in/SMS/school_be/api
  static String get baseUrl {
    final envUrl = dotenv.env['VITE_API_BASE_URL'];
    if (envUrl != null && envUrl.trim().isNotEmpty) {
      return envUrl.trim();
    }
    return 'https://myskool.co.in/SMS/school_be/api';
  }

  static String get loginEndpoint => '$baseUrl/auth/login';

  // Storage keys
  static const String tokenKey = 'e_school_access_token';
  static const String userKey = 'e_school_user';
}
