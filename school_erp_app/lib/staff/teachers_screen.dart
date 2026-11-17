import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/academic_service.dart';
import 'staff_service.dart';

class TeachersScreen extends StatefulWidget {
  const TeachersScreen({super.key});

  @override
  State<TeachersScreen> createState() => _TeachersScreenState();
}

class _TeachersScreenState extends State<TeachersScreen> {
  bool _loading = true;
  List<dynamic> _teachers = [];
  List<dynamic> _branches = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBranches();
    _fetchTeachers();
  }

  Future<void> _loadBranches() async {
    final res = await AcademicService.getBranches();
    if (!mounted) return;
    if (res['status'] == 'success' || res['success'] == true) {
      setState(() {
        _branches = res['data'] ?? [];
      });
    }
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

  void _showBulkUploadDialog() {
    final csvController = TextEditingController();
    String? defaultBranchId = _branches.isNotEmpty ? _branches.first['BR_ID']?.toString() : null;
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.upload_file, color: AppTheme.primary),
              SizedBox(width: 8),
              Text('Faculty Bulk Upload', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            ],
          ),
          content: SingleChildScrollView(
            child: SizedBox(
              width: MediaQuery.of(context).size.width * 0.9,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Paste CSV or Comma-Separated rows for faculty batch onboarding.\nFormat:\nName, Email, Phone, User ID, Password',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  if (_branches.isNotEmpty) ...[
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        labelText: 'Default Campus / Branch *',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      initialValue: defaultBranchId,
                      items: _branches.map<DropdownMenuItem<String>>((b) {
                        final id = (b['BR_ID'] ?? b['branch_id'] ?? '').toString();
                        final name = (b['BR_NM'] ?? b['branch_name'] ?? 'Branch $id').toString();
                        return DropdownMenuItem(value: id, child: Text(name, style: const TextStyle(fontSize: 13)));
                      }).toList(),
                      onChanged: (val) => setDialogState(() => defaultBranchId = val),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: csvController,
                    maxLines: 8,
                    decoration: InputDecoration(
                      hintText: 'John Doe, john@example.com, 9876543210, tchr_john, Pass@123\nJane Smith, jane@example.com, 9123456780, tchr_jane, Pass@123',
                      hintStyle: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      fillColor: Colors.grey.shade50,
                      filled: true,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: AppTheme.primaryLight, borderRadius: BorderRadius.circular(6)),
                    child: Row(
                      children: const [
                        Icon(Icons.info_outline, size: 16, color: AppTheme.primary),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Each line represents one faculty record. At least Name, Email, and Phone are required.',
                            style: TextStyle(fontSize: 11, color: AppTheme.primary),
                          ),
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final text = csvController.text.trim();
                      if (text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter CSV data')));
                        return;
                      }

                      final lines = text.split('\n');
                      final List<Map<String, dynamic>> records = [];

                      for (final rawLine in lines) {
                        final line = rawLine.trim();
                        if (line.isEmpty) continue;
                        final parts = line.split(',').map((p) => p.trim()).toList();
                        if (parts.length >= 2) {
                          final name = parts[0];
                          final email = parts[1];
                          final phone = parts.length > 2 ? parts[2] : '';
                          final userId = parts.length > 3 && parts[3].isNotEmpty ? parts[3] : email.toLowerCase();
                          final password = parts.length > 4 && parts[4].isNotEmpty ? parts[4] : 'Teacher@123';

                          records.add({
                            'name': name,
                            'email': email,
                            'phone': phone,
                            'userId': userId,
                            'password': password,
                            ...?defaultBranchId != null ? {'branch_id': defaultBranchId} : null,
                          });
                        }
                      }

                      if (records.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No valid records parsed from input')));
                        return;
                      }

                      setDialogState(() => isSubmitting = true);

                      final res = await StaffService.bulkUploadTeachers(records);

                      if (ctx.mounted) {
                        Navigator.pop(ctx);
                      }

                      if (mounted) {
                        if (res['status'] == 'success' || res['success'] == true) {
                          final data = res['data'] ?? {};
                          final successCount = data['successCount'] ?? records.length;
                          final failedCount = data['failedCount'] ?? 0;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Bulk upload complete: $successCount succeeded, $failedCount failed'),
                              backgroundColor: failedCount > 0 ? AppTheme.warning : AppTheme.success,
                            ),
                          );
                          _fetchTeachers();
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(res['message'] ?? 'Bulk upload failed'), backgroundColor: AppTheme.danger),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Upload Faculty'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Faculty & Teachers',
        actions: [
          IconButton(
            tooltip: 'Bulk Upload',
            icon: const Icon(Icons.upload_file),
            onPressed: _showBulkUploadDialog,
          ),
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: _fetchTeachers,
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        onPressed: _showBulkUploadDialog,
        icon: const Icon(Icons.group_add),
        label: const Text('Bulk Upload'),
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
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('No teachers found.', style: TextStyle(color: AppTheme.textSecondary)),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            onPressed: _showBulkUploadDialog,
                            icon: const Icon(Icons.upload_file),
                            label: const Text('Bulk Upload Faculty'),
                            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          ),
                        ],
                      ),
                    )
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
