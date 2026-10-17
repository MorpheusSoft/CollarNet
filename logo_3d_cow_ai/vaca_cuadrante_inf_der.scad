// Logotipo COW AI - Cuadrante Inferior Derecho (BR - incluye ondas acento)
// Diseñado para Bambu Lab P1S (Cara frontal hacia la cama PEI)


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
        import("/home/lzambrano/Desarrollo/CollarNet/logo_3d_cow_ai/cow_head_centered.svg", dpi = 96);
}


difference() {
    // Interseccion para aislar el cuadrante
    intersection() {
        cow_full();
        translate([0, -250, -5]) cube([250, 250, 40]);
    }
    
    // Ranura trasera para colgar en pared
    translate([60, -60, 0]) keyhole_pocket(depth = 25);
    
    // Orificios para pines de ensamble ocultos
    pin_hole_x(1, -78.5);
    pin_hole_x(1, -142.5);
    pin_hole_y(-1, 38.0);
}
