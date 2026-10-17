import subprocess
import os

output_dir = '/home/lzambrano/Desarrollo/CollarNet/logo_3d_cow_ai'
os.makedirs(output_dir, exist_ok=True)

# Common keyhole module
keyhole_def = """
$fn = 40;

// Keyhole hanger pocket for wall mounting (face-down printing: rear is at z=depth)
module keyhole_pocket(depth = 30) {
    translate([0, 0, depth - 7]) {
        // Screw head insertion pocket (9mm dia, 7.2mm deep)
        cylinder(d = 9.0, h = 7.2);
        
        // Internal slide channel for screw head (9mm wide, 12mm high, 4mm deep)
        translate([-4.5, 0, 0]) cube([9.0, 12.0, 4.0]);
        translate([0, 12, 0]) cylinder(d = 9.0, h = 4.0);
        
        // Screw shank slot to the wall surface (4.6mm wide, 12mm high, 3.2mm deep)
        translate([-2.3, 0, 4.0]) cube([4.6, 12.0, 3.2]);
        translate([0, 12, 4.0]) cylinder(d = 4.6, h = 3.2);
    }
}
"""

letters = [
    # char, filename, keyhole_positions [(x, y)]
    ('C', 'letra_C', [(0, 40), (0, -40)]),
    ('O', 'letra_O', [(0, 45), (0, -45)]),
    ('W', 'letra_W', [(-45, 30), (45, 30)]),
    ('A', 'letra_A', [(0, 40), (-35, -45), (35, -45)]),
    ('I', 'letra_I', [(0, 40), (0, -40)])
]

for char, name, keyholes in letters:
    scad_content = f"""// Logotipo COW AI - Letra {char} (Relieve 30mm)
// Diseñado para impresión en Bambu Lab P1S (Cara frontal hacia abajo en cama PEI)

{keyhole_def}

difference() {{
    // Letra extruida 30mm
    linear_extrude(height = 30, convexity = 10)
        text("{char}", font = "Ubuntu:style=Bold", size = 182, halign = "center", valign = "center");
        
    // Alojamientos traseros para anclaje a pared
"""
    for kx, ky in keyholes:
        scad_content += f"    translate([{kx}, {ky}, 0]) keyhole_pocket(depth = 30);\n"
        
    scad_content += "}\n"
    
    scad_path = os.path.join(output_dir, f"{name}.scad")
    with open(scad_path, 'w') as f:
        f.write(scad_content)
    print(f"Generated SCAD: {scad_path}")

print("Letter SCADs generated successfully!")
