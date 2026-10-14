// =============================================================================
// TEST X-RAY / TRANSPARENCIA
// =============================================================================
include <collar_halter_v2.scad>

$fn = 40;

c_tpu_trans  = [0.15, 0.18, 0.22, 0.55]; // TPU semitransparente efecto X-Ray
c_asa_base   = [0.95, 0.45, 0.10, 1.0]; 
c_asa_lid    = [0.88, 0.38, 0.08, 1.0]; 
c_snap_teeth = [0.00, 0.90, 1.00, 1.0]; // Cian neón sólido
c_lip        = [1.00, 0.85, 0.00, 0.9]; // Amarillo neón
c_strap      = [0.45, 0.28, 0.15, 1.0]; 

module test_xray() {
    // 1. Cuna de TPU en semitransparencia X-Ray
    color(c_tpu_trans)
        tpu_socket();

    // 2. Dientes de traba resaltados en cian sólido (se ven a través del TPU!)
    color(c_snap_teeth) {
        translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
            snap_wedge();
        translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
            mirror([0, 1, 0]) snap_wedge();
    }

    // 3. Labio elástico en amarillo
    color(c_lip) {
        translate([0, -pod_w/2, pod_base_h - 1.5]) {
            difference() {
                r_box(cradle_depth + 1.0, pod_w, 2.5, pod_r);
                translate([-2, cradle_wall + 1.2, -1])
                    r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
            }
        }
    }

    // 4. Cápsula ensamblada adentro (sólida)
    translate([0, -pod_w/2, 0]) {
        color(c_asa_base) pod_right_base();
        translate([0, 0, pod_base_h]) {
            color(c_asa_lid) pod_right_lid();
            translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                solar_panel_mockup();
        }
    }

    // 5. Cincha ganadera pasando por debajo
    color(c_strap) {
        translate([-20, -strap_width/2, tunnel_t + 0.3])
            cube([pod_l + 35, strap_width, 3.2]);
    }
}

test_xray();
