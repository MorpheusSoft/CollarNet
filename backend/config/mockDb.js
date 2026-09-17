// Mock Database Engine para CollarNet Standalone (cuando PostgreSQL/PostGIS no está instalado localmente)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, 'mock_db_data.json');

function pointInPolygon(point, polygon) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function parseWKT(wkt) {
  if (!wkt) return [];
  const coordsMatch = wkt.match(/\(\((.*?)\)\)/);
  if (!coordsMatch) return [];
  const pairs = coordsMatch[1].split(',').map(s => s.trim());
  return pairs.map(p => {
    const [lon, lat] = p.split(/\s+/).map(Number);
    return [lat, lon];
  });
}

function verticesToGeoJSON(vertices) {
  const ring = vertices.map(v => [v[1], v[0]]);
  if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push([ring[0][0], ring[0][1]]);
  }
  return JSON.stringify({
    type: 'Polygon',
    coordinates: [ring]
  });
}

class MockDB {
  constructor() {
    this._filePath = DB_FILE_PATH;
    if (fs.existsSync(this._filePath)) {
      try {
        const raw = fs.readFileSync(this._filePath, 'utf8');
        const data = JSON.parse(raw);
        this.propietarios = data.propietarios || [];
        this.hatos = data.hatos || [];
        this.potreros = data.potreros || [];
        this.collares = data.collares || [];
        this.animales = data.animales || [];
        this.registro_pesajes = data.registro_pesajes || [];
        this.parametros_rendimiento = data.parametros_rendimiento || [];
        this.telemetria = data.telemetria || [];
        this.alertas = data.alertas || [];
        this.nextId = data.nextId || { propietarios: 2, hatos: 2, potreros: 3, animales: 3, pesajes: 5, alertas: 1 };
        
        // Limpiar duplicados accidentales en hatos cargados
        const uniqueHatos = [];
        const seenCoords = new Set();
        for (const h of this.hatos) {
          const key = (h.vertices || []).map(v => `${v[0].toFixed(5)},${v[1].toFixed(5)}`).join('|');
          if (!seenCoords.has(key)) {
            seenCoords.add(key);
            uniqueHatos.push(h);
          }
        }
        this.hatos = uniqueHatos;
        this.save();
        return;
      } catch (err) {
        console.error('[MockDB] Error leyendo mock_db_data.json, reinicializando semilla:', err);
      }
    }

    this.propietarios = [
      { id: 1, nombre: 'Luis Zambrano (Hacienda Demo)', documento_identidad: 'V-12345678', telefono: '+58 412 111 2233', correo: 'luis@collarnet.com', creado_en: new Date() }
    ];

    this.hatos = [
      {
        id: 1,
        nombre: 'Hato La Esperanza (Principal)',
        vertices: [
          [9.1010, -67.1010],
          [9.1010, -67.0990],
          [9.0990, -67.0990],
          [9.0990, -67.1010]
        ],
        creado_en: new Date()
      }
    ];

    this.potreros = [
      {
        id: 1,
        hato_id: 1,
        nombre: 'Potrero A1 - Pastura Norte',
        vertices: [
          [9.1010, -67.1010],
          [9.1010, -67.1000],
          [9.0990, -67.1000],
          [9.0990, -67.1010]
        ],
        capacidad_max_cabezas: 35,
        creado_en: new Date()
      },
      {
        id: 2,
        hato_id: 1,
        nombre: 'Potrero A2 - Pastura Este',
        vertices: [
          [9.1010, -67.1000],
          [9.1010, -67.0990],
          [9.0990, -67.0990],
          [9.0990, -67.1000]
        ],
        capacidad_max_cabezas: 40,
        creado_en: new Date()
      }
    ];

    this.collares = [
      {
        id: 'collar_test_001',
        numero_sim: '+584129990001',
        nivel_bateria: 94,
        senal_celular: 4,
        latitud: 9.1000,
        longitud: -67.1005,
        ultima_conexion: new Date(),
        fecha_instalacion: '2026-07-01',
        activo: true
      },
      {
        id: 'collar_test_002',
        numero_sim: '+584129990002',
        nivel_bateria: 88,
        senal_celular: 5,
        latitud: 9.1002,
        longitud: -67.0995,
        ultima_conexion: new Date(),
        fecha_instalacion: '2026-07-15',
        activo: true
      }
    ];

    this.animales = [
      {
        id: 1,
        collar_id: 'collar_test_001',
        propietario_id: 1,
        potrero_id: 1,
        arete_visual: 'NEL-042',
        raza: 'Nelore',
        categoria: 'Novillo',
        fecha_nacimiento: '2025-01-15'
      },
      {
        id: 2,
        collar_id: 'collar_test_002',
        propietario_id: 1,
        potrero_id: 2,
        arete_visual: 'BRA-108',
        raza: 'Nelore',
        categoria: 'Novillo',
        fecha_nacimiento: '2024-11-20'
      }
    ];

    this.registro_pesajes = [
      { id: 1, animal_id: 1, peso: 310.00, fecha_pesaje: '2026-06-25' },
      { id: 2, animal_id: 1, peso: 335.50, fecha_pesaje: '2026-07-25' },
      { id: 3, animal_id: 1, peso: 362.00, fecha_pesaje: '2026-08-25' },
      { id: 4, animal_id: 2, peso: 380.00, fecha_pesaje: '2026-08-01' }
    ];

    this.parametros_rendimiento = [
      { id: 1, raza: 'Nelore', categoria: 'Novillo', gdp_promedio: 0.850, peso_adulto_esperado: 550.00, costo_diario_manutencion: 1.20, precio_mercado_por_kg: 2.10 },
      { id: 2, raza: 'Nelore', categoria: 'Toro', gdp_promedio: 1.050, peso_adulto_esperado: 800.00, costo_diario_manutencion: 1.60, precio_mercado_por_kg: 2.25 },
      { id: 3, raza: 'Nelore', categoria: 'Vaca', gdp_promedio: 0.720, peso_adulto_esperado: 480.00, costo_diario_manutencion: 1.10, precio_mercado_por_kg: 2.00 }
    ];

    this.telemetria = [];
    this.alertas = [];
    this.nextId = { propietarios: 2, hatos: 2, potreros: 3, animales: 3, pesajes: 5, alertas: 1 };
  }

