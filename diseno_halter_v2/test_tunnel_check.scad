part = "none";
include <collar_halter_v2.scad>;

// Let us inspect what tpu_socket looks like
module check_socket() {
    tpu_socket();
}

// And what dorsal_bridge_body has at the socket
ang = bridge_half_ang;
x_j = bridge_r_inner * sin(ang);
z_j = bridge_r_inner * cos(ang);

module socket_from_bridge() {
    rotate([0, -ang, 0])
        translate([-x_j, 0, -z_j])
            dorsal_bridge_body();
}

// Let us render a slice of both at X = 15
