caller_part = "none";
include <collar_halter_v2.scad>;

ang = bridge_half_ang;
x_j = bridge_r_inner * sin(ang);
z_j = bridge_r_inner * cos(ang);

// Let us isolate only the bridge arch and see if it overlaps with the socket mouth!
module arch_only(n_steps=24) {
    for (i = [0 : n_steps - 1]) {
        ang1 = -bridge_half_ang + i * (2 * bridge_half_ang) / n_steps;
        ang2 = -bridge_half_ang + (i + 1) * (2 * bridge_half_ang) / n_steps;
        hull() {
            bridge_slice(ang1);
            bridge_slice(ang2);
        }
    }
}

// In the local frame of the right socket:
// Check what arch_only has inside the socket region (X > 0)
intersection() {
    rotate([0, -ang, 0])
        translate([-x_j, 0, -z_j])
            arch_only();
    translate([0, -50, -10])
        cube([50, 100, 50]);
}
