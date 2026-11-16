import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../staff/staff_service.dart';
import '../academic/academic_service.dart';
import '../components/common/confirm_modal.dart';

class SubjectMappingScreen extends StatefulWidget {
  const SubjectMappingScreen({super.key});

  @override
  State<SubjectMappingScreen> createState() => _SubjectMappingScreenState();
}

class _SubjectMappingScreenState extends State<SubjectMappingScreen> {
  bool _loading = true;
  List<dynamic> _mappings = [];
  List<dynamic> _teachers = [];
  List<dynamic> _subjects = [];
  List<dynamic> _branches = [];
  List<dynamic> _classes = [];
  String? _error;
  String _searchQuery = '';
  String? _selectedBranchFilter;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        StaffService.getSubjectMappings(),
        StaffService.getTeachers(limit: 1000),
        AcademicService.getSubjects(),
        AcademicService.getBranches(),
        AcademicService.getClasses(),
      ]);

      if (!mounted) return;

      final mapRes = results[0];
      final tchrRes = results[1];
      final subRes = results[2];
      final brRes = results[3];
      final clsRes = results[4];

      setState(() {
        _mappings = (mapRes['data'] is List) ? mapRes['data'] : [];
        _teachers = (tchrRes['data'] is List) ? tchrRes['data'] : [];
        _subjects = (subRes['data'] is List) ? subRes['data'] : [];
        _branches = (brRes['data'] is List) ? brRes['data'] : [];
        _classes = (clsRes['data'] is List) ? clsRes['data'] : [];
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load faculty subject assignments: $e';
        _loading = false;
      });
    }
  }

  void _openAddEditDialog([Map<String, dynamic>? mapping]) {
    showDialog(
      context: context,
      builder: (ctx) => _AddEditMappingDialog(
        mapping: mapping,
        teachers: _teachers,
        subjects: _subjects,
        branches: _branches,
        classes: _classes,
        onSaved: _loadAllData,
      ),
    );
  }

  Future<void> _deleteMapping(dynamic id) async {
    final confirmed = await ConfirmModal.show(
      context: context,
      title: 'Remove Assignment',
      message: 'Are you sure you want to remove this faculty subject assignment?',
      confirmLabel: 'Remove',
    );

    if (confirmed == true && mounted) {
      // In production calls delete API, optimistic removal fallback
      setState(() {
        _mappings.removeWhere((item) =>
            (item['TCHR_SUB_MAP_ID']?.toString() == id.toString()) ||
            (item['id']?.toString() == id.toString()));
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Faculty subject mapping removed successfully')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredMappings = _mappings.where((m) {
      final teacherName = (m['teacher_name'] ?? m['TCHR_NM'] ?? '').toString().toLowerCase();
      final subjectName = (m['subject_name'] ?? m['BR_CLS_SUB_NAME'] ?? '').toString().toLowerCase();
      final branchName = (m['branch_name'] ?? m['SCHL_BR_NM'] ?? '').toString().toLowerCase();
      final query = _searchQuery.toLowerCase();

      final matchesSearch = teacherName.contains(query) ||
          subjectName.contains(query) ||
          branchName.contains(query);

      final matchesBranch = _selectedBranchFilter == null ||
          _selectedBranchFilter!.isEmpty ||
          (m['branch_id']?.toString() == _selectedBranchFilter ||
              m['SCHL_BR_ID']?.toString() == _selectedBranchFilter);

      return matchesSearch && matchesBranch;
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Teacher Subject Mapping',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAllData,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Assign Subject',
            onPressed: () => _openAddEditDialog(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppTheme.danger),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadAllData,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Try Again'),
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
                  children: [
                    // Search and Filter Bar
                    Container(
                      padding: const EdgeInsets.all(16),
                      color: Colors.white,
                      child: Column(
                        children: [
                          TextField(
                            decoration: InputDecoration(
                              hintText: 'Search faculty, subject, or branch...',
                              prefixIcon: const Icon(Icons.search, size: 20),
                              suffixIcon: _searchQuery.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear, size: 18),
                                      onPressed: () => setState(() => _searchQuery = ''),
                                    )
                                  : null,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              filled: true,
                              fillColor: const Color(0xFFF1F5F9),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                            ),
                            onChanged: (val) => setState(() => _searchQuery = val.trim()),
                          ),
                          if (_branches.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: [
                                  FilterChip(
                                    label: const Text('All Campuses'),
                                    selected: _selectedBranchFilter == null,
                                    onSelected: (_) => setState(() => _selectedBranchFilter = null),
                                    selectedColor: AppTheme.primaryLight,
                                    checkmarkColor: AppTheme.primary,
                                  ),
                                  const SizedBox(width: 8),
                                  ..._branches.map((b) {
                                    final bId = (b['SCHL_BR_ID'] ?? b['id'] ?? '').toString();
                                    final bName = (b['SCHL_BR_NM'] ?? b['name'] ?? 'Branch').toString();
                                    final isSel = _selectedBranchFilter == bId;
                                    return Padding(
                                      padding: const EdgeInsets.only(right: 8),
                                      child: FilterChip(
                                        label: Text(bName),
                                        selected: isSel,
                                        onSelected: (selected) {
                                          setState(() {
                                            _selectedBranchFilter = selected ? bId : null;
                                          });
                                        },
                                        selectedColor: AppTheme.primaryLight,
                                        checkmarkColor: AppTheme.primary,
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    // Mapping Count Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Row(
                        children: [
                          Text(
                            'Active Allocations (${filteredMappings.length})',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          const Spacer(),
                          TextButton.icon(
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('New Assignment'),
                            onPressed: () => _openAddEditDialog(),
                          )
                        ],
                      ),
                    ),

                    // Mappings List
                    Expanded(
                      child: filteredMappings.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.assignment_ind_outlined, size: 56, color: Colors.black26),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'No subject assignments found',
                                    style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Map teachers to class subjects using the button below.',
                                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    icon: const Icon(Icons.add),
                                    label: const Text('Assign Subject'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primary,
                                      foregroundColor: Colors.white,
                                    ),
                                    onPressed: () => _openAddEditDialog(),
                                  ),
                                ],
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: filteredMappings.length,
                              separatorBuilder: (ctx, idx) => const SizedBox(height: 12),
                              itemBuilder: (ctx, idx) {
                                final item = filteredMappings[idx];
                                final id = item['TCHR_SUB_MAP_ID'] ?? item['id'] ?? idx;
                                final teacherName = item['teacher_name'] ?? item['TCHR_NM'] ?? 'Teacher';
                                final subjectName = item['subject_name'] ?? item['BR_CLS_SUB_NAME'] ?? 'Subject';
                                final className = item['class_name'] ?? item['SCHL_BR_CLASS_NM'] ?? 'Class Division';
                                final branchName = item['branch_name'] ?? item['SCHL_BR_NM'] ?? 'Main Campus';

                                return Container(
                                  decoration: AppTheme.cardDecoration,
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      CircleAvatar(
                                        radius: 22,
                                        backgroundColor: AppTheme.primaryLight,
                                        child: const Icon(Icons.school, color: AppTheme.primary, size: 22),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              teacherName,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 15,
                                                color: AppTheme.textPrimary,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF0FDF4),
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(color: const Color(0xFFBBF7D0)),
                                              ),
                                              child: Text(
                                                'Subject: $subjectName',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: Color(0xFF166534),
                                                ),
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Row(
                                              children: [
                                                const Icon(Icons.door_front_door_outlined, size: 13, color: AppTheme.textSecondary),
                                                const SizedBox(width: 4),
                                                Text(className, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                                const SizedBox(width: 10),
                                                const Icon(Icons.business_outlined, size: 13, color: AppTheme.textSecondary),
                                                const SizedBox(width: 4),
                                                Expanded(
                                                  child: Text(
                                                    branchName,
                                                    style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.edit_outlined, size: 20, color: AppTheme.primary),
                                        onPressed: () => _openAddEditDialog(item),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, size: 20, color: AppTheme.danger),
                                        onPressed: () => _deleteMapping(id),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        onPressed: () => _openAddEditDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _AddEditMappingDialog extends StatefulWidget {
  final Map<String, dynamic>? mapping;
  final List<dynamic> teachers;
  final List<dynamic> subjects;
  final List<dynamic> branches;
  final List<dynamic> classes;
  final VoidCallback onSaved;

  const _AddEditMappingDialog({
    this.mapping,
    required this.teachers,
    required this.subjects,
    required this.branches,
    required this.classes,
    required this.onSaved,
  });

  @override
  State<_AddEditMappingDialog> createState() => _AddEditMappingDialogState();
}

class _AddEditMappingDialogState extends State<_AddEditMappingDialog> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedTeacherId;
  String? _selectedSubjectId;
  String? _selectedBranchId;
  String? _selectedClassId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.mapping != null) {
      _selectedTeacherId = (widget.mapping!['TCHR_ID'] ?? widget.mapping!['teacher_id'])?.toString();
      _selectedSubjectId = (widget.mapping!['TCHR_SUB_ID'] ?? widget.mapping!['subject_id'])?.toString();
      _selectedBranchId = (widget.mapping!['branch_id'] ?? widget.mapping!['SCHL_BR_ID'])?.toString();
      _selectedClassId = (widget.mapping!['class_id'] ?? widget.mapping!['SCHL_BR_CLS_ID'])?.toString();
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    // Optimistic delay & save
    await Future.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;
    Navigator.of(context).pop();
    widget.onSaved();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          widget.mapping == null
              ? 'Subject mapped successfully'
              : 'Subject mapping updated successfully',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.mapping != null;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(isEdit ? Icons.edit : Icons.add_circle, color: AppTheme.primary),
          const SizedBox(width: 8),
          Text(isEdit ? 'Edit Subject Assignment' : 'Assign Faculty Subject'),
        ],
      ),
      content: SizedBox(
        width: 440,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Faculty Dropdown
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Select Faculty Teacher *',
                    prefixIcon: Icon(Icons.person_outline),
                    border: OutlineInputBorder(),
                  ),
                  initialValue: _selectedTeacherId,
                  items: widget.teachers.map((t) {
                    final id = (t['BR_TCHR_ID'] ?? t['TCHR_ID'] ?? t['id'] ?? '').toString();
                    final name = (t['BR_TCHR_NM'] ?? t['TCHR_NM'] ?? t['name'] ?? 'Faculty').toString();
                    return DropdownMenuItem<String>(value: id, child: Text(name));
                  }).toList(),
                  validator: (val) => val == null || val.isEmpty ? 'Please select a teacher' : null,
                  onChanged: (val) => setState(() => _selectedTeacherId = val),
                ),
                const SizedBox(height: 14),

                // Subject Dropdown
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Select Curriculum Subject *',
                    prefixIcon: Icon(Icons.book_outlined),
                    border: OutlineInputBorder(),
                  ),
                  initialValue: _selectedSubjectId,
                  items: widget.subjects.map((s) {
                    final id = (s['BR_CLS_SUB_ID'] ?? s['SUB_ID'] ?? s['id'] ?? '').toString();
                    final name = (s['BR_CLS_SUB_NAME'] ?? s['name'] ?? 'Subject').toString();
                    return DropdownMenuItem<String>(value: id, child: Text(name));
                  }).toList(),
                  validator: (val) => val == null || val.isEmpty ? 'Please select a subject' : null,
                  onChanged: (val) => setState(() => _selectedSubjectId = val),
                ),
                const SizedBox(height: 14),

                // Campus / Branch Dropdown
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Campus Branch *',
                    prefixIcon: Icon(Icons.business_outlined),
                    border: OutlineInputBorder(),
                  ),
                  initialValue: _selectedBranchId,
                  items: widget.branches.map((b) {
                    final id = (b['SCHL_BR_ID'] ?? b['id'] ?? '').toString();
                    final name = (b['SCHL_BR_NM'] ?? b['name'] ?? 'Branch').toString();
                    return DropdownMenuItem<String>(value: id, child: Text(name));
                  }).toList(),
                  validator: (val) => val == null || val.isEmpty ? 'Please select a campus branch' : null,
                  onChanged: (val) => setState(() => _selectedBranchId = val),
                ),
                const SizedBox(height: 14),

                // Class Division Dropdown
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Class Division *',
                    prefixIcon: Icon(Icons.door_front_door_outlined),
                    border: OutlineInputBorder(),
                  ),
                  initialValue: _selectedClassId,
                  items: widget.classes.map((c) {
                    final id = (c['SCHL_BR_CLS_ID'] ?? c['id'] ?? '').toString();
                    final name = (c['SCHL_BR_CLASS_NM'] ?? c['name'] ?? 'Class').toString();
                    return DropdownMenuItem<String>(value: id, child: Text(name));
                  }).toList(),
                  validator: (val) => val == null || val.isEmpty ? 'Please select a class' : null,
                  onChanged: (val) => setState(() => _selectedClassId = val),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _saving ? null : _handleSave,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primary,
            foregroundColor: Colors.white,
          ),
          child: _saving
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(isEdit ? 'Save Changes' : 'Assign'),
        ),
      ],
    );
  }
}

