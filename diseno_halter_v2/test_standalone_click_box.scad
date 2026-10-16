include <collar_halter_v2.scad>

$fn = 36;

box_l = 44.0;
box_w = pod_w;
box_h = 22.0;

module mini_caja_click_base() {
    difference() {
        // Cuerpo exterior redondeado idéntico a las cápsulas
        r_box(box_l, box_w, box_h, pod_r);

        // Cavidad interior limpia y cerrada (piso de 2.5 mm, paredes sólidas)
        translate([pod_wall + u_w + 1.0, pod_wall + u_w + 1.0, 2.5])
            r_box(box_l - 2*(pod_wall + u_w + 1.0), box_w - 2*(pod_wall + u_w + 1.0), box_h, max(1, pod_r - pod_wall - u_w - 1.0));

        // Canal perimétrico en U para junta tórica IP67 en el borde superior
        translate([pod_wall, pod_wall, box_h - u_d]) {
            difference() {
                r_box(box_l - 2*pod_wall, box_w - 2*pod_wall, u_d + 1, max(1, pod_r - pod_wall));
                translate([u_w, u_w, -0.5])
                    r_box(box_l - 2*(pod_wall + u_w), box_w - 2*(pod_wall + u_w), u_d + 2, max(1, pod_r - pod_wall - u_w));
            }
        }

        // Ventana de click lateral 1 (Y = 0)
        translate([box_l/2 - clip_w/2, -0.5, box_h - clip_arm_h])
            cube([clip_w, pod_wall + 1.0, 3.2]);

        // Ventana de click lateral 2 (Y = box_w)
        translate([box_l/2 - clip_w/2, box_w - pod_wall - 0.5, box_h - clip_arm_h])
            cube([clip_w, pod_wall + 1.0, 3.2]);

        // Ranura de apertura con destornillador en esquina
        translate([box_l - 6.0, -0.5, box_h - 1.2])
            cube([5.0, 2.0, 2.0]);
    }
}

module mini_caja_click_tapa() {
    union() {
        difference() {
            // Tapa superior
            hull() {
                r_box(box_l, box_w, lid_h - 1.5, pod_r);
                translate([1.5, 1.5, lid_h - 1.5])
                    r_box(box_l - 3, box_w - 3, 1.5, max(1, pod_r - 1.5));
            }
            // Vaciado interior
            translate([pod_wall + u_w + 1.0, pod_wall + u_w + 1.0, -1])
                r_box(box_l - 2*(pod_wall + u_w + 1.0), box_w - 2*(pod_wall + u_w + 1.0), lid_h - 2.5, max(1, pod_r - pod_wall - u_w - 1.0));
        }

        // Lengüeta perimétrica de compresión hacia el canal en U
        translate([pod_wall + (u_w - tongue_w)/2, pod_wall + (u_w - tongue_w)/2, -tongue_h]) {
            difference() {
                r_box(box_l - 2*(pod_wall + (u_w - tongue_w)/2), box_w - 2*(pod_wall + (u_w - tongue_w)/2), tongue_h + 0.1, max(1, pod_r - pod_wall));
                translate([tongue_w, tongue_w, -0.5])
                    r_box(box_l - 2*(pod_wall + (u_w - tongue_w)/2 + tongue_w), box_w - 2*(pod_wall + (u_w - tongue_w)/2 + tongue_w), tongue_h + 1.2, max(1, pod_r - pod_wall - tongue_w));
            }
        }

        // Pestañas elásticas con cuña (Snap-Fit Hooks)
        // Pared lateral Y = 0
        translate([box_l/2 - clip_w/2 + 0.2, 0.4, -clip_arm_h]) {
            cube([clip_w - 0.4, clip_t, clip_arm_h]);
            hull() {
                translate([0, 0, 0.2]) cube([clip_w - 0.4, 0.2, 0.5]);
                translate([0, -hook_d, 2.0]) cube([clip_w - 0.4, 0.2, 0.8]);
            }
        }

        // Pared lateral Y = box_w
        translate([box_l/2 - clip_w/2 + 0.2, box_w - clip_t - 0.4, -clip_arm_h]) {
            cube([clip_w - 0.4, clip_t, clip_arm_h]);
            hull() {
                translate([0, clip_t - 0.2, 0.2]) cube([clip_w - 0.4, 0.2, 0.5]);
                translate([0, clip_t + hook_d - 0.2, 2.0]) cube([clip_w - 0.4, 0.2, 0.8]);
            }
        }
    }
}

// Vista demostrativa: base + tapa flotando arriba
translate([0, 0, 0]) mini_caja_click_base();
translate([0, 0, box_h + 15]) mini_caja_click_tapa();
