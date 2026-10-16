part = "none";
include <collar_halter_v2.scad>;

difference() {
    union() {
        color([0.8, 0.8, 0.8]) tpu_socket();
        translate([0, -pod_w/2, 0])
            color([0.2, 0.2, 0.2]) pod_right_base();
    }
    // Cut along Y = 0 to Y < 0
    translate([-10, -100, -5])
        cube([100, 100, 50]);
}
