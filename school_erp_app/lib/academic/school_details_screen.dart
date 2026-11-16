import 'package:flutter/material.dart';
import 'academic_theme.dart';
import 'academic_service.dart';
import '../components/common/confirm_modal.dart';

class SchoolDetailsScreen extends StatefulWidget {
  const SchoolDetailsScreen({super.key});

  @override
  State<SchoolDetailsScreen> createState() => _SchoolDetailsScreenState();
}

class _SchoolDetailsScreenState extends State<SchoolDetailsScreen> {
  bool _loading = true;
  List<dynamic> _schools = [];
  List<dynamic> _boards = [];
  String? _error;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadAllSchoolsAndBoards();
  }

  Future<void> _loadAllSchoolsAndBoards() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        AcademicService.getSchoolDetails(),
        AcademicService.getBoards(),
      ]);

      if (!mounted) return;

      final schoolRes = results[0];
      final boardsRes = results[1];

      setState(() {
        if (schoolRes['data'] is List) {
          _schools = schoolRes['data'];
        } else if (schoolRes['data'] is Map) {
          _schools = [schoolRes['data']];
        } else {
          _schools = [];
        }

        if (boardsRes['data'] is List) {
          _boards = boardsRes['data'];
        }

        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load school center directory: $e';
        _loading = false;
      });
    }
  }

  void _openAddEditSchoolDialog([Map<String, dynamic>? school]) {
    showDialog(
      context: context,
      builder: (ctx) => _AddEditSchoolDialog(
        school: school,
        boards: _boards,
        onSaved: _loadAllSchoolsAndBoards,
      ),
    );
  }

  Future<void> _deleteSchool(String id) async {
    final confirmed = await ConfirmModal.show(
      context: context,
      title: 'Delete School Center',
      message: 'Are you sure you want to remove this institutional school center and its association records?',
      confirmLabel: 'Delete',
    );

    if (confirmed == true && mounted) {
      final res = await AcademicService.deleteSchool(id);
      if (!mounted) return;

      if (res['status'] == 'success' || res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('School center removed successfully')),
        );
        _loadAllSchoolsAndBoards();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['message'] ?? 'Failed to delete school center')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredSchools = _schools.where((s) {
      final name = (s['schl_mn_nm'] ?? s['SCHL_MN_NM'] ?? s['school_name'] ?? '').toString().toLowerCase();
      final city = (s['schl_mn_city'] ?? s['SCHL_MN_CITY'] ?? s['city'] ?? '').toString().toLowerCase();
      final state = (s['schl_mn_state'] ?? s['SCHL_MN_STATE'] ?? s['state'] ?? '').toString().toLowerCase();
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || city.contains(query) || state.contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'School Centers Directory',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload',
            onPressed: _loadAllSchoolsAndBoards,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Add School Center',
            onPressed: () => _openAddEditSchoolDialog(),
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
                          onPressed: _loadAllSchoolsAndBoards,
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
                    // Search Bar
                    Container(
                      padding: const EdgeInsets.all(16),
                      color: Colors.white,
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Search school centers by name, city, state...',
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
                    ),

                    // Roster Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                      child: Row(
                        children: [
                          const Icon(Icons.account_balance, size: 18, color: AppTheme.primary),
                          const SizedBox(width: 8),
                          Text(
                            'Institutional Center Roster (${filteredSchools.length})',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
                          ),
                          const Spacer(),
                          TextButton.icon(
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Register School'),
                            onPressed: () => _openAddEditSchoolDialog(),
                          )
                        ],
                      ),
                    ),

                    // Schools List
                    Expanded(
                      child: filteredSchools.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.domain_disabled, size: 56, color: Colors.black26),
                                  const SizedBox(height: 12),
                                  const Text('No school centers found', style: TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  const Text('Register your first main school center below.', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    icon: const Icon(Icons.add),
                                    label: const Text('Register School'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primary,
                                      foregroundColor: Colors.white,
                                    ),
                                    onPressed: () => _openAddEditSchoolDialog(),
                                  ),
                                ],
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: filteredSchools.length,
                              separatorBuilder: (ctx, idx) => const SizedBox(height: 12),
                              itemBuilder: (ctx, idx) {
                                final item = filteredSchools[idx];
                                final id = (item['schl_mn_id'] ?? item['SCHL_MN_ID'] ?? item['id'] ?? '').toString();
                                final name = item['schl_mn_nm'] ?? item['SCHL_MN_NM'] ?? item['school_name'] ?? 'School Center';
                                final city = item['schl_mn_city'] ?? item['SCHL_MN_CITY'] ?? item['city'] ?? '';
                                final state = item['schl_mn_state'] ?? item['SCHL_MN_STATE'] ?? item['state'] ?? '';
                                final email = item['schl_mn_emailid'] ?? item['SCHL_MN_EMAILID'] ?? item['email'] ?? '';
                                final phone = item['schl_mn_contactno'] ?? item['SCHL_MN_CONTACTNO'] ?? item['phone'] ?? '';
                                final board = item['schl_brd_id'] ?? item['SCHL_BRD_ID'] ?? 'CBSE';
                                final lang = item['schl_language'] ?? item['SCHL_LANGUAGE'] ?? 'English';
                                final status = item['schl_mn_status'] ?? item['SCHL_MN_STATUS'] ?? 'ACTIVE';

                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: AppTheme.cardDecoration,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          CircleAvatar(
                                            radius: 22,
                                            backgroundColor: AppTheme.primaryLight,
                                            child: const Icon(Icons.account_balance, color: AppTheme.primary, size: 22),
                                          ),
                                          const SizedBox(width: 14),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  name,
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                                                ),
                                                const SizedBox(height: 4),
                                                Row(
                                                  children: [
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                                      decoration: BoxDecoration(
                                                        color: const Color(0xFFF1F5F9),
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                      child: Text(
                                                        'ID: $id',
                                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 6),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                                      decoration: BoxDecoration(
                                                        color: const Color(0xFFEFF6FF),
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                      child: Text(
                                                        'Board: $board',
                                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1D4ED8)),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 6),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                                      decoration: BoxDecoration(
                                                        color: const Color(0xFFF0FDF4),
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                      child: Text(
                                                        status,
                                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.edit_outlined, size: 20, color: AppTheme.primary),
                                            onPressed: () => _openAddEditSchoolDialog(item),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, size: 20, color: AppTheme.danger),
                                            onPressed: () => _deleteSchool(id),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                      const SizedBox(height: 10),
                                      Row(
                                        children: [
                                          const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.textSecondary),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(
                                              '$city, $state (Medium: $lang)',
                                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                            ),
                                          ),
                                          if (phone.isNotEmpty) ...[
                                            const Icon(Icons.phone_outlined, size: 14, color: AppTheme.textSecondary),
                                            const SizedBox(width: 4),
                                            Text(phone, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                          ],
                                        ],
                                      ),
                                      if (email.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            const Icon(Icons.email_outlined, size: 14, color: AppTheme.textSecondary),
                                            const SizedBox(width: 4),
                                            Text(email, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                          ],
                                        ),
                                      ]
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
        onPressed: () => _openAddEditSchoolDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _AddEditSchoolDialog extends StatefulWidget {
  final Map<String, dynamic>? school;
  final List<dynamic> boards;
  final VoidCallback onSaved;

  const _AddEditSchoolDialog({
    this.school,
    required this.boards,
    required this.onSaved,
  });

  @override
  State<_AddEditSchoolDialog> createState() => _AddEditSchoolDialogState();
}

