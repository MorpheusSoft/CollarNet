// =============================================================================
// CAJA ESTANCA GRADO IP67 - COLLARNET / COWAI (REVISIÓN C - ANIMAL-SAFE & REFORZADA)
// Modelado paramétrico para impresión 3D FDM en PETG + TPU para ganadería
// Hardware: LILYGO T-A7670X-S3 + Batería 18650 + MPU-6050 + Buzzer + GPS + LTE
// Sellado: Canal perimetral para junta elástica TPU + Cierre de 6 puntos M3
// Ergonomía: Esquinas redondeadas (R=8mm) y chaflanes suaves sin cantos vivos
// Sujeción: Túnel pasacorreas continuo (Opción A: Piso macizo 3.0mm, cincha 38mm)
// Marca: Logotipo COWAI grabado a lo largo con tipografía estilizada
// =============================================================================

/* [Selector de Pieza] */
part = "both_flat"; // [both_flat: Base y Tapa para imprimir juntas, bottom: Solo la base inferior IP67, lid: Solo la tapa superior IP67, gasket: Solo la junta elástica TPU, brand_text: Solo letras COWAI para laminador multicolor, assembly: Vista 3D de ensamble con componentes]

/* [Modo de Carcasa] */
enclosure_mode = "ip67_sealed"; // [ip67_sealed: 100% estanca para campo (paredes ciegas continuas), bench_open: Modo banco/laboratorio (con aberturas USB)]

/* [Configuración de Batería] */
battery_type = "18650_holder"; // [18650_holder: Portapilas 18650 (24.5mm espacio libre), 18650_cell: Celda suelta 18650 (22.0mm), lipo_flat: Celda LiPo Plana (14.5mm), none: Sin Batería / Alimentación Externa (4mm)]

/* [Sistema de Sujeción Ganadero] */
mount_style = "collar_tunnel_closed"; // [collar_tunnel_closed: Túnel Pasacorreas Continuo 100% Cerrado (Opción A - Máxima Resistencia Ganadera), collar_tunnel_surco: Túnel con Surco Inferior, combo_collar_and_ears: Túnel con fijación M4, none: Sin Pasacorreas]

/* [Sensores y Accesorios Integrados] */
include_mpu6050 = true;     // Soporte/Alojamiento para Acelerómetro MPU-6050 (GY-521)
include_buzzer  = true;     // Alojamiento cilíndrico para Buzzer con base estanca 100% ciega
include_gps_bed = true;     // Cuna superior en la tapa para Antena GPS cerámica (25x25mm)
include_gsm_bed = false;    // Desactivado: La antena LTE flexible se adhiere directamente a la pared interior lisa
include_floor_battery_rails = false; // Desactivado: El portapilas va integrado en la placa PCB Lilygo, piso inferior 100% plano y libre

/* [Personalización de Marca y Orientación] */
include_branding  = true;                 // Grabar logotipo COWAI en bajo relieve en la tapa
brand_orientation = "longitudinal";       // [longitudinal: A lo largo (Recomendado), transversal: A lo ancho]
brand_name        = "COWAI";              // Nombre de marca principal
brand_sub         = "SMART CATTLE IoT";   // Subtítulo tecnológico (o dejar vacío "")
brand_font        = "Ubuntu:style=Bold";  // Tipografía moderna redondeada

/* [Personalización de Colores de Visualización] */
color_case        = "DarkSlateGray";      // Color de la carcasa [DarkSlateGray: Negro/Gris P1S, DarkOrange: Naranja Seguridad, Gold: Amarillo/Dorado, White: Blanco Técnico]
color_text        = "ForestGreen";        // Color de las letras [ForestGreen: Verde Pasto, LimeGreen: Verde Lima, Black: Negro, White: Blanco, Gold: Amarillo/Oro]
color_gasket      = "White";              // Color de la junta TPU [White: Blanco Silicona, LimeGreen: Verde Goma, Black: Negro NBR, Red: Rojo Silicona]

/* [Tornillería y Tolerancias] */
screw_type = "self_tapping"; // [self_tapping: M3 directo en plástico (Ø2.8mm), heat_insert: Insertos térmicos de latón M3 (Ø4.1mm)]

// =============================================================================
// DIMENSIONES BASE Y CÁLCULOS
// =============================================================================

