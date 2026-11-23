import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/class_schedule_screen.dart';
import '../academic/subjects_screen.dart';
import '../student/student_attendance_screen.dart';
import '../finance/fee_management_screen.dart';
import '../components/common/sidebar.dart';
import '../components/common/header.dart';
import '../common/common_service.dart';
import '../academic/academic_service.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key});

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  bool _loading = true;
  final String _attendanceRate = '94.8%';
  int _subjectCount = 6;
  final String _feeStatus = 'Up to Date';
  List<dynamic> _todayClasses = [];
  Map<String, dynamic> _profile = {};

  final List<String> _weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  late String _selectedDay;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final dayIndex = now.weekday - 1; // 0 = Mon, 6 = Sun
    _selectedDay = (dayIndex >= 0 && dayIndex < 6) ? _weekDays[dayIndex] : 'Monday';
    _loadStudentDashboardData();
  }

  Future<void> _loadStudentDashboardData() async {
    setState(() => _loading = true);

    try {
      final futures = await Future.wait([
        CommonService.getProfile(),
        AcademicService.getClasses(),
        AcademicService.getSubjects(),
      ]);

      final profileRes = futures[0];
      final subjectsRes = futures[2];

      if (!mounted) return;

      setState(() {
        if (profileRes['status'] == 'success' || profileRes['success'] == true) {
          _profile = profileRes['data'] ?? {};
        }

        if (subjectsRes['status'] == 'success' || subjectsRes['success'] == true) {
          final list = subjectsRes['data'] as List<dynamic>? ?? [];
          if (list.isNotEmpty) {
            _subjectCount = list.length;
          }
        }

        // Mock timetable schedule for selected day matching webapp
        _todayClasses = [
          {
            'period': 'Period 1',
            'time': '08:30 - 09:15',
            'subject': 'Mathematics',
            'teacher': 'Dr. Sharma',
            'room': 'Room 101',
            'status': 'Present',
          },
          {
            'period': 'Period 2',
            'time': '09:20 - 10:05',
            'subject': 'Physics',
            'teacher': 'Prof. Banerjee',
            'room': 'Science Lab A',
            'status': 'Present',
          },
          {
            'period': 'Period 3',
            'time': '10:10 - 10:55',
            'subject': 'English Literature',
            'teacher': 'Mrs. Sen',
            'room': 'Room 101',
            'status': 'Upcoming',
          },
          {
            'period': 'Period 4',
            'time': '11:15 - 12:00',
            'subject': 'Computer Science',
            'teacher': 'Mr. Roy',
            'room': 'Computer Lab 2',
            'status': 'Upcoming',
          },
        ];

        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final studentName = _profile['user_first_name'] ?? _profile['first_name'] ?? 'Student';
    final studentClass = _profile['class_name'] ?? _profile['user_branch_id'] ?? 'Grade 10-A';

    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: const AppDrawer(),
      appBar: const AppHeader(
        title: 'Student Learning Space',
        breadcrumbs: ['Home', 'Student Portal'],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : RefreshIndicator(
        onRefresh: _loadStudentDashboardData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Banner
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF7C3AED), Color(0xFFA78BFA)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x337C3AED),
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
                        studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 24),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Welcome, $studentName!', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(height: 3),
                          Text('Enrolled: $studentClass • Academic Year 2026-2027', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // KPI Metric Cards
              const Text('Academic Overview', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildMetricCard('My Attendance', _attendanceRate, Icons.fact_check, AppTheme.success, 'Optimal Ratio')),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Enrolled Subjects', '$_subjectCount Active', Icons.book, AppTheme.primary, 'Full Curriculum')),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildMetricCard('Fee Status', _feeStatus, Icons.verified_user, AppTheme.accent, 'No Dues Pending')),
                  const SizedBox(width: 12),
                  Expanded(child: _buildMetricCard('Daily Periods', '${_todayClasses.length} Scheduled', Icons.schedule, AppTheme.warning, 'Today')),
                ],
              ),
              const SizedBox(height: 24),

              // Timetable & Daily Routine Explorer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Class Routine Timetable', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  TextButton.icon(
                    icon: const Icon(Icons.arrow_forward, size: 14),
                    label: const Text('View Full', style: TextStyle(fontSize: 12)),
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassScheduleScreen()));
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Day Selector Chips
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
                      selectedColor: const Color(0xFF7C3AED),
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: isSel ? const Color(0xFF7C3AED) : AppTheme.border)),
                      onSelected: (val) {
                        if (val) setState(() => _selectedDay = day);
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 14),

              // Period Schedule Cards
              if (_todayClasses.isEmpty)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: AppTheme.cardDecoration,
                  child: const Center(child: Text('No classes scheduled for this day.', style: TextStyle(color: AppTheme.textSecondary))),
                )
              else
                ..._todayClasses.map((item) {
                  final isPresent = item['status'] == 'Present';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: AppTheme.cardDecoration,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isPresent ? AppTheme.success.withValues(alpha: 0.12) : const Color(0xFF7C3AED).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            isPresent ? Icons.check_circle : Icons.schedule,
                            color: isPresent ? AppTheme.success : const Color(0xFF7C3AED),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item['subject'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 2),
                              Text('${item['time']} • ${item['room']} • ${item['teacher']}', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isPresent ? AppTheme.success.withValues(alpha: 0.1) : Colors.orange.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            item['status'],
                            style: TextStyle(
                              color: isPresent ? AppTheme.success : Colors.orange.shade800,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),

              const SizedBox(height: 24),

              // Student Quick Action Utilities
              const Text('Student Quick Portals', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              _buildNavCard(
                context: context,
                title: 'Subject Curriculum & Progress',
                subtitle: 'Topic coverage, syllabus percentage & assignments',
                icon: Icons.menu_book,
                iconColor: AppTheme.primary,
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SubjectsScreen())),
              ),
              const SizedBox(height: 10),
              _buildNavCard(
                context: context,
                title: 'Attendance Audit History',
                subtitle: 'Review monthly presence records and leave logs',
                icon: Icons.fact_check_outlined,
                iconColor: AppTheme.success,
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StudentAttendanceScreen())),
              ),
              const SizedBox(height: 10),
              _buildNavCard(
                context: context,
                title: 'Fee Invoices & Digital Receipts',
                subtitle: 'Download receipts, track dues and penalty waivers',
                icon: Icons.receipt_long,
                iconColor: AppTheme.accent,
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FeeManagementScreen())),
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
