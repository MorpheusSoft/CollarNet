part = "none";
include <collar_halter_v2.scad>

$fn = 36;

intersection() {
    pod_right_base();
    translate([-5, -5, -2])
        cube([cradle_depth + 10, pod_w + 10, pod_base_h + 5]);
}
