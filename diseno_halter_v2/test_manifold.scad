include <collar_halter_v2.scad>

$fn = 36;

module pod_stepped_shell_clean() {
    difference() {
        union() {
            translate([cradle_depth, 0, 0])
                r_box(pod_l - cradle_depth, pod_w, pod_base_h, pod_r);
            // Penetración de 0.2 mm en Z para evitar caras coincidentes no-manifold con el techo del túnel
            translate([0, cradle_wall, cradle_floor - 0.2])
                r_box(cradle_depth + 1.0, pod_w - 2*cradle_wall, pod_base_h - cradle_floor + 0.2, max(1, pod_r - cradle_wall));
        }

        // Chaflanes guía
        translate([0, cradle_wall, cradle_floor - 1])
            rotate([0, 0, 30])
                translate([-8, -10, 0])
                    cube([16, 10, pod_base_h + 5]);

        translate([0, pod_w - cradle_wall, cradle_floor - 1])
            rotate([0, 0, -30])
                translate([-8, 0, 0])
                    cube([16, 10, pod_base_h + 5]);

        translate([0, -1, cradle_floor])
            rotate([0, 35, 0])
                translate([-8, 0, -8])
                    cube([8, pod_w + 2, 16]);
    }
}

intersection() {
    pod_stepped_shell_clean();
    translate([-5, -5, -2])
        cube([cradle_depth + 12, pod_w + 10, pod_base_h + 5]);
}
