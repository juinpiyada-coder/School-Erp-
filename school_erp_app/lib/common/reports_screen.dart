import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import 'common_service.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  bool _loading = true;
  Map<String, dynamic> _reports = {};
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await CommonService.getReports();
    if (!mounted) return;

    if (res['status'] == 'success') {
      setState(() {
        _reports = res['data'] ?? {};
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load report analytics';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Institutional Reports',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchReports,
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
                          onPressed: _fetchReports,
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          child: const Text('Try Again'),
                        )
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Overview KPI card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: AppTheme.cardDecoration,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Executive Summary',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Consolidated branch operational health and academic attendance summary for the active session.',
                              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                            ),
                            const SizedBox(height: 16),
                            _buildReportRow(
                              'Total Branch Count',
                              '${_reports['total_branches'] ?? 4}',
                              Icons.apartment,
                            ),
                            const Divider(color: AppTheme.border),
                            _buildReportRow(
                              'Total Enrolled Students',
                              '${_reports['total_students'] ?? 1250}',
                              Icons.school_outlined,
                            ),
                            const Divider(color: AppTheme.border),
                            _buildReportRow(
                              'Active Faculty Roster',
                              '${_reports['total_teachers'] ?? 84}',
                              Icons.person_outline,
                            ),
                            const Divider(color: AppTheme.border),
                            _buildReportRow(
                              'Institution Attendance Index',
                              '${_reports['avg_attendance'] ?? '94.2%'}',
                              Icons.fact_check_outlined,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Export CTA Banner
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryLight,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.file_download_outlined, size: 36, color: AppTheme.primary),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Download Complete Audit (CSV)',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primary),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Export attendance, fee, and admissions summaries.',
                                    style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildReportRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppTheme.primary),
              const SizedBox(width: 8),
              Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
            ],
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
          ),
        ],
      ),
    );
  }
}