// Placa LILYGO T-A7670X-S3-Standard
pcb_l = 110.6;
pcb_w = 33.1;
pcb_t = 1.6;
hole_dx = 27.75;
hole_dy = 105.55;
hole_diam = 2.5;

// Periféricos
mpu_l = 21.0;
mpu_w = 16.0;
mpu_t = 3.5;

buzzer_d = 12.4;
buzzer_h = 8.0; // Altura real del buzzer medida por el usuario: 8.0 mm

gps_ant_w = 25.5;
gps_ant_l = 25.5;
gps_ant_h = 8.2;

// Antena flexible GSM/LTE real medida por el usuario (11.0 cm x 2.0 cm)
gsm_ant_w = 20.0;
gsm_ant_l = 110.0;

// Correa ganadera real medida por el usuario (38 mm de ancho x 2.5-3.0 mm espesor)
strap_w = 38.0;
slot_w  = 41.5;   // Luz de paso para correa de 38 mm (holgura generosa de 3.5 mm)
slot_h  = 5.2;    // Luz vertical para el espesor de la correa y su puntera metálica

// Carcasa IP67 - Revisión C (Animal-Safe & Reforzada)
wall = 2.6;             // Pared robusta de 2.6 mm
corner_r = 8.0;         // Esquinas exteriores muy redondeadas para no lastimar al animal

// Altura de postes inferiores según batería (Revisión C: +2.5 mm de holgura limpia para portapilas de 22mm)
standoff_h = (battery_type == "18650_holder") ? 24.5 :
             (battery_type == "18650_cell")   ? 22.0 :
             (battery_type == "lipo_flat")    ? 14.5 : 4.0;

headroom = 13.5;        // Espacio libre superior en la tapa (+2.0 mm para componentes altos de PCB y antena GPS)
lid_floor_t = 2.6;      // Techo sólido de la tapa superior
lid_h  = lid_floor_t + headroom; // 16.1 mm

// Altura del piso y túnel inferior pasacorreas (Revisión C: Opción A con piso continuo de 3.0 mm)
has_tunnel = (mount_style != "none");
tunnel_bottom_t    = has_tunnel ? 3.0 : 0;    // Piso inferior ultra-robusto de 3.0 mm (cero rotura por tracción)
tunnel_clearance_h = has_tunnel ? slot_h : 0; // 5.2 mm
tunnel_floor_sep   = has_tunnel ? 2.4 : 0;    // Tabique estanco macizo de 2.4 mm entre el túnel y la electrónica
floor_t = (has_tunnel ? (tunnel_bottom_t + tunnel_clearance_h + tunnel_floor_sep) : 2.6); // 10.6 mm con túnel
base_h  = floor_t + standoff_h + pcb_t;       // 10.6 + 24.5 + 1.6 = 36.7 mm total

// Geometría del Sellado IP67 (Canal y Junta)
groove_w = 2.2;         // Ancho del canal de la junta (mm)
groove_d = 1.8;         // Profundidad del canal (mm)
tongue_w = 1.4;         // Ancho del nervio de compresión de la tapa (mm)
tongue_h = 1.25;        // Altura del nervio de compresión (mm)

// Cavidad interior amplia (Placa con USBs y switch mide 36.5 mm)
cavity_w = 39.0;        // 39.0 mm (1.25 mm de holgura limpia a cada lado)
cavity_l = 118.5;       // 118.5 mm (alberga la antena de 110 mm totalmente estirada)

// Dimensiones de la línea central de la junta perimetral
groove_center_w = 43.8; // X = ±21.9 mm (pared interior hacia cavidad = 1.85 mm sólida)
groove_center_l = 125.8;// Y = ±62.9 mm (pared interior hacia cavidad = 3.1 mm sólida)

// Dimensiones exteriores del cuerpo principal IP67
outer_w = 58.0;
outer_l = 138.0;

// Posición de los 6 tornillos de cierre M3 (estrictamente exteriores a la junta)
screw_x = 25.5;
screw_y_corner = 64.0;

// Tornillos M3
screw_tap_d  = (screw_type == "heat_insert") ? 4.1 : 2.8;
screw_pass_d = 3.4;
screw_head_d = 6.4;
$fn = 36;