class _AddEditSchoolDialogState extends State<_AddEditSchoolDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _idController;
  late TextEditingController _nameController;
  late TextEditingController _addressController;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _pinController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _passwordController;
  String _selectedBoard = 'CBSE';
  String _selectedLanguage = 'English';
  String _selectedStatus = 'ACTIVE';
  bool _obscurePassword = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final s = widget.school;
    _idController = TextEditingController(text: (s?['schl_mn_id'] ?? s?['SCHL_MN_ID'] ?? '').toString());
    _nameController = TextEditingController(text: (s?['schl_mn_nm'] ?? s?['SCHL_MN_NM'] ?? '').toString());
    _addressController = TextEditingController(text: (s?['schl_mn_address'] ?? s?['SCHL_MN_ADDRESS'] ?? '').toString());
    _cityController = TextEditingController(text: (s?['schl_mn_city'] ?? s?['SCHL_MN_CITY'] ?? '').toString());
    _stateController = TextEditingController(text: (s?['schl_mn_state'] ?? s?['SCHL_MN_STATE'] ?? '').toString());
    _pinController = TextEditingController(text: (s?['schl_mn_pin'] ?? s?['SCHL_MN_PIN'] ?? '').toString());
    _emailController = TextEditingController(text: (s?['schl_mn_emailid'] ?? s?['SCHL_MN_EMAILID'] ?? '').toString());
    _phoneController = TextEditingController(text: (s?['schl_mn_contactno'] ?? s?['SCHL_MN_CONTACTNO'] ?? '').toString());
    _passwordController = TextEditingController();

    if (s != null) {
      _selectedBoard = (s['schl_brd_id'] ?? s['SCHL_BRD_ID'] ?? 'CBSE').toString();
      _selectedLanguage = (s['schl_language'] ?? s['SCHL_LANGUAGE'] ?? 'English').toString();
      _selectedStatus = (s['schl_mn_status'] ?? s['SCHL_MN_STATUS'] ?? 'ACTIVE').toString();
    }
  }

  @override
  void dispose() {
    _idController.dispose();
    _nameController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pinController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    final isEdit = widget.school != null;

    final body = {
      'schl_mn_id': _idController.text.trim(),
      'schl_mn_nm': _nameController.text.trim(),
      'schl_mn_address': _addressController.text.trim(),
      'schl_mn_city': _cityController.text.trim(),
      'schl_mn_state': _stateController.text.trim(),
      'schl_mn_pin': _pinController.text.trim(),
      'schl_mn_country': 'India',
      'schl_mn_emailid': _emailController.text.trim(),
      'schl_mn_contactno': _phoneController.text.trim(),
      'schl_brd_id': _selectedBoard,
      'schl_language': _selectedLanguage,
      'schl_mn_status': _selectedStatus,
      if (_passwordController.text.isNotEmpty) 'schl_mn_password': _passwordController.text.trim(),
    };

    final res = await AcademicService.saveSchool(
      body,
      schoolId: isEdit ? _idController.text.trim() : null,
    );

    if (!mounted) return;
    setState(() => _saving = false);

    if (res['status'] == 'success' || res['success'] == true) {
      Navigator.of(context).pop();
      widget.onSaved();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isEdit ? 'School center updated successfully' : 'School center created successfully')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['message'] ?? 'Failed to save school center')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.school != null;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(isEdit ? Icons.edit_note : Icons.add_business, color: AppTheme.primary),
          const SizedBox(width: 8),
          Text(isEdit ? 'Edit School Center' : 'Register New School Center'),
        ],
      ),
      content: SizedBox(
        width: 480,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // School ID
                TextFormField(
                  controller: _idController,
                  enabled: !isEdit,
                  decoration: InputDecoration(
                    labelText: 'School Center ID *',
                    hintText: 'e.g. SCH001',
                    prefixIcon: const Icon(Icons.badge_outlined),
                    border: const OutlineInputBorder(),
                    filled: isEdit,
                    fillColor: isEdit ? Colors.grey.shade100 : null,
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'School ID is required' : null,
                ),
                const SizedBox(height: 12),

                // School Name
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'School Name *',
                    hintText: 'e.g. St. Xavier International Academy',
                    prefixIcon: Icon(Icons.school_outlined),
                    border: OutlineInputBorder(),
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'School name is required' : null,
                ),
                const SizedBox(height: 12),

                // Board & Medium
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          labelText: 'Affiliation Board *',
                          border: OutlineInputBorder(),
                        ),
                        initialValue: _selectedBoard,
                        items: ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge'].map((b) {
                          return DropdownMenuItem(value: b, child: Text(b));
                        }).toList(),
                        onChanged: (val) => setState(() => _selectedBoard = val ?? 'CBSE'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          labelText: 'Medium *',
                          border: OutlineInputBorder(),
                        ),
                        initialValue: _selectedLanguage,
                        items: ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati'].map((l) {
                          return DropdownMenuItem(value: l, child: Text(l));
                        }).toList(),
                        onChanged: (val) => setState(() => _selectedLanguage = val ?? 'English'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Email & Contact
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _emailController,
                        decoration: const InputDecoration(
                          labelText: 'Email Address *',
                          prefixIcon: Icon(Icons.email_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) return 'Email is required';
                          if (!val.contains('@')) return 'Enter a valid email';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Contact Phone *',
                          prefixIcon: Icon(Icons.phone_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) => val == null || val.trim().isEmpty ? 'Phone is required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // City & State
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _cityController,
                        decoration: const InputDecoration(
                          labelText: 'City *',
                          prefixIcon: Icon(Icons.location_city_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) => val == null || val.trim().isEmpty ? 'City is required' : null,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _stateController,
                        decoration: const InputDecoration(
                          labelText: 'State *',
                          prefixIcon: Icon(Icons.map_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) => val == null || val.trim().isEmpty ? 'State is required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Address & PIN
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextFormField(
                        controller: _addressController,
                        decoration: const InputDecoration(
                          labelText: 'Address *',
                          prefixIcon: Icon(Icons.home_work_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) => val == null || val.trim().isEmpty ? 'Address is required' : null,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 1,
                      child: TextFormField(
                        controller: _pinController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'PIN Code *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) => val == null || val.trim().isEmpty ? 'PIN required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Admin Password
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: isEdit ? 'Admin Password (leave blank to keep current)' : 'Admin Password *',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                    border: const OutlineInputBorder(),
                  ),
                  validator: (val) {
                    if (!isEdit && (val == null || val.trim().length < 6)) {
                      return 'Minimum 6 characters required';
                    }
                    return null;
                  },
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
              : Text(isEdit ? 'Save Changes' : 'Register Center'),
        ),
      ],
    );
  }
}
