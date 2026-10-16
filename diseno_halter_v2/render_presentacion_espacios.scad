// =============================================================================
// RENDER DE PRESENTACIÓN: COMPONENTES Y ESPACIOS INTERNOS CAD
// Muestra el interior de ambas cápsulas con los dispositivos alojados:
// Batería 21700-3P, LilyGO T-A7670X-S3, Antena GNSS, MPPT, Buzzer, Cincha y Cables.
// =============================================================================

caller_part = "none";
include <collar_halter_v2.scad>
include <generar_componentes_internos.scad>

$fn = 36;

// Vista de las dos cápsulas abiertas con sus componentes adentro
module presentacion_espacios_internos() {
    // 1. CÁPSULA DERECHA (BATERÍA + MPPT + BUZZER)
    translate([70, 0, 0]) {
        // Base rígida semi-transparente
        %color([0.85, 0.85, 0.88], 0.45)
            pod_right_base();

        // Pack Batería 21700-3P alojado
        translate([11.5, (pod_w - bat_w)/2, 10.5])
            comp_bateria_21700_3p();

        // Módulo MPPT alojado
        translate([bat_l + 16, (pod_w - 26)/2, 10.5])
            comp_modulo_mppt();

        // Buzzer alojado
        translate([bat_l + 25 + 6, 16 + 6, 10.5])
            comp_buzzer();

        // Tapa flotando 45 mm arriba (Despiece)
        translate([0, 0, pod_base_h + 45]) {
            %color([0.85, 0.85, 0.88], 0.5)
                pod_right_lid();
            // Panel solar flotando sobre la tapa
            translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h + 15])
                comp_panel_solar();
        }

        // Junta flotando
        translate([0, 0, pod_base_h + 20])
            gasket_tpu();
    }

    // 2. CÁPSULA IZQUIERDA (LILYGO + GNSS)
    translate([-70, 0, 0]) {
        // Base rígida semi-transparente
        %color([0.85, 0.85, 0.88], 0.45)
            pod_left_base();

        // Placa LilyGO sobre postes
        translate([8.0, 8.0, 15.0])
            comp_placa_lilygo();

        // Antena GNSS en su cuna sobreelevada
        translate([pod_l - 42.0 + 2.0, pod_w - 42.0 + 2.0, 10.5])
            comp_antena_gnss();

        // Tapa flotando 45 mm arriba
        translate([0, 0, pod_base_h + 45]) {
            %color([0.85, 0.85, 0.88], 0.5)
                pod_left_lid();
            // Panel solar flotando
            translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h + 15])
                comp_panel_solar();
        }

        // Junta flotando
        translate([0, 0, pod_base_h + 20])
            gasket_tpu();
    }
}

presentacion_espacios_internos();
