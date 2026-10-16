part = "none";
include <collar_halter_v2.scad>;

ang = bridge_half_ang;
x_j = bridge_r_inner * sin(ang);
z_j = bridge_r_inner * cos(ang);

// Look straight into the mouth from X = 50 in local coordinates
rotate([0, -ang, 0])
    translate([-x_j, 0, -z_j])
        dorsal_bridge_body();
