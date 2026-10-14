$fn = 36;

bridge_r_inner = 125.0;
bridge_half_ang = 34.0;
bridge_w_mid = 54.0;
bridge_w_end = 82.0;
bridge_thick_mid = 15.0;
bridge_thick_end = 38.0;

module halter_bridge_profile(w, h) {
    r = min(6, h/3);
    difference() {
        // Base rounded rectangle
        hull() {
            translate([-w/2 + r, r]) circle(r=r);
            translate([w/2 - r, r]) circle(r=r);
            translate([-w/2 + r, h - r]) circle(r=r);
            translate([w/2 - r, h - r]) circle(r=r);
        }
        // Ergonomic central trough on top (Halter style channel)
        translate([0, h + 8])
            scale([1, 0.4]) circle(r=w * 0.28);
    }
}

module bridge_slice(ang) {
    t = abs(ang) / bridge_half_ang; // 0 to 1
    t_smooth = t * t * (3 - 2 * t); // smoothstep
    w = bridge_w_mid + (bridge_w_end - bridge_w_mid) * t_smooth;
    thick = bridge_thick_mid + (bridge_thick_end - bridge_thick_mid) * t_smooth;

    rotate([0, ang, 0]) {
        translate([0, 0, bridge_r_inner]) {
            rotate([0, 90, 0]) {
                linear_extrude(height=0.2, center=true) {
                    halter_bridge_profile(w, thick);
                }
            }
        }
    }
}

module arched_bridge(n_steps=20) {
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
        // Cable conduit
        rotate([90, 0, 0]) {
            intersection() {
                rotate_extrude(angle=360, $fn=90)
                    translate([bridge_r_inner + 7.5, 0, 0])
                        circle(r=4.5, $fn=24);
                translate([-bridge_r_inner - 40, 0, -100])
                    cube([2*(bridge_r_inner + 40), bridge_r_inner + 40, 200]);
            }
        }
    }
}

arched_bridge();
