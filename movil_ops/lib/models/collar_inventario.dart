class CollarInventario {
  final String id;
  final String numeroSim;
  final String? imei;
  final String? macAddress;
  final String? numeroSerie;
  final String estado;
  final int? loteId;
  final String? loteCodigo;
  final String? loteProveedor;
  final int? tenantId;
  final String? tenantNombre;
  final String? ubicacionAlmacen;
  final String? motivoEstado;
  final int? nivelBateria;
  final int? senalCelular;
  final DateTime? ultimaConexion;
  final DateTime? fechaInstalacion;
  final String? versionFirmware;
  final bool activo;
  final DateTime? creadoEn;
  final double? latitud;
  final double? longitud;
  final int? animalId;
  final String? animalArete;
  final String? animalRaza;
  final String? animalCategoria;
  final int? potreroId;
  final String? potreroNombre;
  final int? hatoId;
  final String? hatoNombre;

  const CollarInventario({
    required this.id,
    required this.numeroSim,
    this.imei,
    this.macAddress,
    this.numeroSerie,
    this.estado = 'EN_ALMACEN',
    this.loteId,
    this.loteCodigo,
    this.loteProveedor,
    this.tenantId,
    this.tenantNombre,
    this.ubicacionAlmacen,
    this.motivoEstado,
    this.nivelBateria,
    this.senalCelular,
    this.ultimaConexion,
    this.fechaInstalacion,
    this.versionFirmware,
    this.activo = true,
    this.creadoEn,
    this.latitud,
    this.longitud,
    this.animalId,
    this.animalArete,
    this.animalRaza,
    this.animalCategoria,
    this.potreroId,
    this.potreroNombre,
    this.hatoId,
    this.hatoNombre,
  });

  factory CollarInventario.fromJson(Map<String, dynamic> json) {
    return CollarInventario(
      id: json['id']?.toString() ?? '',
      numeroSim: json['numero_sim']?.toString() ?? json['numeroSim']?.toString() ?? '',
      imei: json['imei']?.toString(),
      macAddress: json['mac_address']?.toString() ?? json['macAddress']?.toString(),
      numeroSerie: json['numero_serie']?.toString() ?? json['numeroSerie']?.toString(),
      estado: json['estado']?.toString() ?? 'EN_ALMACEN',
      loteId: json['lote_id'] != null ? int.tryParse(json['lote_id'].toString()) : (json['loteId'] != null ? int.tryParse(json['loteId'].toString()) : null),
      loteCodigo: json['lote_codigo']?.toString() ?? json['loteCodigo']?.toString(),
      loteProveedor: json['lote_proveedor']?.toString() ?? json['loteProveedor']?.toString(),
      tenantId: json['tenant_id'] != null ? int.tryParse(json['tenant_id'].toString()) : (json['tenantId'] != null ? int.tryParse(json['tenantId'].toString()) : null),
      tenantNombre: json['tenant_nombre']?.toString() ?? json['tenantNombre']?.toString(),
      ubicacionAlmacen: json['ubicacion_almacen']?.toString() ?? json['ubicacionAlmacen']?.toString(),
      motivoEstado: json['motivo_estado']?.toString() ?? json['motivoEstado']?.toString(),
      nivelBateria: json['nivel_bateria'] != null ? int.tryParse(json['nivel_bateria'].toString()) : (json['nivelBateria'] != null ? int.tryParse(json['nivelBateria'].toString()) : null),
      senalCelular: json['senal_celular'] != null ? int.tryParse(json['senal_celular'].toString()) : (json['senalCelular'] != null ? int.tryParse(json['senalCelular'].toString()) : null),
      ultimaConexion: json['ultima_conexion'] != null ? DateTime.tryParse(json['ultima_conexion'].toString()) : (json['ultimaConexion'] != null ? DateTime.tryParse(json['ultimaConexion'].toString()) : null),
      fechaInstalacion: json['fecha_instalacion'] != null ? DateTime.tryParse(json['fecha_instalacion'].toString()) : (json['fechaInstalacion'] != null ? DateTime.tryParse(json['fechaInstalacion'].toString()) : null),
      versionFirmware: json['version_firmware']?.toString() ?? json['versionFirmware']?.toString(),
      activo: json['activo'] == true || json['activo'] == 1 || json['activo'] == 'true',
      creadoEn: json['creado_en'] != null ? DateTime.tryParse(json['creado_en'].toString()) : (json['creadoEn'] != null ? DateTime.tryParse(json['creadoEn'].toString()) : null),
      latitud: json['latitud'] != null ? double.tryParse(json['latitud'].toString()) : null,
      longitud: json['longitud'] != null ? double.tryParse(json['longitud'].toString()) : null,
      animalId: json['animal_id'] != null ? int.tryParse(json['animal_id'].toString()) : (json['animalId'] != null ? int.tryParse(json['animalId'].toString()) : null),
      animalArete: json['animal_arete']?.toString() ?? json['animalArete']?.toString(),
      animalRaza: json['animal_raza']?.toString() ?? json['animalRaza']?.toString(),
      animalCategoria: json['animal_categoria']?.toString() ?? json['animalCategoria']?.toString(),
      potreroId: json['potrero_id'] != null ? int.tryParse(json['potrero_id'].toString()) : (json['potreroId'] != null ? int.tryParse(json['potreroId'].toString()) : null),
      potreroNombre: json['potrero_nombre']?.toString() ?? json['potreroNombre']?.toString(),
      hatoId: json['hato_id'] != null ? int.tryParse(json['hato_id'].toString()) : (json['hatoId'] != null ? int.tryParse(json['hatoId'].toString()) : null),
      hatoNombre: json['hato_nombre']?.toString() ?? json['hatoNombre']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'numero_sim': numeroSim,
      'imei': imei,
      'mac_address': macAddress,
      'numero_serie': numeroSerie,
      'estado': estado,
      'lote_id': loteId,
      'lote_codigo': loteCodigo,
      'lote_proveedor': loteProveedor,
      'tenant_id': tenantId,
      'tenant_nombre': tenantNombre,
      'ubicacion_almacen': ubicacionAlmacen,
      'motivo_estado': motivoEstado,
      'nivel_bateria': nivelBateria,
      'senal_celular': senalCelular,
      'ultima_conexion': ultimaConexion?.toIso8601String(),
      'fecha_instalacion': fechaInstalacion?.toIso8601String(),
      'version_firmware': versionFirmware,
      'activo': activo,
      'creado_en': creadoEn?.toIso8601String(),
      'latitud': latitud,
      'longitud': longitud,
      'animal_id': animalId,
      'animal_arete': animalArete,
      'animal_raza': animalRaza,
      'animal_categoria': animalCategoria,
      'potrero_id': potreroId,
      'potrero_nombre': potreroNombre,
      'hato_id': hatoId,
      'hato_nombre': hatoNombre,
    };
  }

  CollarInventario copyWith({
    String? id,
    String? numeroSim,
    String? imei,
    String? macAddress,
    String? numeroSerie,
    String? estado,
    int? loteId,
    String? loteCodigo,
    String? loteProveedor,
    int? tenantId,
    String? tenantNombre,
    String? ubicacionAlmacen,
    String? motivoEstado,
    int? nivelBateria,
    int? senalCelular,
    DateTime? ultimaConexion,
    DateTime? fechaInstalacion,
    String? versionFirmware,
    bool? activo,
    DateTime? creadoEn,
    double? latitud,
    double? longitud,
    int? animalId,
    String? animalArete,
    String? animalRaza,
    String? animalCategoria,
    int? potreroId,
    String? potreroNombre,
    int? hatoId,
    String? hatoNombre,
  }) {
    return CollarInventario(
      id: id ?? this.id,
      numeroSim: numeroSim ?? this.numeroSim,
      imei: imei ?? this.imei,
      macAddress: macAddress ?? this.macAddress,
      numeroSerie: numeroSerie ?? this.numeroSerie,
      estado: estado ?? this.estado,
      loteId: loteId ?? this.loteId,
      loteCodigo: loteCodigo ?? this.loteCodigo,
      loteProveedor: loteProveedor ?? this.loteProveedor,
      tenantId: tenantId ?? this.tenantId,
      tenantNombre: tenantNombre ?? this.tenantNombre,
      ubicacionAlmacen: ubicacionAlmacen ?? this.ubicacionAlmacen,
      motivoEstado: motivoEstado ?? this.motivoEstado,
      nivelBateria: nivelBateria ?? this.nivelBateria,
      senalCelular: senalCelular ?? this.senalCelular,
      ultimaConexion: ultimaConexion ?? this.ultimaConexion,
      fechaInstalacion: fechaInstalacion ?? this.fechaInstalacion,
      versionFirmware: versionFirmware ?? this.versionFirmware,
      activo: activo ?? this.activo,
      creadoEn: creadoEn ?? this.creadoEn,
      latitud: latitud ?? this.latitud,
      longitud: longitud ?? this.longitud,
      animalId: animalId ?? this.animalId,
      animalArete: animalArete ?? this.animalArete,
      animalRaza: animalRaza ?? this.animalRaza,
      animalCategoria: animalCategoria ?? this.animalCategoria,
      potreroId: potreroId ?? this.potreroId,
      potreroNombre: potreroNombre ?? this.potreroNombre,
      hatoId: hatoId ?? this.hatoId,
      hatoNombre: hatoNombre ?? this.hatoNombre,
    );
  }
}

