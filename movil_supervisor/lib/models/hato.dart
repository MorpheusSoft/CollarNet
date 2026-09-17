import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'potrero.dart';

class Hato {
  final String id;
  String nombre;
  double areaHa;
  double perimeterM;
  List<LatLng> vertices;
  List<Potrero> potreros;
  Color color;
  String? notas;
  DateTime fechaRegistro;
  final bool permiteCrearPotreros;

  Hato({
    required this.id,
    required this.nombre,
    required this.areaHa,
    required this.perimeterM,
    required this.vertices,
    List<Potrero>? potreros,
    this.color = const Color(0xFF3B82F6),
    this.notas,
    DateTime? fechaRegistro,
    this.permiteCrearPotreros = false,
  })  : potreros = potreros ?? [],
        fechaRegistro = fechaRegistro ?? DateTime.now();

  double get totalPotrerosAreaHa {
    return potreros.fold(0.0, (sum, p) => sum + p.areaHa);
  }

  double get remainingAreaHa {
    final rem = areaHa - totalPotrerosAreaHa;
    return rem > 0 ? rem : 0.0;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre': nombre,
      'areaHa': areaHa,
      'perimeterM': perimeterM,
      'vertices': vertices
          .map((v) => {'lat': v.latitude, 'lng': v.longitude})
          .toList(),
      'potreros': potreros.map((p) => p.toJson()).toList(),
      'color': color.toARGB32(),
      'notas': notas,
      'fechaRegistro': fechaRegistro.toIso8601String(),
      'permiteCrearPotreros': permiteCrearPotreros,
    };
  }

  factory Hato.fromJson(Map<String, dynamic> json) {
    final potrerosList = (json['potreros'] as List<dynamic>?)
            ?.map((p) => Potrero.fromJson(p as Map<String, dynamic>))
            .toList() ??
        [];

    return Hato(
      id: json['id'] as String,
      nombre: json['nombre'] as String,
      areaHa: (json['areaHa'] as num?)?.toDouble() ?? 0.0,
      perimeterM: (json['perimeterM'] as num?)?.toDouble() ?? 0.0,
      vertices: (json['vertices'] as List<dynamic>?)
              ?.map((v) => LatLng(
                    (v['lat'] as num).toDouble(),
                    (v['lng'] as num).toDouble(),
                  ))
              .toList() ??
          [],
      potreros: potrerosList,
      color: json['color'] != null ? Color(json['color'] as int) : const Color(0xFF3B82F6),
      notas: json['notas'] as String?,
      fechaRegistro: json['fechaRegistro'] != null
          ? DateTime.parse(json['fechaRegistro'] as String)
          : DateTime.now(),
      permiteCrearPotreros: json['permiteCrearPotreros'] == true || json['permite_crear_potreros'] == true,
    );
  }

  Hato copyWith({
    String? id,
    String? nombre,
    double? areaHa,
    double? perimeterM,
    List<LatLng>? vertices,
    List<Potrero>? potreros,
    Color? color,
    String? notas,
    DateTime? fechaRegistro,
    bool? permiteCrearPotreros,
  }) {
    return Hato(
      id: id ?? this.id,
      nombre: nombre ?? this.nombre,
      areaHa: areaHa ?? this.areaHa,
      perimeterM: perimeterM ?? this.perimeterM,
      vertices: vertices ?? this.vertices,
      potreros: potreros ?? this.potreros,
      color: color ?? this.color,
      notas: notas ?? this.notas,
      fechaRegistro: fechaRegistro ?? this.fechaRegistro,
      permiteCrearPotreros: permiteCrearPotreros ?? this.permiteCrearPotreros,
    );
  }
}
