$fn = 36;

bridge_r_inner = 125.0;
bridge_half_ang = 32.0;
bridge_thick = 18.0;
bridge_w_mid = 56.0;
bridge_w_end = 82.0;

module halter_profile_2d(w, t) {
    r = 5.0;
    hull() {
        translate([-w/2 + r, r]) circle(r=r);
        translate([w/2 - r, r]) circle(r=r);
        translate([-w/2 + r, t - r]) circle(r=r);
        translate([w/2 - r, t - r]) circle(r=r);
    }
}

module bridge_slice(ang) {
    t = abs(ang) / bridge_half_ang;
    t_smooth = t * t * (3 - 2 * t);
    w = bridge_w_mid + (bridge_w_end - bridge_w_mid) * t_smooth;
    thick = bridge_thick + 4.0 * t_smooth; // 18mm at center, 22mm at ends

    rotate([0, ang, 0]) {
        translate([0, 0, bridge_r_inner]) {
            rotate([0, 90, 0]) {
                linear_extrude(height=0.2, center=true) {
                    halter_profile_2d(w, thick);
                }
            }
        }
    }
}

module arched_bridge(n_steps=24) {
    d_ang = (2 * bridge_half_ang) / n_steps;
    difference() {
        for (i = [0 : n_steps - 1]) {
            ang1 = -bridge_half_ang + i * d_ang;
            ang2 = -bridge_half_ang + (i + 1) * d_ang;
            hull() {
                bridge_slice(ang1);
                bridge_slice(ang2);
            }
        }
        // Cable conduit Ø8 mm
        rotate([90, 0, 0]) {
            intersection() {
                rotate_extrude(angle=360, $fn=90)
                    translate([bridge_r_inner + 9.0, 0, 0])
                        circle(r=4.0, $fn=24);
                translate([-bridge_r_inner - 40, 0, -100])
                    cube([2*(bridge_r_inner + 40), bridge_r_inner + 40, 200]);
            }
        }
    }
}

arched_bridge();
