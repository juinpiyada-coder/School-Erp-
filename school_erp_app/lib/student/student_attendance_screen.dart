import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import 'student_service.dart';

class StudentAttendanceScreen extends StatefulWidget {
  const StudentAttendanceScreen({super.key});

  @override
  State<StudentAttendanceScreen> createState() => _StudentAttendanceScreenState();
}

class _StudentAttendanceScreenState extends State<StudentAttendanceScreen> {
  bool _loading = true;
  List<dynamic> _attendance = [];
  String? _error;
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _fetchAttendance();
  }

  Future<void> _fetchAttendance() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final dateStr = "${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}";
    final res = await StudentService.getAttendance(date: dateStr);
    if (!mounted) return;

    if ((res['status'] == 'success' || res['success'] == true)) {
      setState(() {
        _attendance = res['data'] ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load student attendance';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Student Attendance',
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today_outlined),
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime(2020),
                lastDate: DateTime.now(),
              );
              if (picked != null) {
                setState(() => _selectedDate = picked);
                _fetchAttendance();
              }
            },
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchAttendance),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(child: Text(_error!))
              : _attendance.isEmpty
                  ? Center(child: Text('No student attendance logged for ${_selectedDate.toLocal().toString().split(' ')[0]}.', style: const TextStyle(color: AppTheme.textSecondary)))
                  : RefreshIndicator(
                      onRefresh: _fetchAttendance,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _attendance.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _attendance[index];
                          final name = item['name'] ?? item['STU_FIRST_NM'] ?? 'Student #${index + 1}';
                          final roll = item['roll_no'] ?? item['STU_ROLL_NO'] ?? '';
                          final status = (item['status'] ?? item['ATT_STATUS'] ?? 'Present').toString();
                          final isPresent = status.toLowerCase() == 'present';

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: AppTheme.cardDecoration,
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: isPresent ? AppTheme.success.withValues(alpha: 0.1) : AppTheme.danger.withValues(alpha: 0.1),
                                  child: Icon(isPresent ? Icons.check : Icons.close, color: isPresent ? AppTheme.success : AppTheme.danger, size: 20),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary)),
                                      if (roll.isNotEmpty) Text('Roll No: $roll', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isPresent ? AppTheme.success.withValues(alpha: 0.1) : AppTheme.danger.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    status,
                                    style: TextStyle(
                                      color: isPresent ? AppTheme.success : AppTheme.danger,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
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

