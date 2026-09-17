import 'package:flutter_test/flutter_test.dart';
import 'package:movil_ops/models/collar_inventario.dart';
import 'package:movil_ops/providers/inventory_provider.dart';

void main() {
  group('InventoryProvider & Model Tests', () {
    test('addScannedCollar agrega collares correctamente e incrementa contador', () {
      final provider = InventoryProvider();
      provider.clearBatchDraft();

      expect(provider.scannedCollares.length, equals(0));

      final res1 = provider.addScannedCollar(
        rawCode: 'COW-2026-0001',
        imei: '864920000000001',
        sim: '+584120000001',
      );

      expect(res1['success'], isTrue);
      expect(provider.scannedCollares.length, equals(1));
      expect(provider.scannedCollares.first.id, equals('COW-2026-0001'));
    });

    test('addScannedCollar detecta duplicados en la misma sesión de lote', () {
      final provider = InventoryProvider();
      provider.clearBatchDraft();

      provider.addScannedCollar(
        rawCode: 'COW-2026-0001',
        imei: '864920000000001',
      );

      // Intentar agregar el mismo ID
      final resDuplicate = provider.addScannedCollar(
        rawCode: 'COW-2026-0001',
      );

      expect(resDuplicate['success'], isFalse);
      expect(resDuplicate['isDuplicate'], isTrue);
      expect(provider.scannedCollares.length, equals(1));
    });

    test('configureBatch actualiza parámetros del lote incluyendo ubicación y fecha', () {
      final provider = InventoryProvider();
      final receptionDate = DateTime(2026, 9, 7);

      provider.configureBatch(
        batchNumber: 'L-2026-10',
        proveedor: 'Fabrica Central CowIA',
        targetCount: 150,
        ubicacionAlmacen: 'Estante B-04 (Depósito)',
        fechaRecepcion: receptionDate,
        tenantId: 2,
        versionHardware: 'HW-v3.0',
        versionFirmware: '2.0.0',
        notas: 'Lote de prueba unitaria con precintos verificados',
      );

      expect(provider.batchNumber, equals('L-2026-10'));
      expect(provider.proveedor, equals('Fabrica Central CowIA'));
      expect(provider.targetCount, equals(150));
      expect(provider.ubicacionAlmacen, equals('Estante B-04 (Depósito)'));
      expect(provider.fechaRecepcion, equals(receptionDate));
      expect(provider.selectedTenantId, equals(2));
      expect(provider.versionHardware, equals('HW-v3.0'));
      expect(provider.versionFirmware, equals('2.0.0'));
      expect(provider.notasLote, equals('Lote de prueba unitaria con precintos verificados'));
    });

    test('startNewBatch limpia borrador previo e inicializa nuevo lote guiado', () {
      final provider = InventoryProvider();
      provider.addScannedCollar(rawCode: 'COW-PREV-001');
      expect(provider.scannedCollares.isNotEmpty, isTrue);

      final date = DateTime(2026, 9, 15);
      provider.startNewBatch(
        batchNumber: 'L-2026-15',
        proveedor: 'Nordic Semiconductor',
        targetCount: 200,
        ubicacionAlmacen: 'Taller de Diagnóstico',
        fechaRecepcion: date,
        tenantId: 1,
        versionHardware: 'HW-v2.1',
        versionFirmware: '1.2.0',
        notas: 'Lote nuevo inicializado desde diálogo guiado',
      );

      expect(provider.scannedCollares.length, equals(0));
      expect(provider.batchNumber, equals('L-2026-15'));
      expect(provider.proveedor, equals('Nordic Semiconductor'));
      expect(provider.targetCount, equals(200));
      expect(provider.ubicacionAlmacen, equals('Taller de Diagnóstico'));
      expect(provider.fechaRecepcion, equals(date));
      expect(provider.selectedTenantId, equals(1));
      expect(provider.versionHardware, equals('HW-v2.1'));
      expect(provider.versionFirmware, equals('1.2.0'));
      expect(provider.notasLote, equals('Lote nuevo inicializado desde diálogo guiado'));
    });

    test('CollarInventario.fromJson y toJson serializan todos los campos', () {
      final json = {
        'id': 'COW-TEST-99',
        'numero_sim': '+584129999999',
        'imei': '864920099999999',
        'estado': 'EN_ALMACEN',
        'lote_id': 1,
        'lote_codigo': 'L-2026-08',
        'tenant_nombre': 'Hacienda Demo',
        'nivel_bateria': 85,
        'senal_celular': 4,
        'animal_arete': 'NEL-100',
        'activo': true,
      };

      final collar = CollarInventario.fromJson(json);

      expect(collar.id, equals('COW-TEST-99'));
      expect(collar.numeroSim, equals('+584129999999'));
      expect(collar.imei, equals('864920099999999'));
      expect(collar.estado, equals('EN_ALMACEN'));
      expect(collar.loteId, equals(1));
      expect(collar.loteCodigo, equals('L-2026-08'));
      expect(collar.tenantNombre, equals('Hacienda Demo'));
      expect(collar.nivelBateria, equals(85));
      expect(collar.senalCelular, equals(4));
      expect(collar.animalArete, equals('NEL-100'));
      expect(collar.activo, isTrue);

      final outMap = collar.toJson();
      expect(outMap['id'], equals('COW-TEST-99'));
      expect(outMap['estado'], equals('EN_ALMACEN'));
    });
  });
}
