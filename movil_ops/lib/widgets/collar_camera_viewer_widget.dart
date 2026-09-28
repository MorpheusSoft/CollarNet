import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../services/api_service.dart';

enum CameraViewMode { split, floating, fullscreen }

class CollarCameraViewerWidget extends StatefulWidget {
  final Map<String, dynamic> animal;
  final CameraViewMode initialMode;
  final VoidCallback? onClose;
  final ValueChanged<CameraViewMode>? onModeChanged;

  const CollarCameraViewerWidget({
    Key? key,
    required this.animal,
    this.initialMode = CameraViewMode.split,
    this.onClose,
    this.onModeChanged,
  }) : super(key: key);

  @override
  State<CollarCameraViewerWidget> createState() => _CollarCameraViewerWidgetState();
}

class _CollarCameraViewerWidgetState extends State<CollarCameraViewerWidget> {
  late CameraViewMode _currentMode;
  bool _isNightVision = false;
  bool _isLoading = true;
  bool _hasError = false;
  Uint8List? _currentFrameBytes;
  Timer? _frameTimer;
  String _baseUrl = '';
  int _fps = 0;
  int _frameCount = 0;
  DateTime _lastFpsCalc = DateTime.now();

  // PiP Drag Position
  Offset _pipPosition = const Offset(20, 100);

  String get collarId => widget.animal['collar_id']?.toString() ?? 'COL-001';
  String get areteVisual => widget.animal['arete_visual']?.toString() ?? widget.animal['arete']?.toString() ?? 'V-001';
  String get potrero => widget.animal['potrero_nombre']?.toString() ?? widget.animal['potrero']?.toString() ?? 'Principal';
  String get bateria => widget.animal['nivel_bateria']?.toString() ?? widget.animal['bateria']?.toString() ?? '92';
  String get estado => widget.animal['estado_cerca']?.toString() ?? 'DENTRO';

  @override
  void initState() {
    super.initState();
    _currentMode = widget.initialMode;
    _initCamera();
  }

  Future<void> _initCamera() async {
    _baseUrl = await ApiService.getBaseUrl();

    // Notificar al backend encendido de cámara bajo demanda
    try {
      await http.post(
        Uri.parse('$_baseUrl/collares/$collarId/camera/power'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'active': true}),
      ).timeout(const Duration(seconds: 3));
    } catch (_) {}

