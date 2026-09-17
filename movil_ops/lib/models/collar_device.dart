class CollarDevice {
  final String id;
  final String imei;
  final int batteryPercent;
  final double batteryVoltage;
  final int rssi;
  final bool isBleConnected;
  final int satellitesLocked;
  final double hdop;
  final double latitude;
  final double longitude;
  final double solarCurrentMa;
  final int csqSignal;
  final String status;

  CollarDevice({
    required this.id,
    required this.imei,
    required this.batteryPercent,
    required this.batteryVoltage,
    required this.rssi,
    required this.isBleConnected,
    required this.satellitesLocked,
    required this.hdop,
    required this.latitude,
    required this.longitude,
    required this.solarCurrentMa,
    required this.csqSignal,
    required this.status,
  });

  factory CollarDevice.mockActive() {
    return CollarDevice(
      id: 'COW-2026-0042',
      imei: '864920042183920',
      batteryPercent: 88,
      batteryVoltage: 4.12,
      rssi: -42,
      isBleConnected: true,
      satellitesLocked: 9,
      hdop: 1.1,
      latitude: 9.70512,
      longitude: -67.35124,
      solarCurrentMa: 140.0,
      csqSignal: 24,
      status: 'EN_REVISION',
    );
  }
}
