import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

enum CameraViewMode { split, floating, fullscreen }
enum CameraStreamSource { esp32, server }

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
  CameraStreamSource _streamSource = CameraStreamSource.server;
  bool _isNightVision = false;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = 'Buscando señal de cámara...';
  Uint8List? _currentFrameBytes;
  Timer? _pollingTimer;
  http.Client? _streamClient;
  StreamSubscription? _streamSubscription;
  List<int> _mjpegBuffer = [];
  bool _fetchingFrame = false;

  String _baseUrl = '';
  String _esp32Ip = '';
  int _fps = 0;
  int _frameCount = 0;
  DateTime _lastFpsCalc = DateTime.now();

  // PiP Drag Position
  Offset _pipPosition = const Offset(20, 100);

  String get collarId => widget.animal['collar_id']?.toString() ?? 'COW-001';
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
    final prefs = await SharedPreferences.getInstance();

    // 1. Resolver IP del ESP32 si estuviese en red Wi-Fi local
    final animalIp = widget.animal['ip']?.toString().trim();
    final savedIp = prefs.getString('collar_esp32_cam_ip');

    if (animalIp != null && animalIp.isNotEmpty && animalIp != 'null') {
      _esp32Ip = animalIp;
      await prefs.setString('collar_esp32_cam_ip', animalIp);
    } else if (savedIp != null && savedIp.isNotEmpty) {
      _esp32Ip = savedIp;
    } else {
      _esp32Ip = '';
    }

    // 2. Determinar fuente inicial: por defecto Servidor CowIA (4G Nube).
    // Solo conmutar a Wi-Fi directo si el collar reporta explícitamente medio_red WIFI con IP local.
    final net = (widget.animal['medio_red'] ?? widget.animal['net'] ?? '').toString().toUpperCase();
    if (net == 'WIFI' && _esp32Ip.isNotEmpty) {
      _streamSource = CameraStreamSource.esp32;
    } else {
      _streamSource = CameraStreamSource.server;
    }

    // 3. Notificar al backend encendido de cámara bajo demanda
    try {
      await http.post(
        Uri.parse('$_baseUrl/collares/$collarId/camera/power'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'active': true}),
      ).timeout(const Duration(seconds: 3));
    } catch (_) {}

    // 4. Conectar al feed de video
    _connectFeed();
  }

  void _connectFeed() {
    _stopFeed();
    if (_streamSource == CameraStreamSource.esp32) {
      _startDirectEsp32Stream();
    } else {
      _startServerPolling();
    }
  }

  bool _isFeedActive = false;

  void _stopFeed() {
    _isFeedActive = false;
    _pollingTimer?.cancel();
    _pollingTimer = null;
    try {
      _streamSubscription?.cancel();
      _streamSubscription = null;
    } catch (_) {}
    try {
      _streamClient?.close();
      _streamClient = null;
    } catch (_) {}
    _mjpegBuffer.clear();
  }

  // A. Transmisión MJPEG Directa desde ESP32 (:81/stream)
  Future<void> _startDirectEsp32Stream() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = 'Conectando a ESP32 ($_esp32Ip:81)...';
    });

    try {
      _streamClient = http.Client();
      final streamUrl = 'http://$_esp32Ip:81/stream';
      final request = http.Request('GET', Uri.parse(streamUrl));

      final response = await _streamClient!.send(request).timeout(const Duration(seconds: 4));

      if (response.statusCode != 200) {
        _onStreamFailed('ESP32 respondió HTTP ${response.statusCode}');
        return;
      }

      _streamSubscription = response.stream.listen(
        (chunk) {
          _mjpegBuffer.addAll(chunk);

          while (_mjpegBuffer.length > 4) {
            int soi = -1;
            for (int i = 0; i < _mjpegBuffer.length - 1; i++) {
              if (_mjpegBuffer[i] == 0xFF && _mjpegBuffer[i + 1] == 0xD8) {
                soi = i;
                break;
              }
            }

            if (soi == -1) {
              if (_mjpegBuffer.length > 2) {
                _mjpegBuffer = _mjpegBuffer.sublist(_mjpegBuffer.length - 2);
              }
              break;
            }

            int eoi = -1;
            for (int i = soi + 2; i < _mjpegBuffer.length - 1; i++) {
              if (_mjpegBuffer[i] == 0xFF && _mjpegBuffer[i + 1] == 0xD9) {
                eoi = i + 2;
                break;
              }
            }

            if (eoi != -1) {
              final frame = Uint8List.fromList(_mjpegBuffer.sublist(soi, eoi));
              _mjpegBuffer = _mjpegBuffer.sublist(eoi);

              if (mounted) {
                setState(() {
                  _currentFrameBytes = frame;
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
            } else {
              if (soi > 0) {
                _mjpegBuffer = _mjpegBuffer.sublist(soi);
              }
              break;
            }
          }
        },
        onError: (err) => _onStreamFailed('Micro-corte Wi-Fi: $err'),
        onDone: () => _onStreamFailed('Stream Wi-Fi finalizado'),
        cancelOnError: true,
      );
    } catch (e) {
      _onStreamFailed('No se pudo enlazar a http://$_esp32Ip:81/stream');
    }
  }

  void _onStreamFailed(String reason) {
    if (!mounted) return;
    debugPrint('[CameraViewer] $reason. Intentando enlace con Servidor...');
    setState(() {
      _streamSource = CameraStreamSource.server;
      _errorMessage = '$reason\nConmutando automáticamente a Servidor CowIA...';
    });
    _startServerPolling();
  }

  // B. Enlace de Alta Frecuencia con Servidor Cloud (/collares/:id/camera/snapshot)
  void _startServerPolling() {
    _stopFeed();
    _isFeedActive = true;
    _runContinuousPollingLoop();
  }

  Future<void> _runContinuousPollingLoop() async {
    while (_isFeedActive && mounted && _streamSource == CameraStreamSource.server) {
      await _fetchServerFrame();
      if (_isFeedActive && mounted) {
        await Future.delayed(const Duration(milliseconds: 100));
      }
    }
  }

  Future<void> _fetchServerFrame() async {
    if (!mounted || _fetchingFrame) return;
    _fetchingFrame = true;
    if (_baseUrl.isEmpty) {
      _baseUrl = await ApiService.getBaseUrl();
    }
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
      } else {
        if (mounted && _currentFrameBytes == null) {
          setState(() {
            _hasError = true;
            _isLoading = false;
            _errorMessage = 'Sin fotograma en Servidor (HTTP ${res.statusCode})';
          });
        }
      }
    } catch (_) {
      if (mounted && _currentFrameBytes == null) {
        setState(() {
          _hasError = true;
          _isLoading = false;
          _errorMessage = 'Servidor local no responde en $_baseUrl';
        });
      }
    } finally {
      _fetchingFrame = false;
    }
  }

  @override
  void dispose() {
    _stopFeed();
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

  void _toggleStreamSource() {
    setState(() {
      if (_streamSource == CameraStreamSource.esp32) {
        _streamSource = CameraStreamSource.server;
      } else {
        _streamSource = CameraStreamSource.esp32;
      }
    });
    _connectFeed();
  }

  void _showSettingsDialog() {
    final ipCtrl = TextEditingController(text: _esp32Ip);
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF1E293B)),
          ),
          title: Row(
            children: const [
              Icon(Icons.tune_rounded, color: Color(0xFF06B6D4), size: 22),
              SizedBox(width: 8),
              Text('Ajustes de Cámara', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Fuente de Transmisión:', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.wifi, size: 14),
                          SizedBox(width: 4),
                          Text('ESP32 Wi-Fi', style: TextStyle(fontSize: 11)),
                        ],
                      ),
                      selected: _streamSource == CameraStreamSource.esp32,
                      selectedColor: const Color(0xFF06B6D4),
                      onSelected: (val) {
                        if (val) {
                          setDlgState(() => _streamSource = CameraStreamSource.esp32);
                          setState(() => _streamSource = CameraStreamSource.esp32);
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.cloud_outlined, size: 14),
                          SizedBox(width: 4),
                          Text('Servidor Nube', style: TextStyle(fontSize: 11)),
                        ],
                      ),
                      selected: _streamSource == CameraStreamSource.server,
                      selectedColor: const Color(0xFF10B981),
                      onSelected: (val) {
                        if (val) {
                          setDlgState(() => _streamSource = CameraStreamSource.server);
                          setState(() => _streamSource = CameraStreamSource.server);
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('IP Directa del Collar (ESP32):', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: ipCtrl,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  hintText: '192.168.86.26',
                  hintStyle: const TextStyle(color: Colors.white38),
                  prefixIcon: const Icon(Icons.settings_ethernet, color: Color(0xFF06B6D4), size: 18),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                children: [
                  ActionChip(
                    label: const Text('86.26 (Collar)', style: TextStyle(fontSize: 10, color: Color(0xFF06B6D4))),
                    backgroundColor: const Color(0xFF1E293B),
                    onPressed: () => ipCtrl.text = '192.168.86.26',
                  ),
                  ActionChip(
                    label: const Text('86.22 (Taller)', style: TextStyle(fontSize: 10, color: Colors.white70)),
                    backgroundColor: const Color(0xFF1E293B),
                    onPressed: () => ipCtrl.text = '192.168.86.22',
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('CANCELAR', style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF06B6D4),
                foregroundColor: Colors.black,
              ),
              onPressed: () async {
                final newIp = ipCtrl.text.trim();
                if (newIp.isNotEmpty) {
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.setString('collar_esp32_cam_ip', newIp);
                  setState(() {
                    _esp32Ip = newIp;
                  });
                }
                Navigator.pop(ctx);
                _connectFeed();
              },
              child: const Text('GUARDAR Y CONECTAR', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
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
          bottom: BorderSide(color: const Color(0xFF10B981).withOpacity(0.3), width: 2),
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
            border: Border.all(color: const Color(0xFF06B6D4), width: 1.5),
            boxShadow: const [
              BoxShadow(color: Colors.black87, blurRadius: 16, offset: Offset(0, 8)),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              _buildVideoFeed(),
              _buildPipHUD(),
            ],
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
        padding: const EdgeInsets.all(12),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.videocam_off_rounded, color: Color(0xFFEF4444), size: 34),
              const SizedBox(height: 6),
              Text(
                _errorMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 11),
              ),
              const SizedBox(height: 8),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF06B6D4),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: _showSettingsDialog,
                icon: const Icon(Icons.tune, size: 14),
                label: const Text('REINTENTAR / CAMBIAR FUENTE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
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
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: Color(0xFF06B6D4), strokeWidth: 2),
              const SizedBox(height: 8),
              Text(
                _streamSource == CameraStreamSource.esp32
                    ? 'Conectando a ESP32 ($_esp32Ip:81)...'
                    : 'Cargando video desde Servidor...',
                style: const TextStyle(color: Colors.white54, fontSize: 10),
              ),
            ],
          ),
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
    final isEsp32 = _streamSource == CameraStreamSource.esp32;
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withOpacity(0.75),
            Colors.transparent,
            Colors.transparent,
            Colors.black.withOpacity(0.85),
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
              // Badge EN VIVO (Interactivo para alternar fuente)
              GestureDetector(
                onTap: _toggleStreamSource,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _hasError
                          ? const Color(0xFFEF4444)
                          : (isEsp32 ? const Color(0xFF06B6D4) : const Color(0xFF10B981)),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: _hasError
                              ? const Color(0xFFEF4444)
                              : (isEsp32 ? const Color(0xFF06B6D4) : const Color(0xFF10B981)),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _hasError
                            ? 'SIN SEÑAL (Toca p/ cambiar)'
                            : (isEsp32
                                ? 'ESP32 ($_esp32Ip) 🔄'
                                : 'SERVIDOR COWIA 🔄'),
                        style: TextStyle(
                          color: _hasError
                              ? const Color(0xFFEF4444)
                              : (isEsp32 ? const Color(0xFF06B6D4) : const Color(0xFF10B981)),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Botones de control y modo
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Botón Ajustes / Fuente de Video
                  IconButton(
                    iconSize: 18,
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(),
                    icon: const Icon(Icons.tune_rounded, color: Color(0xFF06B6D4)),
                    tooltip: 'Cambiar Fuente / IP',
                    onPressed: _showSettingsDialog,
                  ),
                  const SizedBox(width: 4),

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
                  const SizedBox(width: 4),

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
                    '🌱 $potrero  |  📡 ${widget.animal['medio_red'] ?? 'WIFI'}  |  🔋 $bateria%',
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
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('📸 Captura de Collar $collarId guardada en galería'),
                      duration: const Duration(seconds: 2),
                      backgroundColor: const Color(0xFF047857),
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
                icon: const Icon(Icons.tune, color: Color(0xFF06B6D4)),
                onPressed: _showSettingsDialog,
              ),
              const SizedBox(width: 6),
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
