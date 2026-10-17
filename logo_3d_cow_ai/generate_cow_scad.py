import os
import subprocess

output_dir = '/home/lzambrano/Desarrollo/CollarNet/logo_3d_cow_ai'
svg_path = os.path.join(output_dir, 'cow_head_centered.svg')

# OpenSCAD pin hole definitions
pin_holes_code = """
$fn = 40;

// Orificios para pines de ensamble (diametro 4.2mm para pin de 4.0mm)
// Eje X = 0 (corte vertical)
module pin_hole_x(x_dir, y_pos, z_pos = 12.5, depth = 8) {
    translate([0, y_pos, z_pos])
        rotate([0, x_dir * 90, 0])
            cylinder(d = 4.2, h = depth + 0.1);
}

// Eje Y = 0 (corte horizontal)
module pin_hole_y(y_dir, x_pos, z_pos = 12.5, depth = 8) {
    translate([x_pos, 0, z_pos])
        rotate([-y_dir * 90, 0, 0])
            cylinder(d = 4.2, h = depth + 0.1);
}

// Alojamiento Keyhole para tornillo de pared en la cara trasera
module keyhole_pocket(depth = 25) {
    translate([0, 0, depth - 6]) {
        cylinder(d = 8.5, h = 6.2);
        translate([-4.25, 0, 0]) cube([8.5, 10.0, 3.5]);
        translate([0, 10, 0]) cylinder(d = 8.5, h = 3.5);
        translate([-2.2, 0, 3.5]) cube([4.4, 10.0, 2.7]);
        translate([0, 10, 3.5]) cylinder(d = 4.4, h = 2.7);
    }
}

module cow_full() {
    translate([-191.55, -353.79 - 176.90, 0])
    linear_extrude(height = 25, convexity = 10)
        import(\"""" + svg_path + """\", dpi = 96);
}
"""

quadrants = [
    {
        'id': 'vaca_cuadrante_sup_izq',
        'desc': 'Cuadrante Superior Izquierdo (TL)',
        'box': 'translate([-250, 0, -5]) cube([250, 250, 40]);',
        'keyhole': 'translate([-60, 95, 0]) keyhole_pocket(depth = 25);',
        'pin_holes': [
            'pin_hole_x(-1, 60.5);',    # Frente (corte vertical hacia la izquierda)
            'pin_hole_y(1, -45.0);'     # Mejilla (corte horizontal hacia arriba)
        ]
    },
    {
        'id': 'vaca_cuadrante_sup_der',
        'desc': 'Cuadrante Superior Derecho (TR)',
        'box': 'translate([0, 0, -5]) cube([250, 250, 40]);',
        'keyhole': 'translate([60, 95, 0]) keyhole_pocket(depth = 25);',
        'pin_holes': [
            'pin_hole_x(1, 60.5);',     # Frente (corte vertical hacia la derecha)
            'pin_hole_y(1, 38.0);'      # Mejilla (corte horizontal hacia arriba)
        ]
    },
    {
        'id': 'vaca_cuadrante_inf_izq',
        'desc': 'Cuadrante Inferior Izquierdo (BL)',
        'box': 'translate([-250, -250, -5]) cube([250, 250, 40]);',
        'keyhole': 'translate([-60, -60, 0]) keyhole_pocket(depth = 25);',
        'pin_holes': [
            'pin_hole_x(-1, -78.5);',   # Nariz puente (corte vertical hacia izquierda)
            'pin_hole_x(-1, -142.5);',  # Hocico/mandibula
            'pin_hole_y(-1, -45.0);'    # Mejilla (corte horizontal hacia abajo)
        ]
    },
    {
        'id': 'vaca_cuadrante_inf_der',
        'desc': 'Cuadrante Inferior Derecho (BR - incluye ondas acento)',
        'box': 'translate([0, -250, -5]) cube([250, 250, 40]);',
        'keyhole': 'translate([60, -60, 0]) keyhole_pocket(depth = 25);',
        'pin_holes': [
            'pin_hole_x(1, -78.5);',    # Nariz puente (corte vertical hacia derecha)
            'pin_hole_x(1, -142.5);',   # Hocico/mandibula
            'pin_hole_y(-1, 38.0);'     # Mejilla (corte horizontal hacia abajo)
        ]
    }
]

for q in quadrants:
    scad_code = f"""// Logotipo COW AI - {q['desc']}
// Diseñado para Bambu Lab P1S (Cara frontal hacia la cama PEI)

{pin_holes_code}

difference() {{
    // Interseccion para aislar el cuadrante
    intersection() {{
        cow_full();
        {q['box']}
    }}
    
    // Ranura trasera para colgar en pared
    {q['keyhole']}
    
    // Orificios para pines de ensamble ocultos
"""
    for ph in q['pin_holes']:
        scad_code += f"    {ph}\n"
    scad_code += "}\n"
    
    scad_file = os.path.join(output_dir, f"{q['id']}.scad")
    with open(scad_file, 'w') as f:
        f.write(scad_code)
    print(f"Generated: {scad_file}")

# Also generate alignment pins SCAD
pins_scad = """// Lote de 8 pines de ensamble para la cabeza de vaca COW AI
// Diametro 4.0 mm, Longitud 15.0 mm, biselados en ambos extremos para insercion suave

$fn = 30;

module single_pin() {
    rotate([0, 90, 0]) {
        cylinder(d = 4.0, h = 13.0, center = true);
        // Biseles en los extremos
        translate([0, 0, 6.5]) cylinder(d1 = 4.0, d2 = 3.0, h = 1.0);
        translate([0, 0, -7.5]) cylinder(d1 = 3.0, d2 = 4.0, h = 1.0);
    }
}

// Matriz de 8 pines separados para imprimir juntos comodamente
for (i = [0:3]) {
    for (j = [0:1]) {
        translate([i * 18, j * 12, 2.0])
            rotate([0, -90, 0])
                single_pin();
    }
}
"""
with open(os.path.join(output_dir, "pines_ensamble.scad"), 'w') as f:
    f.write(pins_scad)
print("Generated pines_ensamble.scad")

# Also generate rear reinforcement plates
plates_scad = """// Placas de refuerzo y ensamble trasero (opcionales para maxima rigidez)
// Se pegan con cianoacrilato en la parte trasera de las uniones (invisibles desde el frente)

$fn = 30;

module reinforcement_plate(length = 40, width = 14, thickness = 2.4) {
    difference() {
        hull() {
            translate([-length/2 + width/2, 0, 0]) cylinder(d = width, h = thickness);
            translate([length/2 - width/2, 0, 0]) cylinder(d = width, h = thickness);
        }
        // Ranuras de agarre para pegamento
        for (x = [-length/3, 0, length/3]) {
            translate([x, 0, -0.1]) cylinder(d = 3.5, h = thickness + 0.2);
        }
    }
}

// 4 placas organizadas en cama
for (i = [0:3]) {
    translate([0, i * 20, 0])
        reinforcement_plate();
}
"""
with open(os.path.join(output_dir, "placas_union_vaca.scad"), 'w') as f:
    f.write(plates_scad)
print("Generated placas_union_vaca.scad")
