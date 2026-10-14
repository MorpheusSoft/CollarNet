// =============================================================================
// GENERADOR DE RENDERS DE AGARRE: PUENTE TPU A CÁPSULAS ASA
// =============================================================================

include <collar_halter_v2.scad>

$fn = 40;

// Paleta de colores didácticos de alto contraste
c_tpu        = [0.22, 0.24, 0.28]; // Goma TPU flexible grafito
c_bridge     = [0.20, 0.22, 0.25]; // Arco del puente TPU
c_asa_base   = [0.95, 0.45, 0.10]; // ASA naranja base
c_asa_lid    = [0.88, 0.38, 0.08]; // ASA naranja tapa
c_snap_teeth = [0.00, 0.90, 1.00]; // Cian neón brillante para dientes de click
c_lip        = [1.00, 0.85, 0.00]; // Amarillo vibrante para labio elástico superior
c_strap      = [0.45, 0.28, 0.15]; // Cuero ganadero marrón
c_arrow      = [0.00, 0.75, 1.00]; // Flecha cian

module arrow_3d(len=26, r_shaft=2.0, r_head=4.8, head_len=8.0) {
    rotate([0, 90, 0]) {
        cylinder(r=r_shaft, h=len - head_len, $fn=20);
        translate([0, 0, len - head_len])
            cylinder(r1=r_head, r2=0.3, h=head_len, $fn=24);
    }
}

// -----------------------------------------------------------------------------
// VISTA 1: INSERCIÓN PASO A PASO CON PUENTE DORSAL VISIBLE
// -----------------------------------------------------------------------------
module render_insercion() {
    // Extensión del puente dorsal hacia la izquierda (curvándose)
    color(c_bridge) {
        translate([-40, -pod_w/2 + cradle_wall, 0]) {
            hull() {
                translate([0, 0, 0]) r_box(15, pod_w - 2*cradle_wall, pod_base_h, pod_r);
                translate([25, 0, 0]) r_box(15, pod_w - 2*cradle_wall, pod_base_h, pod_r);
            }
        }
    }

    // Cuna receptora de TPU fija a la izquierda
    color(c_tpu)
        tpu_socket();

    // Dientes de traba resaltados en cian neón dentro de la cuna
    color(c_snap_teeth) {
        translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
            snap_wedge();
        translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
            mirror([0, 1, 0]) snap_wedge();
    }

    // Labio elástico superior en amarillo neón
    color(c_lip) {
        translate([0, -pod_w/2, pod_base_h - 1.5]) {
            difference() {
                r_box(cradle_depth + 1.0, pod_w, 2.5, pod_r);
                translate([-2, cradle_wall + 1.2, -1])
                    r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
            }
        }
    }

    // Cápsula ASA desplazada 60 mm en eje X entrando a la cuna
    desp_x = 60;
    translate([desp_x, -pod_w/2, 0]) {
        color(c_asa_base) pod_right_base();
        translate([0, 0, pod_base_h]) {
            color(c_asa_lid) pod_right_lid();
            translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                solar_panel_mockup();
        }

        // Alojamientos receptores de click resaltados en cian
        color(c_snap_teeth) {
            translate([click_x - 0.5, cradle_wall - 0.2, click_z - click_h/2 - 0.5])
                cube([click_l + 1.0, 0.8, click_h + 1.0]);
            translate([click_x - 0.5, pod_w - cradle_wall - 0.6, click_z - click_h/2 - 0.5])
                cube([click_l + 1.0, 0.8, click_h + 1.0]);
        }
    }

    // Flechas de inserción mostrando la dirección de deslizamiento
    color(c_arrow) {
        translate([desp_x - 8, -pod_w/4, pod_base_h / 2])
            rotate([0, 0, 180]) arrow_3d(len=32, r_shaft=2.4, r_head=5.5, head_len=9);
        translate([desp_x - 8, pod_w/4, pod_base_h / 2])
            rotate([0, 0, 180]) arrow_3d(len=32, r_shaft=2.4, r_head=5.5, head_len=9);
    }