class LoteHardware {
  final int id;
  final String codigoLote;
  final String proveedor;
  final DateTime? fechaRecepcion;
  final int cantidadTotal;
  final String? versionHardware;
  final String? versionFirmwareInicial;
  final int? tenantId;
  final String? tenantNombre;
  final String? notas;
  final int collaresRegistrados;
  final int collaresActivos;
  final int collaresEnAlmacen;
  final int collaresEnRevision;

  const LoteHardware({
    required this.id,
    required this.codigoLote,
    required this.proveedor,
    this.fechaRecepcion,
    required this.cantidadTotal,
    this.versionHardware,
    this.versionFirmwareInicial,
    this.tenantId,
    this.tenantNombre,
    this.notas,
    this.collaresRegistrados = 0,
    this.collaresActivos = 0,
    this.collaresEnAlmacen = 0,
    this.collaresEnRevision = 0,
  });

  factory LoteHardware.fromJson(Map<String, dynamic> json) {
    return LoteHardware(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      codigoLote: json['codigo_lote']?.toString() ?? json['codigoLote']?.toString() ?? '',
      proveedor: json['proveedor']?.toString() ?? '',
      fechaRecepcion: json['fecha_recepcion'] != null ? DateTime.tryParse(json['fecha_recepcion'].toString()) : null,
      cantidadTotal: json['cantidad_total'] is int ? json['cantidad_total'] : int.tryParse(json['cantidad_total'].toString()) ?? 0,
      versionHardware: json['version_hardware']?.toString() ?? json['versionHardware']?.toString(),
      versionFirmwareInicial: json['version_firmware_inicial']?.toString() ?? json['versionFirmwareInicial']?.toString(),
      tenantId: json['tenant_id'] != null ? int.tryParse(json['tenant_id'].toString()) : null,
      tenantNombre: json['tenant_nombre']?.toString() ?? json['tenantNombre']?.toString(),
      notas: json['notas']?.toString(),
      collaresRegistrados: json['collares_registrados'] is int ? json['collares_registrados'] : int.tryParse(json['collares_registrados'].toString()) ?? 0,
      collaresActivos: json['collares_activos'] is int ? json['collares_activos'] : int.tryParse(json['collares_activos'].toString()) ?? 0,
      collaresEnAlmacen: json['collares_en_almacen'] is int ? json['collares_en_almacen'] : int.tryParse(json['collares_en_almacen'].toString()) ?? 0,
      collaresEnRevision: json['collares_en_revision'] is int ? json['collares_en_revision'] : int.tryParse(json['collares_en_revision'].toString()) ?? 0,
    );
  }
}

