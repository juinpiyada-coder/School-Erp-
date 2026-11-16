import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/class_schedule_screen.dart';
import '../student/student_attendance_screen.dart';
import '../finance/fee_management_screen.dart';
import '../common/notifications_screen.dart';
import '../components/common/sidebar.dart';

class GuardianDashboardScreen extends StatelessWidget {
  const GuardianDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: const AppDrawer(),
      appBar: AppTheme.buildAppBar(title: 'Parent & Guardian Portal'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFEA580C), Color(0xFFFB923C)],
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
                    child: Icon(Icons.family_restroom, color: Colors.white, size: 30),
                  ),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Parent / Guardian Space', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                        SizedBox(height: 2),
                        Text('Track your child\'s attendance, routine, and school fees', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Ward Academic Progress', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Ward Attendance', '96.2%', Icons.check_circle_outline, AppTheme.success)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Current Term', 'Term 2 (2026)', Icons.calendar_month, AppTheme.primary)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Due Statement', '₹0 Pending', Icons.verified, AppTheme.accent)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('School Notices', '2 New Circulars', Icons.mark_email_unread, AppTheme.warning)),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Parent Services', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildNav(context, 'Ward Daily Schedule', 'Check what your child is studying today period by period', Icons.schedule, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassScheduleScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Daily Attendance Ledger', 'Live presence and absenteeism records', Icons.fact_check, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const StudentAttendanceScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Fee Invoices & Receipts', 'View invoices and counter payment receipts', Icons.payments_outlined, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const FeeManagementScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Official School Broadcasts', 'Announcements, exam dates, and circulars', Icons.campaign_outlined, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
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

