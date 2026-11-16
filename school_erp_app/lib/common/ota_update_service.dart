import 'dart:async';
import 'package:flutter/material.dart';
import 'package:ota_update/ota_update.dart';
import '../academic/academic_theme.dart';

class OtaUpdateService {
  /// Triggers an OTA update from a remote APK download URL.
  /// Shows real-time progress dialog and handles installation.
  static Future<void> triggerUpdate({
    required BuildContext context,
    required String apkUrl,
    String destinationFilename = 'myskool_update.apk',
  }) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => _OtaProgressDialog(
        apkUrl: apkUrl,
        destinationFilename: destinationFilename,
      ),
    );
  }
}

class _OtaProgressDialog extends StatefulWidget {
  final String apkUrl;
  final String destinationFilename;

  const _OtaProgressDialog({
    required this.apkUrl,
    required this.destinationFilename,
  });

  @override
  State<_OtaProgressDialog> createState() => _OtaProgressDialogState();
}

class _OtaProgressDialogState extends State<_OtaProgressDialog> {
  OtaStatus _status = OtaStatus.DOWNLOADING;
  int _progress = 0;
  String? _errorMessage;
  StreamSubscription<OtaEvent>? _subscription;

  @override
  void initState() {
    super.initState();
    _startOtaUpdate();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _startOtaUpdate() {
    try {
      _subscription = OtaUpdate()
          .execute(
        widget.apkUrl,
        destinationFilename: widget.destinationFilename,
      )
          .listen(
        (OtaEvent event) {
          if (!mounted) return;
          setState(() {
            _status = event.status;
            if (event.value != null && event.value!.isNotEmpty) {
              final parsed = int.tryParse(event.value!);
              if (parsed != null) _progress = parsed;
            }
          });

          if (event.status == OtaStatus.INSTALLING) {
            // Android package installer triggered
            Future.delayed(const Duration(seconds: 2), () {
              if (mounted) Navigator.of(context).pop();
            });
          }
        },
        onError: (e) {
          if (!mounted) return;
          setState(() {
            _status = OtaStatus.INTERNAL_ERROR;
            _errorMessage = e.toString();
          });
        },
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _status = OtaStatus.INTERNAL_ERROR;
        _errorMessage = e.toString();
      });
    }
  }

  String _getStatusText() {
    switch (_status) {
      case OtaStatus.DOWNLOADING:
        return 'Downloading update package ($_progress%)...';
      case OtaStatus.INSTALLING:
        return 'Launching Android Package Installer...';
      case OtaStatus.ALREADY_RUNNING_ERROR:
        return 'An update download is already in progress.';
      case OtaStatus.PERMISSION_NOT_GRANTED_ERROR:
        return 'Permission denied to install unknown apps. Please enable install permission in Android Settings.';
      case OtaStatus.INTERNAL_ERROR:
        return _errorMessage ?? 'An unexpected error occurred during OTA update.';
      default:
        return 'Preparing update...';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isError = _status == OtaStatus.INTERNAL_ERROR ||
        _status == OtaStatus.PERMISSION_NOT_GRANTED_ERROR ||
        _status == OtaStatus.ALREADY_RUNNING_ERROR;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(
            isError ? Icons.error_outline : Icons.system_update,
            color: isError ? AppTheme.danger : AppTheme.primary,
          ),
          const SizedBox(width: 10),
          const Text('System OTA Update', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _getStatusText(),
            style: TextStyle(
              fontSize: 13,
              color: isError ? AppTheme.danger : AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          if (!isError) ...[
            LinearProgressIndicator(
              value: _status == OtaStatus.DOWNLOADING ? (_progress / 100.0).clamp(0.0, 1.0) : null,
              backgroundColor: AppTheme.primaryLight,
              color: AppTheme.primary,
              minHeight: 8,
              borderRadius: BorderRadius.circular(4),
            ),
            const SizedBox(height: 8),
            Text(
              'Please do not close the app while downloading.',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ],
      ),
      actions: [
        if (isError)
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
      ],
    );
  }
}

