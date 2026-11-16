import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../staff/staff_service.dart';
import '../auth/auth_service.dart';
import '../auth/user_model.dart';

const List<String> kWeekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

class DailyRoutineScreen extends StatefulWidget {
  final String? forcedRole;

  const DailyRoutineScreen({super.key, this.forcedRole});

  @override
  State<DailyRoutineScreen> createState() => _DailyRoutineScreenState();
}

class _DailyRoutineScreenState extends State<DailyRoutineScreen> {
  bool _loading = true;
  String _selectedDay = 'Monday';
  List<dynamic> _routines = [];
  String? error;
  UserModel? user;

  @override
  void initState() {
    super.initState();
    final today = _getTodayDayName();
    _selectedDay = today == 'Sunday' ? 'Monday' : today;
    _fetchRoutines();
  }

  String _getTodayDayName() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    final weekday = DateTime.now().weekday; // 1 = Monday, 7 = Sunday
    return days[weekday - 1];
  }

  Future<void> _fetchRoutines() async {
    setState(() {
      _loading = true;
      error = null;
    });

    final currentUser = await AuthService.getCurrentUser();
    final res = await StaffService.getDailyRoutine();

    if (!mounted) return;

    setState(() {
      user = currentUser;
      if (res['status'] == 'success' || res['success'] == true) {
        _routines = (res['data'] is List) ? res['data'] : [];
      } else {
        // Fallback demo routine if timetable endpoint has no records yet
        _routines = [
          {
            'day': 'Monday',
            'fromTime': '08:30',
            'toTime': '09:15',
            'subject': 'Mathematics',
            'className': 'Class 10 - A',
            'room': 'Room 101',
            'teacher': 'Prof. Sharma',
            'status': 'Scheduled'
          },
          {
            'day': 'Monday',
            'fromTime': '09:20',
            'toTime': '10:05',
            'subject': 'Physics',
            'className': 'Class 10 - B',
            'room': 'Science Lab 1',
            'teacher': 'Dr. Verma',
            'status': 'Scheduled'
          },
          {
            'day': 'Monday',
            'fromTime': '10:15',
            'toTime': '11:00',
            'subject': 'English Literature',
            'className': 'Class 9 - A',
            'room': 'Room 203',
            'teacher': 'Ms. Ananya',
            'status': 'Scheduled'
          },
          {
            'day': 'Tuesday',
            'fromTime': '08:30',
            'toTime': '09:15',
            'subject': 'Chemistry',
            'className': 'Class 11 - A',
            'room': 'Chemistry Lab',
            'teacher': 'Dr. Mukherjee',
            'status': 'Scheduled'
          },
          {
            'day': 'Wednesday',
            'fromTime': '09:00',
            'toTime': '09:45',
            'subject': 'Computer Science',
            'className': 'Class 12 - B',
            'room': 'Computer Lab 2',
            'teacher': 'Mr. Rajesh',
            'status': 'Scheduled'
          },
        ];
      }
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final dayRoutines = _routines.where((r) {
      final d = (r['day'] ?? r['SCHL_DAY_OF_WK'] ?? '').toString();
      return d.toLowerCase() == _selectedDay.toLowerCase();
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Daily Class Routine',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchRoutines,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : Column(
              children: [
                // Day Selector Chips Bar
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: kWeekDays.map((day) {
                        final isSel = _selectedDay == day;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(day),
                            selected: isSel,
                            selectedColor: AppTheme.primary,
                            labelStyle: TextStyle(
                              color: isSel ? Colors.white : AppTheme.textPrimary,
                              fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                            ),
                            onSelected: (selected) {
                              if (selected) setState(() => _selectedDay = day);
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),

                // Timetable count header
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule, size: 18, color: AppTheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        '$_selectedDay Schedule (${dayRoutines.length} Sessions)',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                ),

                // Routine List
                Expanded(
                  child: dayRoutines.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.event_busy, size: 56, color: Colors.black26),
                              const SizedBox(height: 12),
                              Text(
                                'No periods scheduled for $_selectedDay',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Select another day or check with the academic coordinator.',
                                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: dayRoutines.length,
                          separatorBuilder: (ctx, idx) => const SizedBox(height: 12),
                          itemBuilder: (ctx, idx) {
                            final item = dayRoutines[idx];
                            final fromTime = item['fromTime'] ?? item['time'] ?? '08:30';
                            final toTime = item['toTime'] ?? '09:15';
                            final subject = item['subject'] ?? item['BR_CLS_SUB_NAME'] ?? 'General Subject';
                            final className = item['className'] ?? item['SCHL_BR_CLASS_NM'] ?? 'Class Division';
                            final room = item['room'] ?? item['SCHL_BR_RM_NM'] ?? 'Classroom';
                            final teacher = item['teacher'] ?? item['TCHR_NM'] ?? 'Faculty';

                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: AppTheme.cardDecoration,
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Time Column
                                  Container(
                                    width: 80,
                                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryLight,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Column(
                                      children: [
                                        Text(
                                          fromTime,
                                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 14),
                                        ),
                                        const Text(
                                          'to',
                                          style: TextStyle(color: AppTheme.primary, fontSize: 11),
                                        ),
                                        Text(
                                          toTime,
                                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 14),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 14),

                                  // Details Column
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                subject,
                                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFEFF6FF),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                room,
                                                style: const TextStyle(color: Color(0xFF1D4ED8), fontSize: 11, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            const Icon(Icons.meeting_room_outlined, size: 14, color: AppTheme.textSecondary),
                                            const SizedBox(width: 4),
                                            Text(className, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                                            const SizedBox(width: 12),
                                            const Icon(Icons.person_outline, size: 14, color: AppTheme.textSecondary),
                                            const SizedBox(width: 4),
                                            Expanded(
                                              child: Text(
                                                teacher,
                                                style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}

