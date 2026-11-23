import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../auth/auth_service.dart';
import '../auth/user_model.dart';
import '../auth/login_screen.dart';
import 'common_service.dart';
import 'ota_update_service.dart';
import 'shorebird_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _loading = true;
  bool _savingBranding = false;
  bool _savingProfile = false;

  UserModel? user;

  // Profile Form Controllers
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();

  // White Label Controllers
  final _appNameController = TextEditingController(text: 'MySkool ERP');
  String _primaryColor = '#005A9E';
  String _secondaryColor = '#0284C7';

  final List<Map<String, String>> _themePalettes = [
    {'name': 'Institutional Navy', 'primary': '#005A9E', 'secondary': '#0284C7'},
    {'name': 'Emerald Academy', 'primary': '#047857', 'secondary': '#10B981'},
    {'name': 'Royal Indigo', 'primary': '#4338CA', 'secondary': '#6366F1'},
    {'name': 'Slate Prestige', 'primary': '#0F172A', 'secondary': '#334155'},
    {'name': 'Crimson Crest', 'primary': '#991B1B', 'secondary': '#EF4444'},
    {'name': 'Amber Gold', 'primary': '#B45309', 'secondary': '#F59E0B'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadSettingsAndProfile();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _appNameController.dispose();
    super.dispose();
  }

  Future<void> _loadSettingsAndProfile() async {
    setState(() => _loading = true);

    try {
      final currentUser = await AuthService.getCurrentUser();
      final results = await Future.wait([
        CommonService.getProfile(),
        CommonService.getWhiteLabelSettings(bmnId: user?.branchId),
      ]);

      if (!mounted) return;

      final profileRes = results[0];
      final wlRes = results[1];

      setState(() {
        user = currentUser;

        if (profileRes['status'] == 'success' || profileRes['success'] == true) {
          final p = profileRes['data'] ?? {};
          _firstNameController.text = (p['user_first_name'] ?? p['first_name'] ?? user?.name ?? '').toString();
          _lastNameController.text = (p['user_last_name'] ?? p['last_name'] ?? '').toString();
          _emailController.text = (p['user_email_id'] ?? p['email'] ?? user?.email ?? '').toString();
        } else {
          _firstNameController.text = user?.name ?? '';
          _emailController.text = user?.email ?? '';
        }

        if (wlRes['status'] == 'success' || wlRes['success'] == true) {
          final wl = wlRes['data'] ?? {};
          final desc = wl['WL_DESC'] ?? {};
          _appNameController.text = (desc['appName'] ?? wl['app_name'] ?? 'MySkool ERP').toString();
          _primaryColor = (desc['primaryColor'] ?? wl['primary_color'] ?? '#005A9E').toString();
          _secondaryColor = (desc['secondaryColor'] ?? wl['secondary_color'] ?? '#0284C7').toString();
        }

        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _handleSaveBranding() async {
    setState(() => _savingBranding = true);

    final res = await CommonService.saveWhiteLabelSettings(
      appName: _appNameController.text.trim(),
      primaryColor: _primaryColor,
      secondaryColor: _secondaryColor,
    );

    if (!mounted) return;
    setState(() => _savingBranding = false);

    if (!mounted) return;
    if (res['status'] == 'success' || res['success'] == true) {
      // Immediately apply to global AppTheme across the entire app
      await AppTheme.updateTheme(
        primaryHex: _primaryColor,
        secondaryHex: _secondaryColor,
        appNameVal: _appNameController.text.trim(),
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Whitelabel branding updated successfully!')),
      );
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['message'] ?? 'Failed to update whitelabel branding')),
      );
    }
  }

  Future<void> _handleSaveProfile() async {
    setState(() => _savingProfile = true);

    final body = {
      'user_first_name': _firstNameController.text.trim(),
      'user_last_name': _lastNameController.text.trim(),
      'user_email_id': _emailController.text.trim(),
    };

    final res = await CommonService.updateProfile(body);

    if (!mounted) return;
    setState(() => _savingProfile = false);

    if (res['status'] == 'success' || res['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile details updated successfully!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['message'] ?? 'Failed to update profile')),
      );
    }
  }

  Color _parseColor(String hex) {
    try {
      final clean = hex.replaceAll('#', '');
      return Color(int.parse('0xFF$clean'));
    } catch (_) {
      return AppTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Settings & White Label', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(icon: Icon(Icons.palette_outlined, size: 20), text: 'Branding'),
            Tab(icon: Icon(Icons.person_outline, size: 20), text: 'Profile'),
            Tab(icon: Icon(Icons.system_update_alt, size: 20), text: 'Updates & App'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildBrandingTab(),
                _buildProfileTab(),
                _buildUpdatesAndSessionTab(),
              ],
            ),
    );
  }

  Widget _buildBrandingTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppTheme.cardDecoration,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: _parseColor(_primaryColor).withValues(alpha: 0.12),
                      child: Icon(Icons.palette, color: _parseColor(_primaryColor), size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Institutional Whitelabeling', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          Text('Customize application title, crest, and global themes.', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // App Title
                TextField(
                  controller: _appNameController,
                  decoration: const InputDecoration(
                    labelText: 'Application Branding Title *',
                    hintText: 'e.g. MySkool ERP or DPS Academy',
                    prefixIcon: Icon(Icons.title),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),

                // Primary / Secondary Palettes
                const Text('Choose Portal Color Theme', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _themePalettes.map((p) {
                    final isSel = _primaryColor.toUpperCase() == p['primary']!.toUpperCase();
                    final color = _parseColor(p['primary']!);

                    return InkWell(
                      onTap: () {
                        setState(() {
                          _primaryColor = p['primary']!;
                          _secondaryColor = p['secondary']!;
                        });
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSel ? color.withValues(alpha: 0.1) : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSel ? color : Colors.grey.shade300,
                            width: isSel ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircleAvatar(radius: 8, backgroundColor: color),
                            const SizedBox(width: 8),
                            Text(
                              p['name']!,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                                color: isSel ? color : AppTheme.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),

                // Save Branding Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    icon: _savingBranding
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.save),
                    label: Text(_savingBranding ? 'Saving Whitelabel...' : 'Save Whitelabel Settings'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _parseColor(_primaryColor),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _savingBranding ? null : _handleSaveBranding,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: AppTheme.cardDecoration,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.primaryLight,
                  child: Icon(Icons.person, color: AppTheme.primary, size: 22),
                ),
                SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('User Profile & Credentials', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('Update contact information and name.', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // First Name
            TextField(
              controller: _firstNameController,
              decoration: const InputDecoration(
                labelText: 'First Name *',
                prefixIcon: Icon(Icons.badge_outlined),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),

            // Last Name
            TextField(
              controller: _lastNameController,
              decoration: const InputDecoration(
                labelText: 'Last Name',
                prefixIcon: Icon(Icons.person_outline),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),

            // Email
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email Address *',
                prefixIcon: Icon(Icons.email_outlined),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),

            // Save Profile Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                icon: _savingProfile
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save),
                label: Text(_savingProfile ? 'Updating Profile...' : 'Save Profile Changes'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _savingProfile ? null : _handleSaveProfile,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUpdatesAndSessionTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // OTA Update Section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppTheme.cardDecoration,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: Color(0xFFEFF6FF),
                      child: Icon(Icons.system_update_alt, color: AppTheme.primary, size: 20),
                    ),
                    SizedBox(width: 10),
                    Text(
                      'Over-The-Air (OTA) Updates',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Instantly install the latest institutional APK release package without manual store downloads.',
                  style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    const Text(
                      'Installed Version: ',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('v1.0.0+1 (Stable)', style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.cloud_download_outlined, size: 18),
                    label: const Text('Check & Install OTA Update', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      side: const BorderSide(color: AppTheme.primary),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () {
                      OtaUpdateService.triggerUpdate(
                        context: context,
                        apkUrl: 'https://myskool.co.in/SMS/school_be/updates/app-release.apk',
                      );
                    },
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.bolt, size: 18),
                    label: const Text('Check Shorebird CodePush Patch', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () {
                      ShorebirdUpdateService.checkAndApplyUpdate(context: context);
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Sign Out Console
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppTheme.cardDecoration,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Account Session',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final nav = Navigator.of(context);
                      await AuthService.logout();
                      nav.pushAndRemoveUntil(
                        MaterialPageRoute(builder: (context) => const LoginScreen()),
                        (route) => false,
                      );
                    },
                    icon: const Icon(Icons.logout),
                    label: const Text('Sign Out of Application'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.danger,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
