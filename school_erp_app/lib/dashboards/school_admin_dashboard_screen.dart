import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/branches_screen.dart';
import '../academic/class_schedule_screen.dart';
import '../staff/teachers_screen.dart';
import '../finance/fee_management_screen.dart';
import '../components/common/sidebar.dart';

class SchoolAdminDashboardScreen extends StatelessWidget {
  const SchoolAdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: const AppDrawer(),
      appBar: AppTheme.buildAppBar(title: 'School Admin Dashboard'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, AppTheme.accent],
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
                    child: Icon(Icons.account_balance, color: Colors.white, size: 30),
                  ),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('School Administration', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                        SizedBox(height: 2),
                        Text('Institutional & Branch Operations', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Academic Overview', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Students', '1,250', Icons.people_outline, AppTheme.primary)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Teachers', '84', Icons.badge_outlined, AppTheme.accent)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildCard('Classes', '36', Icons.class_outlined, AppTheme.warning)),
                const SizedBox(width: 12),
                Expanded(child: _buildCard('Branches', '4', Icons.apartment, AppTheme.success)),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Quick Administrative Actions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildNav(context, 'Associate Branches', 'Manage branch centers and locations', Icons.apartment, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BranchesScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Faculty Registry', 'Staff directory and teaching allocations', Icons.badge_outlined, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const TeachersScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Master Class Timetable', 'Class routines and schedule matrix', Icons.calendar_month, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassScheduleScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Fee Administration', 'Fee structures, invoices, and penalties', Icons.payments_outlined, () {
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

