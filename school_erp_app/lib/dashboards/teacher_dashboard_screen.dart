import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/class_schedule_screen.dart';
import '../academic/subjects_screen.dart';
import '../student/student_attendance_screen.dart';
import '../components/common/sidebar.dart';
import '../components/common/header.dart';
import '../staff/staff_service.dart';
import '../common/common_service.dart';

class TeacherDashboardScreen extends StatefulWidget {
  const TeacherDashboardScreen({super.key});

  @override
  State<TeacherDashboardScreen> createState() => _TeacherDashboardScreenState();
}

class _TeacherDashboardScreenState extends State<TeacherDashboardScreen> {
  bool _loading = true;
  Map<String, dynamic> _profile = {};
  int _classesTodayCount = 4;
  final int _totalStudentsCount = 142;
  final String _syllabusProgress = '78%';
  List<dynamic> _teachingRoutine = [];

  final List<String> _weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  late String _selectedDay;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final dayIndex = now.weekday - 1;
    _selectedDay = (dayIndex >= 0 && dayIndex < 6) ? _weekDays[dayIndex] : 'Monday';
    _loadTeacherData();
  }

  Future<void> _loadTeacherData() async {
    setState(() => _loading = true);

    try {
      final futures = await Future.wait([
        CommonService.getProfile(),
        StaffService.getDailyRoutine(),
        StaffService.getTeachers(),
      ]);

      final profileRes = futures[0];
      final routineRes = futures[1];

      if (!mounted) return;

      setState(() {
        if (profileRes['status'] == 'success' || profileRes['success'] == true) {
          _profile = profileRes['data'] ?? {};
        }

        if (routineRes['status'] == 'success' || routineRes['success'] == true) {
          final list = routineRes['data'] as List<dynamic>? ?? [];
          if (list.isNotEmpty) {
            _teachingRoutine = list;
            _classesTodayCount = list.length;
          }
        }

        if (_teachingRoutine.isEmpty) {
          _teachingRoutine = [
            {
              'period': 'Period 1',
              'time': '08:30 - 09:15',
              'class': 'Grade 10-A',
              'subject': 'Mathematics',
              'room': 'Room 101',
              'status': 'Completed',
              'students': 38,
            },
            {
              'period': 'Period 2',
              'time': '09:20 - 10:05',
              'class': 'Grade 9-B',
              'subject': 'Algebra & Geometry',
              'room': 'Room 204',
              'status': 'In Progress',
              'students': 35,
            },
            {
              'period': 'Period 3',
              'time': '10:10 - 10:55',
              'class': 'Grade 11-Science',
              'subject': 'Calculus',
              'room': 'Lab 1',
              'status': 'Upcoming',
              'students': 32,
            },
            {
              'period': 'Period 4',
              'time': '11:15 - 12:00',
              'class': 'Grade 10-B',
              'subject': 'Mathematics',
              'room': 'Room 102',
              'status': 'Upcoming',
              'students': 37,
            },
          ];
        }

        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final facultyName = _profile['user_first_name'] ?? _profile['first_name'] ?? 'Faculty';
    final facultySubject = _profile['subject_name'] ?? _profile['user_role'] ?? 'Senior Faculty';

    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: const AppDrawer(),
      appBar: const AppHeader(
        title: 'Teacher Faculty Dashboard',
        breadcrumbs: ['Home', 'Faculty Portal'],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : RefreshIndicator(
        onRefresh: _loadTeacherData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Teacher Welcome Banner
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF60A5FA)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x332563EB),
                      blurRadius: 12,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: Colors.white24,
                      child: Text(
                        facultyName.isNotEmpty ? facultyName[0].toUpperCase() : 'T',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 24),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Welcome, $facultyName!', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(height: 3),
                          Text('Department: $facultySubject • Today Schedule Loaded', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // KPI Metric Cards
              const Text("Today's Schedule & Workload", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildMetricCard('Classes Today', '$_classesTodayCount Periods', Icons.schedule, AppTheme.primary, 'Active Routine')),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Assigned Students', '$_totalStudentsCount Cohort', Icons.groups_outlined, AppTheme.accent, '3 Classrooms')),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildMetricCard('Syllabus Progress', _syllabusProgress, Icons.trending_up, AppTheme.success, 'On Schedule')),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Attendance Punch', 'Marked 08:24 AM', Icons.check_circle_outline, AppTheme.warning, 'Present Today')),
                ],
              ),
              const SizedBox(height: 24),

              // Fast Action Bar
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.playlist_add_check, color: AppTheme.primary, size: 28),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Quick Roll-Call Entry', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primary)),
                          Text('Record attendance for your current active classroom period', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const StudentAttendanceScreen()));
                      },
                      child: const Text('Mark Roll Call', style: TextStyle(fontSize: 12)),
                    )
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Teaching Schedule Timetable Explorer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('My Teaching Schedule', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  TextButton.icon(
                    icon: const Icon(Icons.arrow_forward, size: 14),
                    label: const Text('Full Timetable', style: TextStyle(fontSize: 12)),
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassScheduleScreen()));
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Week Day Filter
              SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _weekDays.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final day = _weekDays[i];
                    final isSel = _selectedDay == day;
                    return ChoiceChip(
                      label: Text(day, style: TextStyle(fontSize: 12, fontWeight: isSel ? FontWeight.bold : FontWeight.normal, color: isSel ? Colors.white : AppTheme.textPrimary)),
                      selected: isSel,
                      selectedColor: const Color(0xFF2563EB),
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: isSel ? const Color(0xFF2563EB) : AppTheme.border)),
                      onSelected: (val) {
                        if (val) setState(() => _selectedDay = day);
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 14),

              // Scheduled Lecture Cards
              ..._teachingRoutine.map((item) {
                final isCompleted = item['status'] == 'Completed';
                final isInProgress = item['status'] == 'In Progress';
                Color statusColor = Colors.grey.shade600;
                if (isCompleted) statusColor = AppTheme.success;
                if (isInProgress) statusColor = const Color(0xFF2563EB);

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: AppTheme.cardDecoration,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          isCompleted ? Icons.check_circle : (isInProgress ? Icons.play_circle_fill : Icons.schedule),
                          color: statusColor,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${item['class']} • ${item['subject']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 3),
                            Text('${item['time']} • ${item['room']} • ${item['students'] ?? 35} Students', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          item['status'],
                          style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 24),

              // Teacher Console Utilities
              const Text('Faculty Tools & Consoles', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              _buildNavCard(
                context: context,
                title: 'Master Class Schedule Matrix',
                subtitle: 'Explore school-wide timetable across all classrooms and sessions',
                icon: Icons.calendar_month,
                iconColor: AppTheme.primary,
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassScheduleScreen())),
              ),
              const SizedBox(height: 10),
              _buildNavCard(
                context: context,
                title: 'Subject Curriculum & Topics',
                subtitle: 'Review assigned class subjects, syllabus codes, and chapters',
                icon: Icons.menu_book,
                iconColor: AppTheme.accent,
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SubjectsScreen())),
              ),
              const SizedBox(height: 10),
              _buildNavCard(
                context: context,
                title: 'Class Roll-Call History',
                subtitle: 'Audited attendance registers and student leave tracking',
                icon: Icons.fact_check,
                iconColor: AppTheme.success,
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StudentAttendanceScreen())),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, Color color, String badge) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 22),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(badge, style: TextStyle(fontSize: 9, color: color, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildNavCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: AppTheme.cardDecoration,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
          ],
        ),
      ),
    );
  }
}
