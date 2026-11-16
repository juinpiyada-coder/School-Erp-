import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../academic/academic_theme.dart';
import '../../auth/auth_service.dart';
import '../../auth/constants.dart';
import '../../auth/login_screen.dart';
import '../../auth/user_model.dart';
import '../../auth/role_links_screen.dart';

// Academic screens
import '../../academic/branches_screen.dart';
import '../../academic/classes_screen.dart';
import '../../academic/class_matrix_screen.dart';
import '../../academic/class_schedule_screen.dart';
import '../../academic/class_sessions_screen.dart';
import '../../academic/rooms_screen.dart';
import '../../academic/school_details_screen.dart';
import '../../academic/subjects_screen.dart';

// Staff & Faculty screens
import '../../staff/attendance_screen.dart';
import '../../staff/teachers_screen.dart';

// Student screens
import '../../student/parents_screen.dart';
import '../../student/student_attendance_screen.dart';
import '../../student/students_screen.dart';

// Finance screens
import '../../finance/fee_management_screen.dart';

// Common & Dashboard screens
import '../../common/notifications_screen.dart';
import '../../common/reports_screen.dart';
import '../../common/settings_screen.dart';
import '../../dashboards/role_dashboard_router.dart';
import '../../dashboards/admin_dashboard_screen.dart';
import '../../dashboards/school_admin_dashboard_screen.dart';
import '../../dashboards/branch_dashboard_screen.dart';
import '../../dashboards/teacher_dashboard_screen.dart';
import '../../dashboards/student_dashboard_screen.dart';
import '../../dashboards/guardian_dashboard_screen.dart';

class DynamicNavItem {
  final String title;
  final String url;
  final IconData icon;
  final Widget Function(BuildContext) builder;

  DynamicNavItem({
    required this.title,
    required this.url,
    required this.icon,
    required this.builder,
  });
}

class DynamicNavSection {
  final String label;
  final List<DynamicNavItem> items;

  DynamicNavSection({
    required this.label,
    required this.items,
  });
}

class AppDrawer extends StatefulWidget {
  const AppDrawer({super.key});

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  UserModel? _user;
  List<DynamicNavSection> _navSections = [];
  bool _loading = true;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadUserAndNav();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadUserAndNav() async {
    final user = await AuthService.getCurrentUser();
    if (!mounted) return;

    setState(() {
      _user = user;
    });

    if (user != null) {
      await _fetchRoleLinks(user);
    } else {
      setState(() {
        _navSections = _getFallbackSections('R_SUPERADMIN');
        _loading = false;
      });
    }
  }

  IconData _resolveIcon(String url, String label) {
    final text = '${url.toLowerCase()} ${label.toLowerCase()}';
    if (text.contains('dash') || text.contains('home')) return Icons.home_outlined;
    if (text.contains('branch')) return Icons.account_tree_outlined;
    if (text.contains('school') || text.contains('institution')) return Icons.account_balance_outlined;
    if (text.contains('class') || text.contains('division')) return Icons.meeting_room_outlined;
    if (text.contains('room') || text.contains('facility')) return Icons.door_front_door_outlined;
    if (text.contains('session') || text.contains('section')) return Icons.calendar_today_outlined;
    if (text.contains('subject') || text.contains('syllabus')) return Icons.book_outlined;
    if (text.contains('teacher') || text.contains('faculty')) return Icons.school_outlined;
    if (text.contains('parent') || text.contains('guardian')) return Icons.family_restroom_outlined;
    if (text.contains('student') || text.contains('pupil')) return Icons.person_outline;
    if (text.contains('fee') || text.contains('payment') || text.contains('financ')) return Icons.payments_outlined;
    if (text.contains('attend') || text.contains('leave')) return Icons.how_to_reg_outlined;
    if (text.contains('sched') || text.contains('routine') || text.contains('matrix')) return Icons.schedule_outlined;
    if (text.contains('report') || text.contains('chart') || text.contains('analytic')) return Icons.bar_chart_outlined;
    if (text.contains('notif') || text.contains('alert') || text.contains('announc')) return Icons.notifications_none_outlined;
    if (text.contains('sett') || text.contains('profile')) return Icons.settings_outlined;
    if (text.contains('role') || text.contains('lock') || text.contains('access')) return Icons.lock_outline;
    return Icons.menu_book_outlined;
  }

