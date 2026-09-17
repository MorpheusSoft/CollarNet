import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

class Potrero {
  final String id;
  String nombre;
  final String hatoId;
  double areaHa;
  double perimeterM;
  List<LatLng> vertices;
  Color color;
  String? notas;
  DateTime fechaRegistro;

  Potrero({
    required this.id,
    required this.nombre,
    required this.hatoId,
    required this.areaHa,
    required this.perimeterM,
    required this.vertices,
    this.color = const Color(0xFF10B981),
    this.notas,
    DateTime? fechaRegistro,
  }) : fechaRegistro = fechaRegistro ?? DateTime.now();

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre': nombre,
      'hatoId': hatoId,
      'areaHa': areaHa,
      'perimeterM': perimeterM,
      'vertices': vertices
          .map((v) => {'lat': v.latitude, 'lng': v.longitude})
          .toList(),
      'color': color.value,
      'notas': notas,
      'fechaRegistro': fechaRegistro.toIso8601String(),
    };
  }

  factory Potrero.fromJson(Map<String, dynamic> json) {
    return Potrero(
      id: json['id'] as String,
      nombre: json['nombre'] as String,
      hatoId: json['hatoId'] as String,
      areaHa: (json['areaHa'] as num).toDouble(),
      perimeterM: (json['perimeterM'] as num).toDouble(),
      vertices: (json['vertices'] as List<dynamic>)
          .map((v) => LatLng(
                (v['lat'] as num).toDouble(),
                (v['lng'] as num).toDouble(),
              ))
          .toList(),
      color: json['color'] != null ? Color(json['color'] as int) : const Color(0xFF10B981),
      notas: json['notas'] as String?,
      fechaRegistro: json['fechaRegistro'] != null
          ? DateTime.parse(json['fechaRegistro'] as String)
          : DateTime.now(),
    );
  }

  Potrero copyWith({
    String? id,
    String? nombre,
    String? hatoId,
    double? areaHa,
    double? perimeterM,
    List<LatLng>? vertices,
    Color? color,
    String? notas,
    DateTime? fechaRegistro,
  }) {
    return Potrero(
      id: id ?? this.id,
      nombre: nombre ?? this.nombre,
      hatoId: hatoId ?? this.hatoId,
      areaHa: areaHa ?? this.areaHa,
      perimeterM: perimeterM ?? this.perimeterM,
      vertices: vertices ?? List.from(this.vertices),
      color: color ?? this.color,
      notas: notas ?? this.notas,
      fechaRegistro: fechaRegistro ?? this.fechaRegistro,
    );
  }
}
