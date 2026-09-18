import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:ota_update/ota_update.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class AppVersionMetadata {
  final String appName;
  final String version;
  final int versionCode;
  final String downloadUrl;
  final bool mandatory;
  final String releaseNotes;

  const AppVersionMetadata({
    required this.appName,
    required this.version,
    required this.versionCode,
    required this.downloadUrl,
    required this.mandatory,
    required this.releaseNotes,
  });

  factory AppVersionMetadata.fromJson(Map<String, dynamic> json) {
    return AppVersionMetadata(
      appName: json['appName'] ?? 'CowIA Técnico',
      version: json['version'] ?? '1.0.0',
      versionCode: int.tryParse(json['versionCode']?.toString() ?? '1') ?? 1,
      downloadUrl: json['downloadUrl'] ?? 'https://www.cowai.net/apk/CowIA-Tecnico.apk',
      mandatory: json['mandatory'] == true,
      releaseNotes: json['releaseNotes'] ?? 'Mejoras continuas de rendimiento y estabilidad.',
    );
  }
}

class UpdateService {
  static final UpdateService _instance = UpdateService._internal();
  factory UpdateService() => _instance;
  UpdateService._internal();

  bool _isChecking = false;
  bool _isDialogShowing = false;
  DateTime? _lastPromptTime;

  /// Obtiene los metadatos de versión del backend
  Future<AppVersionMetadata?> fetchLatestVersion() async {
    try {
      final baseUrl = await ApiService.getBaseUrl();
      final uri = Uri.parse('$baseUrl/app/version?app=cowia-tecnico');
      final response = await http.get(uri).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic>) {
          return AppVersionMetadata.fromJson(data);
        }
      }
    } catch (e) {
      debugPrint('⚠️ [UpdateService] Error al consultar versión remota: $e');
    }
    return null;
  }

  /// Chequeo de actualización
  /// [manual]: si es true, muestra feedback visual aunque no haya actualización.
  Future<void> checkForUpdates(
    BuildContext context, {
    bool manual = false,
  }) async {
    if (_isChecking || _isDialogShowing) return;

    // Si es automático, evitar molestar si ya se preguntó hace menos de 10 minutos
    if (!manual && _lastPromptTime != null) {
      if (DateTime.now().difference(_lastPromptTime!) < const Duration(minutes: 10)) {
        return;
      }
    }

    _isChecking = true;

    if (manual && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryCyan),
              ),
              SizedBox(width: 12),
              Text('Verificando actualizaciones del sistema...'),
            ],
          ),
          duration: Duration(seconds: 2),
        ),
      );
    }

    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersionCode = int.tryParse(packageInfo.buildNumber) ?? 1;
      final currentVersionName = packageInfo.version;

      final remote = await fetchLatestVersion();

      _isChecking = false;
      if (!context.mounted) return;

      if (remote != null) {
        final hasNewerVersion = remote.versionCode > currentVersionCode;

        if (hasNewerVersion) {
          _lastPromptTime = DateTime.now();
          _showUpdateDialog(
            context,
            remote: remote,
            currentVersionName: currentVersionName,
            currentVersionCode: currentVersionCode,
          );
        } else if (manual) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: AppTheme.emeraldGreen,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Ya tienes la última versión instalada ($currentVersionName+$currentVersionCode)',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      } else if (manual) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.surfaceLight,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            content: Text(
              'No se pudo conectar al servidor de actualizaciones. Revisa tu conexión.',
              style: GoogleFonts.inter(color: AppTheme.textSecondary),
            ),
          ),
        );
      }
    } catch (e) {
      _isChecking = false;
      debugPrint('⚠️ [UpdateService] Excepción en checkForUpdates: $e');
    }
  }

  void _showUpdateDialog(
    BuildContext context, {
    required AppVersionMetadata remote,
    required String currentVersionName,
    required int currentVersionCode,
  }) {
    _isDialogShowing = true;

    showDialog(
      context: context,
      barrierDismissible: !remote.mandatory,
      builder: (dialogContext) {
        return _UpdateModalDialog(
          remote: remote,
          currentVersion: '$currentVersionName+$currentVersionCode',
          onDismiss: () {
            _isDialogShowing = false;
          },
        );
      },
    ).then((_) {
      _isDialogShowing = false;
    });
  }
}

class _UpdateModalDialog extends StatefulWidget {
  final AppVersionMetadata remote;
  final String currentVersion;
  final VoidCallback onDismiss;

  const _UpdateModalDialog({
    required this.remote,
    required this.currentVersion,
    required this.onDismiss,
  });

  @override
  State<_UpdateModalDialog> createState() => _UpdateModalDialogState();
}

