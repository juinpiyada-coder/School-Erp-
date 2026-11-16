import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import 'student_service.dart';

class ParentsScreen extends StatefulWidget {
  const ParentsScreen({super.key});

  @override
  State<ParentsScreen> createState() => _ParentsScreenState();
}

class _ParentsScreenState extends State<ParentsScreen> {
  bool _loading = true;
  List<dynamic> _parents = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchParents();
  }

  Future<void> _fetchParents() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await StudentService.getParents();
    if (!mounted) return;

    if ((res['status'] == 'success' || res['success'] == true)) {
      setState(() {
        _parents = res['data'] ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load parents';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Parents & Guardians',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchParents,
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(child: Text(_error!))
              : _parents.isEmpty
                  ? const Center(child: Text('No parent records found.', style: TextStyle(color: AppTheme.textSecondary)))
                  : RefreshIndicator(
                      onRefresh: _fetchParents,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _parents.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _parents[index];
                          final name = item['name'] ?? item['PRNT_NAME'] ?? 'Guardian';
                          final phone = item['phone'] ?? item['PRNT_CONT_NO1'] ?? '';
                          final email = item['email'] ?? item['PRNT_EMAIL'] ?? '';
                          final relation = item['relation'] ?? item['PRNT_RELATION'] ?? 'Parent';

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: AppTheme.cardDecoration,
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: AppTheme.warning.withValues(alpha: 0.1),
                                  child: const Icon(Icons.family_restroom, color: AppTheme.warning, size: 20),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text('Relation: $relation • Phone: $phone', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                      if (email.isNotEmpty)
                                        Text('Email: $email', style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
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

