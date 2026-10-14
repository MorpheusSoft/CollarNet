include <collar_halter_v2.scad>

// Test script to verify the intersection-based curved logo
module bridge_solid(n_steps=24) {
    for (i = [0 : n_steps - 1]) {
        ang1 = -bridge_half_ang + i * (2 * bridge_half_ang) / n_steps;
        ang2 = -bridge_half_ang + (i + 1) * (2 * bridge_half_ang) / n_steps;
        hull() {
            bridge_slice(ang1);
            bridge_slice(ang2);
        }
    }
}

// 1. Text badge with depth 0.8 mm following the exact bridge surface
module perfect_text_inlay(depth=0.8) {
    intersection() {
        // Upper shell of the bridge
        difference() {
            bridge_solid();
            // Scale or shrink down by depth
            translate([0, 0, -depth]) bridge_solid();
        }
        // Vertical extrusion of the 2D badge
        translate([0, 0, 120])
            linear_extrude(height = 40)
                cowai_bridge_badge_2d();
    }
}

// Render both: bridge in orange with cavity, text in white
difference() {
    dorsal_bridge_body();
    perfect_text_inlay(0.9);
}

color("White") perfect_text_inlay(0.8);
