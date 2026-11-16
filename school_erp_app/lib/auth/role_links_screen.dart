import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../academic/academic_theme.dart';
import '../../auth/auth_service.dart';
import '../../auth/constants.dart';
import '../../components/common/confirm_modal.dart';

class RoleLinksScreen extends StatefulWidget {
  const RoleLinksScreen({super.key});

  @override
  State<RoleLinksScreen> createState() => _RoleLinksScreenState();
}

class _RoleLinksScreenState extends State<RoleLinksScreen> {
  bool _loading = true;
  List<dynamic> _links = [];
  List<dynamic> _roles = [];
  String _searchQuery = '';
  String _selectedRoleFilter = '';
  String _selectedStatusFilter = '';
  String? _togglingId;

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

      final resLinks = await http.get(
        Uri.parse('${AppConstants.baseUrl}/auth/role-links'),
        headers: headers,
      );
      final resRoles = await http.get(
        Uri.parse('${AppConstants.baseUrl}/auth/roles'),
        headers: headers,
      );

      final linksData = jsonDecode(resLinks.body);
      final rolesData = jsonDecode(resRoles.body);

      List<dynamic> linkList = [];
      if (linksData is List) {
        linkList = linksData;
      } else if (linksData['data'] is List) {
        linkList = linksData['data'];
      }

      List<dynamic> roleList = [];
      if (rolesData is List) {
        roleList = rolesData;
      } else if (rolesData['data'] is List) {
        roleList = rolesData['data'];
      }