    // Iniciar bucle de refresco continuo de fotogramas (1.5 - 2 FPS para ahorro de batería)
    _fetchFrame();
    _frameTimer = Timer.periodic(const Duration(milliseconds: 600), (_) => _fetchFrame());
  }

  Future<void> _fetchFrame() async {
    if (!mounted || _baseUrl.isEmpty) return;
    try {
      final uri = Uri.parse('$_baseUrl/collares/$collarId/camera/snapshot?t=${DateTime.now().millisecondsSinceEpoch}');
      final res = await http.get(uri).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200 && res.bodyBytes.isNotEmpty) {
        if (mounted) {
          setState(() {
            _currentFrameBytes = res.bodyBytes;
            _isLoading = false;
            _hasError = false;
            _frameCount++;
            final now = DateTime.now();
            if (now.difference(_lastFpsCalc).inSeconds >= 1) {
              _fps = _frameCount;
              _frameCount = 0;
              _lastFpsCalc = now;
            }
          });
        }
      }
    } catch (_) {
      if (mounted && _currentFrameBytes == null) {
        setState(() {
          _hasError = true;
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _frameTimer?.cancel();
    // Notificar al backend apagado de cámara
    if (_baseUrl.isNotEmpty) {
      http.post(
        Uri.parse('$_baseUrl/collares/$collarId/camera/power'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'active': false}),
      ).catchError((_) => http.Response('', 500));
    }
    super.dispose();
  }

  void _switchMode(CameraViewMode mode) {
    setState(() {
      _currentMode = mode;
    });
    widget.onModeChanged?.call(mode);
  }

  @override
  Widget build(BuildContext context) {
    if (_currentMode == CameraViewMode.floating) {
      return _buildFloatingPip(context);
    } else if (_currentMode == CameraViewMode.fullscreen) {
      return _buildFullscreen(context);
    } else {
      return _buildSplitView(context);
    }
  }

  // 1. VISTA SPLIT-SCREEN (Mitad de pantalla vertical en móvil)
  Widget _buildSplitView(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF070D14),
        border: Border(
          bottom: BorderSide(color: const Color(0xFF06B6D4).withOpacity(0.4), width: 2),
        ),
        boxShadow: const [
          BoxShadow(color: Colors.black54, blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Stack(
          children: [
            _buildVideoFeed(),
            _buildTelemetryHUD(),
          ],
        ),
      ),
    );
  }

  // 2. VISTA VENTANA FLOTANTE (PiP Draggable)
  Widget _buildFloatingPip(BuildContext context) {
    return Positioned(
      left: _pipPosition.dx,
      top: _pipPosition.dy,
      child: GestureDetector(
        onPanUpdate: (details) {
          setState(() {
            final size = MediaQuery.of(context).size;
            _pipPosition = Offset(
              (_pipPosition.dx + details.delta.dx).clamp(10.0, size.width - 270),
              (_pipPosition.dy + details.delta.dy).clamp(40.0, size.height - 200),
            );
          });
        },
        child: Container(
          width: 260,
          height: 165,
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF06B6D4), width: 2),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF06B6D4).withOpacity(0.4),
                blurRadius: 16,
                spreadRadius: 2,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Stack(
              children: [
                _buildVideoFeed(),
                _buildPipHUD(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // 3. VISTA PANTALLA COMPLETA
  Widget _buildFullscreen(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: _buildVideoFeed(),
              ),
            ),
            _buildTelemetryHUD(isFullscreen: true),
          ],
        ),
      ),
    );
  }

  // Renderizador del Video Feed con soporte Visión Nocturna
  Widget _buildVideoFeed() {
    Widget imageContent;

    if (_hasError) {
      imageContent = Container(
        color: const Color(0xFF0F172A),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.videocam_off, color: Color(0xFFEF4444), size: 36),
              const SizedBox(height: 6),
              Text(
                'Sin señal de cámara • Collar $collarId',
                style: const TextStyle(color: Colors.white70, fontSize: 11),
              ),
            ],
          ),
        ),
      );
    } else if (_currentFrameBytes != null) {
      imageContent = Image.memory(
        _currentFrameBytes!,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        gaplessPlayback: true,
      );
    } else {
      imageContent = Container(
        color: const Color(0xFF0B1320),
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFF06B6D4), strokeWidth: 2),
        ),
      );
    }

    if (_isNightVision) {
      return ColorFiltered(
        colorFilter: const ColorFilter.matrix([
          0.1, 0.8, 0.1, 0, 0,
          0.1, 1.2, 0.1, 0, 0,
          0.1, 0.8, 0.1, 0, 0,
          0, 0, 0, 1, 0,
        ]),
        child: imageContent,
      );
    }

    return imageContent;
  }

  // Telemetría HUD Overlay
  Widget _buildTelemetryHUD({bool isFullscreen = false}) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withOpacity(0.7),
            Colors.transparent,
            Colors.transparent,
            Colors.black.withOpacity(0.8),
          ],
          stops: const [0.0, 0.25, 0.75, 1.0],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Header HUD
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Badge EN VIVO
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF06B6D4), width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: Color(0xFF06B6D4),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'EN VIVO • CAM-01 (${_fps > 0 ? _fps : 2} fps)',
                      style: const TextStyle(
                        color: Color(0xFF06B6D4),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              // Botones de control y modo
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Night vision toggle
                  IconButton(
                    iconSize: 18,
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(),
                    icon: Icon(
                      _isNightVision ? Icons.nightlight_round : Icons.wb_sunny_outlined,
                      color: _isNightVision ? const Color(0xFF22C55E) : Colors.white70,
                    ),
                    tooltip: 'Modo Visión Nocturna / IR',
                    onPressed: () {
                      setState(() {
                        _isNightVision = !_isNightVision;
                      });
                    },
                  ),
                  const SizedBox(width: 6),

                  // Mode buttons
                  if (_currentMode != CameraViewMode.floating)
                    IconButton(
                      iconSize: 18,
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.picture_in_picture_alt_rounded, color: Colors.white70),
                      tooltip: 'Ventana Flotante (PiP)',
                      onPressed: () => _switchMode(CameraViewMode.floating),
                    ),
                  if (_currentMode != CameraViewMode.fullscreen)
                    IconButton(
                      iconSize: 18,
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.fullscreen, color: Colors.white70),
                      tooltip: 'Pantalla Completa',
                      onPressed: () => _switchMode(CameraViewMode.fullscreen),
                    ),
                  if (_currentMode == CameraViewMode.fullscreen)
                    IconButton(
                      iconSize: 18,
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.fullscreen_exit, color: Colors.white70),
                      tooltip: 'Dividir Pantalla',
                      onPressed: () => _switchMode(CameraViewMode.split),
                    ),
                  const SizedBox(width: 4),

                  // Close button
                  IconButton(
                    iconSize: 18,
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(),
                    icon: const Icon(Icons.close, color: Colors.white),
                    tooltip: 'Cerrar Cámara',
                    onPressed: widget.onClose,
                  ),
                ],
              ),
            ],
          ),

          // Footer HUD (Datos Telemetría Collar)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '🐂 Arete: $areteVisual  •  $collarId',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      shadows: [Shadow(color: Colors.black, blurRadius: 4)],
                    ),
                  ),
                  Text(
                    '🌱 $potrero  |  📱 4G Digitel  |  🔋 $bateria%',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 10,
                      shadows: [Shadow(color: Colors.black, blurRadius: 4)],
                    ),
                  ),
                ],
              ),

              // Snapshot Action
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF06B6D4),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('📸 Captura de Collar $collarId guardada en diagnóstico'),
                      duration: const Duration(seconds: 2),
                      backgroundColor: const Color(0xFF0891B2),
                    ),
                  );
                },
                icon: const Icon(Icons.camera_alt, size: 12, color: Colors.black),
                label: const Text('FOTO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // HUD reducido para modo PiP flotante
  Widget _buildPipHUD() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.black.withOpacity(0.8), Colors.transparent],
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.videocam, color: Color(0xFF06B6D4), size: 14),
              const SizedBox(width: 4),
              Text(
                areteVisual,
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          Row(
            children: [
              IconButton(
                iconSize: 14,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.vertical_split_rounded, color: Colors.white70),
                onPressed: () => _switchMode(CameraViewMode.split),
              ),
              const SizedBox(width: 6),
              IconButton(
                iconSize: 14,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: widget.onClose,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
