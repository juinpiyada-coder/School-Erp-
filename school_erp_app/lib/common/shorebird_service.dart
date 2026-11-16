import 'package:flutter/material.dart';
import 'package:shorebird_code_push/shorebird_code_push.dart';
import '../academic/academic_theme.dart';

class ShorebirdUpdateService {
  static final ShorebirdUpdater _updater = ShorebirdUpdater();

  /// Check whether Shorebird code push engine is active and supported on the device.
  static bool get isShorebirdAvailable => _updater.isAvailable;

  /// Reads currently running patch number or null if running base release.
  static Future<int?> getCurrentPatchNumber() async {
    if (!isShorebirdAvailable) return null;
    try {
      final patch = await _updater.readCurrentPatch();
      return patch?.number;
    } catch (_) {
      return null;
    }
  }

  /// Automatically check for updates silently in the background on app launch.
  /// If a new patch is available, it downloads and prepares it for next restart.
  static Future<void> checkForUpdateInBackground() async {
    if (!isShorebirdAvailable) return;
    try {
      final status = await _updater.checkForUpdate();
      if (status == UpdateStatus.outdated) {
        await _updater.update();
      }
    } catch (_) {}
  }

  /// Interactive update check from Settings UI with user feedback.
  static Future<void> checkAndApplyUpdate({
    required BuildContext context,
  }) async {
    if (!isShorebirdAvailable) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.info_outline, color: AppTheme.accent),
              SizedBox(width: 8),
              Text('CodePush Status'),
            ],
          ),
          content: const Text(
            'Shorebird CodePush engine is installed and active.\n\nIn standard flutter build/debug mode, CodePush patches are skipped. To trigger live instant patches, build via "shorebird release android" and push patches with "shorebird patch android".',
            style: TextStyle(fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      return;
    }

    // Show checking dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => const _ShorebirdCheckDialog(),
    );
  }
}

class _ShorebirdCheckDialog extends StatefulWidget {
  const _ShorebirdCheckDialog();

  @override
  State<_ShorebirdCheckDialog> createState() => _ShorebirdCheckDialogState();
}

class _ShorebirdCheckDialogState extends State<_ShorebirdCheckDialog> {
  String _status = 'Checking for instant patches...';
  bool _isChecking = true;
  bool _patchDownloaded = false;
  int? _currentPatch;

  @override
  void initState() {
    super.initState();
    _runCheck();
  }

  Future<void> _runCheck() async {
    final updater = ShorebirdUpdater();
    try {
      final patch = await updater.readCurrentPatch();
      _currentPatch = patch?.number;
      final status = await updater.checkForUpdate();

      if (!mounted) return;

      if (status == UpdateStatus.outdated) {
        setState(() {
          _status = 'New patch available! Downloading instant update...';
        });

        await updater.update();

        if (!mounted) return;
        setState(() {
          _status = 'Patch downloaded successfully! Restart the app to apply changes.';
          _isChecking = false;
          _patchDownloaded = true;
        });
      } else if (status == UpdateStatus.restartRequired) {
        setState(() {
          _status = 'A patch has already been downloaded. Please restart the app to apply.';
          _isChecking = false;
          _patchDownloaded = true;
        });
      } else {
        setState(() {
          _status = _currentPatch != null
              ? 'App is already up to date (Patch #$_currentPatch).'
              : 'App is running the latest base release version.';
          _isChecking = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _status = 'Unable to check for patches: $e';
        _isChecking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(
            _patchDownloaded ? Icons.check_circle : Icons.offline_bolt,
            color: _patchDownloaded ? AppTheme.success : AppTheme.primary,
          ),
          const SizedBox(width: 8),
          const Text('Shorebird CodePush', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_isChecking) ...[
            const CircularProgressIndicator(color: AppTheme.primary),
            const SizedBox(height: 16),
          ],
          Text(
            _status,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
          ),
        ],
      ),
      actions: [
        if (!_isChecking)
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
      ],
    );
  }
}
