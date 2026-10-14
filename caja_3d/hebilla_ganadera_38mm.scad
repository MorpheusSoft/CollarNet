// =============================================================================
// SISTEMA DE SUJECION GANADERA DE ALTA RESISTENCIA (38 mm)
// Hebilla Tri-Glide Autoblocante + Trabilla Pasador de Cinta
// Proyecto: CollarNet / CowAI
// 
// Disenado para cincha de nylon ganadera de 38 mm (grosor 2.5 - 3.2 mm).
// Pieza monolitica sin partes moviles, resistente a tirones, intemperie y golpes.
// Se imprime 100% plana en la cama SIN SOPORTES (Zero Support).
// =============================================================================

$fn = 64;

// Selecciona que pieza renderizar:
// "hebilla"  -> Solo hebilla tensora autoblocante (para exportar STL)
// "trabilla" -> Solo trabilla / pasador de retencion (para exportar STL)
// "ambos"    -> Conjunto completo en la cama para previsualizacion
modo = "hebilla";

// --- PARAMETROS DE LA HEBILLA ---
cinta_ancho      = 38.0;   // Ancho nominal de la cinta
slot_w           = 40.5;   // Ancho de ranura (holgura 1.25mm por lado)
slot_l           = 6.5;    // Longitud/luz de paso de cada ranura (admite doble capa)
buckle_t         = 7.0;    // Espesor/grosor Z de la hebilla (ultra-robusto)

bar_end_w        = 7.5;    // Ancho de las barras de los extremos
bar_center_w     = 9.5;    // Ancho de la barra central de traccion
rail_side_w      = 7.5;    // Ancho de los rieles laterales
corner_r         = 5.0;    // Radio exterior de las esquinas
slot_r           = 2.2;    // Radio interno de las ranuras

// Dimensiones totales calculadas
total_w = slot_w + 2 * rail_side_w;                   // 55.5 mm
total_l = 2 * bar_end_w + bar_center_w + 2 * slot_l; // 37.5 mm

// Centros Y de ranuras
y_c1 = -(bar_center_w / 2 + slot_l / 2);
y_c2 =  (bar_center_w / 2 + slot_l / 2);

// --- PARAMETROS DE LA TRABILLA (KEEPER LOOP) ---
trabilla_slot_w  = 40.0;   // Ancho interior para cinta de 38 mm
trabilla_slot_h  = 6.2;    // Altura interior para 2 capas de cinta (2x 2.8mm)
trabilla_wall    = 3.5;    // Grosor de pared
trabilla_length  = 12.0;   // Ancho de la anilla a lo largo de la cinta
trabilla_r       = 3.0;    // Radio exterior

module rounded_rect(w, l, r) {
    hull() {
        translate([-w/2 + r, -l/2 + r]) circle(r = r);
        translate([ w/2 - r, -l/2 + r]) circle(r = r);
        translate([-w/2 + r,  l/2 - r]) circle(r = r);
        translate([ w/2 - r,  l/2 - r]) circle(r = r);
    }
}

