// =============================================================================
// PROBETAS DE ENSAYO PARA PROTOTIPADO RÁPIDO (HALTER V2)
// Piezas pequeñas de validación mecánica que imprimen en 15-35 minutos
// =============================================================================

caller_part = "none"; // Desactivar el ensamble general de collar_halter_v2
include <collar_halter_v2.scad>

$fn = 36;

// -----------------------------------------------------------------------------
// 1. PROBETA A: BOLSILLO DE TPU (CUNA DE RETENCIÓN)
// Medidas: 37 x 68 x 28 mm | Filamento: ~15g TPU | Tiempo: ~30-35 min
// Valida: Dientes de click interiores, labio superior elástico, túnel pasacorreas
// -----------------------------------------------------------------------------
module probeta_bolsillo_tpu() {
    color(col_bridge)
        tpu_socket();
}

// -----------------------------------------------------------------------------
// 2. PROBETA B: CUELLO DE CÁPSULA (LENGÜETA ASA / PLA DRAFT)
// Medidas: 45 x 68 x 28 mm | Filamento: ~12g PLA/ASA | Tiempo: ~18-22 min
// Valida: Entrada en el bolsillo de TPU, traba de los dientes cian, labio superior
// -----------------------------------------------------------------------------
module probeta_cuello_capsula() {
    color(col_body) {
        intersection() {
            pod_right_base();
            // Rebanamos los primeros 45 mm del pod (zona de acople con holgura)
            translate([-5, -5, -2])
                cube([cradle_depth + 10, pod_w + 10, pod_base_h + 5]);
        }
    }
}

// -----------------------------------------------------------------------------
// 3. PROBETA C: MINI-CAJA AUTÓNOMA CLICK IP67 (BASE)
// Medidas: 44 x 82 x 20 mm | Paredes 100% cerradas | Suelo liso
// Valida: 2 Ventanas de click laterales centradas y canal perimetral en U
// -----------------------------------------------------------------------------
click_box_l = 44.0;
click_box_w = pod_w; // 82.0 mm (ancho real)
click_box_h = 20.0;

module probeta_click_ip67_base() {
    color(col_body) {
        difference() {
            // Cuerpo exterior redondeado idéntico a las cápsulas reales
            r_box(click_box_l, click_box_w, click_box_h, pod_r);

            // Cavidad interior limpia con piso cerrado de 2.5 mm y paredes robustas
            translate([pod_wall + u_w + 1.0, pod_wall + u_w + 1.0, 2.5])
                r_box(click_box_l - 2*(pod_wall + u_w + 1.0), click_box_w - 2*(pod_wall + u_w + 1.0), click_box_h + 5, max(1, pod_r - pod_wall - u_w - 1.0));

            // Canal continuo en U para la junta estanca en todo el borde superior
            translate([pod_wall, pod_wall, click_box_h - u_d]) {
                difference() {
                    r_box(click_box_l - 2*pod_wall, click_box_w - 2*pod_wall, u_d + 1, max(1, pod_r - pod_wall));
                    translate([u_w, u_w, -0.5])
                        r_box(click_box_l - 2*(pod_wall + u_w), click_box_w - 2*(pod_wall + u_w), u_d + 2, max(1, pod_r - pod_wall - u_w));
                }
            }

            // Ventana de click lateral 1 (en pared Y = 0)
            translate([click_box_l/2 - clip_w/2, -0.5, click_box_h - clip_arm_h])
                cube([clip_w, pod_wall + 1.0, 3.2]);

            // Ventana de click lateral 2 (en pared Y = click_box_w)
            translate([click_box_l/2 - clip_w/2, click_box_w - pod_wall - 0.5, click_box_h - clip_arm_h])
                cube([clip_w, pod_wall + 1.0, 3.2]);

            // Muesca ergonómica para abrir con destornillador plano o moneda
            translate([click_box_l - 6.0, -0.5, click_box_h - 1.2])
                cube([5.0, 2.0, 2.0]);
        }
    }
}

// -----------------------------------------------------------------------------
// 4. PROBETA D: MINI-TAPA AUTÓNOMA SNAP-FIT (TAPA)
// Medidas: 44 x 82 x 7 mm
// Valida: 2 Pestañas elásticas completas (Snap-Hooks) y lengüeta de compresión
// -----------------------------------------------------------------------------
module probeta_click_ip67_tapa() {
    color(col_body) {
        union() {
            difference() {
                // Tapa exterior lisa con esquinas suaves
                hull() {
                    r_box(click_box_l, click_box_w, lid_h - 1.5, pod_r);
                    translate([1.5, 1.5, lid_h - 1.5])
                        r_box(click_box_l - 3, click_box_w - 3, 1.5, max(1, pod_r - 1.5));
                }
                // Vaciado interior
                translate([pod_wall + u_w + 1.0, pod_wall + u_w + 1.0, -1])
                    r_box(click_box_l - 2*(pod_wall + u_w + 1.0), click_box_w - 2*(pod_wall + u_w + 1.0), lid_h - 2.5, max(1, pod_r - pod_wall - u_w - 1.0));
            }

            // Lengüeta perimetral de compresión que baja al canal en U (sello IP67)
            translate([pod_wall + (u_w - tongue_w)/2, pod_wall + (u_w - tongue_w)/2, -tongue_h]) {
                difference() {
                    r_box(click_box_l - 2*(pod_wall + (u_w - tongue_w)/2), click_box_w - 2*(pod_wall + (u_w - tongue_w)/2), tongue_h + 0.1, max(1, pod_r - pod_wall));
                    translate([tongue_w, tongue_w, -0.5])
                        r_box(click_box_l - 2*(pod_wall + (u_w - tongue_w)/2 + tongue_w), click_box_w - 2*(pod_wall + (u_w - tongue_w)/2 + tongue_w), tongue_h + 1.2, max(1, pod_r - pod_wall - tongue_w));
                }
            }

            // Pestaña elástica cantilever 1 (en pared lateral Y = 0)
            translate([click_box_l/2 - clip_w/2 + 0.2, 0.4, -clip_arm_h]) {
                cube([clip_w - 0.4, clip_t, clip_arm_h]);
                hull() {
                    translate([0, 0, 0.2]) cube([clip_w - 0.4, 0.2, 0.5]);
                    translate([0, -hook_d, 2.0]) cube([clip_w - 0.4, 0.2, 0.8]);
                }
            }

            // Pestaña elástica cantilever 2 (en pared lateral Y = click_box_w)
            translate([click_box_l/2 - clip_w/2 + 0.2, click_box_w - clip_t - 0.4, -clip_arm_h]) {
                cube([clip_w - 0.4, clip_t, clip_arm_h]);
                hull() {
                    translate([0, clip_t - 0.2, 0.2]) cube([clip_w - 0.4, 0.2, 0.5]);
                    translate([0, clip_t + hook_d - 0.2, 2.0]) cube([clip_w - 0.4, 0.2, 0.8]);
                }
            }
        }
    }
}

