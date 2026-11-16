import 'package:flutter/material.dart';
import 'academic_theme.dart';
import 'school_details_screen.dart';
import 'branches_screen.dart';
import 'classes_screen.dart';
import 'class_sessions_screen.dart';
import 'subjects_screen.dart';
import 'rooms_screen.dart';
import 'class_schedule_screen.dart';
import 'class_matrix_screen.dart';

class AcademicMenuScreen extends StatelessWidget {
  const AcademicMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> menuItems = [
      {
        'title': 'School Details',
        'subtitle': 'Institutional profile and contact data',
        'icon': Icons.account_balance_outlined,
        'page': const SchoolDetailsScreen(),
        'color': AppTheme.primary,
      },
      {
        'title': 'Associate Branches',
        'subtitle': 'Multi-campus directory & branch codes',
        'icon': Icons.account_tree_outlined,
        'page': const BranchesScreen(),
        'color': AppTheme.accent,
      },
      {
        'title': 'Classes',
        'subtitle': 'Standard classes, grades, and sequence',
        'icon': Icons.class_outlined,
        'page': const ClassesScreen(),
        'color': AppTheme.primary,
      },
      {
        'title': 'Sessions & Sections',
        'subtitle': 'Academic batches and section mappings',
        'icon': Icons.groups_outlined,
        'page': const ClassSessionsScreen(),
        'color': AppTheme.accent,
      },
      {
        'title': 'Subjects',
        'subtitle': 'Course catalog and subject codes',
        'icon': Icons.menu_book_outlined,
        'page': const SubjectsScreen(),
        'color': AppTheme.warning,
      },
      {
        'title': 'Rooms & Facilities',
        'subtitle': 'Classrooms, science labs, and halls',
        'icon': Icons.meeting_room_outlined,
        'page': const RoomsScreen(),
        'color': AppTheme.success,
      },
      {
        'title': 'Class Schedule',
        'subtitle': 'Master timetable routine and periods',
        'icon': Icons.calendar_today_outlined,
        'page': const ClassScheduleScreen(),
        'color': AppTheme.primary,
      },
      {
        'title': 'Schedule Matrix',
        'subtitle': 'Period breakdown and allocations',
        'icon': Icons.grid_view_outlined,
        'page': const ClassMatrixScreen(),
        'color': AppTheme.accent,
      },
    ];

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(title: 'Academic Management'),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: menuItems.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = menuItems[index];
          final Color itemColor = item['color'] as Color;

          return Container(
            decoration: AppTheme.cardDecoration,
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: itemColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(item['icon'] as IconData, color: itemColor),
              ),
              title: Text(
                item['title'] as String,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: AppTheme.textPrimary,
                ),
              ),
              subtitle: Text(
                item['subtitle'] as String,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => item['page'] as Widget),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