// =============================================================================
// MODULO: HEBILLA AUTOBLOCANTE TRI-GLIDE
// =============================================================================
module hebilla_38mm() {
    difference() {
        // 1. Cuerpo principal extruido
        linear_extrude(height = buckle_t)
            rounded_rect(total_w, total_l, corner_r);

        // 2. Ranura 1 (Pasador frontal)
        translate([0, y_c1, -1])
            linear_extrude(height = buckle_t + 2)
                rounded_rect(slot_w, slot_l, slot_r);

        // 3. Ranura 2 (Pasador trasero)
        translate([0, y_c2, -1])
            linear_extrude(height = buckle_t + 2)
                rounded_rect(slot_w, slot_l, slot_r);

        // 4. Chaflanes suaves en bocas de ranuras (entrada/salida cinta)
        for (y_slot = [y_c1, y_c2]) {
            // Bisel superior en ranura
            translate([0, y_slot, buckle_t - 1.2])
                hull() {
                    translate([0, 0, 1.25])
                        linear_extrude(height = 0.1)
                            rounded_rect(slot_w + 2.4, slot_l + 2.4, slot_r + 1.2);
                    translate([0, 0, 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(slot_w, slot_l, slot_r);
                }
            // Bisel inferior en ranura
            translate([0, y_slot, -0.05])
                hull() {
                    translate([0, 0, 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(slot_w + 2.4, slot_l + 2.4, slot_r + 1.2);
                    translate([0, 0, 1.25])
                        linear_extrude(height = 0.1)
                            rounded_rect(slot_w, slot_l, slot_r);
                }
        }

        // 5. Bisel perimetrico exterior superior (evita aristas vivas)
        difference() {
            translate([-total_w/2 - 2, -total_l/2 - 2, buckle_t - 1.2])
                cube([total_w + 4, total_l + 4, 3]);
            translate([0, 0, buckle_t - 1.25])
                hull() {
                    translate([0, 0, 1.3])
                        linear_extrude(height = 0.1)
                            rounded_rect(total_w - 2.4, total_l - 2.4, corner_r - 1.2);
                    translate([0, 0, 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(total_w, total_l, corner_r);
                }
        }

        // 6. Bisel perimetrico exterior inferior (evita pie de elefante y contacto aspero con el cuello)
        difference() {
            translate([-total_w/2 - 2, -total_l/2 - 2, -1])
                cube([total_w + 4, total_l + 4, 2.0]);
            translate([0, 0, -0.05])
                hull() {
                    translate([0, 0, 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(total_w - 2.0, total_l - 2.0, corner_r - 1.0);
                    translate([0, 0, 1.1])
                        linear_extrude(height = 0.1)
                            rounded_rect(total_w, total_l, corner_r);
                }
        }

        // 7. Textos grabados en bajorrelieve (0.4 mm de profundidad = 2 capas de 0.2mm)
        translate([-total_w/2 + 3.8, 0, buckle_t - 0.4])
            rotate([0, 0, 90])
                linear_extrude(height = 0.6)
                    text("COWAI", size = 4.2, font = "Liberation Sans:style=Bold", halign = "center", valign = "center");

        translate([total_w/2 - 3.8, 0, buckle_t - 0.4])
            rotate([0, 0, -90])
                linear_extrude(height = 0.6)
                    text("38 mm", size = 4.0, font = "Liberation Sans:style=Bold", halign = "center", valign = "center");
    }

    // 8. Dientes de traccion antideslizante en la barra central
    // Angulo a 45 grados (100% imprimible sin soportes)
    num_teeth = 4;
    pitch = 2.0;
    for (i = [0 : num_teeth - 1]) {
        y_t = -(num_teeth - 1) * pitch / 2 + i * pitch;
        translate([-slot_w/2 + 1.5, y_t, buckle_t])
            rotate([0, 90, 0])
                linear_extrude(height = slot_w - 3)
                    polygon(points=[[-0.9, 0], [0.9, 0], [0, 1.0]]);
    }
}

// =============================================================================
// MODULO: TRABILLA / PASADOR DE RETENCION DE COLA DE CINTA (KEEPER)
// =============================================================================
module trabilla_38mm() {
    tw = trabilla_slot_w + 2 * trabilla_wall;
    th = trabilla_slot_h + 2 * trabilla_wall;

    difference() {
        // Anillo exterior con esquinas redondeadas
        linear_extrude(height = trabilla_length)
            rounded_rect(tw, th, trabilla_r);

        // Ranura interior para 2 cintas
        translate([0, 0, -1])
            linear_extrude(height = trabilla_length + 2)
                rounded_rect(trabilla_slot_w, trabilla_slot_h, 1.5);

        // Bisel de entrada y salida
        for (z_pos = [0, trabilla_length]) {
            translate([0, 0, z_pos == 0 ? -0.1 : trabilla_length - 0.9])
                hull() {
                    translate([0, 0, z_pos == 0 ? 0 : 1.0])
                        linear_extrude(height = 0.1)
                            rounded_rect(trabilla_slot_w + 1.6, trabilla_slot_h + 1.6, 2.0);
                    translate([0, 0, z_pos == 0 ? 1.0 : 0])
                        linear_extrude(height = 0.1)
                            rounded_rect(trabilla_slot_w, trabilla_slot_h, 1.5);
                }
        }
    }
}

// =============================================================================
// DISPOSICION EN ESCENA
// =============================================================================
if (modo == "hebilla") {
    color([0.15, 0.52, 0.88]) // Azul PETG
        hebilla_38mm();
} else if (modo == "trabilla") {
    color([0.2, 0.75, 0.4]) // Verde PETG
        trabilla_38mm();
} else if (modo == "ambos") {
    translate([0, -10, 0])
        color([0.15, 0.52, 0.88])
            hebilla_38mm();

    translate([0, 32, 0])
        color([0.2, 0.75, 0.4])
            trabilla_38mm();
}