// -----------------------------------------------------------------------------
// 5. PROBETA E: MINI JUNTA ESTANCA TPU
// Junta tórica rectangular cerrada para la mini-caja
// -----------------------------------------------------------------------------
module probeta_junta_ip67() {
    color([0.1, 0.9, 0.3]) {
        translate([pod_wall + (u_w - gasket_w)/2, pod_wall + (u_w - gasket_w)/2, 0]) {
            difference() {
                r_box(click_box_l - 2*(pod_wall + (u_w - gasket_w)/2), click_box_w - 2*(pod_wall + (u_w - gasket_w)/2), gasket_d, max(1, pod_r - pod_wall));
                translate([gasket_w, gasket_w, -0.5])
                    r_box(click_box_l - 2*(pod_wall + (u_w - gasket_w)/2 + gasket_w), click_box_w - 2*(pod_wall + (u_w - gasket_w)/2 + gasket_w), gasket_d + 1.0, max(1, pod_r - pod_wall - gasket_w));
            }
        }
    }
}

// -----------------------------------------------------------------------------
// VISTA DEMO 1: VALIDACIÓN DE ACOPLE PUENTE TPU <-> CÁPSULA ASA
// -----------------------------------------------------------------------------
module demo_acople_tpu() {
    probeta_bolsillo_tpu();
    // Cuello entrando desplazado 25 mm en X
    translate([25, -pod_w/2, 0])
        probeta_cuello_capsula();
    // Cincha ganadera continua inferior (52 mm túnel, cinta 38-50 mm)
    color(col_strap)
        translate([-12, -strap_width/2, tunnel_t + 0.3])
            cube([75, strap_width, 3.2]);
    // Arnés Pasacables continuo superior (Ø7.0 mm a Z = conduit_z = 17.0 mm)
    %color([0.20, 0.20, 0.22], 0.8)
        translate([-12, 0, conduit_z])
            rotate([0, 90, 0])
                cylinder(r=3.5, h=75, $fn=24);
}

// -----------------------------------------------------------------------------
// 6. PROBETA F: SEGMENTO DE PUENTE DORSAL TPU (TÚNEL CORREA + CONDUCTO PASACABLES)
// Medidas: 45 mm arco central | Filamento: ~18g TPU 95A | Tiempo: ~25-30 min
// Valida: Túnel pasacorreas continuo 52x5.5mm, conducto pasacables Ø8mm a Z=17mm
// -----------------------------------------------------------------------------
module probeta_puente_segmento() {
    color(col_bridge) {
        intersection() {
            dorsal_bridge_body();
            translate([-25, -pod_w/2 - 2, 110])
                cube([50, pod_w + 4, 45]);
        }
    }
}

// -----------------------------------------------------------------------------
// VISTA DEMO 2: VALIDACIÓN DE CLICK IP67 & COMPRESIÓN DE JUNTA
// -----------------------------------------------------------------------------
module demo_click_ip67() {
    translate([-45, -pod_w/2, 0]) {
        probeta_click_ip67_base();
        // Tapa flotando 15 mm arriba
        translate([0, 0, pod_base_h + 15])
            probeta_click_ip67_tapa();
        // Junta verde
        translate([0, 0, pod_base_h + 5.0])
            probeta_junta_ip67();
    }
}

// Selector
probeta = "demo_acople"; // [demo_acople, demo_click, bolsillo_tpu, cuello_capsula, click_base, click_tapa, junta, puente_segmento]

if (probeta == "demo_acople") {
    demo_acople_tpu();
} else if (probeta == "demo_click") {
    demo_click_ip67();
} else if (probeta == "bolsillo_tpu") {
    probeta_bolsillo_tpu();
} else if (probeta == "cuello_capsula") {
    probeta_cuello_capsula();
} else if (probeta == "click_base") {
    probeta_click_ip67_base();
} else if (probeta == "click_tapa") {
    probeta_click_ip67_tapa();
} else if (probeta == "junta") {
    probeta_junta_ip67();
} else if (probeta == "puente_segmento") {
    probeta_puente_segmento();
}
