// =============================================================================
// VISTA EXPLOSIONADA PEDAGÓGICA DE ENSAMBLE - COLLAR GANADERO COWAI V2
// =============================================================================
include <collar_halter_v2.scad>

$fn = 36;

module exploded_collar_assembly() {
    // 1. PUENTE DORSAL TPU CON CUNAS EN SU LUGAR
    dorsal_bridge();

    ang = bridge_half_ang; // 32°
    x_j = bridge_r_inner * sin(ang);
    z_j = bridge_r_inner * cos(ang);

    // 2. CÁPSULA DERECHA (LADO EXPLOSIONADO PARA MOSTRAR EL ENSAMBLE SIN TORNILLOS)
    // Separamos la cápsula hacia afuera a lo largo de su eje X por 65 mm
    explode_x = 65.0; 
    explode_lid_z = 32.0;

    translate([x_j, 0, z_j]) {
        rotate([0, ang, 0]) {
            // A. Base rígida de ASA desplazada hacia afuera (con muescas de click visibles)
            translate([explode_x, -pod_w/2, 0]) {
                pod_right_base();

                // B. Tapa Solar elevada para mostrar que va atornillada encima de forma independiente
                translate([0, 0, pod_base_h + explode_lid_z]) {
                    pod_right_lid();
                    translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                        solar_panel_mockup();
                }

                // C. Junta elástica TPU flotando entre base y tapa
                translate([0, 0, pod_base_h + explode_lid_z * 0.4])
                    gasket_tpu();
            }

            // D. Guías visuales de deslizamiento hacia el bolsillo de TPU
            color([0.2, 0.7, 1.0], 0.8) {
                // Eje central de deslizamiento
                translate([cradle_depth, 0, click_z])
                    rotate([0, 90, 0]) cylinder(r=0.8, h=explode_x - cradle_depth, $fn=16);

                // Flechas de inserción lateral alineadas con los dientes de click
                for (dy = [-pod_w/2 + cradle_wall, pod_w/2 - cradle_wall]) {
                    translate([cradle_depth + 3, dy, click_z])
                        rotate([0, 90, 0]) cylinder(r1=1.8, r2=0.4, h=10, $fn=16);
                }
            }
        }
    }

    // 3. CÁPSULA IZQUIERDA (ENSAMBLADA EN SU POSICIÓN FINAL PARA COMPARAR)
    mirror([1, 0, 0]) {
        translate([x_j, 0, z_j]) {
            rotate([0, ang, 0]) {
                translate([0, -pod_w/2, 0]) {
                    pod_left_base();
                    translate([0, 0, pod_base_h]) {
                        pod_left_lid();
                        translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t + 0.2])
                            solar_panel_mockup();
                    }
                }
            }
        }
    }

    // 4. CINCHA GANADERA PASANTE
    color(col_strap, 0.6) {
        mirror([1, 0, 0])
            translate([x_j, 0, z_j])
                rotate([0, ang, 0])
                    translate([-10, -strap_width/2, tunnel_t + 0.5])
                        cube([pod_l + 30, strap_width, 3.5]);
    }
}

exploded_collar_assembly();
