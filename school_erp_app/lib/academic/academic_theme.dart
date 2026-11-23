import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../common/common_service.dart';

class AppTheme extends ChangeNotifier {
  // Singleton instance
  static final AppTheme _instance = AppTheme._internal();
  factory AppTheme() => _instance;
  AppTheme._internal();

  static const String _prefKeyTheme = 'qubix_whitelabel_theme';

  // Constant Brand Color Palette (Allows `const` expressions across all screens)
  static const Color primary = Color(0xFF005A9E);
  static const Color primaryDark = Color(0xFF003D6B);
  static const Color primaryLight = Color(0xFFEBF5FF);
  static const Color accent = Color(0xFF0284C7);

  // Constant Semantic / Neutral colors
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);

  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color border = Color(0xFFE2E8F0);

  // Dynamic Whitelabel Overrides
  static Color _livePrimary = primary;
  static Color _liveAccent = accent;
  static String _liveAppName = 'MySkool ERP';

  static Color get livePrimary => _livePrimary;
  static Color get liveAccent => _liveAccent;
  static String get liveAppName => _liveAppName;

  // Reusable Card Decoration
  static const BoxDecoration cardDecoration = BoxDecoration(
    color: surface,
    borderRadius: BorderRadius.all(Radius.circular(16)),
    border: Border.fromBorderSide(BorderSide(color: border)),
    boxShadow: [
      BoxShadow(
        color: Color(0x08000000),
        blurRadius: 10,
        offset: Offset(0, 4),
      ),
    ],
  );

  // App Bar Builder
  static AppBar buildAppBar({
    required String title,
    List<Widget>? actions,
    PreferredSizeWidget? bottom,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return AppBar(
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
      ),
      backgroundColor: backgroundColor ?? _livePrimary,
      foregroundColor: foregroundColor ?? Colors.white,
      elevation: 0,
      centerTitle: false,
      actions: actions,
      bottom: bottom,
    );
  }

  // Color helper
  static Color parseColor(String hex, {Color fallback = primary}) {
    try {
      final clean = hex.replaceAll('#', '').trim();
      if (clean.length == 6) {
        return Color(int.parse('0xFF$clean'));
      } else if (clean.length == 8) {
        return Color(int.parse('0x$clean'));
      }
      return fallback;
    } catch (_) {
      return fallback;
    }
  }

  // Initialize theme from cache on app startup
  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(_prefKeyTheme);
      if (cached != null) {
        final map = jsonDecode(cached) as Map<String, dynamic>;
        _applyColorValues(
          primaryHex: map['primaryColor'],
          secondaryHex: map['secondaryColor'],
          appNameVal: map['appName'],
          notify: false,
        );
      }
    } catch (_) {}
  }

  // Fetch live whitelabel theme from server and cache it
  static Future<void> syncWithServer({String? bmnId, String? brnId}) async {
    try {
      final res = await CommonService.getWhiteLabelSettings(bmnId: bmnId, brnId: brnId);
      if (res['status'] == 'success' || res['success'] == true) {
        final data = res['data'] ?? {};
        final desc = data['WL_DESC'] ?? {};
        final prim = desc['primaryColor'] ?? data['primary_color'];
        final sec = desc['secondaryColor'] ?? data['secondary_color'];
        final name = desc['appName'] ?? data['app_name'];

        if (prim != null) {
          await updateTheme(
            primaryHex: prim.toString(),
            secondaryHex: sec?.toString(),
            appNameVal: name?.toString(),
          );
        }
      }
    } catch (_) {}
  }

  // Update theme colors dynamically and notify all listeners
  static Future<void> updateTheme({
    required String primaryHex,
    String? secondaryHex,
    String? appNameVal,
  }) async {
    _applyColorValues(
      primaryHex: primaryHex,
      secondaryHex: secondaryHex,
      appNameVal: appNameVal,
      notify: true,
    );

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKeyTheme, jsonEncode({
        'primaryColor': primaryHex,
        'secondaryColor': secondaryHex ?? '#0284C7',
        'appName': appNameVal ?? _liveAppName,
      }));
    } catch (_) {}
  }

  static void _applyColorValues({
    required String? primaryHex,
    String? secondaryHex,
    String? appNameVal,
    bool notify = true,
  }) {
    if (primaryHex != null && primaryHex.isNotEmpty) {
      _livePrimary = parseColor(primaryHex, fallback: primary);
    }
    if (secondaryHex != null && secondaryHex.isNotEmpty) {
      _liveAccent = parseColor(secondaryHex, fallback: accent);
    }
    if (appNameVal != null && appNameVal.isNotEmpty) {
      _liveAppName = appNameVal;
    }

    if (notify) {
      _instance.notifyListeners();
    }
  }
}