class _UpdateModalDialogState extends State<_UpdateModalDialog> {
  bool _isDownloading = false;
  double _progressPercentage = 0.0;
  String _statusMessage = '';
  String? _errorMessage;

  void _startOtaDownload() {
    if (kIsWeb || !Platform.isAndroid) {
      setState(() {
        _errorMessage = 'La actualización OTA directa sólo está soportada en Android.';
      });
      return;
    }

    setState(() {
      _isDownloading = true;
      _progressPercentage = 0.0;
      _statusMessage = 'Iniciando descarga segura...';
      _errorMessage = null;
    });

    try {
      OtaUpdate()
          .execute(
            widget.remote.downloadUrl,
            destinationFilename: 'CowIA-Tecnico-Update.apk',
          )
          .listen(
        (OtaEvent event) {
          if (!mounted) return;

          switch (event.status) {
            case OtaStatus.DOWNLOADING:
              final parsed = double.tryParse(event.value ?? '0') ?? 0.0;
              setState(() {
                _progressPercentage = parsed;
                _statusMessage = 'Descargando paquete: ${parsed.toInt()}%';
              });
              break;

            case OtaStatus.INSTALLING:
              setState(() {
                _isDownloading = false;
                _statusMessage = 'Abriendo instalador del sistema Android...';
              });
              break;

            case OtaStatus.ALREADY_RUNNING_ERROR:
              setState(() {
                _isDownloading = false;
                _errorMessage = 'Ya hay una descarga de actualización en curso.';
              });
              break;

            case OtaStatus.PERMISSION_NOT_GRANTED_ERROR:
              setState(() {
                _isDownloading = false;
                _errorMessage = 'Permiso denegado para instalar paquetes. Habilita el permiso en los Ajustes de Android.';
              });
              break;

            case OtaStatus.INTERNAL_ERROR:
            default:
              setState(() {
                _isDownloading = false;
                _errorMessage = 'Error en la descarga (${event.status.name}). Verifica tu conexión.';
              });
              break;
          }
        },
        onError: (err) {
          if (!mounted) return;
          setState(() {
            _isDownloading = false;
            _errorMessage = 'Fallo en la descarga: $err';
          });
        },
      );
    } catch (e) {
      setState(() {
        _isDownloading = false;
        _errorMessage = 'Error iniciando actualización: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final remote = widget.remote;

    return PopScope(
      canPop: !remote.mandatory && !_isDownloading,
      child: AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppTheme.cardBorder, width: 1.5),
        ),
        contentPadding: const EdgeInsets.fromLTRB(22, 20, 22, 20),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cabecera con ícono brillante
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryCyan.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppTheme.primaryCyan.withValues(alpha: 0.35),
                      width: 1.5,
                    ),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.system_update_rounded,
                      color: AppTheme.primaryCyan,
                      size: 26,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Actualización Disponible',
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.emeraldGreen.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: AppTheme.emeraldGreen.withValues(alpha: 0.3),
                            width: 1,
                          ),
                        ),
                        child: Text(
                          'v${remote.version} (Build ${remote.versionCode})',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.emeraldGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Comparativa de versión
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.surfaceLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Versión actual: ${widget.currentVersion}',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  const Icon(Icons.arrow_forward_rounded, size: 14, color: AppTheme.textMuted),
                  Text(
                    'Nueva: ${remote.version}+${remote.versionCode}',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primaryCyan,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Notas de la versión
            Text(
              'NOVEDADES & MEJORAS:',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppTheme.textSecondary,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF090D16),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.cardBorder),
              ),
              child: Text(
                remote.releaseNotes,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: AppTheme.textPrimary,
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Progreso de descarga si está activo
            if (_isDownloading) ...[
              LinearProgressIndicator(
                value: _progressPercentage > 0 ? _progressPercentage / 100.0 : null,
                backgroundColor: AppTheme.surfaceLight,
                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryCyan),
                borderRadius: BorderRadius.circular(8),
                minHeight: 8,
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  _statusMessage,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primaryCyan,
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ] else if (_statusMessage.isNotEmpty) ...[
              Center(
                child: Text(
                  _statusMessage,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: AppTheme.emeraldGreen,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],

            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.dangerRed.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.dangerRed.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: AppTheme.dangerRed, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppTheme.dangerRed,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],

            // Botones de acción
            Row(
              children: [
                if (!remote.mandatory && !_isDownloading) ...[
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: const BorderSide(color: AppTheme.cardBorder),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        widget.onDismiss();
                        Navigator.of(context).pop();
                      },
                      child: Text(
                        'Recordar más tarde',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppTheme.textMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryCyan,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    onPressed: _isDownloading ? null : _startOtaDownload,
                    child: _isDownloading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.download_rounded, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                'Actualizar Ahora',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
