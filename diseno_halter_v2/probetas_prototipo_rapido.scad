// =============================================================================
// PROBETAS DE ENSAYO PARA PROTOTIPADO RÁPIDO (HALTER V2)
// Piezas pequeñas de validación mecánica que imprimen en 15-35 minutos
// =============================================================================

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
// 3. PROBETA C: TEST DE CLICK PERIMETRAL & SELLO IP67 (BASE)
// Medidas: 38 x 68 x 28 mm | Filamento: ~10g PLA/ASA | Tiempo: ~15-18 min
// Valida: Ventanas de click laterales y canal en U para la junta estanca
// -----------------------------------------------------------------------------
module probeta_click_ip67_base() {
    color(col_body) {
        intersection() {
            pod_right_base();
            // Rebanada de 38 mm en la zona central con 2 ventanas de click
            translate([45, -5, -2])
                cube([38, pod_w + 10, pod_base_h + 5]);
        }
    }
}

// -----------------------------------------------------------------------------
// 4. PROBETA D: TEST DE CLICK PERIMETRAL & SELLO IP67 (TAPA)
// Medidas: 38 x 68 x 8 mm | Filamento: ~6g PLA/ASA | Tiempo: ~12-14 min
// Valida: Pestañas cantilever flexibles (snap-fit), lengüeta de compresión
// -----------------------------------------------------------------------------
module probeta_click_ip67_tapa() {
    color(col_body) {
        intersection() {
            pod_right_lid();
            // Misma rebanada de 38 mm con las pestañas de traba
            translate([45, -5, -5])
                cube([38, pod_w + 10, lid_h + 10]);
        }
    }
}

// -----------------------------------------------------------------------------
// 5. PROBETA E: MINI JUNTA ESTANCA TPU
// Filamento: ~1.5g TPU | Tiempo: ~4 min
// -----------------------------------------------------------------------------
module probeta_junta_ip67() {
    color([0.1, 0.9, 0.3]) {
        intersection() {
            gasket_tpu();
            translate([45, -5, -2])
                cube([38, pod_w + 10, 10]);
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
    // Cincha ganadera
    color(col_strap)
        translate([-12, -strap_width/2, tunnel_t + 0.3])
            cube([75, strap_width, 3.2]);
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
probeta = "demo_acople"; // [demo_acople, demo_click, bolsillo_tpu, cuello_capsula, click_base, click_tapa, junta]

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
}
