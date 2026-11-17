import 'package:flutter/material.dart';
import '../academic/academic_theme.dart';
import '../academic/academic_service.dart';
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

  // Branches & selected branch filter
  List<dynamic> _branches = [];
  String? _selectedBranchId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadBranches();
    _loadAllFinanceData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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

  Future<void> _loadAllFinanceData() async {
    setState(() {
      _loading = true;
    });

    final resOverview = await FinanceService.getOverview(branchId: _selectedBranchId);
    final resStructures = await FinanceService.getClassFees(branchId: _selectedBranchId);
    final resInvoices = await FinanceService.getStudentFees(branchId: _selectedBranchId);
    final resPayments = await FinanceService.getPayments(branchId: _selectedBranchId);
    final resFines = await FinanceService.getFines(branchId: _selectedBranchId);

    if (!mounted) return;

    setState(() {
      if (resOverview['status'] == 'success' || resOverview['success'] == true) _overview = resOverview['data'] ?? {};
      if (resStructures['status'] == 'success' || resStructures['success'] == true) _structures = resStructures['data'] ?? [];
      if (resInvoices['status'] == 'success' || resInvoices['success'] == true) _invoices = resInvoices['data'] ?? [];
      if (resPayments['status'] == 'success' || resPayments['success'] == true) _payments = resPayments['data'] ?? [];
      if (resFines['status'] == 'success' || resFines['success'] == true) _fines = resFines['data'] ?? [];
      _loading = false;
    });
  }

  void _showAddFeeStructureDialog() {
    final classController = TextEditingController();
    final amountController = TextEditingController();
    final yearController = TextEditingController(text: '${DateTime.now().year}-${DateTime.now().year + 1}');
    String? branchId = _selectedBranchId ?? (_branches.isNotEmpty ? _branches.first['BR_ID']?.toString() : null);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Add Fee Structure', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_branches.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Branch *', border: OutlineInputBorder()),
                    initialValue: branchId,
                    items: _branches.map<DropdownMenuItem<String>>((b) {
                      final id = (b['BR_ID'] ?? b['branch_id'] ?? '').toString();
                      final name = (b['BR_NM'] ?? b['branch_name'] ?? 'Branch $id').toString();
                      return DropdownMenuItem(value: id, child: Text(name, style: const TextStyle(fontSize: 13)));
                    }).toList(),
                    onChanged: (val) => setDialogState(() => branchId = val),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: classController,
                  decoration: const InputDecoration(labelText: 'Class ID / Name *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Total Annual Fee (₹) *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: yearController,
                  decoration: const InputDecoration(labelText: 'Academic Year', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
              onPressed: () async {
                if (amountController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter total annual fee')));
                  return;
                }
                Navigator.pop(ctx);
                final res = await FinanceService.createClassFee({
                  ...?branchId != null ? {'brch_id': branchId} : null,
                  'class_id': classController.text.trim().isNotEmpty ? classController.text.trim() : '1',
                  'total_annual_fee': double.tryParse(amountController.text.trim()) ?? 0,
                  'academic_year': yearController.text.trim(),
                  'currency': 'INR',
                });
                if (mounted) {
                  if (res['status'] == 'success' || res['success'] == true) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fee structure created!')));
                    _loadAllFinanceData();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Creation failed')));
                  }
                }
              },
              child: const Text('Save Structure'),
            ),
          ],
        ),
      ),
    );
  }

  void _showRecordPaymentDialog() {
    final stuFeeIdController = TextEditingController();
    final studentIdController = TextEditingController();
    final amountController = TextEditingController();
    final remarksController = TextEditingController();
    String paymentMode = 'CASH';
    String? branchId = _selectedBranchId ?? (_branches.isNotEmpty ? _branches.first['BR_ID']?.toString() : null);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Record Fee Payment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_branches.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Branch *', border: OutlineInputBorder()),
                    initialValue: branchId,
                    items: _branches.map<DropdownMenuItem<String>>((b) {
                      final id = (b['BR_ID'] ?? b['branch_id'] ?? '').toString();
                      final name = (b['BR_NM'] ?? b['branch_name'] ?? 'Branch $id').toString();
                      return DropdownMenuItem(value: id, child: Text(name, style: const TextStyle(fontSize: 13)));
                    }).toList(),
                    onChanged: (val) => setDialogState(() => branchId = val),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: stuFeeIdController,
                  decoration: const InputDecoration(labelText: 'Student Fee ID *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: studentIdController,
                  decoration: const InputDecoration(labelText: 'Student ID *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Paid Amount (₹) *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Payment Mode', border: OutlineInputBorder()),
                  initialValue: paymentMode,
                  items: const [
                    DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                    DropdownMenuItem(value: 'UPI', child: Text('UPI / QR')),
                    DropdownMenuItem(value: 'CARD', child: Text('Debit / Credit Card')),
                    DropdownMenuItem(value: 'NETBANKING', child: Text('Net Banking')),
                    DropdownMenuItem(value: 'CHEQUE', child: Text('Cheque / DD')),
                  ],
                  onChanged: (val) {
                    if (val != null) setDialogState(() => paymentMode = val);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: remarksController,
                  decoration: const InputDecoration(labelText: 'Remarks / Transaction Ref', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
              onPressed: () async {
                if (amountController.text.trim().isEmpty ||
                    stuFeeIdController.text.trim().isEmpty ||
                    studentIdController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all mandatory fields')));
                  return;
                }
                Navigator.pop(ctx);
                final res = await FinanceService.recordPayment({
                  ...?branchId != null ? {'brch_id': branchId} : null,
                  'stu_fee_id': stuFeeIdController.text.trim(),
                  'student_id': studentIdController.text.trim(),
                  'paid_amount': double.tryParse(amountController.text.trim()) ?? 0,
                  'payment_mode': paymentMode,
                  'remarks': remarksController.text.trim(),
                });
                if (mounted) {
                  if (res['status'] == 'success' || res['success'] == true) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment recorded successfully!')));
                    _loadAllFinanceData();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Payment record failed')));
                  }
                }
              },
              child: const Text('Record Payment'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddFineDialog() {
    final studentIdController = TextEditingController();
    final amountController = TextEditingController();
    final reasonController = TextEditingController();
    String? branchId = _selectedBranchId ?? (_branches.isNotEmpty ? _branches.first['BR_ID']?.toString() : null);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Impose Fine / Penalty', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: minColumnSize,
              children: [
                if (_branches.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Branch *', border: OutlineInputBorder()),
                    initialValue: branchId,
                    items: _branches.map<DropdownMenuItem<String>>((b) {
                      final id = (b['BR_ID'] ?? b['branch_id'] ?? '').toString();
                      final name = (b['BR_NM'] ?? b['branch_name'] ?? 'Branch $id').toString();
                      return DropdownMenuItem(value: id, child: Text(name, style: const TextStyle(fontSize: 13)));
                    }).toList(),
                    onChanged: (val) => setDialogState(() => branchId = val),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: studentIdController,
                  decoration: const InputDecoration(labelText: 'Student ID *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Fine Amount (₹) *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  decoration: const InputDecoration(labelText: 'Reason for Penalty *', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger, foregroundColor: Colors.white),
              onPressed: () async {
                if (studentIdController.text.trim().isEmpty || amountController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter student ID and amount')));
                  return;
                }
                Navigator.pop(ctx);
                final res = await FinanceService.createFine({
                  ...?branchId != null ? {'brch_id': branchId} : null,
                  'student_id': studentIdController.text.trim(),
                  'fine_amount': double.tryParse(amountController.text.trim()) ?? 0,
                  'fine_reason': reasonController.text.trim().isNotEmpty ? reasonController.text.trim() : 'Late fee penalty',
                });
                if (mounted) {
                  if (res['status'] == 'success' || res['success'] == true) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fine imposed successfully!')));
                    _loadAllFinanceData();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? 'Failed to add fine')));
                  }
                }
              },
              child: const Text('Impose Fine'),
            ),
          ],
        ),
      ),
    );
  }

  static const minColumnSize = MainAxisSize.min;

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
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(88),
          child: Column(
            children: [
              if (_branches.isNotEmpty)
                Container(
                  height: 38,
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String?>(
                      value: _selectedBranchId,
                      dropdownColor: AppTheme.primaryDark,
                      icon: const Icon(Icons.arrow_drop_down, color: Colors.white),
                      isDense: true,
                      hint: const Text('All Branches (Consolidated)', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text('All Branches (Consolidated)', style: TextStyle(color: Colors.white, fontSize: 13)),
                        ),
                        ..._branches.map((b) {
                          final id = (b['BR_ID'] ?? b['branch_id'] ?? '').toString();
                          final name = (b['BR_NM'] ?? b['branch_name'] ?? 'Branch $id').toString();
                          return DropdownMenuItem<String?>(
                            value: id,
                            child: Text(name, style: const TextStyle(color: Colors.white, fontSize: 13)),
                          );
                        }),
                      ],
                      onChanged: (val) {
                        setState(() => _selectedBranchId = val);
                        _loadAllFinanceData();
                      },
                    ),
                  ),
                ),
              TabBar(
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
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        onPressed: () {
          final index = _tabController.index;
          if (index == 1) {
            _showAddFeeStructureDialog();
          } else if (index == 3) {
            _showRecordPaymentDialog();
          } else if (index == 4) {
            _showAddFineDialog();
          } else {
            _showRecordPaymentDialog();
          }
        },
        child: const Icon(Icons.add),
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
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _showAddFeeStructureDialog,
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Add Fee Structure'),
                  style: OutlinedButton.styleFrom(foregroundColor: AppTheme.primary),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _showRecordPaymentDialog,
                  icon: const Icon(Icons.payment, size: 16),
                  label: const Text('Record Payment'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildStructuresTab() {
    return _structures.isEmpty
        ? Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('No class fee structures configured.', style: TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _showAddFeeStructureDialog,
                  icon: const Icon(Icons.add),
                  label: const Text('Configure First Fee Structure'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                ),
              ],
            ),
          )
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
                          Text('Annual: ₹${item['total_annual_fee'] ?? 0} • ${item['academic_year'] ?? '2026-2027'}',
                              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
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
                          Text(item['student_name'] ?? 'Student Invoice #${item['stu_fee_id'] ?? index}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text('Due Date: ${item['due_date'] ?? 'N/A'} • Payable: ₹${item['payable_amount'] ?? 0}',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
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
        ? Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('No payment receipts recorded.', style: TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _showRecordPaymentDialog,
                  icon: const Icon(Icons.add),
                  label: const Text('Record First Payment'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                ),
              ],
            ),
          )
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
                          Text(item['receipt_no'] ?? 'REC-${item['payment_id'] ?? index}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text('Amount: ₹${item['paid_amount'] ?? 0} • Mode: ${item['payment_mode'] ?? 'CASH'}',
                              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
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
        ? Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('No penalties logged.', style: TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _showAddFineDialog,
                  icon: const Icon(Icons.warning_amber),
                  label: const Text('Impose Penalty / Fine'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger, foregroundColor: Colors.white),
                ),
              ],
            ),
          )
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
                          Text(item['student_name'] ?? 'Student #${item['student_id']}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text('${item['fine_reason'] ?? 'Late Fine'} • ₹${item['fine_amount'] ?? 0}',
                              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
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
