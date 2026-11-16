import 'package:flutter/material.dart';
import 'academic_theme.dart';
import 'academic_service.dart';

class SchoolDetailsScreen extends StatefulWidget {
  const SchoolDetailsScreen({super.key});

  @override
  State<SchoolDetailsScreen> createState() => _SchoolDetailsScreenState();
}

class _SchoolDetailsScreenState extends State<SchoolDetailsScreen> {
  bool _loading = true;
  Map<String, dynamic>? _details;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchSchoolDetails();
  }

  Future<void> _fetchSchoolDetails() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await AcademicService.getSchoolDetails();
    if (!mounted) return;

    if ((res['status'] == 'success' || res['success'] == true)) {
      final list = res['data'];
      setState(() {
        _details = (list is List && list.isNotEmpty) ? list[0] : (res['data'] is Map ? res['data'] : {});
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load school details';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final schoolName = _details?['school_name'] ?? _details?['SCHL_NM'] ?? 'MySkool Institution';
    final registrationNo = _details?['reg_no'] ?? _details?['SCHL_REG_NO'] ?? 'N/A';
    final email = _details?['email'] ?? _details?['SCHL_EMAIL_ID'] ?? 'contact@school.com';
    final phone = _details?['phone'] ?? _details?['SCHL_CONT_NO1'] ?? 'N/A';
    final address = _details?['address'] ?? _details?['SCHL_ADD'] ?? 'N/A';

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'School Profile',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchSchoolDetails,
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
                          onPressed: _fetchSchoolDetails,
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          child: const Text('Try Again'),
                        )
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      // Header card
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: AppTheme.cardDecoration,
                        child: Column(
                          children: [
                            Container(
                              width: 72,
                              height: 72,
                              decoration: const BoxDecoration(
                                color: AppTheme.primaryLight,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.school, size: 40, color: AppTheme.primary),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              schoolName,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Reg No: $registrationNo',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Information sections
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: AppTheme.cardDecoration,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Institutional Contact Details',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 16),
                            _buildInfoTile(Icons.email_outlined, 'Email', email),
                            const Divider(color: AppTheme.border),
                            _buildInfoTile(Icons.phone_outlined, 'Contact Phone', phone),
                            const Divider(color: AppTheme.border),
                            _buildInfoTile(Icons.location_on_outlined, 'Address', address),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildInfoTile(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppTheme.primary),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

