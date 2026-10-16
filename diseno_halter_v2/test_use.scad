use <collar_halter_v2.scad>

$fn = 36;

intersection() {
    pod_right_base();
    translate([-5, -5, -2])
        cube([45, 90, 40]);
}
