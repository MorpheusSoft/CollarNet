part = "none";
include <collar_halter_v2.scad>;

ang = bridge_half_ang;
x_j = bridge_r_inner * sin(ang);
z_j = bridge_r_inner * cos(ang);

// Cut through the socket at X = 15
projection(cut = true)
    rotate([0, 90, 0])
        translate([-15, 0, 0])
            rotate([0, -ang, 0])
                translate([-x_j, 0, -z_j])
                    dorsal_bridge_body();
