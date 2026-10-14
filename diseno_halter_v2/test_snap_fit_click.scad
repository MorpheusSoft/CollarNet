$fn = 36;

// Parámetros de la cápsula
pod_l = 126.0;
pod_w = 82.0;
pod_base_h = 26.0;
pod_r = 7.0;
pod_wall = 2.8;

// Parámetros de la cuna TPU
cradle_depth = 35.0;
cradle_wall = 2.5;
cradle_floor = 2.5;
cradle_tol = 0.3; // Holgura precisa para TPU sobre ASA

// Parámetros del Click / Snap-Fit
click_x = 16.0;      // Posición a lo largo del bolsillo (mm)
click_l = 10.0;      // Largo del diente en X (mm)
click_h = 8.0;       // Altura del diente en Z (mm)
click_depth = 1.8;   // Saliente del diente de traba hacia adentro (mm)
click_z = 13.0;      // Centrado verticalmente a media altura

// Túnel pasacorreas
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

// Diente de traba en cuña (Entrada suave en rampa hacia X=0, tope recto anti-extracción)
module snap_wedge() {
    hull() {
        // Cara trasera de retención recta (tope en X=0 local)
        translate([0, 0, -click_h/2])
            cube([0.5, click_depth, click_h]);
        // Cima redondeada del diente de traba
        translate([2.5, click_depth - 0.4, -click_h/2])
            cube([1.0, 0.4, click_h]);
        // Rampa suave hacia la boca de entrada (en X=click_l)
        translate([click_l, 0, -click_h/2 + 0.5])
            cube([0.5, 0.3, click_h - 1.0]);
    }
}

// CUNA EN TPU CON DIENTES DE CLICK Y LABIO TIPO FUNDA DE CELULAR
module tpu_cradle_snap_fit() {
    color([0.18, 0.20, 0.22]) // TPU Grafito
    difference() {
        union() {
            // Cuerpo exterior de la cuna
            translate([0, -pod_w/2, 0])
                r_box(cradle_depth + 2.0, pod_w, pod_base_h, pod_r);

            // Labio superior elástico tipo funda de celular (sujeta el borde superior del case)
            translate([0, -pod_w/2, pod_base_h - 1.5]) {
                difference() {
                    r_box(cradle_depth + 1.0, pod_w, 2.5, pod_r);
                    translate([-2, cradle_wall + 1.2, -1])
                        r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
                }
            }

            // Dientes de click interiores en las paredes laterales de TPU
            // Diente lateral 1 (en pared Y = -pod_w/2 + cradle_wall)
            translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
                snap_wedge();

            // Diente lateral 2 (en pared Y = +pod_w/2 - cradle_wall)
            translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
                mirror([0, 1, 0]) snap_wedge();
        }

        // Cavidad interior donde entra el case
        translate([-1.0, -pod_w/2 + cradle_wall - cradle_tol, cradle_floor - cradle_tol])
            r_box(cradle_depth + 4.0, pod_w - 2*(cradle_wall - cradle_tol), 
                  pod_base_h + 5.0, max(1, pod_r - cradle_wall));

        // Túnel pasacorreas continuo
        translate([-5, -strap_slot_w/2, tunnel_t])
            cube([cradle_depth + 10, strap_slot_w, strap_slot_h]);

        // Pasacables hacia el puente
        translate([-5, 0, 8.0])
            rotate([0, 90, 0]) cylinder(r=4.0, h=15, $fn=24);

        // Muescas para desenganche con los dedos (para liberar el click si se desea)
        translate([cradle_depth - 2.0, -pod_w/2 - 1.0, click_z - 3.5])
            cube([5.0, cradle_wall + 2.0, 7.0]);
        translate([cradle_depth - 2.0, pod_w/2 - cradle_wall - 1.0, click_z - 3.5])
            cube([5.0, cradle_wall + 2.0, 7.0]);
    }
}

// BASE RÍGIDA ASA CON MUESCAS DE TRABA (CLICK DETENT)
module asa_pod_snap_fit() {
    color([0.94, 0.42, 0.12]) // ASA Naranja
    difference() {
        union() {
            // Cuerpo principal a tamaño completo
            translate([cradle_depth, 0, 0])
                r_box(pod_l - cradle_depth, pod_w, pod_base_h, pod_r);
            
            // Lengüeta rebajada macho
            translate([0, cradle_wall, cradle_floor])
                r_box(cradle_depth + 0.5, pod_w - 2*cradle_wall, pod_base_h - cradle_floor, max(1, pod_r - cradle_wall));
        }

        // Túnel pasacorreas
        translate([-5, (pod_w - strap_slot_w)/2, tunnel_t])
            cube([pod_l + 10, strap_slot_w, strap_slot_h]);

        // Pasacables frontal
        translate([-5, pod_w/2, 8.0])
            rotate([0, 90, 0]) cylinder(r=4.0, h=15, $fn=24);

        // MUESCA / CANAL DE CLICK LATERAL 1
        translate([click_x - 0.5, cradle_wall - 0.2, click_z - click_h/2 - 0.5]) {
            cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);
        }

        // MUESCA / CANAL DE CLICK LATERAL 2
        translate([click_x - 0.5, pod_w - cradle_wall - click_depth - 0.3, click_z - click_h/2 - 0.5]) {
            cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);
        }

        // Vaciado interior de la caja
        translate([cradle_wall + pod_wall, cradle_wall + pod_wall, tunnel_t + strap_slot_h + 2.0])
            r_box(pod_l - 2*(cradle_wall + pod_wall), pod_w - 2*(cradle_wall + pod_wall), pod_base_h + 5, 2.0);
    }
}

// Vista explosionada
tpu_cradle_snap_fit();
translate([42, -pod_w/2, 0]) asa_pod_snap_fit();

// Flechas indicadoras de ensamble
color([0.2, 0.8, 1.0]) {
    translate([cradle_depth + 2, 0, click_z])
        rotate([0, 90, 0]) cylinder(r=1.0, h=38, $fn=16);
}
