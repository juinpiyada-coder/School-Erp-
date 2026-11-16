import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/branches_screen.dart';
import '../academic/classes_screen.dart';
import '../academic/rooms_screen.dart';
import '../finance/fee_management_screen.dart';
import '../components/common/sidebar.dart';

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: const AppDrawer(),
      appBar: AppTheme.buildAppBar(title: 'Super Admin Dashboard'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF334155)],
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
                    child: Icon(Icons.admin_panel_settings, color: Colors.white, size: 30),
                  ),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Super Administrator', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                        SizedBox(height: 2),
                        Text('Full Platform Oversight & Global Tenancy', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Institutional Metrics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildMetric('Active Branches', '4', Icons.account_tree, AppTheme.primary)),
                const SizedBox(width: 12),
                Expanded(child: _buildMetric('Total Capacity', '2,400', Icons.people, AppTheme.accent)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildMetric('System Health', '99.9%', Icons.health_and_safety, AppTheme.success)),
                const SizedBox(width: 12),
                Expanded(child: _buildMetric('Global Ledger', '₹42.8L', Icons.monetization_on, AppTheme.warning)),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Management Consoles', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildNav(context, 'Branches Management', 'Audit campus locations and branch IDs', Icons.business, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BranchesScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Classes & Divisions', 'Global grades and classroom hierarchy', Icons.school, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassesScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Campus Facilities & Rooms', 'Auditoriums, computer labs, classrooms', Icons.meeting_room, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const RoomsScreen()));
            }),
            const SizedBox(height: 10),
            _buildNav(context, 'Finance & Collections', 'Multi-branch fee structures and collection rates', Icons.payments, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const FeeManagementScreen()));
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildMetric(String label, String value, IconData icon, Color color) {
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

