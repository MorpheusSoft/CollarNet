
caller_part = "none";
include <collar_halter_v2.scad>;

// Macro view of socket back wall and entering pod tongue
// Cut in half along Y so we see the cylindrical boss entering the counterbore
difference() {
    union() {
        // Socket coupon
        intersection() {
            tpu_socket();
            translate([-15, -45, 0]) cube([30, 90, 30]);
        }
        
        // Pod tongue entered 1.8mm into the socket (mating position)
        translate([0, -pod_w/2, 0])
            intersection() {
                pod_right_base();
                translate([-2, -5, 0]) cube([25, 95, 30]);
            }

        // Cable harness
        %color([0.15, 0.15, 0.18], 0.7)
            translate([-12, 0, conduit_z])
                rotate([0, 90, 0]) cylinder(r=3.5, h=30, $fn=24);
    }
    
    // Cut away Y > 0 to see cross section
    translate([-30, 0, -10])
        cube([60, 60, 50]);
}
