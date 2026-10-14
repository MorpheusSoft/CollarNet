// =============================================================================
// VISTA EXPLOSIONADA DE LA CÁPSULA CLAMSHELL SNAP-FIT IP67 (3 PIEZAS TIPO CELULAR)
// =============================================================================
include <collar_halter_v2.scad>

$fn = 36;

module single_pod_clamshell_exploded(side="right") {
    explode_lid = 35.0;
    explode_gasket = 16.0;
    explode_solar = 18.0;

    if (side == "right") {
        // 1. BASE DERECHA (BATERÍA + MPPT + BUZZER)
        pod_right_base();

        // 2. JUNTA TÓRICA ELASTOMÉRICA IP67
        translate([0, 0, pod_base_h + explode_gasket])
            gasket_tpu();

        // 3. TAPA CON CLIPS PERIMETRALES SNAP-FIT
        translate([0, 0, pod_base_h + explode_lid]) {
            pod_right_lid();
            
            // 4. PANEL SOLAR FLOTANDO
            translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h + explode_solar])
                solar_panel_mockup();
        }

        // Guías de ensamble verticales
        color([0.2, 0.8, 1.0], 0.8) {
            for (cx = clip_x_positions) {
                // Guía lateral Y=0
                translate([cx, 0.5, pod_base_h - 2])
                    cylinder(r=0.6, h=explode_lid + 4, $fn=16);
                // Guía lateral Y=pod_w
                translate([cx, pod_w - 0.5, pod_base_h - 2])
                    cylinder(r=0.6, h=explode_lid + 4, $fn=16);
            }
            // Guía trasera
            translate([pod_l - 0.5, clip_y_end, pod_base_h - 2])
                cylinder(r=0.6, h=explode_lid + 4, $fn=16);
        }
    } else {
        // Base Izquierda
        pod_left_base();
        translate([0, 0, pod_base_h + explode_gasket]) gasket_tpu();
        translate([0, 0, pod_base_h + explode_lid]) {
            pod_left_lid();
            translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h + explode_solar])
                solar_panel_mockup();
        }
    }
}

single_pod_clamshell_exploded("right");
