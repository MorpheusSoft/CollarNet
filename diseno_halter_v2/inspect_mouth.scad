part = "none";
include <collar_halter_v2.scad>;

// Rotate and translate dorsal_bridge_body so the right socket mouth is facing the camera
ang = bridge_half_ang;
x_j = bridge_r_inner * sin(ang);
z_j = bridge_r_inner * cos(ang);

rotate([0, -ang, 0])
    translate([-x_j, 0, -z_j])
        dorsal_bridge_body();
