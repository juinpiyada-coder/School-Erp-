import 'package:flutter/material.dart';
import 'academic_theme.dart';
import 'academic_service.dart';

class ClassSessionsScreen extends StatefulWidget {
  const ClassSessionsScreen({super.key});

  @override
  State<ClassSessionsScreen> createState() => _ClassSessionsScreenState();
}

class _ClassSessionsScreenState extends State<ClassSessionsScreen> {
  bool _loading = true;
  List<dynamic> _sessions = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchSessions();
  }

  Future<void> _fetchSessions() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await AcademicService.getClassSessions();
    if (!mounted) return;

    if (res['status'] == 'success') {
      setState(() {
        _sessions = res['data'] ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load sessions';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Sessions & Sections',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchSessions,
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
                          onPressed: _fetchSessions,
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          child: const Text('Try Again'),
                        )
                      ],
                    ),
                  ),
                )
              : _sessions.isEmpty
                  ? const Center(
                      child: Text('No sessions or sections found.', style: TextStyle(color: AppTheme.textSecondary)),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchSessions,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _sessions.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _sessions[index];
                          final className = item['class_name'] ?? item['SCHL_BR_CLASS_NM'] ?? 'Class';
                          final section = item['section_name'] ?? item['SCHL_BR_SEC_NM'] ?? 'Section';
                          final session = item['session_name'] ?? item['SCHL_BR_SESSION_NM'] ?? '2026-2027';
                          final branch = item['branch_name'] ?? item['SCHL_BR_NM'] ?? 'Main Campus';

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: AppTheme.cardDecoration,
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryLight,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.groups_outlined, color: AppTheme.primary),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '$className - Section $section',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                          color: AppTheme.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Session: $session • Branch: $branch',
                                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                                      ),
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

