
$fn = 48;
include <test_pod_clamshell_full.scad>

// Corte transversal por el medio Y = pod_w/2
difference() {
    union() {
        color([0.94, 0.42, 0.12]) test_base();
        translate([0, 0, 0]) test_gasket();
        translate([0, 0, 0]) color([0.80, 0.35, 0.10]) test_lid();
    }
    // Plano de corte
    translate([-10, pod_w/2, -10])
        cube([pod_l + 20, pod_w, 80]);
}
