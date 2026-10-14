include <collar_halter_v2.scad>

r_out = bridge_r_inner + bridge_thick_mid; // 141.0

module curved_badge(depth=0.8) {
    intersection() {
        translate([0, 0, r_out - 15])
            linear_extrude(height = 30)
                cowai_bridge_badge_2d();
        rotate([90, 0, 0])
            difference() {
                cylinder(r = r_out + 0.5, h = 60, center = true, $fn=120);
                cylinder(r = r_out - depth, h = 65, center = true, $fn=120);
            }
    }
}

// Visualizar el puente con la cajera curva correcta
difference() {
    dorsal_bridge_body();
    curved_badge(0.9);
}

color("White") curved_badge(0.8);
