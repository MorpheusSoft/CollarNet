
caller_part = "none";
include <collar_halter_v2.scad>;

$fn = 40;

// Exploded and Cut view of the IP67 cable seal interface
difference() {
    union() {
        // 1. TPU Socket section (Grey/Dark TPU)
        color(col_bridge)
            intersection() {
                tpu_socket();
                translate([-10, -30, 0])
                    cube([15, 60, pod_base_h]);
            }

        // 2. ASA Capsule stepped tongue entering the socket
        // Displaced by 10mm in X to show the boss entering the counterbore in semi-exploded view
        color(col_body)
            translate([10, -pod_w/2, 0])
                intersection() {
                    pod_left_base();
                    translate([-2, 10, 0])
                        cube([25, 60, pod_base_h]);
                }

        // 3. Continuous Cable Harness (5-wire silicone jacketed bundle)
        color([0.2, 0.2, 0.22])
            translate([-12, 0, conduit_z])
                rotate([0, 90, 0])
                    cylinder(r=3.5, h=55, $fn=30);
    }

    // Cut in half along Y=0 (keep Y <= 0)
    translate([-30, 0, -5])
        cube([80, 50, pod_base_h + 10]);
}
