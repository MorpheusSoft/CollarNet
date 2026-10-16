include <collar_halter_v2.scad>

$fn = 36;

union() {
    translate([cradle_depth, 0, 0])
        r_box(pod_l - cradle_depth, pod_w, pod_base_h, pod_r);
    translate([0, cradle_wall, cradle_floor - 0.2])
        r_box(cradle_depth + 1.0, pod_w - 2*cradle_wall, pod_base_h - cradle_floor + 0.2, max(1, pod_r - cradle_wall));
}
