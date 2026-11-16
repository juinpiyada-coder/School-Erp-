import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/class_schedule_screen.dart';
import '../academic/subjects_screen.dart';
import '../student/student_attendance_screen.dart';
import '../finance/fee_management_screen.dart';
import '../components/common/sidebar.dart';
import '../components/common/header.dart';

class StudentDashboardScreen extends StatelessWidget {
  const StudentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: const AppDrawer(),
      appBar: const AppHeader(
        title: 'Student Learning Space',
        breadcrumbs: ['Home', 'Student Portal'],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF7C3AED), Color(0xFFA78BFA)],
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
                        Text('Student Portal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                        SizedBox(height: 2),
                        Text('Classes, Daily Attendance, & Fee Invoices', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Academic Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('My Attendance', '94.8%', Icons.fact_check, AppTheme.success)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Active Subjects', '6 Enrolled', Icons.book, AppTheme.primary)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Fee Status', 'Up to Date', Icons.verified, AppTheme.accent)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Upcoming Test', 'Fri, 20 Nov', Icons.event_note, AppTheme.warning)),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Student Utilities', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildNav(context, 'My Daily Routine', 'Period timings, subject order, and classroom rooms', Icons.schedule, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassScheduleScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Subject Curriculum & Progress', 'Topics covered and syllabus completion', Icons.menu_book, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const SubjectsScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Attendance Audit Log', 'Monthly presence and absent percentage summary', Icons.fact_check_outlined, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const StudentAttendanceScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Fee Invoices & Receipts', 'Monthly fee invoices and payment history', Icons.receipt_long, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const FeeManagementScreen()));
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

