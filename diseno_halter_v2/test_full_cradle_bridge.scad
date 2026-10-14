$fn = 36;

// Parámetros principales
pod_l = 126.0;
pod_w = 82.0;
pod_base_h = 26.0;
lid_h = 9.0;
pod_total_h = pod_base_h + lid_h;
pod_r = 7.0;
pod_wall = 2.8;

cradle_depth = 35.0;
cradle_wall = 2.5;
cradle_floor = 2.5;
cradle_tol = 0.3;

strap_slot_w = 52.0;
strap_slot_h = 5.5;
tunnel_t = 3.0;

bridge_r_inner = 125.0;
bridge_half_ang = 32.0;
bridge_thick_mid = 16.0;
bridge_thick_end = pod_total_h;
bridge_w_mid = 56.0;
bridge_w_end = pod_w;
conduit_d = 8.0;

module r_box(l, w, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([l-r, r, 0]) cylinder(r=r, h=h);
        translate([r, w-r, 0]) cylinder(r=r, h=h);
        translate([l-r, w-r, 0]) cylinder(r=r, h=h);
    }
}

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

// Cuna receptora en coordenadas locales del pod (X=0 a cradle_depth)
module tpu_socket() {
    difference() {
        // Envolvente exterior
        translate([0, -pod_w/2, 0])
            r_box(cradle_depth + 2.0, pod_w, pod_base_h, pod_r);

        // Cavidad interior donde entra el escalón de ASA
        translate([-1.0, -pod_w/2 + cradle_wall - cradle_tol, cradle_floor - cradle_tol])
            r_box(cradle_depth + 4.0, pod_w - 2*(cradle_wall - cradle_tol), 
                  pod_base_h + 5.0, max(1, pod_r - cradle_wall));

        // Túnel pasacorreas
        translate([-5, -strap_slot_w/2, tunnel_t])
            cube([cradle_depth + 10, strap_slot_w, strap_slot_h]);

        // Taladros M4 de seguridad
        for (dy = [-pod_w/2 + 14, pod_w/2 - 14]) {
            translate([cradle_depth/2, dy, -5])
                cylinder(r=2.2, h=pod_base_h + 10, $fn=24);
        }

        // Pasacables de entrada desde el puente (Ø8 mm)
        translate([-5, 0, 8.0])
            rotate([0, 90, 0]) cylinder(r=conduit_d/2, h=15, $fn=24);
    }
}

// PUENTE DORSAL COMPLETO CON DOBLE CUNA INTEGRADA EN TPU
module full_tpu_bridge_with_cradles(n_steps=24) {
    color([0.18, 0.20, 0.22]) {
        union() {
            // 1. Arco dorsal anatómico
            difference() {
                for (i = [0 : n_steps - 1]) {
                    ang1 = -bridge_half_ang + i * (2 * bridge_half_ang) / n_steps;
                    ang2 = -bridge_half_ang + (i + 1) * (2 * bridge_half_ang) / n_steps;
                    hull() {
                        bridge_slice(ang1);
                        bridge_slice(ang2);
                    }
                }

                // Conducto pasacables interior (Ø8 mm)
                rotate([90, 0, 0]) {
                    intersection() {
                        rotate_extrude(angle=360, $fn=90)
                            translate([bridge_r_inner + 8.0, 0, 0])
                                circle(r=conduit_d/2, $fn=24);
                        translate([-bridge_r_inner - 40, 0, -100])
                            cube([2*(bridge_r_inner + 40), bridge_r_inner + 40, 200]);
                    }
                }

                // Canales de ventilación y confort
                for (dy = [-18, 0, 18]) {
                    translate([0, dy, 0]) {
                        rotate([90, 0, 0]) {
                            intersection() {
                                rotate_extrude(angle=360, $fn=90)
                                    translate([bridge_r_inner, 0, 0])
                                        scale([1, 0.6]) circle(r=2.5, $fn=20);
                                translate([-bridge_r_inner - 40, 0, -100])
                                    cube([2*(bridge_r_inner + 40), bridge_r_inner + 40, 200]);
                            }
                        }
                    }
                }
            }

            // 2. Cuna Derecha de TPU unida al arco
            ang = bridge_half_ang;
            x_j = bridge_r_inner * sin(ang);
            z_j = bridge_r_inner * cos(ang);

            translate([x_j, 0, z_j])
                rotate([0, ang, 0])
                    tpu_socket();

            // 3. Cuna Izquierda de TPU unida al arco
            mirror([1, 0, 0])
                translate([x_j, 0, z_j])
                    rotate([0, ang, 0])
                        tpu_socket();
        }
    }
}

full_tpu_bridge_with_cradles();
