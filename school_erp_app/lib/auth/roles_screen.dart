import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../academic/academic_theme.dart';
import '../../auth/auth_service.dart';
import '../../auth/constants.dart';
import '../../components/common/confirm_modal.dart';

class RolesScreen extends StatefulWidget {
  const RolesScreen({super.key});

  @override
  State<RolesScreen> createState() => _RolesScreenState();
}

class _RolesScreenState extends State<RolesScreen> {
  bool _loading = true;
  List<dynamic> _roles = [];
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadRoles();
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

  Future<void> _loadRoles() async {
    setState(() => _loading = true);
    try {
      final headers = await _getHeaders();
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/auth/roles'),
        headers: headers,
      );

      final data = jsonDecode(res.body);
      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data['data'] is List) {
        items = data['data'];
      }

      if (!mounted) return;
      setState(() {
        _roles = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to load roles: $e'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  Future<void> _handleDelete(String roleId, String roleDesc) async {
    final confirmed = await ConfirmModal.show(
      context: context,
      title: 'Delete System Role?',
      message: 'Are you sure you want to permanently delete role "$roleDesc ($roleId)"? Users assigned to this role may lose permissions.',
      confirmLabel: 'Delete Role',
      cancelLabel: 'Cancel',
    );

    if (confirmed != true) return;

    try {
      final headers = await _getHeaders();
      final res = await http.delete(
        Uri.parse('${AppConstants.baseUrl}/auth/roles/${Uri.encodeComponent(roleId)}'),
        headers: headers,
      );

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && (data['status'] == 'success' || data['success'] == true)) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Role "$roleDesc" deleted successfully'),
            backgroundColor: AppTheme.success,
          ),
        );
        _loadRoles();
      } else {
        throw Exception(data['message'] ?? 'Failed to delete role');
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

  void _openAddEditModal([Map<String, dynamic>? role]) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _AddEditRoleDialog(
        role: role,
        onSaved: _loadRoles,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _roles.where((item) {
      final rid = (item['MAS_role_id'] ?? item['MAS_ROLE_ID'] ?? item['mas_role_id'] ?? '').toString();
      final rdesc = (item['MAS_role_DESC'] ?? item['MAS_ROLE_DESC'] ?? item['mas_role_desc'] ?? '').toString();
      final rlink = (item['MAS_role_link'] ?? item['MAS_ROLE_LINK'] ?? item['mas_role_link'] ?? '').toString();
      final q = _searchQuery.toLowerCase();
      return '$rid $rdesc $rlink'.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'System Roles',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload',
            onPressed: _loadRoles,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddEditModal(),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Role'),
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
                    _loading ? 'Loading roles...' : '${_roles.length} system roles registered',
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),

          // Search Filter Input
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                isDense: true,
                hintText: 'Search roles by code or description…',
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
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Roles List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.shield_outlined, size: 52, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            const Text('No roles found', style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                        itemCount: filtered.length,
                        separatorBuilder: (ctx, idx) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = filtered[index];
                          final roleId = (item['MAS_role_id'] ?? item['MAS_ROLE_ID'] ?? item['mas_role_id'] ?? '').toString();
                          final roleDesc = (item['MAS_role_DESC'] ?? item['MAS_ROLE_DESC'] ?? item['mas_role_desc'] ?? roleId).toString();
                          final roleLink = (item['MAS_role_link'] ?? item['MAS_ROLE_LINK'] ?? item['mas_role_link'] ?? '/').toString();

                          return Container(
                            decoration: AppTheme.cardDecoration,
                            child: Padding(
                              padding: const EdgeInsets.all(14.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primary.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.shield_outlined, color: AppTheme.primary, size: 22),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              roleDesc,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              roleId,
                                              style: const TextStyle(fontSize: 12.5, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      const Icon(Icons.link, size: 14, color: AppTheme.textSecondary),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Default Gateway: $roleLink',
                                        style: const TextStyle(fontSize: 12, color: Color(0xFF0284C7), fontWeight: FontWeight.w500),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      OutlinedButton.icon(
                                        onPressed: () => _openAddEditModal(item),
                                        icon: const Icon(Icons.edit, size: 15),
                                        label: const Text('Edit'),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppTheme.primary,
                                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      OutlinedButton.icon(
                                        onPressed: () => _handleDelete(roleId, roleDesc),
                                        icon: const Icon(Icons.delete_outline, size: 15),
                                        label: const Text('Delete'),
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

/// Modal dialog for adding and editing Roles with form validation
class _AddEditRoleDialog extends StatefulWidget {
  final Map<String, dynamic>? role;
  final VoidCallback onSaved;

  const _AddEditRoleDialog({this.role, required this.onSaved});

  @override
  State<_AddEditRoleDialog> createState() => _AddEditRoleDialogState();
}

class _AddEditRoleDialogState extends State<_AddEditRoleDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _idController;
  late TextEditingController _descController;
  late TextEditingController _linkController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final role = widget.role;
    if (role != null) {
      _idController = TextEditingController(text: (role['MAS_role_id'] ?? role['MAS_ROLE_ID'] ?? role['mas_role_id'] ?? '').toString());
      _descController = TextEditingController(text: (role['MAS_role_DESC'] ?? role['MAS_ROLE_DESC'] ?? role['mas_role_desc'] ?? '').toString());
      _linkController = TextEditingController(text: (role['MAS_role_link'] ?? role['MAS_ROLE_LINK'] ?? role['mas_role_link'] ?? '/').toString());
    } else {
      _idController = TextEditingController(text: 'R_');
      _descController = TextEditingController();
      _linkController = TextEditingController(text: '/');
    }
  }

  @override
  void dispose() {
    _idController.dispose();
    _descController.dispose();
    _linkController.dispose();
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

      final payload = {
        'MAS_role_id': _idController.text.trim().toUpperCase(),
        'MAS_role_DESC': _descController.text.trim(),
        'MAS_role_link': _linkController.text.trim(),
      };

      http.Response res;
      if (widget.role != null) {
        final id = widget.role!['MAS_role_id'] ?? widget.role!['MAS_ROLE_ID'] ?? widget.role!['mas_role_id'];
        res = await http.put(
          Uri.parse('${AppConstants.baseUrl}/auth/roles/${Uri.encodeComponent(id.toString())}'),
          headers: headers,
          body: jsonEncode(payload),
        );
      } else {
        res = await http.post(
          Uri.parse('${AppConstants.baseUrl}/auth/roles'),
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
            content: Text(widget.role != null ? 'Role updated successfully' : 'Role created successfully'),
            backgroundColor: AppTheme.success,
          ),
        );
        widget.onSaved();
      } else {
        throw Exception(data['message'] ?? 'Failed to save role');
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
    final isEdit = widget.role != null;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.all(16),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
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
                      child: Icon(isEdit ? Icons.edit : Icons.shield_outlined, color: AppTheme.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        isEdit ? 'Edit System Role' : 'Create System Role',
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

                // Role ID field
                const Text('Role ID Code *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _idController,
                  enabled: !isEdit,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    hintText: 'e.g. R_TEACHER',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: isEdit ? const Color(0xFFF1F5F9) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Role ID is required';
                    final trimmed = val.trim();
                    if (!RegExp(r'^[a-zA-Z_-]+$').hasMatch(trimmed)) {
                      return 'Only letters, underscores and hyphens allowed (no numbers)';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Role Description field
                const Text('Role Description / Title *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _descController,
                  decoration: InputDecoration(
                    hintText: 'e.g. Teacher Faculty',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Description is required';
                    if (!RegExp(r'^[a-zA-Z\s]+$').hasMatch(val.trim())) {
                      return 'Description can only contain letters and spaces';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Default Route Link
                const Text('Default Route Link', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _linkController,
                  decoration: InputDecoration(
                    hintText: 'e.g. / or /dashboard',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  validator: (val) {
                    if (val != null && val.trim().isNotEmpty && !val.trim().startsWith('/')) {
                      return 'Link must start with "/"';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // Action buttons
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
                          : Text(isEdit ? 'Update Role' : 'Create Role'),
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