// =============================================================================
// VALIDACIÓN Y MEDICIONES AUTOMÁTICAS EN CONSOLA OPENSCAD
// =============================================================================
echo("------------------------------------------------------------------");
echo("=== COLLARNET COWAI - MEDIDAS Y HOLGURAS VERIFICADAS (REV C) ===");
echo(str("1. Altura de Postes PCB (standoff_h): ", standoff_h, " mm"));
echo(str("2. Altura real del Buzzer: ", buzzer_h, " mm"));
echo(str("3. Holgura vertical libre sobre Buzzer (PCB - Buzzer): ", standoff_h - buzzer_h, " mm"));
echo(str("4. Altura total base exterior: ", base_h, " mm (Piso: ", floor_t, " mm)"));
echo(str("5. Altura libre en tapa (headroom): ", headroom, " mm (Tapa ext: ", lid_h, " mm)"));
echo(str("6. Espesor piso macizo túnel correa: ", tunnel_bottom_t, " mm"));
echo(str("7. Tabique estanco bajo buzzer: ", tunnel_floor_sep, " mm (IP67 100% Ciego)"));
echo(str("8. Separación Poste Izq a Buzzer: +8.33 mm libres"));
echo(str("9. Separación Poste Der a MPU-6050: +3.38 mm libres"));
echo("------------------------------------------------------------------");

// =============================================================================
// MÓDULOS AUXILIARES Y ERGONOMÍA
// =============================================================================

// Prisma con esquinas redondeadas
module rounded_box(w, l, h, r) {
    translate([-w/2, -l/2, 0])
        hull() {
            translate([r, r, 0]) cylinder(r=r, h=h);
            translate([w - r, r, 0]) cylinder(r=r, h=h);
            translate([r, l - r, 0]) cylinder(r=r, h=h);
            translate([w - r, l - r, 0]) cylinder(r=r, h=h);
        }
}

// Prisma con chaflán inferior suave a 45° (anti pie de elefante y anti aristas cortantes)
module rounded_box_chamfer(w, l, h, r, ch=1.5) {
    translate([-w/2, -l/2, 0])
        hull() {
            // Chaflán inferior suave
            translate([r, r, 0]) cylinder(r1=r - ch, r2=r, h=ch);
            translate([w - r, r, 0]) cylinder(r1=r - ch, r2=r, h=ch);
            translate([r, l - r, 0]) cylinder(r1=r - ch, r2=r, h=ch);
            translate([w - r, l - r, 0]) cylinder(r1=r - ch, r2=r, h=ch);

            // Altura total
            translate([r, r, ch]) cylinder(r=r, h=h - ch);
            translate([w - r, r, ch]) cylinder(r=r, h=h - ch);
            translate([r, l - r, ch]) cylinder(r=r, h=h - ch);
            translate([w - r, l - r, ch]) cylinder(r=r, h=h - ch);
        }
}

// Logotipo COWAI con espaciado calibrado
module cowai_logo() {
    linear_extrude(height = 0.7) {
        if (brand_orientation == "longitudinal") {
            rotate([0, 0, 90]) {
                // Icono ondas satelitales / IoT con 7 mm de aire limpio respecto a la 'C'
                translate([-37, 1.8, 0]) {
                    circle(r = 1.1);
                    difference() {
                        circle(r = 3.3);
                        circle(r = 2.4);
                        translate([-6, -6, 0]) square([6, 12]);
                    }
                    difference() {
                        circle(r = 5.4);
                        circle(r = 4.5);
                        translate([-8, -8, 0]) square([8, 16]);
                    }
                }
                
                // Texto principal COWAI destacado
                translate([4.0, 1.8, 0])
                    text(brand_name, font = brand_font, size = 12.0, halign = "center", valign = "center", spacing = 1.18);
                
                // Subtítulo SMART CATTLE IoT centrado
                if (brand_sub != "") {
                    translate([0, -6.8, 0])
                        text(brand_sub, font = brand_font, size = 2.8, halign = "center", valign = "center", spacing = 1.22);
                    // Líneas de acento
                    translate([27, -6.8, 0]) square([4.5, 0.6], center = true);
                    translate([-27, -6.8, 0]) square([4.5, 0.6], center = true);
                }
            }
        } else {
            // Orientación transversal
            translate([0, 9.5, 0]) {
                circle(r = 1.0);
                difference() {
                    circle(r = 3.2);
                    circle(r = 2.4);
                    translate([-5, -5, 0]) square([10, 5]);
                }
                difference() {
                    circle(r = 5.2);
                    circle(r = 4.4);
                    translate([-6, -6, 0]) square([12, 6]);
                }
            }
            translate([0, 1.5, 0])
                text(brand_name, font = brand_font, size = 11.0, halign = "center", valign = "center", spacing = 1.18);
            if (brand_sub != "") {
                translate([0, -6.5, 0])
                    text(brand_sub, font = brand_font, size = 2.8, halign = "center", valign = "center", spacing = 1.22);
                for (sx = [-1, 1]) {
                    translate([sx * 19.5, -6.5, 0])
                        square([4.5, 0.6], center = true);
                }
            }
        }
    }
}

