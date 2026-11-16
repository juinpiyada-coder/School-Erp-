import 'package:flutter/material.dart';
import 'academic_theme.dart';
import 'academic_service.dart';

class BranchesScreen extends StatefulWidget {
  const BranchesScreen({super.key});

  @override
  State<BranchesScreen> createState() => _BranchesScreenState();
}

class _BranchesScreenState extends State<BranchesScreen> {
  bool _loading = true;
  List<dynamic> _branches = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchBranches();
  }

  Future<void> _fetchBranches() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await AcademicService.getBranches();
    if (!mounted) return;

    if ((res['status'] == 'success' || res['success'] == true)) {
      setState(() {
        _branches = res['data'] ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load branches';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Associated Branches',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchBranches,
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
                          onPressed: _fetchBranches,
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          child: const Text('Try Again'),
                        )
                      ],
                    ),
                  ),
                )
              : _branches.isEmpty
                  ? const Center(
                      child: Text('No branches found.', style: TextStyle(color: AppTheme.textSecondary)),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchBranches,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _branches.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _branches[index];
                          final name = item['brch_name'] ?? item['SCHL_BR_NM'] ?? 'Branch #${index + 1}';
                          final code = item['brch_code'] ?? item['SCHL_BR_CODE'] ?? 'N/A';
                          final city = item['city'] ?? item['SCHL_BR_CITY'] ?? '';
                          final state = item['state'] ?? item['SCHL_BR_STATE'] ?? '';
                          final contact = item['contact_no'] ?? item['SCHL_BR_CONT_NO1'] ?? '';

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
                                  child: const Icon(Icons.account_tree_outlined, color: AppTheme.primary),
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
                                          fontSize: 16,
                                          color: AppTheme.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Code: $code ${city.isNotEmpty ? '• $city, $state' : ''}',
                                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                                      ),
                                      if (contact.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          'Phone: $contact',
                                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, color: AppTheme.textSecondary),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