    // Cincha ganadera continua pasando por el túnel inferior
    color(c_strap) {
        translate([-45, -strap_width/2, tunnel_t + 0.3])
            cube([cradle_depth + desp_x + pod_l + 25, strap_width, 3.2]);
    }
}

// -----------------------------------------------------------------------------
// VISTA 2: BOCA DEL BOLSILLO TPU (MIRANDO AL INTERIOR DE LA CUNA)
// -----------------------------------------------------------------------------
module render_boca_socket() {
    // Extensión del puente curvo en la parte trasera
    color(c_bridge) {
        translate([-35, -pod_w/2 + cradle_wall, 0])
            r_box(35, pod_w - 2*cradle_wall, pod_base_h, pod_r);
    }

    // TPU gris oscuro
    color(c_tpu)
        tpu_socket();

    // Dientes de traba resaltados en cian brillante a ambos lados
    color(c_snap_teeth) {
        translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
            snap_wedge();
        translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
            mirror([0, 1, 0]) snap_wedge();
    }

    // Labio superior en amarillo neón envolviendo la boca
    color(c_lip) {
        translate([0, -pod_w/2, pod_base_h - 1.5]) {
            difference() {
                r_box(cradle_depth + 1.0, pod_w, 2.5, pod_r);
                translate([-2, cradle_wall + 1.2, -1])
                    r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
            }
        }
    }
}

// -----------------------------------------------------------------------------
// VISTA 3: COLLAR COMPLETO MONTADO EN PERSPECTIVA
// -----------------------------------------------------------------------------
module render_collar_completo() {
    full_assembly();
}

// -----------------------------------------------------------------------------
// VISTA 4: COMPARATIVA BOLSILLO 35 MM VS FUNDA COMPLETA 126 MM
// -----------------------------------------------------------------------------
module render_comparativa() {
    // Opción A: Bolsillo frontal 35 mm (cuna)
    translate([0, -55, 0]) {
        color(c_tpu) tpu_socket();
        translate([0, -pod_w/2, 0]) {
            color(c_asa_base) pod_right_base();
            translate([0, 0, pod_base_h]) {
                color(c_asa_lid) pod_right_lid();
                translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                    solar_panel_mockup();
            }
        }
        color(c_strap)
            translate([-15, -strap_width/2, tunnel_t + 0.3])
                cube([pod_l + 30, strap_width, 3.2]);
    }

    // Opción B: Funda completa tipo guante (126 mm)
    translate([0, 55, 0]) {
        color(c_tpu) {
            difference() {
                translate([0, -pod_w/2 - cradle_wall, -cradle_floor])
                    r_box(pod_l + 2.0, pod_w + 2*cradle_wall, pod_total_h + cradle_floor + 1.5, pod_r + 1.5);
                translate([-1.0, -pod_w/2, 0])
                    r_box(pod_l + 5.0, pod_w, pod_total_h + 0.5, pod_r);
                translate([12, -solar_w/2, pod_total_h - 2])
                    r_box(solar_l + 12, solar_w, 10, 3.0);
                translate([-5, -strap_slot_w/2, tunnel_t])
                    cube([pod_l + 15, strap_slot_w, strap_slot_h]);
            }
        }
        translate([0, -pod_w/2, 0]) {
            color(c_asa_base) pod_right_base();
            translate([0, 0, pod_base_h]) {
                color(c_asa_lid) pod_right_lid();
                translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                    solar_panel_mockup();
            }
        }
        color(c_strap)
            translate([-15, -strap_width/2, tunnel_t + 0.3])
                cube([pod_l + 30, strap_width, 3.2]);
    }
}

// Selector
vista_r = "insercion"; // [insercion, boca_socket, collar_completo, comparativa]

if (vista_r == "insercion") {
    render_insercion();
} else if (vista_r == "boca_socket") {
    render_boca_socket();
} else if (vista_r == "collar_completo") {
    render_collar_completo();
} else if (vista_r == "comparativa") {
    render_comparativa();
}