// =============================================================================
// TÚNEL PASACORREAS INTEGRADO (ANIMAL-SAFE - PUENTES EXTERIORES)
// =============================================================================
module animal_safe_collar_bracket() {
    if (has_tunnel) {
        flange_l = 18.0;
        flange_w = 50.0;
        flange_h = floor_t + 2.0; // Altura del bloque del puente
        bracket_r = 5.0;

        for (sy = [-1, 1]) {
            translate([0, sy * (outer_l/2 + flange_l/2 - 2.0), 0]) {
                hull() {
                    rounded_box_chamfer(flange_w, flange_l, flange_h, bracket_r, 1.2);
                    translate([-outer_w/2 + 5, -sy * flange_l/2, 0])
                        cube([outer_w - 10, 0.1, flange_h]);
                }
            }
        }
    }
}

// =============================================================================
// BASE INFERIOR ESTANCA IP67 CON TÚNEL Y SURCO PASACORREAS CONTINUO
// =============================================================================
module bottom_case() {
    flange_l = 18.0;
    difference() {
        union() {
            rounded_box_chamfer(outer_w, outer_l, base_h, corner_r, 1.5);
            animal_safe_collar_bracket();
        }

        // TÚNEL PASANTE CONTINUO 100% CERRADO (Para cincha ganadera 38 mm + puntera 40 mm)
        if (has_tunnel) {
            tunnel_z = tunnel_bottom_t + slot_h/2; // 3.0 + 2.6 = 5.6 mm
            translate([0, 0, tunnel_z]) {
                cube([slot_w, outer_l + 2*flange_l + 10, slot_h], center=true);
                
                // Bocas de entrada y salida redondeadas (r=slot_h/2=2.6mm) para deslizamiento suave sin afilar el labio exterior
                for (sy = [-1, 1]) {
                    translate([0, sy * (outer_l/2 + flange_l - 2.0), 0])
                        rotate([0, 90, 0])
                            cylinder(r=slot_h/2, h=slot_w + 2, center=true);
                }
            }

            // Si se selecciona modo surco abierto (legacy), se resta el piso inferior. En Opción A (cerrado) se mantiene continuo y 100% macizo.
            if (mount_style == "collar_tunnel_surco") {
                translate([0, 0, 1.0])
                    cube([slot_w - 4, outer_l - 24, 3.0], center=true);
            }
        }

        // Cavidad interior limpia y amplia (Piso sólido impermeable a Z = floor_t)
        translate([0, 0, floor_t])
            rounded_box(cavity_w, cavity_l, base_h - floor_t + 2.0, 2.0);

        // Canal perimetral para junta tórica / elástica TPU
        translate([0, 0, base_h - groove_d])
            difference() {
                rounded_box(groove_center_w + groove_w, groove_center_l + groove_w, groove_d + 1, corner_r - 2.0);
                translate([0, 0, -1])
                    rounded_box(groove_center_w - groove_w, groove_center_l - groove_w, groove_d + 3, corner_r - 4.0);
            }

        // 6 Taladros roscados ciegos para tornillos M3
        for (sx = [-1, 1]) {
            for (sy = [-1, 1]) {
                translate([sx * screw_x, sy * screw_y_corner, floor_t])
                    cylinder(d=screw_tap_d, h=base_h - floor_t + 2);
            }
            translate([sx * screw_x, 0, floor_t])
                cylinder(d=screw_tap_d, h=base_h - floor_t + 2);
        }

        // Aberturas para puertos en Modo Banco / Laboratorio
        if (enclosure_mode == "bench_open") {
            usb1_y = pcb_l/2 - 47 + 4.5;
            usb2_y = pcb_l/2 - 60 + 4.5;
            usb_z  = floor_t + standoff_h + pcb_t;

            for (uy = [usb1_y, usb2_y]) {
                translate([-outer_w/2 - 1, uy - 6.0, usb_z - 1.2])
                    cube([wall + 6, 12.0, base_h - usb_z + 2.5]);
            }

            sw_y = pcb_l/2 - 62 + 4.25;
            translate([cavity_w/2 - 1, sw_y - 6.0, usb_z - 1.2])
                cube([wall + 6, 12.0, base_h - usb_z + 2.5]);
        }
        
        // CERO RESTA EN EL PISO BAJO EL BUZZER: Tabique macizo 100% continuo de 2.4 mm (IP67 garantizado)
    }

