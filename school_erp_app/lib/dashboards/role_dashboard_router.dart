import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../auth/user_model.dart';

class RoleDashboardRouter extends StatelessWidget {
  final UserModel user;

  const RoleDashboardRouter({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    final role = user.roleCode.toUpperCase();

    // Map according to school_ui role definitions
    String roleTitle = 'Institutional Dashboard';
    List<Map<String, dynamic>> roleActions = [];

    if (role.contains('TEACHER')) {
      roleTitle = 'Teacher Faculty Portal';
      roleActions = [
        {'title': 'My Daily Schedule', 'icon': Icons.schedule, 'color': AppTheme.primary},
        {'title': 'Class Attendance', 'icon': Icons.checklist, 'color': AppTheme.success},
        {'title': 'Subject Coverage', 'icon': Icons.menu_book, 'color': AppTheme.accent},
      ];
    } else if (role.contains('STUDENT')) {
      roleTitle = 'Student Learning Space';
      roleActions = [
        {'title': 'My Timetable', 'icon': Icons.calendar_month, 'color': AppTheme.primary},
        {'title': 'Attendance Report', 'icon': Icons.fact_check, 'color': AppTheme.success},
        {'title': 'Fee Invoices', 'icon': Icons.receipt, 'color': AppTheme.warning},
      ];
    } else if (role.contains('PARENT') || role.contains('GUARDIAN')) {
      roleTitle = 'Parent / Guardian Portal';
      roleActions = [
        {'title': 'Ward Daily Routine', 'icon': Icons.schedule, 'color': AppTheme.primary},
        {'title': 'Attendance Overview', 'icon': Icons.check_circle_outline, 'color': AppTheme.success},
        {'title': 'Due Fee Statements', 'icon': Icons.payments_outlined, 'color': AppTheme.danger},
      ];
    } else if (role.contains('BRANCH')) {
      roleTitle = 'Branch Executive Console';
      roleActions = [
        {'title': 'Branch Rooms & Classes', 'icon': Icons.door_front_door_outlined, 'color': AppTheme.primary},
        {'title': 'Staff Attendance', 'icon': Icons.badge_outlined, 'color': AppTheme.accent},
        {'title': 'Collections & Ledger', 'icon': Icons.monetization_on_outlined, 'color': AppTheme.success},
      ];
    } else {
      roleTitle = 'Headquarters Admin Console';
      roleActions = [
        {'title': 'Multi-Campus Matrix', 'icon': Icons.hub_outlined, 'color': AppTheme.primary},
        {'title': 'Faculty Management', 'icon': Icons.groups_outlined, 'color': AppTheme.accent},
        {'title': 'Consolidated Financials', 'icon': Icons.account_balance_outlined, 'color': AppTheme.success},
      ];
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(title: roleTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: AppTheme.cardDecoration,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: AppTheme.primaryLight,
                    child: const Icon(Icons.person, color: AppTheme.primary, size: 30),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user.name.isNotEmpty ? user.name : 'Welcome', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                        const SizedBox(height: 2),
                        Text('Role: ${user.roleCode} • ${user.branchName ?? 'Branch User'}', style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Dedicated Role Actions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: roleActions.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final action = roleActions[index];
                final color = action['color'] as Color;

                return Container(
                  decoration: AppTheme.cardDecoration,
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Icon(action['icon'] as IconData, color: color),
                    ),
                    title: Text(action['title'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
                    onTap: () {},
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

