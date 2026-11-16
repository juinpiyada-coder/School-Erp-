import 'package:flutter/material.dart';
import '../../academic/academic_theme.dart';
import '../../auth/auth_service.dart';
import '../../auth/user_model.dart';
import '../../auth/login_screen.dart';
import '../../common/notifications_screen.dart';
import '../../common/settings_screen.dart';

/// AppHeader matches the school_ui WebApp Header.jsx.
/// It renders:
/// 1. Menu hamburger toggle
/// 2. Active Screen Title and Dynamic Breadcrumb
/// 3. Notification alert badge with navigation
/// 4. Current Logged-In User Profile card with Role Badge and Quick Sign Out modal
class AppHeader extends StatefulWidget implements PreferredSizeWidget {
  final String title;
  final List<String>? breadcrumbs;
  final List<Widget>? extraActions;

  const AppHeader({
    super.key,
    required this.title,
    this.breadcrumbs,
    this.extraActions,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  State<AppHeader> createState() => _AppHeaderState();

  /// Time-based greeting utility matching timeGreeting.js
  static String getGreeting() {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  }
}

class _AppHeaderState extends State<AppHeader> {
  UserModel? _user;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await AuthService.getCurrentUser();
    if (mounted) {
      setState(() => _user = user);
    }
  }

  void _showUserMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final userName = _user?.name.isNotEmpty == true ? _user!.name : 'User Account';
        final userEmail = _user?.email.isNotEmpty == true ? _user!.email : 'Logged In';
        final userRole = _user?.roleCode.isNotEmpty == true ? _user!.roleCode : 'MEMBER';
        final initial = userName.isNotEmpty ? userName[0].toUpperCase() : 'U';

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Bottomsheet drag handle
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // User Info Row
              Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: AppTheme.primary,
                    child: Text(
                      initial,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          userName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          userEmail,
                          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryLight,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            userRole,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Divider(color: AppTheme.border),

              // Menu Navigation Actions
              ListTile(
                leading: const Icon(Icons.settings_outlined, color: AppTheme.primary),
                title: const Text('Portal Settings & Whitelabel', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
                },
              ),
              ListTile(
                leading: const Icon(Icons.notifications_none_outlined, color: AppTheme.primary),
                title: const Text('Notifications & Alerts', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
                },
              ),

              const SizedBox(height: 10),

              // Sign Out Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFEF2F2),
                    foregroundColor: AppTheme.danger,
                    elevation: 0,
                    side: const BorderSide(color: Color(0xFFFECACA)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    Navigator.pop(ctx);
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
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final userName = _user?.name.isNotEmpty == true ? _user!.name : '';
    final initial = userName.isNotEmpty ? userName[0].toUpperCase() : 'U';

    return AppBar(
      backgroundColor: AppTheme.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
          ),
          if (widget.breadcrumbs != null && widget.breadcrumbs!.isNotEmpty)
            Text(
              widget.breadcrumbs!.join('  ›  '),
              style: const TextStyle(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.normal),
            ),
        ],
      ),
      actions: [
        if (widget.extraActions != null) ...widget.extraActions!,

        // Notifications Bell
        IconButton(
          icon: const Icon(Icons.notifications_outlined, size: 22),
          tooltip: 'Notifications',
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          ),
        ),

        // User Login Profile Avatar Trigger
        Padding(
          padding: const EdgeInsets.only(right: 12, left: 4),
          child: InkWell(
            onTap: () => _showUserMenu(context),
            borderRadius: BorderRadius.circular(20),
            child: CircleAvatar(
              radius: 17,
              backgroundColor: Colors.white,
              child: CircleAvatar(
                radius: 15,
                backgroundColor: AppTheme.primaryLight,
                child: Text(
                  initial,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primary,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

