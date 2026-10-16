
caller_part = "none";
include <collar_halter_v2.scad>;

ang = bridge_half_ang;
x_j = bridge_r_inner * sin(ang);
z_j = bridge_r_inner * cos(ang);

rotate([0, -ang, 0])
    translate([-x_j, 0, -z_j])
        difference() {
            full_assembly();
            union() {
                translate([-300, 0, -100]) cube([600, 250, 400]);
                translate([60, -150, -100]) cube([200, 300, 300]);
                translate([-250, -150, -100]) cube([200, 300, 300]);
            }
        }
