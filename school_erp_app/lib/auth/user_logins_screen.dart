import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../academic/academic_theme.dart';
import '../../auth/auth_service.dart';
import '../../auth/constants.dart';
import '../../components/common/confirm_modal.dart';

class UserLoginsScreen extends StatefulWidget {
  const UserLoginsScreen({super.key});

  @override
  State<UserLoginsScreen> createState() => _UserLoginsScreenState();
}

class _UserLoginsScreenState extends State<UserLoginsScreen> {
  bool _loading = true;
  List<dynamic> _users = [];
  List<dynamic> _roles = [];
  List<dynamic> _branches = [];
  String _searchQuery = '';
  String _selectedRoleFilter = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final headers = await _getHeaders();

      final resUsers = await http.get(Uri.parse('${AppConstants.baseUrl}/auth/users'), headers: headers);
      final resRoles = await http.get(Uri.parse('${AppConstants.baseUrl}/auth/roles'), headers: headers);
      final resBranches = await http.get(Uri.parse('${AppConstants.baseUrl}/academic/branches'), headers: headers);

      final usersData = jsonDecode(resUsers.body);
      final rolesData = jsonDecode(resRoles.body);
      final branchesData = jsonDecode(resBranches.body);

      List<dynamic> userList = [];
      if (usersData is List) {
        userList = usersData;
      } else if (usersData['data'] is List) {
        userList = usersData['data'];
      }

      List<dynamic> roleList = [];
      if (rolesData is List) {
        roleList = rolesData;
      } else if (rolesData['data'] is List) {
        roleList = rolesData['data'];
      }

      List<dynamic> branchList = [];
      if (branchesData is List) {
        branchList = branchesData;
      } else if (branchesData['data'] is List) {
        branchList = branchesData['data'];
      }