  Widget Function(BuildContext) _resolveScreenBuilder(String url) {
    final norm = url.trim().toLowerCase();
    if (norm == '/' || norm == '/dashboard') {
      return (ctx) => _user != null ? RoleDashboardRouter(user: _user!) : const AdminDashboardScreen();
    }
    if (norm.contains('role-link') || norm.contains('role_link') || (norm.contains('role') && norm.contains('link'))) {
      return (ctx) => const RoleLinksScreen();
    }
    if (norm.contains('branch')) return (ctx) => const BranchesScreen();
    if (norm.contains('matrix')) return (ctx) => const ClassMatrixScreen();
    if (norm.contains('session')) return (ctx) => const ClassSessionsScreen();
    if (norm.contains('schedule') || norm.contains('routine')) return (ctx) => const ClassScheduleScreen();
    if (norm.contains('class')) return (ctx) => const ClassesScreen();
    if (norm.contains('room')) return (ctx) => const RoomsScreen();
    if (norm.contains('detail')) return (ctx) => const SchoolDetailsScreen();
    if (norm.contains('subject')) return (ctx) => const SubjectsScreen();
    if (norm.contains('fee')) return (ctx) => const FeeManagementScreen();
    if (norm.contains('teacher') && norm.contains('attend')) return (ctx) => const AttendanceScreen();
    if (norm.contains('teacher')) return (ctx) => const TeachersScreen();
    if (norm.contains('student') && norm.contains('attend')) return (ctx) => const StudentAttendanceScreen();
    if (norm.contains('student')) return (ctx) => const StudentsScreen();
    if (norm.contains('parent')) return (ctx) => const ParentsScreen();
    if (norm.contains('notif')) return (ctx) => const NotificationsScreen();
    if (norm.contains('report')) return (ctx) => const ReportsScreen();
    if (norm.contains('sett') || norm.contains('whitelabel')) return (ctx) => const SettingsScreen();

    // Fallback based on user role dashboard
    return (ctx) => _user != null ? RoleDashboardRouter(user: _user!) : const AdminDashboardScreen();
  }

  Future<void> _fetchRoleLinks(UserModel user) async {
    try {
      final token = await AuthService.getToken();
      final roleCode = user.roleCode.toUpperCase();

      // Request role links from backend API matching WebApp Sidebar.jsx
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/auth/role-links?role_id=$roleCode'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      final dynamic responseData = jsonDecode(res.body);
      final isSuccess = res.statusCode == 200 &&
          (responseData['status'] == 'success' || responseData['success'] == true);

      if (isSuccess) {
        final List<dynamic> items = responseData['data'] is List ? responseData['data'] : [];
        if (items.isNotEmpty) {
          final Map<String, List<DynamicNavItem>> groups = {};
          final List<String> groupOrder = [];

          // Sort by SRL sequence
          items.sort((a, b) {
            final int srlA = int.tryParse(a['SM_RL_LINK_SRL']?.toString() ?? '0') ?? 0;
            final int srlB = int.tryParse(b['SM_RL_LINK_SRL']?.toString() ?? '0') ?? 0;
            return srlA.compareTo(srlB);
          });

          for (final item in items) {
            final status = (item['SM_RL_STATUS'] ?? item['sm_rl_status'] ?? 'ACTIVE').toString().toUpperCase();
            if (status != 'ACTIVE') continue;

            final section = (item['SM_RL_SUBMENU'] ?? item['sm_rl_submenu'] ?? 'Overview').toString();
            final url = (item['SM_RL_LINK_URL'] ?? item['sm_rl_link_url'] ?? '/').toString();
            final label = (item['SM_RL_LINK_DESC'] ?? item['sm_rl_link_desc'] ?? 'Navigation').toString();

            if (!groups.containsKey(section)) {
              groups[section] = [];
              groupOrder.add(section);
            }

            groups[section]!.add(
              DynamicNavItem(
                title: label,
                url: url,
                icon: _resolveIcon(url, label),
                builder: _resolveScreenBuilder(url),
              ),
            );
          }

          if (groups.isNotEmpty) {
            setState(() {
              _navSections = groupOrder.map((sec) => DynamicNavSection(label: sec, items: groups[sec]!)).toList();
              _loading = false;
            });
            return;
          }
        }
      }
    } catch (_) {}

    // Fallback to role-based hardcoded matrix if network fails or DB links are empty
    setState(() {
      _navSections = _getFallbackSections(_user?.roleCode ?? 'R_SUPERADMIN');
      _loading = false;
    });
  }

