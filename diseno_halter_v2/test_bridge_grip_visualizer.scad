// =============================================================================
// DEMOSTRACIÓN VISUAL CLARA: CÓMO AGARRA EL PUENTE A LAS CÁPSULAS
// =============================================================================
include <collar_halter_v2.scad>

$fn = 36;

// VISTA A: MIRANDO AL INTERIOR DEL BOLSILLO DE TPU (DESDE LA BOCA DE ENTRADA)
module view_socket_interior() {
    // TPU en gris oscuro contrastado
    color([0.22, 0.24, 0.28])
        tpu_socket();

    // Dientes de click resaltados en color cian brillante para que se vean al instante
    color([0.0, 0.9, 1.0]) {
        translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
            snap_wedge();
        translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
            mirror([0, 1, 0]) snap_wedge();
    }

    // Flechas indicadoras hacia los dientes de click
    color([0.0, 0.9, 1.0]) {
        translate([click_x, -pod_w/2 + 18, click_z])
            rotate([0, 0, -90]) cylinder(r1=3.0, r2=0.5, h=10, $fn=16);
        translate([click_x, pod_w/2 - 18, click_z])
            rotate([0, 0, 90]) cylinder(r1=3.0, r2=0.5, h=10, $fn=16);
    }

    // Labio superior resaltado en amarillo
    color([1.0, 0.85, 0.1], 0.9) {
        translate([cradle_depth - 3, 0, pod_base_h + 10])
            rotate([180, 0, 0]) cylinder(r1=3.5, r2=0.5, h=8, $fn=16);
    }
}

// VISTA B: CORTE TRANSVERSAL LONGITUDINAL (CÁPSULA ENGANCHADA DENTRO DEL TPU)
module view_cross_section() {
    difference() {
        union() {
            // Cuna de TPU
            color([0.25, 0.27, 0.30]) tpu_socket();

            // Cápsula ASA encajada adentro
            translate([0, -pod_w/2, 0]) {
                color([0.94, 0.42, 0.12]) pod_right_base();
                translate([0, 0, pod_base_h]) color([0.88, 0.38, 0.10]) pod_right_lid();
                translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, pod_base_h + lid_h - solar_t + 0.2])
                    solar_panel_mockup();
            }

            // Diente de click en corte (resaltado)
            color([0.0, 0.9, 1.0]) {
                translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
                    snap_wedge();
            }

            // Cincha marrón pasando por debajo de ambas piezas
            color(col_strap) {
                translate([-15, -strap_width/2, tunnel_t + 0.5])
                    cube([pod_l + 30, strap_width, 3.5]);
            }
        }
        // Corte a la mitad Y = 0 hacia Y < 0 para ver el interior
        translate([-25, -pod_w - 5, -15])
            cube([pod_l + 50, pod_w + 5, 80]);
    }
}

// VISTA C: COMPARATIVA CON FUNDA ENTERIZA COMPLETA (TIPO CELULAR TOTAL)
module view_full_glove() {
    // Funda completa de TPU que abraza toda la cápsula (126 mm) con ventana para panel solar
    color([0.22, 0.24, 0.28]) {
        difference() {
            // Cuerpo exterior completo de goma
            translate([0, -pod_w/2 - cradle_wall, -cradle_floor])
                r_box(pod_l + 2.0, pod_w + 2*cradle_wall, pod_total_h + cradle_floor + 1.5, pod_r + 1.5);
            
            // Hueco interior para la cápsula ASA
            translate([-1.0, -pod_w/2, 0])
                r_box(pod_l + 5.0, pod_w, pod_total_h + 0.5, pod_r);

            // Ventana superior abierta para insolación del panel solar
            translate([10, -solar_w/2, pod_total_h - 2])
                r_box(solar_l + 15, solar_w, 10, 3.0);

            // Túnel pasacorreas inferior
            translate([-5, -strap_slot_w/2, tunnel_t])
                cube([pod_l + 15, strap_slot_w, strap_slot_h]);
        }
    }

    // Cápsula ASA adentro visible por la ventana
    translate([0, -pod_w/2, 0]) {
        color([0.94, 0.42, 0.12]) pod_right_base();
        translate([0, 0, pod_base_h]) color([0.88, 0.38, 0.10]) pod_right_lid();
        translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, pod_base_h + lid_h - solar_t + 0.2])
            solar_panel_mockup();
    }
}

part_v = "internal"; // [internal, section, full_glove]

if (part_v == "internal") {
    view_socket_interior();
} else if (part_v == "section") {
    view_cross_section();
} else if (part_v == "full_glove") {
    view_full_glove();
}
