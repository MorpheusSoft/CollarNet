// Logotipo COW AI - Letra W (Relieve 30mm)
// Diseñado para impresión en Bambu Lab P1S (Cara frontal hacia abajo en cama PEI)


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


difference() {
    // Letra extruida 30mm
    linear_extrude(height = 30, convexity = 10)
        text("W", font = "Ubuntu:style=Bold", size = 182, halign = "center", valign = "center");
        
    // Alojamientos traseros para anclaje a pared
    translate([-45, 30, 0]) keyhole_pocket(depth = 30);
    translate([45, 30, 0]) keyhole_pocket(depth = 30);
}