  List<DynamicNavSection> _getFallbackSections(String roleCode) {
    final role = roleCode.toUpperCase();

    if (role.contains('SUPER')) {
      return [
        DynamicNavSection(label: 'Overview', items: [
          DynamicNavItem(title: 'Super Admin Dashboard', url: '/', icon: Icons.admin_panel_settings_outlined, builder: (_) => const AdminDashboardScreen()),
          DynamicNavItem(title: 'Role Dashboards Switcher', url: '/dashboards', icon: Icons.view_quilt_outlined, builder: (_) => const DashboardsMenuScreen()),
        ]),
        DynamicNavSection(label: 'Academics & Campuses', items: [
          DynamicNavItem(title: 'Branches Management', url: '/school/branches', icon: Icons.business_outlined, builder: (_) => const BranchesScreen()),
          DynamicNavItem(title: 'Class Divisions', url: '/school/classes', icon: Icons.meeting_room_outlined, builder: (_) => const ClassesScreen()),
          DynamicNavItem(title: 'Classroom Facilities', url: '/school/rooms', icon: Icons.door_front_door_outlined, builder: (_) => const RoomsScreen()),
          DynamicNavItem(title: 'Curriculum Subjects', url: '/school/subjects', icon: Icons.book_outlined, builder: (_) => const SubjectsScreen()),
        ]),
        DynamicNavSection(label: 'Finance & Accounts', items: [
          DynamicNavItem(title: 'Fee Management', url: '/finance/fees', icon: Icons.payments_outlined, builder: (_) => const FeeManagementScreen()),
        ]),
        DynamicNavSection(label: 'Staff & Students', items: [
          DynamicNavItem(title: 'Faculty Directory', url: '/teacher/teachers', icon: Icons.school_outlined, builder: (_) => const TeachersScreen()),
          DynamicNavItem(title: 'Students Directory', url: '/student/students', icon: Icons.people_outline, builder: (_) => const StudentsScreen()),
          DynamicNavItem(title: 'Parents & Guardians', url: '/parent/parents', icon: Icons.family_restroom_outlined, builder: (_) => const ParentsScreen()),
        ]),
        DynamicNavSection(label: 'System & Reports', items: [
          DynamicNavItem(title: 'Notifications & Alerts', url: '/notifications', icon: Icons.notifications_none_outlined, builder: (_) => const NotificationsScreen()),
          DynamicNavItem(title: 'Institutional Reports', url: '/reports', icon: Icons.bar_chart_outlined, builder: (_) => const ReportsScreen()),
          DynamicNavItem(title: 'Platform Settings', url: '/settings', icon: Icons.settings_outlined, builder: (_) => const SettingsScreen()),
        ]),
      ];
    } else if (role.contains('SCHOOL')) {
      return [
        DynamicNavSection(label: 'Overview', items: [
          DynamicNavItem(title: 'School Admin Dashboard', url: '/', icon: Icons.account_balance_outlined, builder: (_) => const SchoolAdminDashboardScreen()),
        ]),
        DynamicNavSection(label: 'Academic Operations', items: [
          DynamicNavItem(title: 'Branches Management', url: '/school/branches', icon: Icons.business_outlined, builder: (_) => const BranchesScreen()),
          DynamicNavItem(title: 'Classes Matrix', url: '/school/classes', icon: Icons.calendar_month_outlined, builder: (_) => const ClassMatrixScreen()),
          DynamicNavItem(title: 'Sessions & Schedules', url: '/school/sessions', icon: Icons.schedule_outlined, builder: (_) => const ClassScheduleScreen()),
          DynamicNavItem(title: 'Rooms & Labs', url: '/school/rooms', icon: Icons.door_front_door_outlined, builder: (_) => const RoomsScreen()),
        ]),
        DynamicNavSection(label: 'Finance', items: [
          DynamicNavItem(title: 'Fees & Collections', url: '/finance/fees', icon: Icons.payments_outlined, builder: (_) => const FeeManagementScreen()),
        ]),
        DynamicNavSection(label: 'People', items: [
          DynamicNavItem(title: 'Teachers', url: '/teacher/teachers', icon: Icons.school_outlined, builder: (_) => const TeachersScreen()),
          DynamicNavItem(title: 'Students', url: '/student/students', icon: Icons.people_outline, builder: (_) => const StudentsScreen()),
        ]),
      ];
    } else if (role.contains('BRANCH')) {
      return [
        DynamicNavSection(label: 'Overview', items: [
          DynamicNavItem(title: 'Branch Hub', url: '/', icon: Icons.storefront_outlined, builder: (_) => const BranchDashboardScreen()),
        ]),
        DynamicNavSection(label: 'Campus Matrix', items: [
          DynamicNavItem(title: 'Class Divisions', url: '/school/classes', icon: Icons.meeting_room_outlined, builder: (_) => const ClassesScreen()),
          DynamicNavItem(title: 'Facilities', url: '/school/rooms', icon: Icons.door_front_door_outlined, builder: (_) => const RoomsScreen()),
          DynamicNavItem(title: 'Daily Schedules', url: '/academic/schedule', icon: Icons.schedule_outlined, builder: (_) => const ClassScheduleScreen()),
        ]),
        DynamicNavSection(label: 'Branch Finance', items: [
          DynamicNavItem(title: 'Fee Collection', url: '/finance/fees', icon: Icons.payments_outlined, builder: (_) => const FeeManagementScreen()),
        ]),
      ];
    } else if (role.contains('TEACHER')) {
      return [
        DynamicNavSection(label: 'Overview', items: [
          DynamicNavItem(title: 'Teacher Workspace', url: '/', icon: Icons.school_outlined, builder: (_) => const TeacherDashboardScreen()),
        ]),
        DynamicNavSection(label: 'Academic Routine', items: [
          DynamicNavItem(title: 'My Daily Routine', url: '/academic/schedule', icon: Icons.schedule_outlined, builder: (_) => const ClassScheduleScreen()),
          DynamicNavItem(title: 'My Attendance & Leave', url: '/academic/teacher-attendance', icon: Icons.how_to_reg_outlined, builder: (_) => const AttendanceScreen()),
          DynamicNavItem(title: 'Mark Student Attendance', url: '/academic/student-attendance', icon: Icons.checklist_outlined, builder: (_) => const StudentAttendanceScreen()),
          DynamicNavItem(title: 'My Students', url: '/student/students', icon: Icons.people_outline, builder: (_) => const StudentsScreen()),
        ]),
      ];
    } else if (role.contains('STUDENT')) {
      return [
        DynamicNavSection(label: 'Overview', items: [
          DynamicNavItem(title: 'Student Learning Space', url: '/', icon: Icons.person_outline, builder: (_) => const StudentDashboardScreen()),
        ]),
        DynamicNavSection(label: 'Student Modules', items: [
          DynamicNavItem(title: 'Daily Class Routine', url: '/student/routine', icon: Icons.schedule_outlined, builder: (_) => const ClassScheduleScreen()),
          DynamicNavItem(title: 'Attendance History', url: '/student/attendance-report', icon: Icons.fact_check_outlined, builder: (_) => const StudentAttendanceScreen()),
          DynamicNavItem(title: 'Fees Due & Paid', url: '/student/fees-report', icon: Icons.payments_outlined, builder: (_) => const FeeManagementScreen()),
        ]),
      ];
    } else {
      // Guardian / Parent
      return [
        DynamicNavSection(label: 'Overview', items: [
          DynamicNavItem(title: 'Parent Portal', url: '/', icon: Icons.family_restroom_outlined, builder: (_) => const GuardianDashboardScreen()),
        ]),
        DynamicNavSection(label: 'Ward Activities', items: [
          DynamicNavItem(title: 'Child Daily Routine', url: '/parent/routine', icon: Icons.schedule_outlined, builder: (_) => const ClassScheduleScreen()),
          DynamicNavItem(title: 'Attendance Report', url: '/parent/attendance-report', icon: Icons.fact_check_outlined, builder: (_) => const StudentAttendanceScreen()),
          DynamicNavItem(title: 'School Fees & Dues', url: '/parent/fees-report', icon: Icons.payments_outlined, builder: (_) => const FeeManagementScreen()),
        ]),
      ];
    }
  }

