import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import 'teachers_screen.dart';
import 'attendance_screen.dart';

class StaffMenuScreen extends StatelessWidget {
  const StaffMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> menuItems = [
      {
        'title': 'Faculty & Teachers Directory',
        'subtitle': 'Manage teachers, staff profiles, and contacts',
        'icon': Icons.badge_outlined,
        'page': const TeachersScreen(),
        'color': AppTheme.primary,
      },
      {
        'title': 'Staff Daily Attendance',
        'subtitle': 'Mark and inspect teacher attendance logs',
        'icon': Icons.checklist_rtl_outlined,
        'page': const AttendanceScreen(),
        'color': AppTheme.success,
      },
    ];

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(title: 'Staff Management'),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: menuItems.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = menuItems[index];
          final Color color = item['color'] as Color;

          return Container(
            decoration: AppTheme.cardDecoration,
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: Icon(item['icon'] as IconData, color: color),
              ),
              title: Text(item['title'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              subtitle: Text(item['subtitle'] as String, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => item['page'] as Widget));
              },
            ),
          );
        },
      ),
    );
  }
}

