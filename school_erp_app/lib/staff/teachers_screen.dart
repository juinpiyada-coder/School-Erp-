import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import 'staff_service.dart';

class TeachersScreen extends StatefulWidget {
  const TeachersScreen({super.key});

  @override
  State<TeachersScreen> createState() => _TeachersScreenState();
}

class _TeachersScreenState extends State<TeachersScreen> {
  bool _loading = true;
  List<dynamic> _teachers = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchTeachers();
  }

  Future<void> _fetchTeachers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await StaffService.getTeachers();
    if (!mounted) return;

    if ((res['status'] == 'success' || res['success'] == true)) {
      setState(() {
        _teachers = res['data'] ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load teachers';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Faculty & Teachers',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchTeachers,
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
                          onPressed: _fetchTeachers,
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          child: const Text('Try Again'),
                        )
                      ],
                    ),
                  ),
                )
              : _teachers.isEmpty
                  ? const Center(child: Text('No teachers found.', style: TextStyle(color: AppTheme.textSecondary)))
                  : RefreshIndicator(
                      onRefresh: _fetchTeachers,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _teachers.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _teachers[index];
                          final name = item['name'] ?? item['TCHR_NM'] ?? 'Teacher';
                          final email = item['email'] ?? item['TCHR_EMAIL'] ?? '';
                          final phone = item['phone'] ?? item['TCHR_CONTACT_NO'] ?? '';
                          final branch = item['branchName'] ?? item['branch_name'] ?? 'Main Campus';
                          final subjects = item['subjects'] ?? '';

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: AppTheme.cardDecoration,
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: AppTheme.primaryLight,
                                  child: Text(
                                    name.isNotEmpty ? name[0].toUpperCase() : 'T',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: AppTheme.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '$branch ${subjects.isNotEmpty ? '• $subjects' : ''}',
                                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                      ),
                                      if (email.isNotEmpty || phone.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          '$email ${phone.isNotEmpty ? '• $phone' : ''}',
                                          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                        ),
                                      ]
                                    ],
                                  ),
                                ),
                                const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

