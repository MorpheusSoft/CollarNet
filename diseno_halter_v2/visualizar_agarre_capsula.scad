// =============================================================================
// VISUALIZADOR PEDAGÓGICO DE ALTA DEFINICIÓN:
// CÓMO AGARRA EL PUENTE DE TPU A LAS CÁPSULAS DE ASA
// =============================================================================

include <collar_halter_v2.scad>

$fn = 40;

// Paleta de colores de alto contraste para pantallas móviles
c_tpu        = [0.22, 0.24, 0.28]; // Goma TPU flexible gris grafito
c_asa_base   = [0.95, 0.45, 0.10]; // ASA naranja alta visibilidad base
c_asa_lid    = [0.88, 0.38, 0.08]; // ASA naranja tapa
c_snap_teeth = [0.00, 0.85, 1.00]; // Cian neón brillante para dientes de click
c_lip        = [1.00, 0.85, 0.00]; // Amarillo neón para labio elástico superior
c_strap      = [0.45, 0.28, 0.15]; // Cuero / cincha marrón ganadera (50 mm)
c_gasket     = [0.10, 0.90, 0.30]; // Junta estanca verde neón IP67
c_arrow      = [0.00, 0.75, 1.00]; // Flecha cian

module arrow_3d(len=25, r_shaft=2.0, r_head=4.8, head_len=8.0) {
    rotate([0, 90, 0]) {
        cylinder(r=r_shaft, h=len - head_len, $fn=20);
        translate([0, 0, len - head_len])
            cylinder(r1=r_head, r2=0.3, h=head_len, $fn=24);
    }
}

// -----------------------------------------------------------------------------
// VISTA 1: ENTRADA DESLIZANTE TIPO FUNDA DE CELULAR (EXPLODED INSERCIÓN)
// -----------------------------------------------------------------------------
module vista_insercion_deslizante() {
    // 1. Bolsillo receptor de TPU (fijo en su posición)
    color(c_tpu)
        tpu_socket();

    // Dientes de traba resaltados en cian dentro de la cuna
    color(c_snap_teeth) {
        translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
            snap_wedge();
        translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
            mirror([0, 1, 0]) snap_wedge();
    }

    // Labio superior elástico resaltado en amarillo neón
    color(c_lip) {
        translate([0, -pod_w/2, pod_base_h - 1.5]) {
            difference() {
                r_box(cradle_depth + 1.0, pod_w, 2.5, pod_r);
                translate([-2, cradle_wall + 1.2, -1])
                    r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
            }
        }
    }

    // 2. Cápsula de ASA desplazada 45 mm hacia afuera en eje X
    desplazamiento_x = 45;

    translate([desplazamiento_x, -pod_w/2, 0]) {
        // Base de la cápsula
        color(c_asa_base)
            pod_right_base();

        // Tapa con panel solar
        translate([0, 0, pod_base_h]) {
            color(c_asa_lid)
                pod_right_lid();
            translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                solar_panel_mockup();
        }

        // Resaltar en cian los 2 alojamientos receptores de click en la cápsula
        color(c_snap_teeth) {
            translate([click_x - 0.5, cradle_wall - 0.2, click_z - click_h/2 - 0.5])
                cube([click_l + 1.0, 0.8, click_h + 1.0]);
            translate([click_x - 0.5, pod_w - cradle_wall - 0.6, click_z - click_h/2 - 0.5])
                cube([click_l + 1.0, 0.8, click_h + 1.0]);
        }
    }

    // 3. Flechas 3D de inserción indicando cómo la cápsula entra al bolsillo
    color(c_arrow) {
        translate([desplazamiento_x - 5, -pod_w/4, pod_base_h / 2])
            rotate([0, 0, 180]) arrow_3d(len=26, r_shaft=2.0, r_head=4.5, head_len=8);
        translate([desplazamiento_x - 5, pod_w/4, pod_base_h / 2])
            rotate([0, 0, 180]) arrow_3d(len=26, r_shaft=2.0, r_head=4.5, head_len=8);
    }

    // 4. Correa ganadera continua pasando por debajo de ambas piezas
    color(c_strap) {
        translate([-20, -strap_width/2, tunnel_t + 0.3])
            cube([cradle_depth + desplazamiento_x + pod_l + 10, strap_width, 3.2]);
    }
}

