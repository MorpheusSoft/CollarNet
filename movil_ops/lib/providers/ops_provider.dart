import 'package:flutter/material.dart';
import '../models/collar_device.dart';

class OpsProvider extends ChangeNotifier {
  // Estado del Operador y Servidor
  String operatorName = 'Ing. Carlos Mendoza';
  String operatorRole = 'Soporte CowIA / SuperAdmin';
  bool isCloudServerOnline = true;
  int serverLatencyMs = 42;

  // Métricas de Stock
  int totalStockCount = 142;
  int inReviewCount = 8;
  int totalBatchesCount = 12;

  // Collar Activo Seleccionado
  CollarDevice? activeCollar = CollarDevice.mockActive();
  bool isScanningBle = false;

  // Bitácora de Auditoría Reciente
  List<Map<String, dynamic>> recentActivities = [
    {
      'title': 'Collar COW-2026-0042 [TEST APROBADO ✅]',
      'subtitle': 'Buzzer, IMU 3-ejes, GNSS 3D y corte 60s certificados',
      'time': 'Hace 4m',
      'type': 'success',
    },
    {
      'title': 'Lote #L-2026-08 (50 unidades) ingresado',
      'subtitle': 'Carga masiva escaneada en Almacén Central',
      'time': 'Hace 18m',
      'type': 'info',
    },
    {
      'title': 'Hato "Hacienda La Gloria" creado con IA',
      'subtitle': 'Plano catastral PDF procesado (1,240 Ha, 18 vértices)',
      'time': 'Hace 1h',
      'type': 'purple',
    },
  ];

  void startBleScan() {
    isScanningBle = true;
    notifyListeners();

    // Simulación de escaneo rápido
    Future.delayed(const Duration(seconds: 2), () {
      isScanningBle = false;
      activeCollar = CollarDevice.mockActive();
      notifyListeners();
    });
  }

  void setActiveCollar(CollarDevice collar) {
    activeCollar = collar;
    notifyListeners();
  }
}
