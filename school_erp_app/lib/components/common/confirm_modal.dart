import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Flutter implementation of ConfirmModal matching school_ui React ConfirmModal.jsx.
/// It renders a glass-like dialog with warning icon, title, message, cancel, and confirm action.
/// Reads the backend API URL from .env.production via flutter_dotenv.
class ConfirmModal extends StatelessWidget {
  final String title;
  final String message;
  final String confirmLabel;
  final String cancelLabel;
  final bool busy;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;

  const ConfirmModal({
    super.key,
    this.title = 'Are you sure?',
    required this.message,
    this.confirmLabel = 'Delete',
    this.cancelLabel = 'Cancel',
    this.busy = false,
    this.onConfirm,
    this.onCancel,
  });

  /// Helper getter to read backend API base URL from .env.production
  static String get apiBaseUrl {
    return dotenv.env['VITE_API_BASE_URL'] ?? 'https://myskool.co.in/SMS/school_be/index.php/api';
  }

  /// Convenient static method to present the ConfirmModal as a dialog
  static Future<bool?> show({
    required BuildContext context,
    String title = 'Are you sure?',
    required String message,
    String confirmLabel = 'Delete',
    String cancelLabel = 'Cancel',
    bool busy = false,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: !busy,
      builder: (BuildContext ctx) => ConfirmModal(
        title: title,
        message: message,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        busy: busy,
        onConfirm: () => Navigator.of(ctx).pop(true),
        onCancel: () => Navigator.of(ctx).pop(false),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const dangerRed = Color(0xFFDC2626);
    const dangerRedBg = Color(0x1ADC2626);
    const textTitleColor = Color(0xFF0F172A);
    const textSubtitleColor = Color(0xFF64748B);
    const borderColor = Color(0xFFE2E8F0);

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: borderColor),
      ),
      elevation: 12,
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: dangerRedBg,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.warning_amber_rounded,
                      color: dangerRed,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: textTitleColor,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          message,
                          style: const TextStyle(
                            fontSize: 14,
                            color: textSubtitleColor,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: busy
                        ? null
                        : () {
                            if (onCancel != null) {
                              onCancel!();
                            } else {
                              Navigator.of(context).pop(false);
                            }
                          },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF334155),
                      side: const BorderSide(color: borderColor),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Text(
                      cancelLabel,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: busy
                        ? null
                        : () {
                            if (onConfirm != null) {
                              onConfirm!();
                            } else {
                              Navigator.of(context).pop(true);
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: dangerRed,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            confirmLabel,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