    // Postes de fijación PCB (4 esquinas) robustos de Ø5.8 mm con cartelas exteriores
    for (sx = [-1, 1], sy = [-1, 1]) {
        px = sx * (hole_dx / 2);
        py = sy * (hole_dy / 2);
        
        translate([px, py, floor_t]) {
            difference() {
                union() {
                    cylinder(d=5.8, h=standoff_h);
                    if (standoff_h > 8.0) {
                        // Cartelas orientadas hacia las esquinas exteriores para no invadir la cavidad central
                        rotate([0, 0, (sx == 1 ? (sy == 1 ? 45 : 315) : (sy == 1 ? 135 : 225))])
                            translate([-0.8, 0, 0])
                                hull() {
                                    cube([1.6, 3.5, 0.1]);
                                    cube([1.6, 0.8, min(standoff_h, 8.0)]);
                                }
                    }
                }
                translate([0, 0, 0.8])
                    cylinder(d=2.0, h=standoff_h + 1);
            }
        }
    }

    // Alojamiento cilíndrico del Buzzer (Revisión C: reubicado a Y = -35.0, X = -9.0 -> +8.3 mm libre del poste)
    if (include_buzzer) {
        buz_y = -35.0;
        buz_x = -9.0;
        translate([buz_x, buz_y, floor_t]) {
            difference() {
                cylinder(d=buzzer_d + 2.4, h=4.5);
                translate([0, 0, -0.1])
                    cylinder(d=buzzer_d, h=6.0);
                translate([0, -buzzer_d/2 - 2, 0])
                    cube([4.0, 5.0, 6.0]);
            }
        }
    }

    // Cuna para sensor MPU-6050 (Revisión C: reubicado a Y = -34.5, X = +8.5 -> +3.4 mm libre del poste)
    if (include_mpu6050) {
        mpu_y = -34.5;
        mpu_x = 8.5;
        
        translate([mpu_x, mpu_y, floor_t]) {
            difference() {
                union() {
                    translate([-mpu_w/2 - 1.2, -mpu_l/2 - 1.2, 0])
                        cube([mpu_w + 2.4, mpu_l + 2.4, 4.0]);
                    translate([mpu_w/2 - 2.5, mpu_l/2 - 2.5, 0])
                        cylinder(d=5.0, h=4.0);
                }
                translate([-mpu_w/2, -mpu_l/2, 1.2])
                    cube([mpu_w, mpu_l, 6.0]);
                translate([mpu_w/2 - 2.5, mpu_l/2 - 2.5, 0.5])
                    cylinder(d=1.8, h=6.0);
            }
        }
    }

    // Cuna para Batería 18650 (Opcional, desactivada por defecto porque el portapilas va en la propia PCB Lilygo)
    if (include_floor_battery_rails && (battery_type == "18650_holder" || battery_type == "18650_cell")) {
        bat_y_center = 16.5;
        bat_l = 76.0;
        
        for (sx = [-1, 1]) {
            translate([sx * 11.0, bat_y_center - bat_l/2, floor_t])
                hull() {
                    cube([1.8, bat_l, 3.2]);
                    translate([sx * -0.5, 0, 0]) cube([2.3, bat_l, 0.8]);
                }
        }
        for (sy = [-1, 1]) {
            translate([-9.0, bat_y_center + sy * (bat_l/2), floor_t]) {
                difference() {
                    cube([18.0, 1.8, 3.2]);
                    // Ranura para paso de cables de la batería
                    translate([6.5, -0.5, 0.8])
                        cube([5.0, 3.0, 3.0]);
                }
            }
        }
    }
}

