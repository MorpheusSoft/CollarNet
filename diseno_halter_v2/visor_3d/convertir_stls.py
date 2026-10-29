#!/usr/bin/env python3
"""
Convertidor y Empaquetador de Mallas CAD para el Visualizador 3D Interactivo COWAI V2.
Parsea archivos STL (ASCII y binarios), calcula bounding boxes precisas,
genera versiones binarias compactas y compila un bundle JavaScript 'modelos_geometrias.js'
con arrays binarios en base64 para carga instantánea offline.
"""

import os
import glob
import struct
import base64
import json
import re

STL_DIR = os.path.join(os.path.dirname(__file__), 'modelos_stl')
OUT_JS = os.path.join(os.path.dirname(__file__), 'modelos_geometrias.js')

def parse_stl(filepath):
    """Parsea un archivo STL (ASCII o binario) y retorna una lista de floats con posiciones [x,y,z, ...]"""
    with open(filepath, 'rb') as fp:
        raw = fp.read()
    
    # Comprobar si es binario estándar
    is_binary = False
    if len(raw) >= 84:
        n_tris = struct.unpack('<I', raw[80:84])[0]
        if len(raw) == 84 + n_tris * 50:
            is_binary = True
            
    positions = []
    
    if is_binary:
        n_tris = struct.unpack('<I', raw[80:84])[0]
        offset = 84
        for _ in range(n_tris):
            # 3 floats normal (ignorar, computamos con three.js) + 9 floats vértices + 2 bytes attr
            v_floats = struct.unpack('<9f', raw[offset+12:offset+48])
            positions.extend(v_floats)
            offset += 50
    else:
        # Modo ASCII
        text = raw.decode('utf-8', errors='ignore')
        # Buscar todos los vertex x y z
        matches = re.findall(r'vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)', text)
        for m in matches:
            positions.extend([float(m[0]), float(m[1]), float(m[2])])
            
    return positions

def main():
    print("=== Procesando modelos STL para Visualizador 3D COWAI V2 ===")
    stl_files = sorted([
        f for f in glob.glob(os.path.join(STL_DIR, '*.stl'))
        if not f.endswith('_bin.stl')
    ])
    
    models = {}
    total_triangles = 0
    total_bytes = 0
    
    for f in stl_files:
        basename = os.path.basename(f)
        key = os.path.splitext(basename)[0]
        
        positions = parse_stl(f)
        n_vertices = len(positions) // 3
        n_tris = n_vertices // 3
        total_triangles += n_tris
        
        # Calcular Bounding Box
        min_x = min(positions[0::3]) if positions else 0
        max_x = max(positions[0::3]) if positions else 0
        min_y = min(positions[1::3]) if positions else 0
        max_y = max(positions[1::3]) if positions else 0
        min_z = min(positions[2::3]) if positions else 0
        max_z = max(positions[2::3]) if positions else 0
        
        # Empacar a Float32Array bytes
        float_bytes = struct.pack(f'<{len(positions)}f', *positions)
        total_bytes += len(float_bytes)
        b64_data = base64.b64encode(float_bytes).decode('ascii')
        
        # También generar STL binario limpio en disco
        bin_stl_path = os.path.join(STL_DIR, f"{key}_bin.stl")
        with open(bin_stl_path, 'wb') as bfp:
            # 80 bytes header
            header = f"Binary STL generated for COWAI 3D CAD Viewer - {key}".encode('utf-8')[:80].ljust(80, b'\0')
            bfp.write(header)
            bfp.write(struct.pack('<I', n_tris))
            # Escribir triángulos
            for i in range(n_tris):
                idx = i * 9
                v1 = positions[idx:idx+3]
                v2 = positions[idx+3:idx+6]
                v3 = positions[idx+6:idx+9]
                # Normal simple (0, 0, 0) o calculada
                bfp.write(struct.pack('<3f9fH', 0.0, 0.0, 0.0, *v1, *v2, *v3, 0))
                
        models[key] = {
            "name": key,
            "filename": basename,
            "triangles": n_tris,
            "bbox": [round(min_x, 2), round(min_y, 2), round(min_z, 2), 
                     round(max_x, 2), round(max_y, 2), round(max_z, 2)],
            "dim": [round(max_x - min_x, 2), round(max_y - min_y, 2), round(max_z - min_z, 2)],
            "data": b64_data
        }
        
        print(f" -> {key:35s}: {n_tris:6d} triángulos | Dim: {models[key]['dim']} mm")
        
    print(f"\nTotal triángulos: {total_triangles} | Tamaño binario: {total_bytes/1024:.1f} KB")
    
    # Escribir modelos_geometrias.js
    with open(OUT_JS, 'w', encoding='utf-8') as js_file:
        js_file.write("// Base de Datos de Mallas 3D Geométricas para Visualizador COWAI V2\n")
        js_file.write("// Generado automáticamente a partir de los modelos OpenSCAD de producción\n")
        js_file.write("window.COWAI_MODELS = ")
        json.dump(models, js_file, indent=2)
        js_file.write(";\n")
        
    js_size = os.path.getsize(OUT_JS)
    print(f"Archivo generado: {OUT_JS} ({js_size/1024:.1f} KB)")

if __name__ == '__main__':
    main()
