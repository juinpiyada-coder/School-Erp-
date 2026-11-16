import 'package:flutter/material.dart';
import '../../academic/academic_theme.dart';
import '../../auth/auth_service.dart';
import '../../auth/login_screen.dart';
import '../../academic/academic_menu_screen.dart';
import '../../staff/staff_menu_screen.dart';
import '../../student/student_menu_screen.dart';
import '../../finance/fee_management_screen.dart';
import '../../dashboards/role_dashboard_router.dart';
import '../../common/notifications_screen.dart';
import '../../common/reports_screen.dart';
import '../../common/settings_screen.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppTheme.background,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 50, 20, 20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primary, AppTheme.accent],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: const Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white,
                  child: Icon(Icons.school, color: AppTheme.primary, size: 28),
                ),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'MySkool ERP',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                      Text(
                        'Institutional Portal',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                _buildNavItem(context, Icons.dashboard_outlined, 'Dashboard', () => Navigator.pop(context)),
                _buildNavItem(context, Icons.view_quilt_outlined, 'Role Dashboards', () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const DashboardsMenuScreen()));
                }),
                _buildNavItem(context, Icons.account_balance_outlined, 'Academics', () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AcademicMenuScreen()));
                }),
                _buildNavItem(context, Icons.badge_outlined, 'Staff & Teachers', () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const StaffMenuScreen()));
                }),
                _buildNavItem(context, Icons.people_outline, 'Student Portal', () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const StudentMenuScreen()));
                }),
                _buildNavItem(context, Icons.payments_outlined, 'Finance & Fees', () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const FeeManagementScreen()));
                }),
                const Divider(),
                _buildNavItem(context, Icons.notifications_outlined, 'Notifications', () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
                }),
                _buildNavItem(context, Icons.bar_chart_outlined, 'Reports', () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportsScreen()));
                }),
                _buildNavItem(context, Icons.settings_outlined, 'Settings', () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
                }),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            child: ListTile(
              leading: const Icon(Icons.logout, color: AppTheme.danger),
              title: const Text('Sign Out', style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.bold)),
              onTap: () async {
                await AuthService.logout();
                if (!context.mounted) return;
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.primary, size: 22),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.textPrimary)),
      trailing: const Icon(Icons.chevron_right, size: 16, color: AppTheme.textSecondary),
      onTap: onTap,
    );
  }
}

