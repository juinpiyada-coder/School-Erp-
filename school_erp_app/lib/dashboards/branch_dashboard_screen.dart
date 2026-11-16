import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/rooms_screen.dart';
import '../staff/attendance_screen.dart';
import '../student/students_screen.dart';
import '../finance/fee_management_screen.dart';
import '../components/common/sidebar.dart';

class BranchDashboardScreen extends StatelessWidget {
  const BranchDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: const AppDrawer(),
      appBar: AppTheme.buildAppBar(title: 'Branch Executive Dashboard'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F766E), Color(0xFF14B8A6)],
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
                    child: Icon(Icons.storefront, color: Colors.white, size: 30),
                  ),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Branch Operations', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                        SizedBox(height: 2),
                        Text('Campus-Level Facility & Student Administration', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Branch Performance Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Branch Students', '320', Icons.school, AppTheme.primary)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Campus Staff', '24', Icons.badge, AppTheme.accent)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Daily Attendance', '96.4%', Icons.fact_check, AppTheme.success)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Fee Collected', '₹11.2L', Icons.monetization_on, AppTheme.warning)),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Branch Management Consoles', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildNav(context, 'Campus Classrooms & Rooms', 'Rooms capacity, science labs and facilities', Icons.meeting_room, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const RoomsScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Enrolled Students', 'Branch student profiles and contact registry', Icons.people_outline, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const StudentsScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Faculty Attendance', 'Staff daily check-ins and timekeeping', Icons.checklist_rtl, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Branch Collections & Invoices', 'Monthly branch fee collections and receipts', Icons.receipt_long, () {
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
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildNav(BuildContext context, String title, String sub, IconData icon, VoidCallback onTap) {
    return Container(
      decoration: AppTheme.cardDecoration,
      child: ListTile(
        leading: Icon(icon, color: AppTheme.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        subtitle: Text(sub, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
        onTap: onTap,
      ),
    );
  }
}

