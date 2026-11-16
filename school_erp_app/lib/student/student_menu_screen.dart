import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import 'students_screen.dart';
import 'parents_screen.dart';
import 'student_attendance_screen.dart';

class StudentMenuScreen extends StatelessWidget {
  const StudentMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> menuItems = [
      {
        'title': 'Students Directory',
        'subtitle': 'Manage enrolled students, admission details & roll numbers',
        'icon': Icons.people_outline,
        'page': const StudentsScreen(),
        'color': AppTheme.primary,
      },
      {
        'title': 'Parents & Guardians',
        'subtitle': 'Guardian contacts, emergency numbers, and relations',
        'icon': Icons.family_restroom_outlined,
        'page': const ParentsScreen(),
        'color': AppTheme.accent,
      },
      {
        'title': 'Student Attendance',
        'subtitle': 'Daily roll-call attendance tracking and records',
        'icon': Icons.checklist_outlined,
        'page': const StudentAttendanceScreen(),
        'color': AppTheme.success,
      },
    ];

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(title: 'Student Portal'),
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

