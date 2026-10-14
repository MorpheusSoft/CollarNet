include <collar_halter_v2.scad>

// Simulación de corte con altura extendida para que atraviese toda la curva
module test_badge_through() {
    translate([0, 0, 139.0])
        linear_extrude(height = 5.0)
            cowai_bridge_badge_2d();
}

module test_badge_inlay() {
    translate([0, 0, 139.0])
        linear_extrude(height = 1.5)
            cowai_bridge_badge_2d();
}

// 1. Puente con cajera profunda que atraviesa la curva
color(col_body)
difference() {
    dorsal_bridge_body();
    test_badge_through();
}

// 2. Texto en blanco
color("White")
    test_badge_inlay();