// -----------------------------------------------------------------------------
// VISTA 2: CORTE LONGITUDINAL AL 50% (MECANISMO DE RETENCIÓN TOTAL)
// -----------------------------------------------------------------------------
module vista_corte_mecanismo() {
    difference() {
        union() {
            // Cuna de TPU
            color(c_tpu)
                tpu_socket();

            // Labio elástico superior en amarillo
            color(c_lip) {
                translate([0, -pod_w/2, pod_base_h - 1.5]) {
                    difference() {
                        r_box(cradle_depth + 1.0, pod_w, 2.5, pod_r);
                        translate([-2, cradle_wall + 1.2, -1])
                            r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
                    }
                }
            }

            // Cápsula totalmente insertada adentro
            translate([0, -pod_w/2, 0]) {
                color(c_asa_base)
                    pod_right_base();
                
                translate([0, 0, pod_base_h]) {
                    color(c_asa_lid)
                        pod_right_lid();
                    translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                        solar_panel_mockup();
                }
            }

            // Diente de click encastrado (resaltado en cian neón)
            color(c_snap_teeth) {
                translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
                    mirror([0, 1, 0]) snap_wedge();
            }

            // Junta de silicona IP67 en el laberinto (verde)
            color(c_gasket) {
                translate([0, -pod_w/2, pod_base_h - u_d + 0.3])
                    gasket_tpu();
            }

            // Cincha pasando por el túnel continuo
            color(c_strap) {
                translate([-25, -strap_width/2, tunnel_t + 0.4])
                    cube([pod_l + 45, strap_width, 3.2]);
            }
        }

        // Plano de corte: eliminamos Y < 0 para mirar por dentro exactamente en el medio
        translate([-40, -pod_w - 10, -15])
            cube([pod_l + 80, pod_w + 10, pod_total_h + 30]);
    }
}

// -----------------------------------------------------------------------------
// VISTA 3: COMPARATIVA FUNDA COMPLETA ENTERIZA VS BOLSILLO FRONTAL DE 35 MM
// -----------------------------------------------------------------------------
module vista_comparativa_funda() {
    // Opción A: Bolsillo frontal de 35 mm (Diseño actual ligero y desmontable)
    translate([0, -50, 0]) {
        color(c_tpu) tpu_socket();
        translate([0, -pod_w/2, 0]) {
            color(c_asa_base) pod_right_base();
            translate([0, 0, pod_base_h]) {
                color(c_asa_lid) pod_right_lid();
                translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                    solar_panel_mockup();
            }
        }
        // Correa
        color(c_strap)
            translate([-15, -strap_width/2, tunnel_t + 0.3])
                cube([pod_l + 30, strap_width, 3.2]);
    }

    // Opción B: Funda completa enteriza que recubre toda la cápsula (126 mm)
    translate([0, 50, 0]) {
        color(c_tpu) {
            difference() {
                translate([0, -pod_w/2 - cradle_wall, -cradle_floor])
                    r_box(pod_l + 2.0, pod_w + 2*cradle_wall, pod_total_h + cradle_floor + 1.5, pod_r + 1.5);
                translate([-1.0, -pod_w/2, 0])
                    r_box(pod_l + 5.0, pod_w, pod_total_h + 0.5, pod_r);
                // Ventana superior para insolación del panel solar
                translate([12, -solar_w/2, pod_total_h - 2])
                    r_box(solar_l + 12, solar_w, 10, 3.0);
                // Túnel pasacorreas continuo
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
        // Correa
        color(c_strap)
            translate([-15, -strap_width/2, tunnel_t + 0.3])
                cube([pod_l + 30, strap_width, 3.2]);
    }
}

// -----------------------------------------------------------------------------
// VISTA 4: COLLAR COMPLETO MONTADO EN PERSPECTIVA
// -----------------------------------------------------------------------------
module vista_collar_completo() {
    full_assembly();
}

// Selector
vista = "insercion"; // [insercion, corte, comparativa, collar_completo]

if (vista == "insercion") {
    vista_insercion_deslizante();
} else if (vista == "corte") {
    vista_corte_mecanismo();
} else if (vista == "comparativa") {
    vista_comparativa_funda();
} else if (vista == "collar_completo") {
    vista_collar_completo();
}
