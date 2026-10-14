include <collar_halter_v2.scad>

module r_rect(w, l, r) {
    hull() {
        translate([-w/2 + r, -l/2 + r]) circle(r=r);
        translate([w/2 - r, -l/2 + r]) circle(r=r);
        translate([-w/2 + r, l/2 - r]) circle(r=r);
        translate([w/2 - r, l/2 - r]) circle(r=r);
    }
}

// 1. Placa técnica embutida en la cresta
plaque_w = 54.0;
plaque_l = 15.0;
plaque_z = 140.0; // Piso plano a Z=140

module crest_plaque_cut() {
    translate([0, 0, plaque_z]) {
        linear_extrude(height = 6.0) {
            r_rect(plaque_w, plaque_l, 2.5);
        }
    }
}

// 2. Logotipo plano dentro de la placa
module crest_logo_inlay() {
    translate([0, 0, plaque_z]) {
        linear_extrude(height = 0.8) {
            cowai_bridge_badge_2d();
        }
    }
}

// Puente con la placa técnica embutida
difference() {
    dorsal_bridge_body();
    crest_plaque_cut();
    // Cajera para las letras en el piso de la placa
    translate([0, 0, plaque_z - 0.7])
        linear_extrude(height = 1.0)
            cowai_bridge_badge_2d();
}

// Letras en blanco dentro de la placa
color("White")
    translate([0, 0, plaque_z - 0.68])
        linear_extrude(height = 0.7)
            cowai_bridge_badge_2d();
