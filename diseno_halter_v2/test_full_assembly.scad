$fn = 36;

bridge_r_inner = 125.0;
bridge_half_ang = 32.0;
bridge_thick_mid = 16.0;
bridge_thick_end = 33.0; // Exact match to pod height (24 base + 9 lid)
bridge_w_mid = 56.0;
bridge_w_end = 82.0;     // Exact match to pod width

col_body     = [0.22, 0.24, 0.26];
col_bridge   = [0.18, 0.20, 0.22];
col_solar    = [0.08, 0.14, 0.24];
col_led      = [0.05, 1.00, 0.30];
col_strap    = [0.32, 0.26, 0.22];
col_text     = [0.88, 0.90, 0.92];

solar_l = 60.0;
solar_w = 55.0;
solar_t = 2.2;
pod_l = 126.0;
pod_w = 82.0;
pod_base_h = 24.0;
lid_h = 9.0;
pod_r = 7.0;

module r_box(l, w, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([l-r, r, 0]) cylinder(r=r, h=h);
        translate([r, w-r, 0]) cylinder(r=r, h=h);
        translate([l-r, w-r, 0]) cylinder(r=r, h=h);
    }
}

// 2D slice profile of the bridge:
// X is radial outward thickness (0 to thick)
// Y is width along neck (-w/2 to +w/2)
module halter_profile_2d(thick, w) {
    r = min(5.0, thick/3);
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
            rotate([0, -90, 0]) {
                linear_extrude(height=0.2, center=true) {
                    halter_profile_2d(thick, w);
                }
            }
        }
    }
}

module dorsal_bridge(n_steps=24) {
    color(col_bridge) {
        difference() {
            for (i = [0 : n_steps - 1]) {
                ang1 = -bridge_half_ang + i * (2 * bridge_half_ang) / n_steps;
                ang2 = -bridge_half_ang + (i + 1) * (2 * bridge_half_ang) / n_steps;
                hull() {
                    bridge_slice(ang1);
                    bridge_slice(ang2);
                }
            }
            // Continuous internal cable conduit Ø8 mm
            rotate([90, 0, 0]) {
                intersection() {
                    rotate_extrude(angle=360, $fn=90)
                        translate([bridge_r_inner + 8.0, 0, 0])
                            circle(r=4.0, $fn=24);
                    translate([-bridge_r_inner - 40, 0, -100])
                        cube([2*(bridge_r_inner + 40), bridge_r_inner + 40, 200]);
                }
            }
            // Embossed letters COWAI along central ridge
            translate([0, 0, bridge_r_inner + bridge_thick_mid - 0.7]) {
                linear_extrude(height=1.5) {
                    text("C O W A I", size=7.0, font="Ubuntu:style=Bold", 
                         halign="center", valign="center", spacing=1.3);
                }
            }
        }
    }
}

module pod_base() {
    color(col_body) {
        difference() {
            r_box(pod_l, pod_w, pod_base_h, pod_r);
            // Interior cavity
            translate([2.8, 2.8, 4.5])
                r_box(pod_l - 5.6, pod_w - 5.6, pod_base_h + 2, pod_r - 2);
            // Strap tunnel 52mm
            translate([-5, (pod_w - 52)/2, 2.5])
                cube([pod_l + 10, 52, 5.5]);
            // Pass-through conduit hole into the bridge
            translate([-2, pod_w/2, 8])
                rotate([0, -90, 0]) cylinder(r=4.2, h=10, $fn=20);
        }
    }
}

module pod_lid(has_led=false) {
    color(col_body) {
        difference() {
            hull() {
                r_box(pod_l, pod_w, lid_h - 1.5, pod_r);
                translate([1.5, 1.5, lid_h - 1.5])
                    r_box(pod_l - 3, pod_w - 3, 1.5, max(1, pod_r - 1.5));
            }
            // Solar panel flush-mount pocket (55x60mm)
            translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t])
                r_box(solar_l + 1, solar_w + 1, solar_t + 2, 2.0);
            // Solar wire hole
            translate([(pod_l - solar_l)/2 + 8 + solar_l/2, pod_w/2, -1])
                cylinder(r=2.5, h=lid_h + 2, $fn=16);

            // LED vertical diffuser slot if requested
            if (has_led) {
                translate([8, (pod_w - 4)/2, 1])
                    cube([4, 28, lid_h + 2]);
            }
        }
    }
    // Solar panel mockup
    color(col_solar) {
        translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2]) {
            difference() {
                r_box(solar_l, solar_w, solar_t, 2.0);
                for (i = [1:3]) translate([i * 15, 1, solar_t - 0.2]) cube([0.5, solar_w - 2, 0.4]);
                for (j = [1:2]) translate([1, j * 18, solar_t - 0.2]) cube([solar_l - 2, 0.5, 0.4]);
            }
        }
    }
    // LED mockup
    if (has_led) {
        color(col_led, 0.95) {
            translate([8.5, (pod_w - 26)/2, 1.5])
                cube([3, 26, lid_h - 1]);
        }
    }
}

module full_collar() {
    dorsal_bridge();

    ang = bridge_half_ang;
    x_j = bridge_r_inner * sin(ang);
    z_j = bridge_r_inner * cos(ang);

    // Right Pod (Battery 21700-3P + Solar 2)
    translate([x_j, 0, z_j]) {
        rotate([0, ang, 0]) {
            translate([0, -pod_w/2, 0]) {
                pod_base();
                translate([0, 0, pod_base_h]) pod_lid(has_led=false);
            }
        }
    }

    // Left Pod (LilyGO + GPS + Solar 1 + Green LED)
    mirror([1, 0, 0]) {
        translate([x_j, 0, z_j]) {
            rotate([0, ang, 0]) {
                translate([0, -pod_w/2, 0]) {
                    pod_base();
                    translate([0, 0, pod_base_h]) pod_lid(has_led=true);
                }
            }
        }
    }

    // Cow collar strap (38mm)
    color(col_strap, 0.85) {
        translate([x_j, 0, z_j])
            rotate([0, ang, 0])
                translate([-10, -19, 3])
                    cube([pod_l + 30, 38, 3.5]);
        mirror([1, 0, 0])
            translate([x_j, 0, z_j])
                rotate([0, ang, 0])
                    translate([-10, -19, 3])
                        cube([pod_l + 30, 38, 3.5]);
    }
}

full_collar();