  @override
  Widget build(BuildContext context) {
    // Filter sections based on search query
    final filteredSections = _navSections.map((sec) {
      if (_searchQuery.isEmpty) return sec;
      final matchedItems = sec.items.where((it) {
        return it.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            sec.label.toLowerCase().contains(_searchQuery.toLowerCase());
      }).toList();
      return DynamicNavSection(label: sec.label, items: matchedItems);
    }).where((sec) => sec.items.isNotEmpty).toList();

    return Drawer(
      backgroundColor: Colors.white,
      elevation: 16,
      child: Column(
        children: [
          // Header matching webapp branding
          Container(
            padding: const EdgeInsets.fromLTRB(20, 50, 20, 20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF005A9E), Color(0xFF0284C7)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Colors.white,
                  child: const Icon(Icons.school, color: Color(0xFF005A9E), size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MySkool ERP',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                      Text(
                        _user?.name.isNotEmpty == true
                            ? _user!.name
                            : (_user?.roleCode.isNotEmpty == true ? _user!.roleCode : 'Institutional Portal'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Search Filter Input matching WebApp
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                isDense: true,
                hintText: 'Search menus...',
                hintStyle: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                prefixIcon: const Icon(Icons.search, size: 18, color: AppTheme.textSecondary),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 16),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (val) {
                setState(() => _searchQuery = val.trim());
              },
            ),
          ),

          // Dynamic Menu Items List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : filteredSections.isEmpty
                    ? Center(
                        child: Text(
                          'No menu options found',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        itemCount: filteredSections.length,
                        itemBuilder: (context, sectionIndex) {
                          final section = filteredSections[sectionIndex];
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.fromLTRB(18, 14, 18, 6),
                                child: Text(
                                  section.label.toUpperCase(),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF94A3B8),
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ),
                              ...section.items.map((item) {
                                return ListTile(
                                  dense: true,
                                  horizontalTitleGap: 12,
                                  leading: Icon(item.icon, color: const Color(0xFF005A9E), size: 20),
                                  title: Text(
                                    item.title,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13.5,
                                      color: Color(0xFF1E293B),
                                    ),
                                  ),
                                  trailing: const Icon(Icons.chevron_right, size: 16, color: Color(0xFF94A3B8)),
                                  onTap: () {
                                    Navigator.pop(context); // Close Drawer
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: item.builder),
                                    );
                                  },
                                );
                              }),
                              const Divider(height: 12, color: Color(0xFFF1F5F9)),
                            ],
                          );
                        },
                      ),
          ),

          // User info and Logout Footer
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: ListTile(
              dense: true,
              leading: const Icon(Icons.logout, color: AppTheme.danger, size: 22),
              title: const Text(
                'Sign Out',
                style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.bold, fontSize: 14),
              ),
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
}
