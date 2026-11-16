import 'package:flutter/material.dart';
import 'academic_theme.dart';
import 'academic_service.dart';

class ClassScheduleScreen extends StatefulWidget {
  const ClassScheduleScreen({super.key});

  @override
  State<ClassScheduleScreen> createState() => _ClassScheduleScreenState();
}

class _ClassScheduleScreenState extends State<ClassScheduleScreen> {
  bool _loading = true;
  List<dynamic> _schedules = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchSchedule();
  }

  Future<void> _fetchSchedule() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await AcademicService.getSchedule();
    if (!mounted) return;

    if (res['status'] == 'success') {
      setState(() {
        _schedules = res['data'] ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load schedule';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Master Class Schedule',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchSchedule,
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchSchedule,
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          child: const Text('Try Again'),
                        )
                      ],
                    ),
                  ),
                )
              : _schedules.isEmpty
                  ? const Center(
                      child: Text('No schedule routines configured.', style: TextStyle(color: AppTheme.textSecondary)),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchSchedule,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _schedules.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _schedules[index];
                          final day = item['day'] ?? item['DAY_NAME'] ?? 'Monday';
                          final period = item['period_no'] ?? item['PERIOD_NO'] ?? '${index + 1}';
                          final time = item['time_slot'] ?? '${item['START_TIME'] ?? '09:00'} - ${item['END_TIME'] ?? '09:45'}';
                          final subject = item['subject_name'] ?? item['BR_CLS_SUB_NAME'] ?? 'General';
                          final teacher = item['teacher_name'] ?? item['BR_TCHR_NM'] ?? 'Unassigned';
                          final room = item['room_name'] ?? item['SCHL_BR_ROOM_NM'] ?? 'Classroom';

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: AppTheme.cardDecoration,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryLight,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        'Period $period • $day',
                                        style: const TextStyle(
                                          color: AppTheme.primary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      time,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  subject,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.person_outline, size: 14, color: AppTheme.textSecondary),
                                    const SizedBox(width: 4),
                                    Text('Faculty: $teacher', style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                                    const Spacer(),
                                    const Icon(Icons.room_outlined, size: 14, color: AppTheme.textSecondary),
                                    const SizedBox(width: 4),
                                    Text('Room: $room', style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

