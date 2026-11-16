import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import 'finance_service.dart';

class FeeManagementScreen extends StatefulWidget {
  const FeeManagementScreen({super.key});

  @override
  State<FeeManagementScreen> createState() => _FeeManagementScreenState();
}

class _FeeManagementScreenState extends State<FeeManagementScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _loading = true;
  Map<String, dynamic> _overview = {};
  List<dynamic> _structures = [];
  List<dynamic> _invoices = [];
  List<dynamic> _payments = [];
  List<dynamic> _fines = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadAllFinanceData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllFinanceData() async {
    setState(() {
      _loading = true;
    });

    final resOverview = await FinanceService.getOverview();
    final resStructures = await FinanceService.getClassFees();
    final resInvoices = await FinanceService.getStudentFees();
    final resPayments = await FinanceService.getPayments();
    final resFines = await FinanceService.getFines();

    if (!mounted) return;

    setState(() {
      if (resOverview['status'] == 'success') _overview = resOverview['data'] ?? {};
      if (resStructures['status'] == 'success') _structures = resStructures['data'] ?? [];
      if (resInvoices['status'] == 'success') _invoices = resInvoices['data'] ?? [];
      if (resPayments['status'] == 'success') _payments = resPayments['data'] ?? [];
      if (resFines['status'] == 'success') _fines = resFines['data'] ?? [];
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Fee & Finance Management', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadAllFinanceData),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Fee Structures'),
            Tab(text: 'Invoices'),
            Tab(text: 'Payments'),
            Tab(text: 'Penalties'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildStructuresTab(),
                _buildInvoicesTab(),
                _buildPaymentsTab(),
                _buildFinesTab(),
              ],
            ),
    );
  }

  Widget _buildOverviewTab() {
    final expected = _overview['total_expected'] ?? 0;
    final collected = _overview['total_collected'] ?? 0;
    final pending = _overview['total_pending'] ?? 0;
    final percentage = _overview['collection_percentage'] ?? 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _buildMetricCard('Expected Fee', '₹$expected', AppTheme.primary, Icons.account_balance_wallet_outlined),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard('Collected Fee', '₹$collected', AppTheme.success, Icons.check_circle_outline),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricCard('Pending Overdue', '₹$pending', AppTheme.danger, Icons.error_outline),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard('Collection Rate', '$percentage%', AppTheme.warning, Icons.trending_up),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppTheme.cardDecoration,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Collection Health Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 8),
                const Text(
                  'Multi-branch real-time collection metrics and ledger records.',
                  style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 16),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: (percentage is num ? percentage.toDouble() : 0.0) / 100,
                    minHeight: 10,
                    backgroundColor: AppTheme.border,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.success),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStructuresTab() {
    return _structures.isEmpty
        ? const Center(child: Text('No class fee structures configured.', style: TextStyle(color: AppTheme.textSecondary)))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _structures.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = _structures[index];
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: AppTheme.cardDecoration,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppTheme.primaryLight, borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.layers_outlined, color: AppTheme.primary),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['class_name'] ?? 'Class Fee', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text('Annual: ₹${item['total_annual_fee'] ?? 0} • ${item['academic_year'] ?? '2026-2027'}', style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
                  ],
                ),
              );
            },
          );
  }

  Widget _buildInvoicesTab() {
    return _invoices.isEmpty
        ? const Center(child: Text('No student fee invoices generated.', style: TextStyle(color: AppTheme.textSecondary)))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _invoices.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = _invoices[index];
              final status = (item['status'] ?? 'PENDING').toString().toUpperCase();
              final isPaid = status == 'PAID';

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: AppTheme.cardDecoration,
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['student_name'] ?? 'Student Invoice #${item['stu_fee_id'] ?? index}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text('Due Date: ${item['due_date'] ?? 'N/A'} • Payable: ₹${item['payable_amount'] ?? 0}', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isPaid ? AppTheme.success.withValues(alpha: 0.1) : AppTheme.danger.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(color: isPaid ? AppTheme.success : AppTheme.danger, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
  }

  Widget _buildPaymentsTab() {
    return _payments.isEmpty
        ? const Center(child: Text('No payment receipts recorded.', style: TextStyle(color: AppTheme.textSecondary)))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _payments.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = _payments[index];
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: AppTheme.cardDecoration,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppTheme.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.receipt_long_outlined, color: AppTheme.success),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['receipt_no'] ?? 'REC-${item['payment_id'] ?? index}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text('Amount: ₹${item['paid_amount'] ?? 0} • Mode: ${item['payment_mode'] ?? 'CASH'}', style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
  }

  Widget _buildFinesTab() {
    return _fines.isEmpty
        ? const Center(child: Text('No penalties logged.', style: TextStyle(color: AppTheme.textSecondary)))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _fines.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = _fines[index];
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: AppTheme.cardDecoration,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppTheme.danger.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.warning_amber_outlined, color: AppTheme.danger),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item['student_name'] ?? 'Student #${item['student_id']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text('${item['fine_reason'] ?? 'Late Fine'} • ₹${item['fine_amount'] ?? 0}', style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
  }

  Widget _buildMetricCard(String title, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 10),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(title, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}