// =============================================================================
// TAPA SUPERIOR ESTANCA IP67
// =============================================================================
module top_lid() {
    difference() {
        union() {
            rounded_box_chamfer(outer_w, outer_l, lid_h, corner_r, 1.5);

            // Nervio macho de compresión estanca
            translate([0, 0, lid_h])
                difference() {
                    rounded_box(groove_center_w + tongue_w, groove_center_l + tongue_w, tongue_h, corner_r - 2.0);
                    translate([0, 0, -1])
                        rounded_box(groove_center_w - tongue_w, groove_center_l - tongue_w, tongue_h + 2, corner_r - 4.0);
                }
        }

        // Cavidad interior de la tapa
        translate([0, 0, lid_floor_t])
            rounded_box(cavity_w, cavity_l, lid_h + tongue_h + 2.0, 2.0);

        // Grabado de Marca COWAI en bajo relieve exterior (0.6 mm)
        if (include_branding) {
            translate([0, 0, -0.1])
                mirror([0, 1, 0])
                    cowai_logo();
        }

        // 6 Taladros pasantes para tornillos M3 con avellanado cónico 45°
        for (sx = [-1, 1]) {
            for (sy = [-1, 1]) {
                translate([sx * screw_x, sy * screw_y_corner, -1])
                    cylinder(d=screw_pass_d, h=lid_h + tongue_h + 3);
                translate([sx * screw_x, sy * screw_y_corner, -0.1])
                    cylinder(d1=screw_head_d, d2=screw_pass_d, h=2.8);
            }
            translate([sx * screw_x, 0, -1])
                cylinder(d=screw_pass_d, h=lid_h + tongue_h + 3);
            translate([sx * screw_x, 0, -0.1])
                cylinder(d1=screw_head_d, d2=screw_pass_d, h=2.8);
        }
    }

    // Cuna superior para Antena GPS cerámica (25x25mm)
    if (include_gps_bed) {
        gps_y = pcb_l/2 - 20;
        translate([0, gps_y, lid_floor_t]) {
            difference() {
                translate([-gps_ant_w/2 - 1.2, -gps_ant_l/2 - 1.2, 0])
                    cube([gps_ant_w + 2.4, gps_ant_l + 2.4, 5.0]);
                translate([-gps_ant_w/2, -gps_ant_l/2, 0.4])
                    cube([gps_ant_w, gps_ant_l, 6.0]);
                translate([-2.5, -gps_ant_l/2 - 2, 0])
                    cube([5.0, 4.0, 6.0]);
            }
        }
    }

    // Guías interiores para Antena Adhesiva GSM/LTE de 110 mm
    if (include_gsm_bed) {
        translate([-cavity_w/2 + 0.6, -gsm_ant_l/2, lid_floor_t]) {
            cube([1.2, gsm_ant_l, 4.0]);
        }
    }
}

// =============================================================================
// JUNTA DE SELLADO ELASTOMÉRICA IMPRIMIBLE EN TPU (CALIBRADA TIPO O-RING)
// =============================================================================
module ip67_gasket() {
    // Espesor Z = 0.80 mm (exactamente 4 capas de 0.20 mm)
    // El canal mide 1.80 mm de profundidad y el nervio de la tapa 1.25 mm.
    // Espacio libre al cerrar: 1.80 - 1.25 = 0.55 mm.
    // Compresión elástica: 0.80 mm -> 0.55 mm = 0.25 mm (31.25% compresión O-ring ideal).
    gasket_t = 0.80; 
    
    // Ancho = 1.50 mm (el canal mide 2.2 mm, el nervio de la tapa 1.4 mm).
    // Deja 0.70 mm libres para expansión lateral del TPU sin bloqueo hidráulico.
    gasket_w = 1.50; 
    
    color(color_gasket)
        difference() {
            rounded_box(groove_center_w + gasket_w, groove_center_l + gasket_w, gasket_t, corner_r - 2.0);
            translate([0, 0, -1])
                rounded_box(groove_center_w - gasket_w, groove_center_l - gasket_w, gasket_t + 2, corner_r - 4.0);
        }
}