  save() {
    try {
      const data = {
        propietarios: this.propietarios,
        hatos: this.hatos,
        potreros: this.potreros,
        collares: this.collares,
        animales: this.animales,
        registro_pesajes: this.registro_pesajes,
        parametros_rendimiento: this.parametros_rendimiento,
        telemetria: this.telemetria,
        alertas: this.alertas,
        nextId: this.nextId
      };
      fs.writeFileSync(this._filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[MockDB] Error guardando a disco:', err);
    }
  }

  async query(text, params = []) {
    const q = text.trim();

    // 1. SELECT 1 (healthcheck)
    if (/SELECT 1/i.test(q)) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // 2. GET /api/animales/monitoreo
    if (/FROM animales a\s+INNER JOIN collares c/i.test(q) && /potreros p/i.test(q)) {
      const rows = this.animales.map(a => {
        const c = this.collares.find(col => col.id === a.collar_id) || {};
        const p = this.potreros.find(pot => pot.id === a.potrero_id);
        const birth = new Date(a.fecha_nacimiento);
        const now = new Date();
        const edad_dias = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
        const activeAlert = this.alertas.find(al => al.animal_id === a.id && al.estado === 'ACTIVO');

        return {
          animal_id: a.id,
          arete_visual: a.arete_visual,
          raza: a.raza,
          categoria: a.categoria,
          fecha_nacimiento: a.fecha_nacimiento,
          edad_dias,
          collar_id: c.id || null,
          numero_sim: c.numero_sim || '',
          nivel_bateria: c.nivel_bateria || 0,
          senal_celular: c.senal_celular || 0,
          ultima_conexion: c.ultima_conexion || new Date(),
          latitud: c.latitud !== undefined ? c.latitud : 9.1000,
          longitud: c.longitud !== undefined ? c.longitud : -67.1000,
          potrero_asignado_nombre: p ? p.nombre : null,
          estado_alerta: activeAlert ? activeAlert.tipo : 'NORMAL'
        };
      });
      return { rows, rowCount: rows.length };
    }

    // 3. GET /api/geocercas/hatos
    if (/SELECT id, nombre, ST_AsGeoJSON\(perimetro\) AS geojson FROM hatos/i.test(q)) {
      const rows = this.hatos.map(h => ({
        id: h.id,
        nombre: h.nombre,
        geojson: verticesToGeoJSON(h.vertices)
      }));
      return { rows, rowCount: rows.length };
    }

    // 4. GET /api/geocercas/potreros
    if (/SELECT id, hato_id, nombre, ST_AsGeoJSON\(perimetro\) AS geojson FROM potreros/i.test(q)) {
      const rows = this.potreros.map(p => ({
        id: p.id,
        hato_id: p.hato_id,
        nombre: p.nombre,
        geojson: verticesToGeoJSON(p.vertices)
      }));
      return { rows, rowCount: rows.length };
    }

    // 5. GET /api/collares
    if (/SELECT id, numero_sim, nivel_bateria, senal_celular, ultima_conexion, activo FROM collares/i.test(q)) {
      return { rows: [...this.collares], rowCount: this.collares.length };
    }

    // 6. GET /api/propietarios
    if (/SELECT id, nombre, documento_identidad FROM propietarios/i.test(q)) {
      return { rows: [...this.propietarios], rowCount: this.propietarios.length };
    }

    // 7. GET /api/geocercas/sincronizar queries
    if (/SELECT p\.hato_id, h\.nombre AS hato_nombre, c\.activo FROM animales a/i.test(q)) {
      const collarId = params[0];
      const a = this.animales.find(an => an.collar_id === collarId);
      if (!a) return { rows: [], rowCount: 0 };
      const p = this.potreros.find(pot => pot.id === a.potrero_id);
      const h = p ? this.hatos.find(hat => hat.id === p.hato_id) : null;
      const c = this.collares.find(col => col.id === collarId);
      if (!p || !h) return { rows: [], rowCount: 0 };
      return {
        rows: [{ hato_id: p.hato_id, hato_nombre: h.nombre, activo: c ? c.activo : true }],
        rowCount: 1
      };
    }

    if (/SELECT nombre, ST_AsGeoJSON\(perimetro\) as geojson FROM hatos WHERE id = \$1/i.test(q)) {
      const h = this.hatos.find(hat => hat.id === parseInt(params[0], 10));
      if (!h) return { rows: [], rowCount: 0 };
      return { rows: [{ nombre: h.nombre, geojson: verticesToGeoJSON(h.vertices) }], rowCount: 1 };
    }

    if (/SELECT nombre, ST_AsGeoJSON\(perimetro\) as geojson FROM potreros WHERE id = \$1/i.test(q)) {
      const p = this.potreros.find(pot => pot.id === parseInt(params[0], 10));
      if (!p) return { rows: [], rowCount: 0 };
      return { rows: [{ nombre: p.nombre, geojson: verticesToGeoJSON(p.vertices) }], rowCount: 1 };
    }

    if (/UPDATE animales SET potrero_id = \$1 WHERE collar_id = \$2/i.test(q)) {
      const [potId, collarId] = params;
      const a = this.animales.find(an => an.collar_id === collarId);
      if (a) a.potrero_id = parseInt(potId, 10);
      return { rows: [], rowCount: a ? 1 : 0 };
    }

    // 8. ESCALAR GEOCERCA CENTROID QUERY
    if (/ST_Y\(ST_Centroid\(perimetro\)\) as lat/i.test(q)) {
      const id = parseInt(params[0], 10);
      const isHato = /FROM hatos/i.test(q);
      const item = isHato ? this.hatos.find(h => h.id === id) : this.potreros.find(p => p.id === id);
      if (!item) return { rows: [], rowCount: 0 };
      const avgLat = item.vertices.reduce((sum, v) => sum + v[0], 0) / item.vertices.length;
      const avgLon = item.vertices.reduce((sum, v) => sum + v[1], 0) / item.vertices.length;
      return {
        rows: [{
          id: item.id,
          nombre: item.nombre,
          hato_id: item.hato_id,
          lat: avgLat,
          lon: avgLon
        }],
        rowCount: 1
      };
    }

    // 9. SAVE HATO (INSERT/UPDATE)
    if (/UPDATE hatos\s+SET nombre = \$1/i.test(q)) {
      const [nombre, wkt, id] = params;
      const h = this.hatos.find(hat => hat.id === parseInt(id, 10));
      if (h) {
        h.nombre = nombre;
        h.vertices = parseWKT(wkt);
        this.save();
        return { rows: [h], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (/INSERT INTO hatos/i.test(q)) {
      const [nombre, wkt] = params;
      const newHato = {
        id: this.nextId.hatos++,
        nombre,
        vertices: parseWKT(wkt),
        creado_en: new Date()
      };
      this.hatos.push(newHato);
      this.save();
      return { rows: [newHato], rowCount: 1 };
    }

    // 10. SAVE POTRERO (INSERT/UPDATE)
    if (/UPDATE potreros\s+SET/i.test(q)) {
      const [hatoId, nombre, wkt, cap, id] = params;
      const p = this.potreros.find(pot => pot.id === parseInt(id, 10));
      if (p) {
        p.hato_id = parseInt(hatoId, 10);
        p.nombre = nombre;
        p.vertices = parseWKT(wkt);
        p.capacidad_max_cabezas = parseInt(cap || 50, 10);
        this.save();
        return { rows: [p], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (/INSERT INTO potreros/i.test(q)) {
      const [hatoId, nombre, wkt, cap] = params;
      const newPot = {
        id: this.nextId.potreros++,
        hato_id: parseInt(hatoId, 10),
        nombre,
        vertices: parseWKT(wkt),
        capacidad_max_cabezas: parseInt(cap || 50, 10),
        creado_en: new Date()
      };
      this.potreros.push(newPot);
      this.save();
      return { rows: [newPot], rowCount: 1 };
    }

    // 11. DELETE HATO / POTRERO
    if (/SELECT COUNT\(\*\) FROM animales a\s+INNER JOIN potreros p ON a\.potrero_id = p\.id\s+WHERE p\.hato_id = \$1/i.test(q)) {
      const hatoId = parseInt(params[0], 10);
      const count = this.animales.filter(a => {
        const p = this.potreros.find(pot => pot.id === a.potrero_id);
        return p && p.hato_id === hatoId && a.collar_id;
      }).length;
      return { rows: [{ count }], rowCount: 1 };
    }
    if (/DELETE FROM hatos WHERE id = \$1/i.test(q)) {
      const id = parseInt(params[0], 10);
      this.hatos = this.hatos.filter(h => h.id !== id);
      this.potreros = this.potreros.filter(p => p.hato_id !== id);
      this.save();
      return { rows: [], rowCount: 1 };
    }
    if (/SELECT COUNT\(\*\) FROM animales\s+WHERE potrero_id = \$1/i.test(q)) {
      const potId = parseInt(params[0], 10);
      const count = this.animales.filter(a => a.potrero_id === potId && a.collar_id).length;
      return { rows: [{ count }], rowCount: 1 };
    }
    if (/DELETE FROM potreros WHERE id = \$1/i.test(q)) {
      const id = parseInt(params[0], 10);
      this.potreros = this.potreros.filter(p => p.id !== id);
      this.save();
      return { rows: [], rowCount: 1 };
    }

    // 12. UPDATE COLLAR STATUS
    if (/UPDATE collares SET activo = \$1 WHERE id = \$2/i.test(q)) {
      const [activo, id] = params;
      const c = this.collares.find(col => col.id === id);
      if (c) {
        c.activo = activo;
        this.save();
        return { rows: [c], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 13. POST PROPIETARIO
    if (/INSERT INTO propietarios/i.test(q)) {
      const [nombre, doc, tel, correo] = params;
      const newProp = {
        id: this.nextId.propietarios++,
        nombre,
        documento_identidad: doc,
        telefono: tel,
        correo: correo,
        creado_en: new Date()
      };
      this.propietarios.push(newProp);
      this.save();
      return { rows: [newProp], rowCount: 1 };
    }

    // 14. POST COLLAR
    if (/INSERT INTO collares/i.test(q)) {
      const [id, num, fecha] = params;
      const newCol = {
        id,
        numero_sim: num,
        nivel_bateria: 100,
        senal_celular: 5,
        latitud: 9.1000,
        longitud: -67.1000,
        ultima_conexion: new Date(),
        fecha_instalacion: fecha,
        activo: true
      };
      this.collares.push(newCol);
      this.save();
      return { rows: [newCol], rowCount: 1 };
    }

    // 15. POST ANIMAL
    if (/SELECT id, arete_visual FROM animales WHERE collar_id = \$1/i.test(q)) {
      const existing = this.animales.find(a => a.collar_id === params[0]);
      return { rows: existing ? [existing] : [], rowCount: existing ? 1 : 0 };
    }
    if (/INSERT INTO animales/i.test(q)) {
      const [collarId, propId, potId, arete, raza, cat, fecha] = params;
      const newAnimal = {
        id: this.nextId.animales++,
        collar_id: collarId,
        propietario_id: propId,
        potrero_id: potId,
        arete_visual: arete,
        raza: raza,
        categoria: cat,
        fecha_nacimiento: fecha
      };
      this.animales.push(newAnimal);
      this.save();
      return { rows: [newAnimal], rowCount: 1 };
    }

    // 16. POST PESAJE
    if (/INSERT INTO registro_pesajes/i.test(q)) {
      const [animalId, peso, fecha] = params;
      const newPesaje = {
        id: this.nextId.pesajes++,
        animal_id: parseInt(animalId, 10),
        peso: parseFloat(peso),
        fecha_pesaje: fecha || new Date().toISOString().split('T')[0]
      };
      this.registro_pesajes.push(newPesaje);
      this.save();
      return { rows: [newPesaje], rowCount: 1 };
    }

    // 17. POST RENDIMIENTO
    if (/INSERT INTO parametros_rendimiento/i.test(q)) {
      const [raza, cat, gdp, pesoAdulto, costo, precio] = params;
      let existing = this.parametros_rendimiento.find(p => p.raza.toLowerCase() === raza.toLowerCase() && p.categoria.toLowerCase() === cat.toLowerCase());
      if (existing) {
        existing.gdp_promedio = parseFloat(gdp);
        existing.peso_adulto_esperado = parseFloat(pesoAdulto);
        existing.costo_diario_manutencion = parseFloat(costo);
        existing.precio_mercado_por_kg = parseFloat(precio);
      } else {
        existing = {
          id: this.parametros_rendimiento.length + 1,
          raza,
          categoria: cat,
          gdp_promedio: parseFloat(gdp),
          peso_adulto_esperado: parseFloat(pesoAdulto),
          costo_diario_manutencion: parseFloat(costo),
          precio_mercado_por_kg: parseFloat(precio)
        };
        this.parametros_rendimiento.push(existing);
      }
      this.save();
      return { rows: [existing], rowCount: 1 };
    }

    // 18. PROYECCIONES ZOOTÉCNICAS
    if (/FROM animales\s+WHERE id = \$1/i.test(q)) {
      const id = parseInt(params[0], 10);
      const a = this.animales.find(an => an.id === id);
      if (!a) return { rows: [], rowCount: 0 };
      const birth = new Date(a.fecha_nacimiento);
      const now = new Date();
      const edad_dias = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
      return {
        rows: [{
          id: a.id,
          arete_visual: a.arete_visual,
          raza: a.raza,
          categoria: a.categoria,
          fecha_nacimiento: a.fecha_nacimiento,
          edad_dias
        }],
        rowCount: 1
      };
    }

    if (/FROM registro_pesajes\s+WHERE animal_id = \$1\s+ORDER BY fecha_pesaje DESC/is.test(q)) {
      const animalId = parseInt(params[0], 10);
      const pesajes = this.registro_pesajes
        .filter(p => p.animal_id === animalId)
        .sort((a, b) => new Date(b.fecha_pesaje) - new Date(a.fecha_pesaje));
      return { rows: pesajes.slice(0, 1), rowCount: pesajes.length > 0 ? 1 : 0 };
    }

    if (/FROM parametros_rendimiento\s+WHERE raza = \$1 AND categoria = \$2/is.test(q)) {
      const [raza, cat] = params;
      const r = this.parametros_rendimiento.find(p => p.raza.toLowerCase() === (raza || '').toLowerCase() && p.categoria.toLowerCase() === (cat || '').toLowerCase()) || this.parametros_rendimiento[0];
      return { rows: r ? [r] : [], rowCount: r ? 1 : 0 };
    }

    if (/FROM registro_pesajes\s+WHERE animal_id = \$1\s+ORDER BY fecha_pesaje ASC/is.test(q)) {
      const animalId = parseInt(params[0], 10);
      const pesajes = this.registro_pesajes
        .filter(p => p.animal_id === animalId)
        .sort((a, b) => new Date(a.fecha_pesaje) - new Date(b.fecha_pesaje));
      return { rows: pesajes, rowCount: pesajes.length };
    }

    if (/SELECT gdp_promedio, peso_adulto_esperado, costo_diario_manutencion, precio_mercado_por_kg FROM parametros_rendimiento WHERE raza = \$1 AND categoria = \$2/i.test(q)) {
      const [raza, cat] = params;
      const r = this.parametros_rendimiento.find(p => p.raza.toLowerCase() === raza.toLowerCase() && p.categoria.toLowerCase() === cat.toLowerCase()) || this.parametros_rendimiento[0];
      return { rows: r ? [r] : [], rowCount: r ? 1 : 0 };
    }

    if (/SELECT peso, fecha_pesaje FROM registro_pesajes WHERE animal_id = \$1 ORDER BY fecha_pesaje ASC/i.test(q)) {
      const animalId = parseInt(params[0], 10);
      const pesajes = this.registro_pesajes
        .filter(p => p.animal_id === animalId)
        .sort((a, b) => new Date(a.fecha_pesaje) - new Date(b.fecha_pesaje));
      return { rows: pesajes, rowCount: pesajes.length };
    }

    // 19. MQTT QUERIES & GEOFENCE EVALUATION
    if (/SELECT a\.id AS animal_id, a\.arete_visual, c\.activo FROM collares c/i.test(q)) {
      const collarId = params[0];
      const c = this.collares.find(col => col.id === collarId);
      if (!c) return { rows: [], rowCount: 0 };
      const a = this.animales.find(an => an.collar_id === collarId);
      return {
        rows: [{
          animal_id: a ? a.id : null,
          arete_visual: a ? a.arete_visual : null,
          activo: c.activo
        }],
        rowCount: 1
      };
    }

    if (/UPDATE collares\s+SET nivel_bateria = \$1, senal_celular = \$2/i.test(q)) {
      const [bat, sig, lat, lon, collarId] = params;
      const c = this.collares.find(col => col.id === collarId);
      if (c) {
        c.nivel_bateria = bat;
        c.senal_celular = sig;
        c.latitud = lat;
        c.longitud = lon;
        c.ultima_conexion = new Date();
      }
      return { rows: [], rowCount: c ? 1 : 0 };
    }

    if (/INSERT INTO telemetria/i.test(q)) {
      const [animalId, lat, lon, bat, sig] = params;
      this.telemetria.push({
        id: this.telemetria.length + 1,
        animal_id: animalId,
        latitud: lat,
        longitud: lon,
        bateria: bat,
        senal: sig,
        fecha_hora: new Date()
      });
      return { rows: [], rowCount: 1 };
    }

    if (/SELECT a\.potrero_id AS potrero_asignado_id/i.test(q) || /SELECT \s*a\.id AS animal_id/i.test(q)) {
      // Evaluate animal position query
      const [lat, lon, animalId] = params;
      const a = this.animales.find(an => an.id === parseInt(animalId, 10));
      if (!a) return { rows: [], rowCount: 0 };

      const potAsig = this.potreros.find(p => p.id === a.potrero_id);
      const hato = this.hatos[0];

      const dentroHato = hato ? pointInPolygon([lat, lon], hato.vertices) : true;
      const dentroPotrero = potAsig ? pointInPolygon([lat, lon], potAsig.vertices) : true;

      let potActualNombre = null;
      for (const p of this.potreros) {
        if (pointInPolygon([lat, lon], p.vertices)) {
          potActualNombre = p.nombre;
          break;
        }
      }

      return {
        rows: [{
          animal_id: a.id,
          arete_visual: a.arete_visual,
          potrero_asignado_id: a.potrero_id,
          potrero_asignado_nombre: potAsig ? potAsig.nombre : 'Sin Asignar',
          hato_id: hato ? hato.id : 1,
          hato_nombre: hato ? hato.nombre : 'Hato Principal',
          dentro_hato: dentroHato,
          dentro_potrero: dentroPotrero,
          distancia_hato: dentroHato ? 0.0 : 25.5,
          potrero_actual_nombre: potActualNombre
        }],
        rowCount: 1
      };
    }

    if (/SELECT id FROM alertas WHERE animal_id = \$1 AND tipo = \$2 AND estado = 'ACTIVO'/i.test(q)) {
      const [animalId, tipo] = params;
      const al = this.alertas.find(a => a.animal_id === parseInt(animalId, 10) && a.tipo === tipo && a.estado === 'ACTIVO');
      return { rows: al ? [al] : [], rowCount: al ? 1 : 0 };
    }

    if (/INSERT INTO alertas/i.test(q)) {
      const [animalId, tipo, lat, lon] = params;
      const newAl = {
        id: this.nextId.alertas++,
        animal_id: parseInt(animalId, 10),
        tipo,
        estado: 'ACTIVO',
        latitud: lat,
        longitud: lon,
        fecha_inicio: new Date(),
        fecha_fin: null
      };
      this.alertas.push(newAl);
      return { rows: [newAl], rowCount: 1 };
    }

    if (/UPDATE alertas\s+SET estado = 'RESUELTO'/i.test(q)) {
      const animalId = parseInt(params[0], 10);
      let count = 0;
      this.alertas.forEach(al => {
        if (al.animal_id === animalId && al.estado === 'ACTIVO') {
          al.estado = 'RESUELTO';
          al.fecha_fin = new Date();
          count++;
        }
      });
      return { rows: [], rowCount: count };
    }

    // Default fallback
    console.log('[MockDB Query (Unmatched)]:', q, params);
    return { rows: [], rowCount: 0 };
  }
}

export const mockDbInstance = new MockDB();
