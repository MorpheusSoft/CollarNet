include <collar_halter_v2.scad>

$fn = 36;

module probeta_cuello_capsula_solida() {
    color(col_body) {
        union() {
            intersection() {
                pod_right_base();
                translate([-5, -5, -2])
                    cube([cradle_depth + 10, pod_w + 10, pod_base_h + 5]);
            }
            // Pared trasera de cierre (2.5 mm) para eliminar aristas sueltas y facilitar agarre
            translate([cradle_depth + 7.5, cradle_wall, cradle_floor])
                r_box(2.5, pod_w - 2*cradle_wall, pod_base_h - cradle_floor, 2.0);
        }
    }
}

probeta_cuello_capsula_solida();
