import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/class_schedule_screen.dart';
import '../academic/subjects_screen.dart';
import '../student/student_attendance_screen.dart';
import '../components/common/sidebar.dart';

class TeacherDashboardScreen extends StatelessWidget {
  const TeacherDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: const AppDrawer(),
      appBar: AppTheme.buildAppBar(title: 'Teacher Faculty Dashboard'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF2563EB), Color(0xFF60A5FA)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: Colors.white24,
                    child: Icon(Icons.school, color: Colors.white, size: 30),
                  ),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Faculty Portal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                        SizedBox(height: 2),
                        Text('Daily Teaching Routine & Attendance', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text("Today's Schedule & Progress", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Classes Today', '5 Periods', Icons.schedule, AppTheme.primary)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Next Subject', 'Mathematics', Icons.menu_book, AppTheme.accent)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Syllabus Progress', '72%', Icons.trending_up, AppTheme.success)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Pending Roll-Call', 'Class 10-A', Icons.pending_actions, AppTheme.warning)),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Teacher Tools', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildNav(context, 'Mark Student Attendance', 'Daily period and class roll call', Icons.checklist, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const StudentAttendanceScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'My Timetable Routine', 'Master teaching schedule across classrooms', Icons.calendar_today, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassScheduleScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Subjects & Curriculum', 'Subject codes and course curriculum tracking', Icons.menu_book_outlined, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const SubjectsScreen()));
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildNav(BuildContext context, String title, String sub, IconData icon, VoidCallback onTap) {
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
        leading: Icon(icon, color: AppTheme.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        subtitle: Text(sub, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
        onTap: onTap,
      ),
    );
  }
}

