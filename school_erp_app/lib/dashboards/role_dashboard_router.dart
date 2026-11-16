import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../auth/user_model.dart';
import 'admin_dashboard_screen.dart';
import 'school_admin_dashboard_screen.dart';
import 'branch_dashboard_screen.dart';
import 'teacher_dashboard_screen.dart';
import 'student_dashboard_screen.dart';
import 'guardian_dashboard_screen.dart';

class RoleDashboardRouter extends StatelessWidget {
  final UserModel user;

  const RoleDashboardRouter({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    final role = user.roleCode.toUpperCase();

    // 1. Super Admin
    if (role.contains('SUPER') || role == 'R_SUPERADMIN') {
      return const AdminDashboardScreen();
    }

    // 2. School Admin / Executive
    if (role.contains('SCHOOL') || role == 'R_SCHOOLADMIN' || role == 'R_SCHOOLEXECUTIVE') {
      return const SchoolAdminDashboardScreen();
    }

    // 3. Branch Admin / Executive
    if (role.contains('BRANCH') || role == 'R_BRANCHADMIN' || role == 'R_BRANCHEXECUTIVE') {
      return const BranchDashboardScreen();
    }

    // 4. Teacher Faculty
    if (role.contains('TEACHER') || role == 'R_TEACHER') {
      return const TeacherDashboardScreen();
    }

    // 5. Student
    if (role.contains('STUDENT') || role == 'R_STUDENT') {
      return const StudentDashboardScreen();
    }

    // 6. Parent / Guardian
    if (role.contains('PARENT') || role.contains('GUARDIAN') || role == 'R_PARENT' || role == 'R_GUARDIAN') {
      return const GuardianDashboardScreen();
    }

    // Fallback to School Admin Dashboard
    return const SchoolAdminDashboardScreen();
  }
}

class DashboardsMenuScreen extends StatelessWidget {
  const DashboardsMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> dashboards = [
      {
        'title': 'Super Admin Dashboard',
        'subtitle': 'Full multi-campus network and platform oversight',
        'icon': Icons.admin_panel_settings_outlined,
        'page': const AdminDashboardScreen(),
        'color': const Color(0xFF1E293B),
      },
      {
        'title': 'School Admin Dashboard',
        'subtitle': 'School headquarters, academic matrix, and all branches',
        'icon': Icons.account_balance_outlined,
        'page': const SchoolAdminDashboardScreen(),
        'color': AppTheme.primary,
      },
      {
        'title': 'Branch Executive Dashboard',
        'subtitle': 'Campus-specific facilities, classrooms, and daily ops',
        'icon': Icons.storefront_outlined,
        'page': const BranchDashboardScreen(),
        'color': const Color(0xFF0F766E),
      },
      {
        'title': 'Teacher Faculty Dashboard',
        'subtitle': 'Teaching routine, syllabus tracking, and student attendance',
        'icon': Icons.school_outlined,
        'page': const TeacherDashboardScreen(),
        'color': const Color(0xFF2563EB),
      },
      {
        'title': 'Student Dashboard',
        'subtitle': 'My class schedule, attendance ledger, and fee invoices',
        'icon': Icons.person_outline,
        'page': const StudentDashboardScreen(),
        'color': const Color(0xFF7C3AED),
      },
      {
        'title': 'Parent / Guardian Dashboard',
        'subtitle': 'Ward attendance, timetable routine, and fee dues',
        'icon': Icons.family_restroom_outlined,
        'page': const GuardianDashboardScreen(),
        'color': const Color(0xFFEA580C),
      },
    ];

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(title: 'Role-Based Dashboards'),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: dashboards.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = dashboards[index];
          final color = item['color'] as Color;

          return Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            elevation: 1,
            shadowColor: Colors.black12,
            child: ListTile(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
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
