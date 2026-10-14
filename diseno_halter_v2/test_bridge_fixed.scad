$fn = 36;

bridge_r_inner = 125.0;
bridge_half_ang = 32.0;
bridge_thick_mid = 16.0;
bridge_thick_end = 22.0;
bridge_w_mid = 56.0;
bridge_w_end = 82.0;

// 2D Profile:
// X is thickness (0 to thick, radial outward)
// Y is width (-w/2 to +w/2, along neck)
module halter_profile_2d(thick, w) {
    r = 4.0;
    hull() {
        translate([r, -w/2 + r]) circle(r=r);
        translate([r, w/2 - r]) circle(r=r);
        translate([thick - r, -w/2 + r]) circle(r=r);
        translate([thick - r, w/2 - r]) circle(r=r);
    }
}

module bridge_slice(ang) {
    t = abs(ang) / bridge_half_ang;
    t_smooth = t * t * (3 - 2 * t);
    w = bridge_w_mid + (bridge_w_end - bridge_w_mid) * t_smooth;
    thick = bridge_thick_mid + (bridge_thick_end - bridge_thick_mid) * t_smooth;

    rotate([0, ang, 0]) {
        translate([0, 0, bridge_r_inner]) {
            // Extrude along X_local (tangent)
            rotate([0, 90, 0]) {
                linear_extrude(height=0.2, center=true) {
                    halter_profile_2d(thick, w);
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
        // Cable conduit Ø8 mm in the X-Z plane
        rotate([90, 0, 0]) {
            intersection() {
                rotate_extrude(angle=360, $fn=90)
                    translate([bridge_r_inner + 8.0, 0, 0])
                        circle(r=4.0, $fn=24);
                translate([-bridge_r_inner - 40, 0, -100])
                    cube([2*(bridge_r_inner + 40), bridge_r_inner + 40, 200]);
            }
        }
    }
}

arched_bridge();
