$fn = 36;

// Parámetros
pod_l = 126.0;
pod_w = 82.0;
pod_base_h = 26.0;
pod_r = 7.0;
pod_wall = 2.8;

cradle_depth = 35.0;
cradle_wall = 2.5;
cradle_floor = 2.5;
cradle_tol = 0.3; // Holgura para encastre suave de TPU sobre ASA

strap_slot_w = 52.0;
strap_slot_h = 5.5;
tunnel_t = 3.0;

module r_box(l, w, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([l-r, r, 0]) cylinder(r=r, h=h);
        translate([r, w-r, 0]) cylinder(r=r, h=h);
        translate([l-r, w-r, 0]) cylinder(r=r, h=h);
    }
}

// 1. Cuna receptora en TPU (el brazo que sale del puente)
module tpu_cradle_sleeve() {
    color([0.18, 0.20, 0.22]) // TPU grafito
    difference() {
        // Bloque exterior continuo con el perfil del pod
        r_box(cradle_depth + 4, pod_w, pod_base_h, pod_r);

        // Cavidad/Bolsillo interior donde entra la lengüeta del pod
        translate([-1, cradle_wall - cradle_tol, cradle_floor - cradle_tol]) {
            r_box(cradle_depth + 1, pod_w - 2*(cradle_wall - cradle_tol), 
                  pod_base_h + 2, max(1, pod_r - cradle_wall));
        }

        // Túnel pasacorreas inferior
        translate([-5, (pod_w - strap_slot_w)/2, tunnel_t]) {
            cube([cradle_depth + 15, strap_slot_w, strap_slot_h]);
        }

        // Taladros para tornillos M4 de fijación (2 laterales)
        for (dy = [pod_w/2 - 14, -pod_w/2 + 14]) {
            translate([cradle_depth/2, pod_w/2 + dy, -5])
                cylinder(r=2.2, h=pod_base_h + 10, $fn=24);
        }

        // Pasacables hacia el interior del puente (X=0)
        translate([-5, pod_w/2, 8.0])
            rotate([0, 90, 0]) cylinder(r=4.0, h=15, $fn=24);
    }
}

// 2. Base rígida en ASA con el escalón macho rebajado
module asa_pod_with_step() {
    color([0.94, 0.42, 0.12]) // ASA Naranja
    difference() {
        union() {
            // Sección frontal completa (X = cradle_depth a pod_l)
            translate([cradle_depth, 0, 0]) {
                difference() {
                    r_box(pod_l - cradle_depth, pod_w, pod_base_h, pod_r);
                    // Cara de tope plana en X=0 local
                }
            }
            // Lengüeta rebajada que embona en la cuna de TPU (X = 0 a cradle_depth)
            translate([0, cradle_wall, cradle_floor]) {
                r_box(cradle_depth + 1, pod_w - 2*cradle_wall, pod_base_h - cradle_floor, max(1, pod_r - cradle_wall));
            }
        }

        // Túnel pasacorreas continuo
        translate([-5, (pod_w - strap_slot_w)/2, tunnel_t]) {
            cube([pod_l + 10, strap_slot_w, strap_slot_h]);
        }

        // Taladros M4 alineados con la cuna
        for (dy = [pod_w/2 - 14, -pod_w/2 + 14]) {
            translate([cradle_depth/2, pod_w/2 + dy, -5])
                cylinder(r=2.2, h=pod_base_h + 10, $fn=24);
        }

        // Pasacables frontal en la lengüeta
        translate([-5, pod_w/2, 8.0])
            rotate([0, 90, 0]) cylinder(r=4.0, h=15, $fn=24);
    }
}

// Visualización ensamblada: Cuna TPU + Base ASA
tpu_cradle_sleeve();
asa_pod_with_step();
