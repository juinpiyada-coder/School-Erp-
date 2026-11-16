import 'package:flutter/material.dart';
import 'academic_theme.dart';
import 'academic_service.dart';

class RoomsScreen extends StatefulWidget {
  const RoomsScreen({super.key});

  @override
  State<RoomsScreen> createState() => _RoomsScreenState();
}

class _RoomsScreenState extends State<RoomsScreen> {
  bool _loading = true;
  List<dynamic> _rooms = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRooms();
  }

  Future<void> _fetchRooms() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final res = await AcademicService.getRooms();
    if (!mounted) return;

    if ((res['status'] == 'success' || res['success'] == true)) {
      setState(() {
        _rooms = res['data'] ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = res['message'] ?? 'Failed to load rooms';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTheme.buildAppBar(
        title: 'Classrooms & Facilities',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchRooms,
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
                          onPressed: _fetchRooms,
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                          child: const Text('Try Again'),
                        )
                      ],
                    ),
                  ),
                )
              : _rooms.isEmpty
                  ? const Center(
                      child: Text('No rooms found.', style: TextStyle(color: AppTheme.textSecondary)),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchRooms,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _rooms.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _rooms[index];
                          final name = item['room_name'] ?? item['SCHL_BR_ROOM_NM'] ?? 'Room';
                          final capacity = item['capacity'] ?? item['SCHL_BR_ROOM_CAPACITY'] ?? 'N/A';
                          final category = item['category_name'] ?? item['SCHL_ROOM_CAT_NM'] ?? 'Classroom';
                          final branch = item['branch_name'] ?? item['SCHL_BR_NM'] ?? 'Main Campus';

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: AppTheme.cardDecoration,
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppTheme.warning.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.meeting_room_outlined, color: AppTheme.warning),
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
                                          fontSize: 16,
                                          color: AppTheme.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Type: $category • Capacity: $capacity seats',
                                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                                      ),
                                      Text(
                                        'Branch: $branch',
                                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                      ),
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

