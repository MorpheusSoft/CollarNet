$fn = 60;

bridge_r_inner = 125.0;
bridge_thick_mid = 16.0;
r_out = bridge_r_inner + bridge_thick_mid; // 141.0 mm

module cowai_badge_2d() {
    // Icono ondas satelitales / IoT
    translate([-24, 1.2, 0]) {
        circle(r = 0.9);
        difference() {
            circle(r = 2.6);
            circle(r = 1.9);
            translate([-4, -4, 0]) square([4, 8]);
        }
        difference() {
            circle(r = 4.3);
            circle(r = 3.6);
            translate([-6, -6, 0]) square([6, 12]);
        }
    }
    
    // Texto principal COWAI
    translate([2.5, 1.2, 0])
        text("COWAI", font = "Ubuntu:style=Bold", size = 8.5, halign = "center", valign = "center", spacing = 1.15);
    
    // Subtítulo SMART CATTLE IoT
    translate([0, -5.2, 0])
        text("SMART CATTLE IoT", font = "Ubuntu:style=Bold", size = 2.2, halign = "center", valign = "center", spacing = 1.2);
        
    // Líneas tecnológicas de acento
    translate([19.0, -5.2, 0]) square([3.5, 0.45], center = true);
    translate([-19.0, -5.2, 0]) square([3.5, 0.45], center = true);
}

// Emblema curvo adaptado a la superficie del arco de radio r_out (141 mm)
module curved_badge_3d(depth=0.8) {
    intersection() {
        // 1. Extrusión vertical profunda del texto 2D
        translate([0, 0, r_out - 15])
            linear_extrude(height = 30)
                cowai_badge_2d();
                
        // 2. Capa cilíndrica curva entre (r_out - depth) y (r_out + 0.5)
        rotate([90, 0, 0])
            difference() {
                cylinder(r = r_out + 0.2, h = 60, center = true);
                cylinder(r = r_out - depth, h = 65, center = true);
            }
    }
}

curved_badge_3d();
