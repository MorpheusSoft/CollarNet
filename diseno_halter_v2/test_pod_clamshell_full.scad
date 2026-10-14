
$fn = 36;

pod_l = 126.0;
pod_w = 82.0;
pod_base_h = 26.0;
lid_h = 9.0;
pod_r = 7.0;
pod_wall = 2.8;

// U-channel & tongue IP67 parameters
u_w = 2.4;
u_d = 2.8;
tongue_w = 1.6;
tongue_h = 2.2;
gasket_w = 2.0;
gasket_t = 2.0;

// Cantilever snap clips
clip_w = 8.0;
clip_t = 1.4;
clip_arm_h = 7.5;
hook_d = 1.2;

// Posiciones de los clips perimetrales (X para laterales, Y para extremos)
clip_x_positions = [45.0, 85.0, 115.0]; // 3 clips a cada lado largo
clip_y_end = pod_w / 2;                 // 1 clip en el extremo trasero

module r_box(l, w, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([l-r, r, 0]) cylinder(r=r, h=h);
        translate([r, w-r, 0]) cylinder(r=r, h=h);
        translate([l-r, w-r, 0]) cylinder(r=r, h=h);
    }
}

// 1. CARCASA BASE CON CANAL EN U Y VENTANAS DE CLICK
module test_base() {
    difference() {
        // Cuerpo exterior
        r_box(pod_l, pod_w, pod_base_h, pod_r);

        // Vaciado interior
        translate([pod_wall + u_w, pod_wall + u_w, 3.0])
            r_box(pod_l - 2*(pod_wall + u_w), pod_w - 2*(pod_wall + u_w), pod_base_h, max(1, pod_r - pod_wall - u_w));

        // Canal laberíntico continuo en U para junta tórica IP67
        translate([pod_wall, pod_wall, pod_base_h - u_d]) {
            difference() {
                r_box(pod_l - 2*pod_wall, pod_w - 2*pod_wall, u_d + 1, max(1, pod_r - pod_wall));
                translate([u_w, u_w, -0.5])
                    r_box(pod_l - 2*(pod_wall + u_w), pod_w - 2*(pod_wall + u_w), u_d + 2, max(1, pod_r - pod_wall - u_w));
            }
        }

        // Ventanas de click en laterales Y=0 y Y=pod_w
        for (cx = clip_x_positions) {
            // Lado Y=0
            translate([cx - clip_w/2, -0.5, pod_base_h - clip_arm_h])
                cube([clip_w, pod_wall + 1.0, 3.0]);
            // Lado Y=pod_w
            translate([cx - clip_w/2, pod_w - pod_wall - 0.5, pod_base_h - clip_arm_h])
                cube([clip_w, pod_wall + 1.0, 3.0]);
        }

        // Ventana de click en extremo trasero X=pod_l
        translate([pod_l - pod_wall - 0.5, clip_y_end - clip_w/2, pod_base_h - clip_arm_h])
            cube([pod_wall + 1.0, clip_w, 3.0]);
    }
}

// 2. TAPA CON LENGÜETA DE COMPRESIÓN Y CLIPS SNAP-FIT
module test_lid() {
    union() {
        // Marco/tapa superior
        difference() {
            r_box(pod_l, pod_w, lid_h, pod_r);
            // Cuna para panel solar
            translate([(pod_l - 60)/2 + 8, (pod_w - 55)/2, lid_h - 2.2])
                r_box(61, 56, 3, 2);
            // Vaciado interior
            translate([pod_wall + u_w + 1, pod_wall + u_w + 1, -1])
                r_box(pod_l - 2*(pod_wall + u_w + 1), pod_w - 2*(pod_wall + u_w + 1), lid_h - 1, max(1, pod_r - pod_wall - u_w - 1));
        }

        // Lengüeta perimetral de compresión que baja hacia el canal en U
        translate([pod_wall + (u_w - tongue_w)/2, pod_wall + (u_w - tongue_w)/2, -tongue_h]) {
            difference() {
                r_box(pod_l - 2*(pod_wall + (u_w - tongue_w)/2), pod_w - 2*(pod_wall + (u_w - tongue_w)/2), tongue_h + 0.1, max(1, pod_r - pod_wall));
                translate([tongue_w, tongue_w, -0.5])
                    r_box(pod_l - 2*(pod_wall + (u_w - tongue_w)/2 + tongue_w), pod_w - 2*(pod_wall + (u_w - tongue_w)/2 + tongue_w), tongue_h + 1.2, max(1, pod_r - pod_wall - tongue_w));
            }
        }

        // Brazos con ganchos de traba (Snap-Fit Hooks)
        // Laterales Y=0 y Y=pod_w
        for (cx = clip_x_positions) {
            // Lado Y=0
            translate([cx - clip_w/2 + 0.2, 0.4, -clip_arm_h]) {
                cube([clip_w - 0.4, clip_t, clip_arm_h]);
                // Gancho en cuña (rampa 30° hacia abajo, tope 90° arriba)
                hull() {
                    translate([0, 0, 0.2]) cube([clip_w - 0.4, 0.2, 0.5]);
                    translate([0, -hook_d, 2.0]) cube([clip_w - 0.4, 0.2, 0.8]);
                }
            }
            // Lado Y=pod_w
            translate([cx - clip_w/2 + 0.2, pod_w - clip_t - 0.4, -clip_arm_h]) {
                cube([clip_w - 0.4, clip_t, clip_arm_h]);
                hull() {
                    translate([0, clip_t - 0.2, 0.2]) cube([clip_w - 0.4, 0.2, 0.5]);
                    translate([0, clip_t + hook_d - 0.2, 2.0]) cube([clip_w - 0.4, 0.2, 0.8]);
                }
            }
        }

        // Extremo trasero X=pod_l
        translate([pod_l - clip_t - 0.4, clip_y_end - clip_w/2 + 0.2, -clip_arm_h]) {
            cube([clip_t, clip_w - 0.4, clip_arm_h]);
            hull() {
                translate([clip_t - 0.2, 0, 0.2]) cube([0.2, clip_w - 0.4, 0.5]);
                translate([clip_t + hook_d - 0.2, 0, 2.0]) cube([0.2, clip_w - 0.4, 0.8]);
            }
        }
    }
}

// 3. JUNTA TÓRICA ELASTOMÉRICA IP67
module test_gasket() {
    color([0.95, 0.40, 0.10, 0.8]) {
        translate([pod_wall + (u_w - gasket_w)/2, pod_wall + (u_w - gasket_w)/2, pod_base_h - u_d + 0.4]) {
            difference() {
                r_box(pod_l - 2*(pod_wall + (u_w - gasket_w)/2), pod_w - 2*(pod_wall + (u_w - gasket_w)/2), gasket_t, max(1, pod_r - pod_wall));
                translate([gasket_w, gasket_w, -0.5])
                    r_box(pod_l - 2*(pod_wall + (u_w - gasket_w)/2 + gasket_w), pod_w - 2*(pod_wall + (u_w - gasket_w)/2 + gasket_w), gasket_t + 1.0, max(1, pod_r - pod_wall - gasket_w));
            }
        }
    }
}

// Vista explosionada
color([0.94, 0.42, 0.12]) test_base();
translate([0, 0, 20]) test_gasket();
translate([0, 0, 48]) color([0.94, 0.42, 0.12]) test_lid();