      if (!mounted) return;
      setState(() {
        _users = userList;
        _roles = roleList;
        _branches = branchList;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to load user accounts: $e'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  Future<void> _handleDelete(String userId, String displayName) async {
    final confirmed = await ConfirmModal.show(
      context: context,
      title: 'Delete User Account?',
      message: 'Are you sure you want to permanently revoke credentials for "$displayName ($userId)"? This user will not be able to log in.',
      confirmLabel: 'Delete Account',
      cancelLabel: 'Cancel',
    );

    if (confirmed != true) return;

    try {
      final headers = await _getHeaders();
      final res = await http.delete(
        Uri.parse('${AppConstants.baseUrl}/auth/users/${Uri.encodeComponent(userId)}'),
        headers: headers,
      );

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && (data['status'] == 'success' || data['success'] == true)) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('User account "$displayName" deleted successfully'),
            backgroundColor: AppTheme.success,
          ),
        );
        _loadData();
      } else {
        throw Exception(data['message'] ?? 'Failed to delete user');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Delete failed: $e'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  void _openAddEditModal([Map<String, dynamic>? user]) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _AddEditUserDialog(
        user: user,
        roles: _roles,
        branches: _branches,
        onSaved: _loadData,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _users.where((item) {
      final uid = (item['user_id'] ?? item['id'] ?? '').toString();
      final email = (item['user_email_id'] ?? item['email'] ?? '').toString();
      final fname = (item['user_first_name'] ?? '').toString();
      final lname = (item['user_last_name'] ?? '').toString();
      final role = (item['user_role'] ?? item['role_id'] ?? item['role'] ?? '').toString();

      if (_selectedRoleFilter.isNotEmpty && !role.toUpperCase().contains(_selectedRoleFilter.toUpperCase())) {
        return false;
      }

      final q = _searchQuery.toLowerCase();
      return '$uid $email $fname $lname $role'.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'User Login Accounts',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload',
            onPressed: _loadData,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddEditModal(),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('New Login'),
      ),
      body: Column(
        children: [
          // Subheader Info
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _loading ? 'Loading user logins...' : '${_users.length} institutional user accounts configured',
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),

          // Filters Card
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            color: Colors.white,
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: 'Search by user ID, email, or name…',
                    hintStyle: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                    prefixIcon: const Icon(Icons.search, size: 20, color: AppTheme.textSecondary),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 16),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                  ),
                  onChanged: (val) {
                    setState(() => _searchQuery = val.trim());
                  },
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _selectedRoleFilter.isEmpty ? '' : _selectedRoleFilter,
                      items: [
                        const DropdownMenuItem(value: '', child: Text('All Assigned Roles', style: TextStyle(fontSize: 13))),
                        ..._roles.map((r) {
                          final rid = (r['MAS_role_id'] ?? r['MAS_ROLE_ID'] ?? r['mas_role_id'] ?? '').toString();
                          final rdesc = (r['MAS_role_DESC'] ?? r['MAS_ROLE_DESC'] ?? r['mas_role_desc'] ?? rid).toString();
                          return DropdownMenuItem(
                            value: rid,
                            child: Text('$rdesc ($rid)', style: const TextStyle(fontSize: 13)),
                          );
                        }),
                      ],
                      onChanged: (val) {
                        setState(() => _selectedRoleFilter = val ?? '');
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // User Accounts List View
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.person_off_outlined, size: 52, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            const Text('No user login accounts found', style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                        itemCount: filtered.length,
                        separatorBuilder: (ctx, idx) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = filtered[index];
                          final userId = (item['user_id'] ?? item['id'] ?? '').toString();
                          final email = (item['user_email_id'] ?? item['email'] ?? '').toString();
                          final fname = (item['user_first_name'] ?? '').toString();
                          final lname = (item['user_last_name'] ?? '').toString();
                          final fullName = '$fname $lname'.trim().isNotEmpty ? '$fname $lname'.trim() : userId;
                          final role = (item['user_role'] ?? item['role_id'] ?? item['role'] ?? 'R_SUPERADMIN').toString();
                          final branchId = (item['user_branch_id'] ?? item['branch_id'] ?? '').toString();

                          return Container(
                            decoration: AppTheme.cardDecoration,
                            child: Padding(
                              padding: const EdgeInsets.all(14.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 20,
                                        backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                                        child: Text(
                                          fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U',
                                          style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              fullName,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15.5, color: Color(0xFF0F172A)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              email,
                                              style: const TextStyle(fontSize: 12.5, color: AppTheme.textSecondary),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          role,
                                          style: const TextStyle(color: Color(0xFF005A9E), fontWeight: FontWeight.w700, fontSize: 11),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      const Icon(Icons.badge_outlined, size: 14, color: AppTheme.textSecondary),
                                      const SizedBox(width: 4),
                                      Text(
                                        'User ID: $userId',
                                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                      ),
                                      if (branchId.isNotEmpty) ...[
                                        const SizedBox(width: 12),
                                        const Icon(Icons.business_outlined, size: 14, color: AppTheme.textSecondary),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            'Branch: $branchId',
                                            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      OutlinedButton.icon(
                                        onPressed: () => _openAddEditModal(item),
                                        icon: const Icon(Icons.edit, size: 15),
                                        label: const Text('Edit Account'),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppTheme.primary,
                                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      OutlinedButton.icon(
                                        onPressed: () => _handleDelete(userId, fullName),
                                        icon: const Icon(Icons.delete_outline, size: 15),
                                        label: const Text('Revoke'),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppTheme.danger,
                                          side: const BorderSide(color: Color(0xFFFECACA)),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

/// Modal dialog for adding and editing user logins
class _AddEditUserDialog extends StatefulWidget {
  final Map<String, dynamic>? user;
  final List<dynamic> roles;
  final List<dynamic> branches;
  final VoidCallback onSaved;

  const _AddEditUserDialog({
    this.user,
    required this.roles,
    required this.branches,
    required this.onSaved,
  });

  @override
  State<_AddEditUserDialog> createState() => _AddEditUserDialogState();
}

class _AddEditUserDialogState extends State<_AddEditUserDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _idController;
  late TextEditingController _emailController;
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _passwdController;
  String _role = 'R_TEACHER';
  String? _branchId;
  bool _saving = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    final user = widget.user;
    if (user != null) {
      _idController = TextEditingController(text: (user['user_id'] ?? user['id'] ?? '').toString());
      _emailController = TextEditingController(text: (user['user_email_id'] ?? user['email'] ?? '').toString());
      _firstNameController = TextEditingController(text: (user['user_first_name'] ?? '').toString());
      _lastNameController = TextEditingController(text: (user['user_last_name'] ?? '').toString());
      _passwdController = TextEditingController();
      _role = (user['user_role'] ?? user['role_id'] ?? 'R_TEACHER').toString();
      _branchId = (user['user_branch_id'] ?? user['branch_id'])?.toString();
    } else {
      _idController = TextEditingController();
      _emailController = TextEditingController();
      _firstNameController = TextEditingController();
      _lastNameController = TextEditingController();
      _passwdController = TextEditingController();
      _role = widget.roles.isNotEmpty
          ? (widget.roles[0]['MAS_role_id'] ?? widget.roles[0]['MAS_ROLE_ID'] ?? widget.roles[0]['mas_role_id'] ?? 'R_TEACHER').toString()
          : 'R_TEACHER';
    }
  }

  @override
  void dispose() {
    _idController.dispose();
    _emailController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _passwdController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    try {
      final token = await AuthService.getToken();
      final headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final payload = <String, dynamic>{
        'user_id': _idController.text.trim(),
        'user_email_id': _emailController.text.trim(),
        'user_first_name': _firstNameController.text.trim(),
        'user_last_name': _lastNameController.text.trim(),
        'user_role': _role,
        if (_branchId != null && _branchId!.isNotEmpty) 'user_branch_id': _branchId,
      };

      if (_passwdController.text.trim().isNotEmpty) {
        payload['user_passwd'] = _passwdController.text.trim();
      }

      http.Response res;
      if (widget.user != null) {
        final id = widget.user!['user_id'] ?? widget.user!['id'];
        res = await http.put(
          Uri.parse('${AppConstants.baseUrl}/auth/users/${Uri.encodeComponent(id.toString())}'),
          headers: headers,
          body: jsonEncode(payload),
        );
      } else {
        res = await http.post(
          Uri.parse('${AppConstants.baseUrl}/auth/users'),
          headers: headers,
          body: jsonEncode(payload),
        );
      }

      final data = jsonDecode(res.body);
      final isSuccess = (res.statusCode == 200 || res.statusCode == 201) &&
          (data['status'] == 'success' || data['success'] == true);

      if (isSuccess) {
        if (!mounted) return;
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.user != null ? 'User account updated successfully' : 'User account created successfully'),
            backgroundColor: AppTheme.success,
          ),
        );
        widget.onSaved();
      } else {
        throw Exception(data['message'] ?? 'Failed to save user account');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Save error: $e'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.user != null;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.all(16),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(isEdit ? Icons.edit : Icons.person_add_alt_1, color: AppTheme.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        isEdit ? 'Edit User Credentials' : 'Create User Login',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A)),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                const Divider(height: 1, color: Color(0xFFE2E8F0)),
                const SizedBox(height: 18),

                // User ID
                const Text('User ID / Username *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _idController,
                  enabled: !isEdit,
                  decoration: InputDecoration(
                    hintText: 'e.g. usr_teacher01',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: isEdit ? const Color(0xFFF1F5F9) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'User ID is required' : null,
                ),
                const SizedBox(height: 14),

                // Email
                const Text('Email Address *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: 'e.g. teacher@myskool.com',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Email is required';
                    if (!val.contains('@') || !val.contains('.')) return 'Invalid email address';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Name fields
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('First Name', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _firstNameController,
                            decoration: InputDecoration(
                              hintText: 'First name',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Last Name', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _lastNameController,
                            decoration: InputDecoration(
                              hintText: 'Last name',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Role Target
                const Text('Assigned System Role *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: widget.roles.any((r) => (r['MAS_role_id'] ?? r['MAS_ROLE_ID'] ?? r['mas_role_id']).toString() == _role)
                      ? _role
                      : (widget.roles.isNotEmpty ? (widget.roles[0]['MAS_role_id'] ?? widget.roles[0]['MAS_ROLE_ID'] ?? widget.roles[0]['mas_role_id']).toString() : null),
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  items: widget.roles.map((r) {
                    final rid = (r['MAS_role_id'] ?? r['MAS_ROLE_ID'] ?? r['mas_role_id'] ?? '').toString();
                    final rdesc = (r['MAS_role_DESC'] ?? r['MAS_ROLE_DESC'] ?? r['mas_role_desc'] ?? rid).toString();
                    return DropdownMenuItem(value: rid, child: Text('$rdesc ($rid)', style: const TextStyle(fontSize: 13.5)));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _role = val);
                  },
                ),
                const SizedBox(height: 14),

                // Branch Association (Optional)
                if (widget.branches.isNotEmpty) ...[
                  const Text('Branch Location (Optional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: widget.branches.any((b) => (b['SCHL_BR_ID'] ?? b['schl_br_id']).toString() == _branchId) ? _branchId : null,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                    ),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('No Specific Branch', style: TextStyle(fontSize: 13.5))),
                      ...widget.branches.map((b) {
                        final bid = (b['SCHL_BR_ID'] ?? b['schl_br_id'] ?? '').toString();
                        final bname = (b['SCHL_BR_NM'] ?? b['schl_br_nm'] ?? bid).toString();
                        return DropdownMenuItem(value: bid, child: Text('$bname ($bid)', style: const TextStyle(fontSize: 13.5)));
                      }),
                    ],
                    onChanged: (val) {
                      setState(() => _branchId = val);
                    },
                  ),
                  const SizedBox(height: 14),
                ],

                // Password
                Text(
                  isEdit ? 'New Password (Leave blank to keep current)' : 'Password *',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155)),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _passwdController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: isEdit ? '••••••••' : 'Enter login password',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, size: 18),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  validator: (val) {
                    if (!isEdit && (val == null || val.trim().isEmpty)) {
                      return 'Password is required for new accounts';
                    }
                    if (val != null && val.trim().isNotEmpty && val.trim().length < 3) {
                      return 'Password must be at least 3 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _saving ? null : () => Navigator.pop(context),
                      child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _saving ? null : _handleSave,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(isEdit ? 'Update Account' : 'Create Account'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