      if (!mounted) return;
      setState(() {
        _links = linkList;
        _roles = roleList;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to load role links: $e'),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  Future<void> _handleToggleStatus(Map<String, dynamic> item) async {
    final id = item['SM_RL_ID'] ?? item['sm_rl_id'];
    if (id == null || _togglingId != null) return;

    final currentStatus = (item['SM_RL_STATUS'] ?? item['sm_rl_status'] ?? 'ACTIVE').toString().toUpperCase();
    final nextStatus = currentStatus == 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    setState(() {
      _togglingId = id.toString();
      final idx = _links.indexWhere((l) => (l['SM_RL_ID'] ?? l['sm_rl_id']).toString() == id.toString());
      if (idx != -1) {
        _links[idx]['SM_RL_STATUS'] = nextStatus;
      }
    });

    try {
      final headers = await _getHeaders();
      final uri = Uri.parse('${AppConstants.baseUrl}/auth/role-links/${Uri.encodeComponent(id.toString())}/toggle-status');
      final res = await http.post(
        uri,
        headers: headers,
        body: jsonEncode({'SM_RL_STATUS': nextStatus}),
      );

      if (res.statusCode != 200 && res.statusCode != 201) {
        // Fallback to update
        await http.put(
          Uri.parse('${AppConstants.baseUrl}/auth/role-links/${Uri.encodeComponent(id.toString())}'),
          headers: headers,
          body: jsonEncode({
            ...item,
            'SM_RL_STATUS': nextStatus,
          }),
        );
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"${item['SM_RL_LINK_DESC'] ?? 'Link'}" is now ${nextStatus == 'ACTIVE' ? 'Active' : 'Deactivated'}'),
          backgroundColor: nextStatus == 'ACTIVE' ? AppTheme.success : Colors.orange.shade700,
        ),
      );
    } catch (_) {
      // Revert on failure
      if (!mounted) return;
      setState(() {
        final idx = _links.indexWhere((l) => (l['SM_RL_ID'] ?? l['sm_rl_id']).toString() == id.toString());
        if (idx != -1) {
          _links[idx]['SM_RL_STATUS'] = currentStatus;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to update status'),
          backgroundColor: AppTheme.danger,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _togglingId = null);
      }
    }
  }

  Future<void> _handleDelete(String id, String label) async {
    final confirmed = await ConfirmModal.show(
      context: context,
      title: 'Delete Navigation Route?',
      message: 'Are you sure you want to remove "$label"? This link will no longer appear in the sidepanel menu.',
      confirmLabel: 'Delete Route',
      cancelLabel: 'Keep',
    );

    if (confirmed != true) return;

    try {
      final headers = await _getHeaders();
      final res = await http.delete(
        Uri.parse('${AppConstants.baseUrl}/auth/role-links/${Uri.encodeComponent(id)}'),
        headers: headers,
      );

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && (data['status'] == 'success' || data['success'] == true)) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Deleted route "$label" successfully'),
            backgroundColor: AppTheme.success,
          ),
        );
        _loadData();
      } else {
        throw Exception(data['message'] ?? 'Failed to delete');
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

  void _openAddEditModal([Map<String, dynamic>? link]) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _AddEditRoleLinkDialog(
        link: link,
        roles: _roles,
        currentCount: _links.length,
        onSaved: () {
          _loadData();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _links.where((item) {
      final roleId = (item['SM_RL_ROLE_ID'] ?? item['sm_rl_role_id'] ?? '').toString();
      final desc = (item['SM_RL_LINK_DESC'] ?? item['sm_rl_link_desc'] ?? '').toString();
      final url = (item['SM_RL_LINK_URL'] ?? item['sm_rl_link_url'] ?? '').toString();
      final submenu = (item['SM_RL_SUBMENU'] ?? item['sm_rl_submenu'] ?? '').toString();
      final status = (item['SM_RL_STATUS'] ?? item['sm_rl_status'] ?? 'ACTIVE').toString().toUpperCase();

      if (_selectedRoleFilter.isNotEmpty && roleId != _selectedRoleFilter) {
        return false;
      }
      if (_selectedStatusFilter.isNotEmpty && status != _selectedStatusFilter) {
        return false;
      }

      final query = _searchQuery.toLowerCase();
      return '$roleId $desc $url $submenu $status'.toLowerCase().contains(query);
    }).toList();

    final activeCount = _links.where((l) => (l['SM_RL_STATUS'] ?? l['sm_rl_status'] ?? 'ACTIVE').toString().toUpperCase() == 'ACTIVE').length;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Role Links (Sidepanel Menu)',
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
        icon: const Icon(Icons.add),
        label: const Text('Add Route'),
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
                    _loading
                        ? 'Loading navigation matrix...'
                        : '${_links.length} total navigation routes ($activeCount active)',
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
                // Search bar
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: 'Search by label, route URL, or category…',
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
                Row(
                  children: [
                    // Role Filter Dropdown
                    Expanded(
                      flex: 3,
                      child: Container(
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
                              const DropdownMenuItem(value: '', child: Text('All Roles', style: TextStyle(fontSize: 13))),
                              ..._roles.map((r) {
                                final rid = (r['MAS_role_id'] ?? r['MAS_ROLE_ID'] ?? r['mas_role_id'] ?? '').toString();
                                final rdesc = (r['MAS_role_DESC'] ?? r['MAS_ROLE_DESC'] ?? r['mas_role_desc'] ?? rid).toString();
                                return DropdownMenuItem(
                                  value: rid,
                                  child: Text('$rdesc ($rid)', style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
                                );
                              }),
                            ],
                            onChanged: (val) {
                              setState(() => _selectedRoleFilter = val ?? '');
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Status Filter Dropdown
                    Expanded(
                      flex: 2,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: _selectedStatusFilter.isEmpty ? '' : _selectedStatusFilter,
                            items: const [
                              DropdownMenuItem(value: '', child: Text('All Status', style: TextStyle(fontSize: 13))),
                              DropdownMenuItem(value: 'ACTIVE', child: Text('Active Only', style: TextStyle(fontSize: 13))),
                              DropdownMenuItem(value: 'INACTIVE', child: Text('Inactive Only', style: TextStyle(fontSize: 13))),
                            ],
                            onChanged: (val) {
                              setState(() => _selectedStatusFilter = val ?? '');
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Role Links List View
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.link_off, size: 52, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            const Text('No role navigation links match the filters', style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                        itemCount: filtered.length,
                        separatorBuilder: (ctx, idx) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = filtered[index];
                          final id = (item['SM_RL_ID'] ?? item['sm_rl_id'] ?? '').toString();
                          final roleId = (item['SM_RL_ROLE_ID'] ?? item['sm_rl_role_id'] ?? '').toString();
                          final desc = (item['SM_RL_LINK_DESC'] ?? item['sm_rl_link_desc'] ?? 'Navigation Link').toString();
                          final url = (item['SM_RL_LINK_URL'] ?? item['sm_rl_link_url'] ?? '/').toString();
                          final submenu = (item['SM_RL_SUBMENU'] ?? item['sm_rl_submenu'] ?? 'Overview').toString();
                          final srl = (item['SM_RL_LINK_SRL'] ?? item['sm_rl_link_srl'] ?? 1).toString();
                          final status = (item['SM_RL_STATUS'] ?? item['sm_rl_status'] ?? 'ACTIVE').toString().toUpperCase();
                          final isActive = status == 'ACTIVE';
                          final isToggling = _togglingId == id;

                          return Container(
                            decoration: AppTheme.cardDecoration,
                            child: Padding(
                              padding: const EdgeInsets.all(14.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Category / Section Tag
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primary.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          submenu.toUpperCase(),
                                          style: const TextStyle(
                                            color: AppTheme.primary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      // Seq tag
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          'Seq #$srl',
                                          style: const TextStyle(
                                            color: AppTheme.textSecondary,
                                            fontWeight: FontWeight.w600,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ),
                                      const Spacer(),
                                      // Status badge with toggle button
                                      InkWell(
                                        onTap: isToggling ? null : () => _handleToggleStatus(item),
                                        borderRadius: BorderRadius.circular(20),
                                        child: isToggling
                                            ? const SizedBox(
                                                width: 18,
                                                height: 18,
                                                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                                              )
                                            : Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: isActive ? const Color(0x1A10B981) : const Color(0x1AEF4444),
                                                  borderRadius: BorderRadius.circular(20),
                                                  border: Border.all(
                                                    color: isActive ? AppTheme.success : AppTheme.danger,
                                                    width: 1,
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      isActive ? Icons.check_circle : Icons.cancel,
                                                      size: 13,
                                                      color: isActive ? AppTheme.success : AppTheme.danger,
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      isActive ? 'Active' : 'Inactive',
                                                      style: TextStyle(
                                                        fontSize: 11.5,
                                                        fontWeight: FontWeight.w700,
                                                        color: isActive ? AppTheme.success : AppTheme.danger,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  // Title
                                  Text(
                                    desc,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  // Route Path & Role Code
                                  Row(
                                    children: [
                                      const Icon(Icons.link, size: 14, color: AppTheme.textSecondary),
                                      const SizedBox(width: 4),
                                      Text(
                                        url,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500,
                                          color: Color(0xFF0284C7),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      const Icon(Icons.badge_outlined, size: 14, color: AppTheme.textSecondary),
                                      const SizedBox(width: 4),
                                      Text(
                                        roleId,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  // Action Buttons
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      OutlinedButton.icon(
                                        onPressed: () => _openAddEditModal(item),
                                        icon: const Icon(Icons.edit, size: 15),
                                        label: const Text('Edit Route'),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppTheme.primary,
                                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      OutlinedButton.icon(
                                        onPressed: () => _handleDelete(id, desc),
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

/// Modal dialog for creating and updating Role Links with field validation
class _AddEditRoleLinkDialog extends StatefulWidget {
  final Map<String, dynamic>? link;
  final List<dynamic> roles;
  final int currentCount;
  final VoidCallback onSaved;

  const _AddEditRoleLinkDialog({
    this.link,
    required this.roles,
    required this.currentCount,
    required this.onSaved,
  });

  @override
  State<_AddEditRoleLinkDialog> createState() => _AddEditRoleLinkDialogState();
}

class _AddEditRoleLinkDialogState extends State<_AddEditRoleLinkDialog> {
  final _formKey = GlobalKey<FormState>();
  late String _roleId;
  late TextEditingController _descController;
  late TextEditingController _urlController;
  late TextEditingController _submenuController;
  late TextEditingController _srlController;
  String _status = 'ACTIVE';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final link = widget.link;
    if (link != null) {
      _roleId = (link['SM_RL_ROLE_ID'] ?? link['sm_rl_role_id'] ?? '').toString();
      _descController = TextEditingController(text: (link['SM_RL_LINK_DESC'] ?? link['sm_rl_link_desc'] ?? '').toString());
      _urlController = TextEditingController(text: (link['SM_RL_LINK_URL'] ?? link['sm_rl_link_url'] ?? '').toString());
      _submenuController = TextEditingController(text: (link['SM_RL_SUBMENU'] ?? link['sm_rl_submenu'] ?? '').toString());
      _srlController = TextEditingController(text: (link['SM_RL_LINK_SRL'] ?? link['sm_rl_link_srl'] ?? 1).toString());
      final st = (link['SM_RL_STATUS'] ?? link['sm_rl_status'] ?? 'ACTIVE').toString().toUpperCase();
      _status = st == 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    } else {
      final firstRole = widget.roles.isNotEmpty
          ? (widget.roles[0]['MAS_role_id'] ?? widget.roles[0]['MAS_ROLE_ID'] ?? widget.roles[0]['mas_role_id'] ?? 'R_SUPERADMIN').toString()
          : 'R_SUPERADMIN';
      _roleId = firstRole;
      _descController = TextEditingController();
      _urlController = TextEditingController(text: '/');
      _submenuController = TextEditingController(text: 'Overview');
      _srlController = TextEditingController(text: (widget.currentCount + 1).toString());
      _status = 'ACTIVE';
    }
  }

  @override
  void dispose() {
    _descController.dispose();
    _urlController.dispose();
    _submenuController.dispose();
    _srlController.dispose();
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
        'SM_RL_ROLE_ID': _roleId,
        'SM_RL_LINK_DESC': _descController.text.trim(),
        'SM_RL_LINK_URL': _urlController.text.trim(),
        'SM_RL_LINK_SRL': int.tryParse(_srlController.text.trim()) ?? 1,
        'SM_RL_SUBMENU': _submenuController.text.trim(),
        'SM_RL_STATUS': _status,
      };

      http.Response res;
      if (widget.link != null) {
        final id = widget.link!['SM_RL_ID'] ?? widget.link!['sm_rl_id'];
        res = await http.put(
          Uri.parse('${AppConstants.baseUrl}/auth/role-links/${Uri.encodeComponent(id.toString())}'),
          headers: headers,
          body: jsonEncode(payload),
        );
      } else {
        res = await http.post(
          Uri.parse('${AppConstants.baseUrl}/auth/role-links'),
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
            content: Text(widget.link != null ? 'Role navigation link updated' : 'Role navigation link added'),
            backgroundColor: AppTheme.success,
          ),
        );
        widget.onSaved();
      } else {
        throw Exception(data['message'] ?? 'Failed to save link');
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
    final isEdit = widget.link != null;

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
                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(isEdit ? Icons.edit : Icons.add_link, color: AppTheme.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        isEdit ? 'Edit Role Navigation Route' : 'Add New Role Route',
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

                // Role Dropdown
                const Text('Role Target *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: widget.roles.any((r) => (r['MAS_role_id'] ?? r['MAS_ROLE_ID'] ?? r['mas_role_id']).toString() == _roleId)
                      ? _roleId
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
                    return DropdownMenuItem(
                      value: rid,
                      child: Text('$rdesc ($rid)', style: const TextStyle(fontSize: 13.5)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _roleId = val);
                  },
                  validator: (val) => val == null || val.isEmpty ? 'Role is required' : null,
                ),
                const SizedBox(height: 14),

                // Link Title / Description
                const Text('Link Title / Description *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _descController,
                  decoration: InputDecoration(
                    hintText: 'e.g., Associate Branches',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Link title is required';
                    if (val.trim().length < 2) return 'Must be at least 2 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Route URL Path
                const Text('Route URL Path *', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _urlController,
                  decoration: InputDecoration(
                    hintText: 'e.g., /school/branches',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Route URL path is required';
                    if (!val.trim().startsWith('/') && !val.trim().startsWith('http')) {
                      return 'URL path must begin with "/" (e.g. /school/branches)';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Category Submenu & Sequence Row
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Submenu Section', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _submenuController,
                            decoration: InputDecoration(
                              hintText: 'e.g., Overview, Academic',
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
                      flex: 1,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Sequence #', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _srlController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              hintText: '1',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                            ),
                            validator: (val) {
                              if (val != null && val.isNotEmpty && int.tryParse(val) == null) {
                                return 'Must be a number';
                              }
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Status Toggle Row
                Row(
                  children: [
                    const Text('Status:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF334155))),
                    const SizedBox(width: 16),
                    ChoiceChip(
                      label: const Text('Active'),
                      selected: _status == 'ACTIVE',
                      selectedColor: const Color(0xFFDCFCE7),
                      onSelected: (sel) {
                        if (sel) setState(() => _status = 'ACTIVE');
                      },
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text('Inactive'),
                      selected: _status == 'INACTIVE',
                      selectedColor: const Color(0xFFFEE2E2),
                      onSelected: (sel) {
                        if (sel) setState(() => _status = 'INACTIVE');
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Action Buttons
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
                          : Text(isEdit ? 'Update Link' : 'Add Link'),
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

