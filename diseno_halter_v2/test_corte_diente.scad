// =============================================================================
// TEST CORTE DIENTE EXACTO
// =============================================================================
include <collar_halter_v2.scad>

$fn = 40;

c_tpu        = [0.22, 0.24, 0.28]; 
c_asa_base   = [0.95, 0.45, 0.10]; 
c_asa_lid    = [0.88, 0.38, 0.08]; 
c_snap_teeth = [0.00, 0.90, 1.00]; 
c_lip        = [1.00, 0.85, 0.00]; 
c_strap      = [0.45, 0.28, 0.15]; 

module test_corte_seccion() {
    difference() {
        union() {
            // Cuna de TPU
            color(c_tpu)
                tpu_socket();

            // Diente de traba en cian neón
            color(c_snap_teeth) {
                translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
                    mirror([0, 1, 0]) snap_wedge();
            }

            // Labio elástico en amarillo
            color(c_lip) {
                translate([0, -pod_w/2, pod_base_h - 1.5]) {
                    difference() {
                        r_box(cradle_depth + 1.0, pod_w, 2.5, pod_r);
                        translate([-2, cradle_wall + 1.2, -1])
                            r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
                    }
                }
            }

            // Cápsula ensamblada adentro
            translate([0, -pod_w/2, 0]) {
                color(c_asa_base) pod_right_base();
                translate([0, 0, pod_base_h]) {
                    color(c_asa_lid) pod_right_lid();
                    translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                        solar_panel_mockup();
                }
            }

            // Cincha marrón
            color(c_strap) {
                translate([-15, -strap_width/2, tunnel_t + 0.3])
                    cube([pod_l + 30, strap_width, 3.2]);
            }
        }

        // Cortamos TODO desde Y = -100 hasta Y = 30.0 mm (justo por el medio del diente de traba a Y=31)
        translate([-50, -100, -10])
            cube([pod_l + 100, 130.0, pod_total_h + 30]);
    }
}

test_corte_seccion();
