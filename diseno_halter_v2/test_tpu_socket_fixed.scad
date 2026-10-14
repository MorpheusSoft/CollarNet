// =============================================================================
// TEST CORRECCIÓN TPU SOCKET: DIENTES VISIBLES Y PISO SÓLIDO
// =============================================================================
include <collar_halter_v2.scad>

$fn = 40;

cradle_wall = 3.0;
cradle_depth = 35.0;
back_wall_t = 3.0; 
cradle_floor_fixed = tunnel_t + tunnel_h + 1.5; // 1.5 + 4.0 + 1.5 = 7.0 mm piso continuo

module tpu_socket_fixed() {
    union() {
        // 1. CUERPO PRINCIPAL HUECO DEL BOLSILLO
        difference() {
            // Envolvente exterior continuo con la silueta exterior del pod
            translate([-back_wall_t, -pod_w/2, 0])
                r_box(cradle_depth + back_wall_t, pod_w, pod_base_h, pod_r);

            // Cavidad interior donde entra la lengüeta de ASA
            translate([0, -pod_w/2 + cradle_wall - cradle_tol, cradle_floor_fixed - cradle_tol])
                r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall - cradle_tol), 
                      pod_base_h + 5.0, max(1, pod_r - cradle_wall));

            // Túnel pasacorreas continuo inferior (52 mm de ancho x 4.2 mm de alto)
            translate([-back_wall_t - 2, -strap_slot_w/2, tunnel_t])
                cube([cradle_depth + back_wall_t + 5, strap_slot_w, tunnel_h]);

            // Pasacables de entrada central (Ø8 mm)
            translate([-back_wall_t - 2, 0, click_z])
                rotate([0, 90, 0]) cylinder(r=conduit_d/2, h=back_wall_t + 4, $fn=24);

            // Muescas ergonómicas exteriores para desenganche manual con los dedos
            translate([cradle_depth - 3.0, -pod_w/2 - 1.0, click_z - 3.5])
                cube([5.0, cradle_wall + 2.0, 7.0]);
            translate([cradle_depth - 3.0, pod_w/2 - cradle_wall - 1.0, click_z - 3.5])
                cube([5.0, cradle_wall + 2.0, 7.0]);
        }

        // 2. LABIO SUPERIOR ELÁSTICO TIPO FUNDA DE CELULAR
        translate([0, -pod_w/2, pod_base_h - 1.5]) {
            difference() {
                r_box(cradle_depth, pod_w, 2.5, pod_r);
                translate([-1, cradle_wall + 1.2, -1])
                    r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
            }
        }

        // 3. DIENTES DE CLICK INTERIORES (100% SÓLIDOS)
        // Diente lateral 1 (Pared Y negativa)
        translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
            snap_wedge();

        // Diente lateral 2 (Pared Y positiva)
        translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
            mirror([0, 1, 0]) snap_wedge();
    }
}

tpu_socket_fixed();
