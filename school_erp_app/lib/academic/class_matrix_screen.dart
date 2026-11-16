import 'package:flutter/material.dart';
import 'academic_theme.dart';
import 'academic_service.dart';

class ClassMatrixScreen extends StatefulWidget {
  const ClassMatrixScreen({super.key});

  @override
  State<ClassMatrixScreen> createState() => _ClassMatrixScreenState();
}

class _ClassMatrixScreenState extends State<ClassMatrixScreen> {
  bool _loading = true;
  List<dynamic> _matrices = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchMatrix();
  }

  Future<void> _fetchMatrix() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await AcademicService.getMatrix();
    if (!mounted) return;

    if ((res['status'] == 'success' || res['success'] == true)) {
      setState(() {
        _matrices = res['data'] ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load timetable matrix';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Schedule Matrix',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchMatrix,
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
                          onPressed: _fetchMatrix,
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          child: const Text('Try Again'),
                        )
                      ],
                    ),
                  ),
                )
              : _matrices.isEmpty
                  ? const Center(
                      child: Text('No matrix allocations found.', style: TextStyle(color: AppTheme.textSecondary)),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchMatrix,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _matrices.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _matrices[index];
                          final className = item['class_name'] ?? item['SCHL_BR_CLASS_NM'] ?? 'Class';
                          final periodsPerDay = item['periods_per_day'] ?? item['PERIODS_PER_DAY'] ?? 8;
                          final workingDays = item['working_days'] ?? item['WORKING_DAYS'] ?? 6;

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
                                  child: const Icon(Icons.grid_view_outlined, color: AppTheme.primary),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        className,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                          color: AppTheme.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Periods/Day: $periodsPerDay • Working Days: $workingDays',
                                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
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
    );
  }
}

