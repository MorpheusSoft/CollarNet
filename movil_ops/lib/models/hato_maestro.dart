import 'package:latlong2/latlong.dart';

class HatoMaestro {
  final int? id;
  final int tenantId;
  final String tenantNombre;
  final String nombre;
  final List<LatLng> vertices;
  final double areaHa;
  final double perimeterKm;
  final double warningWidthM;
  final bool permiteCrearPotreros;
  final String modoOrigen; // 'IA_PDF', 'SATELITAL', 'GPS_TERRENO'
  final DateTime? fechaCreacion;

  HatoMaestro({
    this.id,
    required this.tenantId,
    required this.tenantNombre,
    required this.nombre,
    required this.vertices,
    required this.areaHa,
    required this.perimeterKm,
    this.warningWidthM = 25.0,
    this.permiteCrearPotreros = true,
    this.modoOrigen = 'SATELITAL',
    this.fechaCreacion,
  });

  HatoMaestro copyWith({
    int? id,
    int? tenantId,
    String? tenantNombre,
    String? nombre,
    List<LatLng>? vertices,
    double? areaHa,
    double? perimeterKm,
    double? warningWidthM,
    bool? permiteCrearPotreros,
    String? modoOrigen,
    DateTime? fechaCreacion,
  }) {
    return HatoMaestro(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      tenantNombre: tenantNombre ?? this.tenantNombre,
      nombre: nombre ?? this.nombre,
      vertices: vertices ?? this.vertices,
      areaHa: areaHa ?? this.areaHa,
      perimeterKm: perimeterKm ?? this.perimeterKm,
      warningWidthM: warningWidthM ?? this.warningWidthM,
      permiteCrearPotreros: permiteCrearPotreros ?? this.permiteCrearPotreros,
      modoOrigen: modoOrigen ?? this.modoOrigen,
      fechaCreacion: fechaCreacion ?? this.fechaCreacion,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'nombre': nombre,
      'warningWidthM': warningWidthM,
      'permiteCrearPotreros': permiteCrearPotreros,
      'modoOrigen': modoOrigen,
      'vertices': vertices.map((v) => [v.latitude, v.longitude]).toList(),
    };
  }
}