class CollarHistorial {
  final int id;
  final String collarId;
  final String? estadoAnterior;
  final String? estadoNuevo;
  final String? tenantAnteriorNombre;
  final String? tenantNuevoNombre;
  final String? areteAnterior;
  final String? areteNuevo;
  final String? usuarioNombre;
  final String? motivo;
  final DateTime? fechaCambio;

  const CollarHistorial({
    required this.id,
    required this.collarId,
    this.estadoAnterior,
    this.estadoNuevo,
    this.tenantAnteriorNombre,
    this.tenantNuevoNombre,
    this.areteAnterior,
    this.areteNuevo,
    this.usuarioNombre,
    this.motivo,
    this.fechaCambio,
  });

  factory CollarHistorial.fromJson(Map<String, dynamic> json) {
    return CollarHistorial(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      collarId: json['collar_id']?.toString() ?? '',
      estadoAnterior: json['estado_anterior']?.toString(),
      estadoNuevo: json['estado_nuevo']?.toString(),
      tenantAnteriorNombre: json['tenant_anterior_nombre']?.toString(),
      tenantNuevoNombre: json['tenant_nuevo_nombre']?.toString(),
      areteAnterior: json['arete_anterior']?.toString(),
      areteNuevo: json['arete_nuevo']?.toString(),
      usuarioNombre: json['usuario_nombre']?.toString(),
      motivo: json['motivo']?.toString(),
      fechaCambio: json['fecha_cambio'] != null ? DateTime.tryParse(json['fecha_cambio'].toString()) : null,
    );
  }
}

class ScannedCollarDraft {
  final String id;
  final String imei;
  final String numeroSim;
  final String? numeroSerie;
  final String status;
  final DateTime scanTime;

  const ScannedCollarDraft({
    required this.id,
    required this.imei,
    required this.numeroSim,
    this.numeroSerie,
    this.status = 'EN_ALMACEN',
    required this.scanTime,
  });
}