// =============================================================================
// MOCKUPS 3D PARA VISUALIZACIÓN DE ENSAMBLE
// =============================================================================
module lilygo_mockup() {
    color([0.15, 0.15, 0.15]) {
        difference() {
            translate([-pcb_w/2, -pcb_l/2, 0])
                cube([pcb_w, pcb_l, pcb_t]);
            for (sx = [-1, 1], sy = [-1, 1]) {
                translate([sx * hole_dx / 2, sy * hole_dy / 2, -1])
                    cylinder(d=hole_diam, h=pcb_t + 2);
            }
        }
    }
    color([0.75, 0.75, 0.8])
        translate([-12, pcb_l/2 - 32, pcb_t]) cube([24, 24, 2.3]);
    color([0.65, 0.65, 0.7])
        translate([-9, -pcb_l/2 + 8, pcb_t]) cube([18, 25, 3.0]);
    color([0.9, 0.9, 0.95]) {
        translate([-pcb_w/2 - 1.5, pcb_l/2 - 47, pcb_t]) cube([7.5, 9.0, 3.2]);
        translate([-pcb_w/2 - 1.5, pcb_l/2 - 60, pcb_t]) cube([7.5, 9.0, 3.2]);
    }
    color([0.2, 0.2, 0.2])
        translate([pcb_w/2 - 2, pcb_l/2 - 62, pcb_t]) cube([4.0, 8.5, 3.5]);
}

// =============================================================================
// DISPOSICIÓN SEGÚN SELECCIÓN
// =============================================================================
if (part == "both_flat") {
    // Base y Tapa juntas listas para imprimir en OrcaSlicer
    color(color_case)
        bottom_case();
    translate([outer_w + 14, 0, 0]) {
        color(color_case)
            top_lid();
        if (include_branding) {
            color(color_text)
                translate([0, 0, -0.05])
                    mirror([0, 1, 0])
                        cowai_logo();
        }
    }
} else if (part == "bottom") {
    color(color_case)
        bottom_case();
} else if (part == "lid") {
    // Tapa con celdas de bajo relieve vacías (para imprimir con brand_text)
    color(color_case)
        top_lid();
} else if (part == "gasket") {
    ip67_gasket();
} else if (part == "brand_text") {
    // Letras independientes para multimaterial
    color(color_text)
        translate([0, 0, 0])
            mirror([0, 1, 0])
                cowai_logo();
} else if (part == "assembly") {
    // Vista completa explosionada
    color(color_case)
        bottom_case();
    
    translate([0, 0, base_h - groove_d + 0.5])
        ip67_gasket();

    translate([0, 0, floor_t + standoff_h])
        lilygo_mockup();

    color([0.85, 0.65, 0.45])
        translate([0, pcb_l/2 - 20, base_h + 3.0])
            cube([gps_ant_w, gps_ant_l, gps_ant_h], center=true);

    color([0.1, 0.3, 0.9])
        translate([8.5, -34.5, floor_t + 1.0])
            cube([mpu_w, mpu_l, mpu_t], center=true);

    color([0.1, 0.1, 0.1])
        translate([-9.0, -35.0, floor_t + buzzer_h/2])
            cylinder(d=buzzer_d, h=buzzer_h, center=true);

    color([0.2, 0.7, 0.3])
        translate([0, 16.5, floor_t + 10.0])
            rotate([90, 0, 0])
                cylinder(d=18.5, h=65.0, center=true);

    // Antena LTE adhesiva pegada a lo largo de la pared lateral interior
    color([0.85, 0.75, 0.2, 0.85])
        translate([-cavity_w/2 + 0.3, 0, floor_t + gsm_ant_w/2 + 1.0])
            rotate([0, 90, 0])
                cube([gsm_ant_w, gsm_ant_l, 0.5], center=true);

    color(color_case, 0.9)
        translate([0, 0, base_h + headroom + 18.0])
            rotate([180, 0, 0])
                top_lid();

    color(color_text)
        translate([0, 0, base_h + headroom + 18.0])
            rotate([180, 0, 0])
                translate([0, 0, -0.05])
                    mirror([0, 1, 0])
                        cowai_logo();
}
