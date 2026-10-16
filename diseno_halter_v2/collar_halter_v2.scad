// =============================================================================
// COLLARNET / COWAI V2 - COLLAR GANADERO INTELIGENTE ESTILO "HALTER"
// =============================================================================
// Arquitectura anatómica de puente dorsal ergonómico con doble cápsula simétrica
// Hardware real medido e integrado:
//  - Batería: Pack 21700-3P Li-Ion (73 x 67 x 23.5 mm, ~15.000 mAh)
//  - Paneles Solares: 2x Monocristalinos Epoxi 55 x 60 mm (RY9-414)
//  - Placa: LILYGO T-A7670X-S3 (ESP32-S3 + LTE 4G + GNSS)
//  - Antena GNSS: Parche cerámico 25.5 x 25.5 x 8.2 mm
//  - Audio: Zumbador piezoeléctrico 12.4 mm (geocerca 95dB)
//  - Señalización: Barra difusora LED verde vertical en hombro
//  - Correa: Ranura pasante de 52 mm (soporta 38 mm actual y 50 mm futura)
// =============================================================================

/* [Selector de Pieza] */
part = "assembly"; // [assembly, print_all_flat, bridge, bridge_text, pod_left_base, pod_left_lid, pod_right_base, pod_right_lid, gaskets_tpu, none]
active_part = is_undef(caller_part) ? part : caller_part;

/* [Colores del Collar] */
// Color principal de las cápsulas (ASA)
color_theme = "orange"; // [orange:Naranja Alta Visibilidad, dark_slate:Gris Halter Original, green:Verde Campo, yellow:Amarillo Seguridad, white:Blanco Anti Sol, blue:Azul Industrial]

// Material y color del puente dorsal flexible (TPU)
bridge_color_theme = "dark_tpu"; // [dark_tpu:TPU Grafito Halter, match_body:A juego con las cápsulas, orange_tpu:TPU Naranja]

// Color del logotipo C O W A I
logo_color = "white"; // [white:Blanco Puro, yellow:Amarillo Fluor, orange:Naranja Neon, green:Verde Neon, black:Negro Contraste, gold:Dorado]

/* [Configuracion de Correa] */
strap_width  = 38.0;     // Ancho de correa actual en mm
strap_slot_w = 52.0;     // Ancho del túnel (soporta de 38 a 50 mm)
strap_slot_h = 5.5;      // Altura del túnel de correa

/* [Paletas Dinámicas de Color] */
col_body = (color_theme == "orange")      ? [0.94, 0.42, 0.12] :
           (color_theme == "green")       ? [0.18, 0.48, 0.24] :
           (color_theme == "yellow")      ? [0.96, 0.80, 0.12] :
           (color_theme == "white")       ? [0.92, 0.94, 0.96] :
           (color_theme == "blue")        ? [0.12, 0.38, 0.72] :
                                            [0.22, 0.24, 0.26]; // dark_slate por defecto

col_bridge = (bridge_color_theme == "dark_tpu")   ? [0.18, 0.20, 0.22] :
             (bridge_color_theme == "orange_tpu") ? [0.86, 0.36, 0.08] :
             (color_theme == "orange")    ? [0.86, 0.36, 0.08] :
             (color_theme == "green")     ? [0.14, 0.40, 0.18] :
             (color_theme == "yellow")    ? [0.88, 0.72, 0.10] :
             (color_theme == "white")     ? [0.84, 0.86, 0.88] :
             (color_theme == "blue")      ? [0.10, 0.30, 0.62] :
                                            [0.18, 0.20, 0.22];

col_text = (logo_color == "white")        ? [0.98, 0.98, 0.98] :
           (logo_color == "yellow")       ? [0.98, 0.92, 0.15] :
           (logo_color == "orange")       ? [1.00, 0.48, 0.08] :
           (logo_color == "green")        ? [0.15, 0.98, 0.35] :
           (logo_color == "black")        ? [0.08, 0.08, 0.08] :
           (logo_color == "gold")         ? [0.92, 0.76, 0.22] :
                                            [0.98, 0.98, 0.98];

col_solar    = [0.08, 0.14, 0.24]; // Azul silicio monocristalino
col_grid     = [0.65, 0.78, 0.92]; // Metalizado de pistas solares
col_led      = [0.05, 1.00, 0.30]; // Verde brillante Halter
col_gasket   = [0.95, 0.40, 0.10]; // TPU Naranja
col_strap    = [0.32, 0.26, 0.22]; // Cincha ganadera
col_bat      = [0.12, 0.40, 0.85]; // Batería azul 21700-3P

/* [Resolución de Curvas] */
$fn = 36;

// =============================================================================
// PARÁMETROS GEOMÉTRICOS PRINCIPALES
// =============================================================================

// Paneles Solares (RY9-414: 55x60mm)
solar_l = 60.0;          // A lo largo de la cápsula
solar_w = 55.0;          // A lo ancho de la cápsula
solar_t = 2.2;           // Espesor del panel
solar_tol = 1.0;         // Holgura perimetral

// Batería Pack 21700-3P
bat_l = 73.0;            // Largo
bat_w = 67.0;            // Ancho
bat_h = 23.5;            // Grosor

// Placa LilyGO T-A7670X-S3
pcb_l = 110.6;
pcb_w = 33.1;
pcb_hole_dx = 27.75;
pcb_hole_dy = 105.55;

// Cápsulas Laterales
pod_l = 126.0;           // Longitud exterior
pod_w = 82.0;            // Ancho exterior
pod_base_h = 26.0;       // Altura de la base
lid_h = 9.0;             // Altura de la tapa biselada
pod_total_h = pod_base_h + lid_h; // 35.0 mm
pod_wall = 2.8;          // Espesor de pared robusta
pod_r = 7.0;             // Radio de esquinas

// Sellado IP67 por Machihembrado en U (Tongue-and-Groove Labyrinth)
u_w = 2.4;               // Ancho de ranura en U en la base (mm)
u_d = 2.8;               // Profundidad de ranura en U (mm)
tongue_w = 1.6;          // Ancho de lengüeta en la tapa (mm)
tongue_h = 2.2;          // Altura de lengüeta (comprime 25% la junta)
gasket_w = 2.0;          // Ancho de la junta tórica elástica (mm)
gasket_d = 2.0;          // Espesor de la junta tórica elástica (mm)

// Clips de Traba Perimetrales (Cantilever Snap-Fit Clamshell - 100% Cero Tornillos)
clip_w = 8.0;            // Ancho de clip (mm)
clip_t = 1.4;            // Espesor flexible del brazo (mm)
clip_arm_h = 7.5;        // Longitud del brazo de flexión (mm)
hook_d = 1.2;            // Saliente de traba en cuña (mm)
clip_x_positions = [48.0, 85.0, 115.0]; // Posiciones a lo largo de las paredes laterales
clip_y_end = pod_w / 2;                 // Posición central en pared trasera

// Túnel Pasacorreas
tunnel_t = 3.0;          // Piso inferior macizo
tunnel_h = strap_slot_h;

// Cuna Receptora / Bolsillos Envolventes en TPU (Cradle Sleeves)
cradle_depth = 35.0;     // Profundidad de embone de las cápsulas en el puente (mm)
cradle_wall  = 2.8;      // Espesor de pared TPU protectora alrededor de la cápsula
cradle_floor = tunnel_t + tunnel_h; // 8.5 mm: base continua sobre el túnel pasacorreas
cradle_tol   = 0.3;      // Holgura para encastre deslizante preciso entre TPU y ASA

// Encastre Elástico sin Tornillos (Snap-Fit Click & Phone-Case Lip)
click_x = 16.0;          // Posición longitudinal del diente de click (mm)
click_l = 10.0;          // Largo del diente en X (mm)
click_h = 7.0;           // Altura del diente en Z (mm)
click_depth = 2.0;       // Saliente óptimo del diente de traba hacia adentro (mm)
click_z = (cradle_floor + pod_base_h) / 2; // Centrado vertical en la pared interior (~17.2 mm)

// Conducto Pasacables y Sellado Estanco IP67
conduit_z = 17.0;        // Altura milimétrica del eje pasacables (mm) - centrado en cámara sobre cradle_floor (8.5 mm)
conduit_d = 8.0;         // Diámetro del orificio pasacables (mm)
gland_od  = 12.0;        // Diámetro exterior base del cuello elástico de estanqueidad TPU (mm)
gland_tip_od = 11.4;     // Diámetro en la punta con chaflán guía cónico de embone suave (mm)
gland_h   = 2.2;         // Longitud saliente del cuello TPU (mm) - 2.2 mm comprime 0.4 mm (22.2%) en cajera de 1.8 mm
gland_pocket_d = 12.0;   // Diámetro de la cajera exterior en ASA para cuello TPU o junta tórica ISO 8x2 (mm)
gland_pocket_depth = 1.8;// Profundidad de la cajera exterior en ASA (mm)
gland_inner_pocket_d = 12.0; // Diámetro de la cajera interior en ASA para sellador pasamuros / potting (mm)
gland_inner_pocket_depth = 1.8; // Profundidad de la cajera interior en ASA (mm)

// Geometría del Puente Dorsal Ergonómico (Arco Anatómico en plano X-Z)
bridge_r_inner = 125.0;  // Radio interno de la cruz/cuello de la vaca (125 mm)
bridge_half_ang = 32.0;  // Ángulo de caída de 32° a cada lado
bridge_thick_mid = 26.0; // Espesor robusto en cima central (aloja piso 3mm + correa 5.5mm + tabique 4.5mm + cable Ø8mm + techo 5mm)
bridge_thick_end = pod_total_h; // Espesor en extremos para acople enrasado (35 mm)
bridge_w_mid = 64.0;     // Cintura ergonómica central (ancho 64mm contiene el túnel de 52mm con 6mm de pared TPU a cada lado)
bridge_w_end = pod_w;    // Expansión a 82 mm en extremos para unión con los pods

// =============================================================================
// MÓDULOS DE UTILIDAD
// =============================================================================

module r_box(l, w, h, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=h);
        translate([l-r, r, 0]) cylinder(r=r, h=h);
        translate([r, w-r, 0]) cylinder(r=r, h=h);
        translate([l-r, w-r, 0]) cylinder(r=r, h=h);
    }
}

// Diente de traba en cuña (Entrada suave en rampa hacia X=0, tope recto anti-extracción)
module snap_wedge() {
    hull() {
        // Cara trasera de retención recta (tope en X=0 local)
        translate([0, 0, -click_h/2])
            cube([0.5, click_depth, click_h]);
        // Cima redondeada del diente de traba
        translate([2.5, click_depth - 0.4, -click_h/2])
            cube([1.0, 0.4, click_h]);
        // Rampa suave hacia la boca de entrada (en X=click_l)
        translate([click_l, 0, -click_h/2 + 0.5])
            cube([0.5, 0.3, click_h - 1.0]);
    }
}

// Carcasa exterior escalonada para embone macho en la cuna de TPU
module pod_stepped_shell() {
    difference() {
        union() {
            // Cuerpo principal a tamaño completo (X = cradle_depth a pod_l)
            translate([cradle_depth, 0, 0])
                r_box(pod_l - cradle_depth, pod_w, pod_base_h, pod_r);
            
            // Lengüeta rebajada que embona en la cuna de TPU (X = 0 a cradle_depth)
            translate([0, cradle_wall, cradle_floor])
                r_box(cradle_depth + 0.5, pod_w - 2*cradle_wall, pod_base_h - cradle_floor, max(1, pod_r - cradle_wall));
        }

        // Chaflán guía delantero tipo calzador en X=0 (abre suavemente el TPU y facilita el click)
        // Chaflán lateral 1 (Y = cradle_wall)
        translate([0, cradle_wall, cradle_floor - 1])
            rotate([0, 0, 30])
                translate([-8, -10, 0])
                    cube([16, 10, pod_base_h + 5]);

        // Chaflán lateral 2 (Y = pod_w - cradle_wall)
        translate([0, pod_w - cradle_wall, cradle_floor - 1])
            rotate([0, 0, -30])
                translate([-8, 0, 0])
                    cube([16, 10, pod_base_h + 5]);

        // Chaflán guía inferior delantero en X=0 (facilita la entrada en el bolsillo de TPU sin invadir el plano de sellado)
        translate([0, -1, cradle_floor])
            rotate([0, 45, 0])
                translate([-2, 0, -2])
                    cube([2, pod_w + 2, 4]);
    }
}

// Ranura continua en U para junta tórica IP67 (en la base)
module pod_u_groove() {
    translate([pod_wall, pod_wall, pod_base_h - u_d]) {
        difference() {
            r_box(pod_l - 2*pod_wall, pod_w - 2*pod_wall, u_d + 1, max(1, pod_r - pod_wall));
            translate([u_w, u_w, -0.5])
                r_box(pod_l - 2*(pod_wall + u_w), pod_w - 2*(pod_wall + u_w), u_d + 2, max(1, pod_r - pod_wall - u_w));
        }
    }
}

// Ventanas perimetrales en las paredes de la base para encastre de los clips
module pod_snap_windows() {
    // Pared lateral Y=0
    for (cx = clip_x_positions) {
        translate([cx - clip_w/2, -0.5, pod_base_h - clip_arm_h])
            cube([clip_w, pod_wall + 1.0, 3.2]);
    }
    // Pared lateral Y=pod_w
    for (cx = clip_x_positions) {
        translate([cx - clip_w/2, pod_w - pod_wall - 0.5, pod_base_h - clip_arm_h])
            cube([clip_w, pod_wall + 1.0, 3.2]);
    }
    // Pared trasera X=pod_l
    translate([pod_l - pod_wall - 0.5, clip_y_end - clip_w/2, pod_base_h - clip_arm_h])
        cube([pod_wall + 1.0, clip_w, 3.2]);
}

// Lengüeta perimetral de compresión que baja de la tapa al canal en U
module pod_compression_tongue() {
    translate([pod_wall + (u_w - tongue_w)/2, pod_wall + (u_w - tongue_w)/2, -tongue_h]) {
        difference() {
            r_box(pod_l - 2*(pod_wall + (u_w - tongue_w)/2), pod_w - 2*(pod_wall + (u_w - tongue_w)/2), tongue_h + 0.1, max(1, pod_r - pod_wall));
            translate([tongue_w, tongue_w, -0.5])
                r_box(pod_l - 2*(pod_wall + (u_w - tongue_w)/2 + tongue_w), pod_w - 2*(pod_wall + (u_w - tongue_w)/2 + tongue_w), tongue_h + 1.2, max(1, pod_r - pod_wall - tongue_w));
        }
    }
}

// Brazos elásticos con pestañas en cuña (Snap-Fit Hooks) en la tapa
module pod_snap_hooks() {
    // Pared lateral Y=0
    for (cx = clip_x_positions) {
        translate([cx - clip_w/2 + 0.2, 0.4, -clip_arm_h]) {
            cube([clip_w - 0.4, clip_t, clip_arm_h]);
            hull() {
                translate([0, 0, 0.2]) cube([clip_w - 0.4, 0.2, 0.5]);
                translate([0, -hook_d, 2.0]) cube([clip_w - 0.4, 0.2, 0.8]);
            }
        }
    }
    // Pared lateral Y=pod_w
    for (cx = clip_x_positions) {
        translate([cx - clip_w/2 + 0.2, pod_w - clip_t - 0.4, -clip_arm_h]) {
            cube([clip_w - 0.4, clip_t, clip_arm_h]);
            hull() {
                translate([0, clip_t - 0.2, 0.2]) cube([clip_w - 0.4, 0.2, 0.5]);
                translate([0, clip_t + hook_d - 0.2, 2.0]) cube([clip_w - 0.4, 0.2, 0.8]);
            }
        }
    }
    // Pared trasera X=pod_l
    translate([pod_l - clip_t - 0.4, clip_y_end - clip_w/2 + 0.2, -clip_arm_h]) {
        cube([clip_t, clip_w - 0.4, clip_arm_h]);
        hull() {
            translate([clip_t - 0.2, 0, 0.2]) cube([0.2, clip_w - 0.4, 0.5]);
            translate([clip_t + hook_d - 0.2, 0, 2.0]) cube([0.2, clip_w - 0.4, 0.8]);
        }
    }
}

// Cuna receptora integrada en TPU con doble diente de click y labio elástico superior
module tpu_socket() {
    back_wall_t = 3.0; // Espesor de la pared trasera del bolsillo
    
    union() {
        difference() {
            // Envolvente exterior continuo desde la pared trasera hasta la boca
            translate([-back_wall_t, -pod_w/2, 0])
                r_box(cradle_depth + back_wall_t, pod_w, pod_base_h, pod_r);

            // Cavidad interior donde entra la lengüeta de ASA con tolerancia precisa
            translate([0, -pod_w/2 + cradle_wall - cradle_tol, cradle_floor - cradle_tol])
                r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall - cradle_tol), 
                      pod_base_h + 5.0, max(1, pod_r - cradle_wall));

            // Túnel pasacorreas continuo inferior (52 mm)
            translate([-back_wall_t - 2, -strap_slot_w/2, tunnel_t])
                cube([cradle_depth + back_wall_t + 5, strap_slot_w, tunnel_h]);

            // Pasacables de entrada central (Ø8 mm a Z = conduit_z = 17.0 mm)
            translate([-back_wall_t - 2, 0, conduit_z])
                rotate([0, 90, 0]) cylinder(r=conduit_d/2, h=back_wall_t + 4, $fn=24);

            // Muescas ergonómicas para desenganche manual con los dedos
            translate([cradle_depth - 3.0, -pod_w/2 - 1.0, click_z - 3.5])
                cube([5.0, cradle_wall + 2.0, 7.0]);
            translate([cradle_depth - 3.0, pod_w/2 - cradle_wall - 1.0, click_z - 3.5])
                cube([5.0, cradle_wall + 2.0, 7.0]);
        }

        // Cuello anular elástico de sellado estanco IP67 (TPU Gasket Boss hacia la cajera de ASA)
        translate([0, 0, conduit_z])
            rotate([0, 90, 0]) {
                difference() {
                    // Conicidad guía suave (r1 base a r2 punta) para embone guiado sin rebabas
                    cylinder(r1=gland_od/2, r2=gland_tip_od/2, h=gland_h, $fn=30);
                    translate([0, 0, -0.5])
                        cylinder(r=conduit_d/2, h=gland_h + 1.0, $fn=24);
                }
            }

        // Labio superior elástico tipo funda de celular (sujeta el borde superior del case)
        translate([0, -pod_w/2, pod_base_h - 1.5]) {
            difference() {
                r_box(cradle_depth, pod_w, 2.5, pod_r);
                translate([-1, cradle_wall + 1.2, -1])
                    r_box(cradle_depth + 5.0, pod_w - 2*(cradle_wall + 1.2), 5.0, max(1, pod_r - cradle_wall));
            }
        }

        // Dientes de click interiores en las paredes laterales de TPU (100% sólidos, no afectados por el vaciado)
        // Diente lateral 1 (en pared Y = -pod_w/2 + cradle_wall)
        translate([click_x, -pod_w/2 + cradle_wall - cradle_tol, click_z])
            snap_wedge();

        // Diente lateral 2 (en pared Y = +pod_w/2 - cradle_wall)
        translate([click_x, pod_w/2 - cradle_wall + cradle_tol, click_z])
            mirror([0, 1, 0]) snap_wedge();
    }
}

// Perfil 2D del puente dorsal:
// X_2D: Espesor radial hacia afuera (0 a thick)
// Y_2D: Ancho ergonómico (-w/2 a +w/2)
module halter_profile_2d(thick, w) {
    r = min(4.0, thick/3);
    hull() {
        translate([r, -w/2 + r]) circle(r=r, $fn=24);
        translate([r, w/2 - r]) circle(r=r, $fn=24);
        translate([thick - r, -w/2 + r]) circle(r=r);
        translate([thick - r, w/2 - r]) circle(r=r);
    }
}

// Rodaja angular a lo largo del arco dorsal
module bridge_slice(ang) {
    t = abs(ang) / bridge_half_ang;
    t_smooth = t * t * (3 - 2 * t); // Transición cúbica suave
    w = bridge_w_mid + (bridge_w_end - bridge_w_mid) * t_smooth;
    thick = bridge_thick_mid + (bridge_thick_end - bridge_thick_mid) * t_smooth;

    rotate([0, ang, 0]) {
        translate([0, 0, bridge_r_inner]) {
            rotate([0, -90, 0]) {
                linear_extrude(height=0.2, center=true) {
                    halter_profile_2d(thick, w);
                }
            }
        }
    }
}

// Módulo oficial del Logotipo y Emblema COWAI (Ondas Satelitales IoT + Texto + Subtítulo)
module cowai_bridge_badge_2d() {
    // Icono ondas satelitales / IoT (con 3 ondas concéntricas de radiofrecuencia)
    translate([-26, 1.2, 0]) {
        circle(r = 0.9);
        difference() {
            circle(r = 2.6);
            circle(r = 1.9);
            translate([-4, -4, 0]) square([4, 8]);
        }
        difference() {
            circle(r = 4.3);
            circle(r = 3.6);
            translate([-6, -6, 0]) square([6, 12]);
        }
    }
    
    // Texto principal COWAI destacado en tipografía Ubuntu Bold
    translate([3.0, 1.2, 0])
        text("COWAI", font = "Ubuntu:style=Bold", size = 8.5, halign = "center", valign = "center", spacing = 1.15);
    
    // Subtítulo tecnológico SMART CATTLE IoT
    translate([0, -5.2, 0])
        text("SMART CATTLE IoT", font = "Ubuntu:style=Bold", size = 2.2, halign = "center", valign = "center", spacing = 1.2);
        
    // Líneas tecnológicas de acento
    translate([20.0, -5.2, 0]) square([3.5, 0.45], center = true);
    translate([-20.0, -5.2, 0]) square([3.5, 0.45], center = true);
}

// 1A. CUERPO ESTRUCTURAL DEL PUENTE CON CUNAS INTEGRADAS Y BAJORRELIEVE (Para imprimir / STL base TPU)
module dorsal_bridge_body(n_steps=24) {
    color(col_bridge) {
        difference() {
            union() {
                // Cuerpo del arco ergonómico continuo con curvatura anatómica
                for (i = [0 : n_steps - 1]) {
                    ang1 = -bridge_half_ang + i * (2 * bridge_half_ang) / n_steps;
                    ang2 = -bridge_half_ang + (i + 1) * (2 * bridge_half_ang) / n_steps;
                    hull() {
                        bridge_slice(ang1);
                        bridge_slice(ang2);
                    }
                }

                // Cuna Derecha de TPU unida al arco
                ang = bridge_half_ang;
                x_j = bridge_r_inner * sin(ang);
                z_j = bridge_r_inner * cos(ang);

                translate([x_j, 0, z_j])
                    rotate([0, ang, 0])
                        tpu_socket();

                // Cuna Izquierda de TPU unida al arco
                mirror([1, 0, 0])
                    translate([x_j, 0, z_j])
                        rotate([0, ang, 0])
                            tpu_socket();
            }

            // Túnel pasacorreas continuo inferior curvo (52 mm ancho x 5.5 mm alto) - OPCIÓN A
            rotate([90, 0, 0]) {
                rotate([0, 0, 90 - (bridge_half_ang + 1.0)])
                    rotate_extrude(angle = 2 * (bridge_half_ang + 1.0), $fn=90)
                        translate([bridge_r_inner + tunnel_t, -strap_slot_w/2])
                            square([strap_slot_h, strap_slot_w]);
            }

            // Canal interior pasacables estanco continuo (Ø8 mm a R = bridge_r_inner + conduit_z = 142 mm)
            rotate([90, 0, 0]) {
                rotate([0, 0, 90 - (bridge_half_ang + 1.5)])
                    rotate_extrude(angle = 2 * (bridge_half_ang + 1.5), $fn=90)
                        translate([bridge_r_inner + conduit_z, 0])
                            circle(r=conduit_d/2, $fn=24);
            }

            // Ranuras de ventilación y confort en el intradós (lado del animal, profundidad 1.2 mm)
            for (dy = [-18, 0, 18]) {
                translate([0, dy, 0]) {
                    rotate([90, 0, 0]) {
                        rotate([0, 0, 90 - (bridge_half_ang - 2.0)])
                            rotate_extrude(angle = 2 * (bridge_half_ang - 2.0), $fn=90)
                                translate([bridge_r_inner, 0, 0])
                                    scale([1, 0.6]) circle(r=1.2, $fn=20);
                    }
                }
            }

            // Cajera en bajorrelieve en la cresta central que atraviesa toda la curvatura
            translate([0, 0, 147.8]) {
                linear_extrude(height=10.0) {
                    cowai_bridge_badge_2d();
                }
            }
        }
    }
}

// 1B. OBJETO 3D DEL TEXTO Y EMBLEMA COWAI (Para cargar como objeto/parte en OrcaSlicer)
module dorsal_bridge_text() {
    color(col_text) {
        translate([0, 0, 147.8]) {
            linear_extrude(height=3.4) {
                cowai_bridge_badge_2d();
            }
        }
    }
}

// 1C. PUENTE COMPLETO COMBINADO (Para ensamble visual)
module dorsal_bridge(n_steps=24) {
    dorsal_bridge_body(n_steps);
    dorsal_bridge_text();
}

// =============================================================================
// 2. CÁPSULA IZQUIERDA BASE (ELECTRÓNICA & GNSS)
// =============================================================================
module pod_left_base() {
    color(col_body) {
        difference() {
            pod_stepped_shell();

            // Cavidad interior principal para electrónica
            translate([pod_wall + cradle_wall, pod_wall + cradle_wall, tunnel_t + tunnel_h + 2.0]) {
                r_box(pod_l - 2*(pod_wall + cradle_wall), pod_w - 2*(pod_wall + cradle_wall), pod_base_h + 5, max(1, pod_r - pod_wall));
            }

            // Túnel pasacorreas continuo inferior (52 mm)
            translate([-10, (pod_w - strap_slot_w)/2, tunnel_t]) {
                cube([pod_l + 20, strap_slot_w, tunnel_h]);
            }

            // Ranura laberíntica continua en U para junta tórica IP67
            pod_u_groove();

            // Ventanas perimetrales de click para las pestañas de la tapa
            pod_snap_windows();

            // Pasacables hacia el puente dorsal (cara X=0, Z=conduit_z = 17.0 mm)
            translate([-5, pod_w/2, conduit_z])
                rotate([0, 90, 0]) cylinder(r=conduit_d/2, h=16, $fn=24);

            // Cajera exterior para cuello de sellado estanco TPU o junta tórica IP67 (Ø12.0 x 1.8 mm)
            translate([-0.5, pod_w/2, conduit_z])
                rotate([0, 90, 0]) cylinder(r=gland_pocket_d/2, h=gland_pocket_depth + 0.5, $fn=30);

            // Cajera interior pasamuros para cordón de sellador / potting anti-capilaridad
            translate([pod_wall + cradle_wall - gland_inner_pocket_depth, pod_w/2, conduit_z])
                rotate([0, 90, 0]) cylinder(r=gland_inner_pocket_d/2, h=gland_inner_pocket_depth + 1.0, $fn=30);

            // Muescas laterales de retención para click mecánico en cuna de TPU
            translate([click_x - 0.5, cradle_wall - 0.2, click_z - click_h/2 - 0.5]) {
                cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);
            }
            translate([click_x - 0.5, pod_w - cradle_wall - click_depth - 0.3, click_z - click_h/2 - 0.5]) {
                cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);
            }
        }

        // Postes para LilyGO T-A7670X-S3
        translate([8, 8, tunnel_t + tunnel_h + 2.0]) {
            difference() {
                union() {
                    translate([0, 0, 0]) cylinder(r=3.2, h=4.5, $fn=20);
                    translate([pcb_hole_dy, 0, 0]) cylinder(r=3.2, h=4.5, $fn=20);
                    translate([0, pcb_hole_dx, 0]) cylinder(r=3.2, h=4.5, $fn=20);
                    translate([pcb_hole_dy, pcb_hole_dx, 0]) cylinder(r=3.2, h=4.5, $fn=20);
                }
                translate([0, 0, 1]) cylinder(r=1.2, h=6, $fn=16);
                translate([pcb_hole_dy, 0, 1]) cylinder(r=1.2, h=6, $fn=16);
                translate([0, pcb_hole_dx, 1]) cylinder(r=1.2, h=6, $fn=16);
                translate([pcb_hole_dy, pcb_hole_dx, 1]) cylinder(r=1.2, h=6, $fn=16);
            }
        }

        // Cuna para Antena GNSS cerámica (25.5 x 25.5 mm)
        translate([pod_l - 42, pod_w - 42, tunnel_t + tunnel_h + 2.0]) {
            difference() {
                r_box(30, 30, 9, 2.5);
                translate([2, 2, 2]) cube([26, 26, 10]);
            }
        }
    }
}

// =============================================================================
// 3. CÁPSULA IZQUIERDA TAPA (PANEL SOLAR 1 & VISOR LED)
// =============================================================================
module pod_left_lid() {
    color(col_body) {
        union() {
            difference() {
                hull() {
                    r_box(pod_l, pod_w, lid_h - 1.5, pod_r);
                    translate([1.5, 1.5, lid_h - 1.5])
                        r_box(pod_l - 3, pod_w - 3, 1.5, max(1, pod_r - 1.5));
                }

                // Alojamiento enrasado (Flush-Mount) para Panel Solar 1 (55x60mm)
                translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t]) {
                    r_box(solar_l + solar_tol, solar_w + solar_tol, solar_t + 2, 2.0);
                }

                // Orificio pasacables bajo el panel
                translate([(pod_l - solar_l)/2 + 8 + solar_l/2, pod_w/2, -1])
                    cylinder(r=2.5, h=lid_h + 2, $fn=20);

                // Ranura vertical para barra difusora LED verde estilo Halter (en hombro X=8)
                translate([8, (pod_w - 4.0)/2, 1.0])
                    cube([4.0, 28.0, lid_h + 2]);

                // Vaciado interior de la tapa
                translate([pod_wall + u_w + 1.0, pod_wall + u_w + 1.0, -1])
                    r_box(pod_l - 2*(pod_wall + u_w + 1.0), pod_w - 2*(pod_wall + u_w + 1.0), lid_h - 2.5, max(1, pod_r - pod_wall - u_w - 1.0));
            }

            // Lengüeta perimetral de compresión que baja al canal en U (precarga IP67)
            pod_compression_tongue();

            // Clips elásticos de traba perimetrales (Snap-Fit Hooks)
            pod_snap_hooks();
        }
    }

    // Inserto de barra LED verde translúcida activa
    color(col_led, 0.95) {
        translate([8.5, (pod_w - 26.0)/2, 1.5])
            cube([3.0, 26.0, lid_h - 1.0]);
    }
}

// =============================================================================
// 4. CÁPSULA DERECHA BASE (BATERÍA 21700-3P + MPPT + BUZZER)
// =============================================================================
module pod_right_base() {
    color(col_body) {
        difference() {
            pod_stepped_shell();

            // Compartimento para Batería 21700-3P (Holgura: 76 x 70 x 24 mm)
            translate([10, (pod_w - (bat_w + 3))/2, tunnel_t + tunnel_h + 2.0]) {
                r_box(bat_l + 3, bat_w + 3, pod_base_h + 5, 3.0);
            }

            // Compartimento para módulo de carga solar MPPT (CN3791 / TP4056)
            translate([bat_l + 16, (pod_w - 26)/2, tunnel_t + tunnel_h + 2.0]) {
                r_box(24, 26, pod_base_h + 5, 2.0);
            }

            // Alojamiento cilíndrico para zumbador piezoeléctrico (buzzer)
            translate([bat_l + 25, 16, tunnel_t + tunnel_h + 2.0]) {
                cylinder(r=12.4/2 + 0.3, h=12, $fn=30);
                translate([0, 0, -(tunnel_t + tunnel_h + 1)])
                    cylinder(r1=1.8, r2=12.4/2, h=tunnel_t + tunnel_h + 1, $fn=24);
            }

            // Túnel pasacorreas continuo inferior (52 mm)
            translate([-10, (pod_w - strap_slot_w)/2, tunnel_t]) {
                cube([pod_l + 20, strap_slot_w, tunnel_h]);
            }

            // Ranura laberíntica continua en U para junta tórica IP67
            pod_u_groove();

            // Ventanas perimetrales de click para las pestañas de la tapa
            pod_snap_windows();

            // Pasacables hacia el puente dorsal (cara X=0, Z=conduit_z = 17.0 mm)
            translate([-5, pod_w/2, conduit_z])
                rotate([0, 90, 0]) cylinder(r=conduit_d/2, h=16, $fn=24);

            // Cajera exterior para cuello de sellado estanco TPU o junta tórica IP67 (Ø12.0 x 1.8 mm)
            translate([-0.5, pod_w/2, conduit_z])
                rotate([0, 90, 0]) cylinder(r=gland_pocket_d/2, h=gland_pocket_depth + 0.5, $fn=30);

            // Cajera interior pasamuros para cordón de sellador / potting anti-capilaridad
            translate([10.0 - gland_inner_pocket_depth, pod_w/2, conduit_z])
                rotate([0, 90, 0]) cylinder(r=gland_inner_pocket_d/2, h=gland_inner_pocket_depth + 1.0, $fn=30);

            // Muescas laterales de retención para click mecánico en cuna de TPU
            translate([click_x - 0.5, cradle_wall - 0.2, click_z - click_h/2 - 0.5]) {
                cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);
            }
            translate([click_x - 0.5, pod_w - cradle_wall - click_depth - 0.3, click_z - click_h/2 - 0.5]) {
                cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);
            }
        }
    }

    // Mockup interior de la batería 21700-3P para verificación
    %color(col_bat, 0.8) {
        translate([11.5, (pod_w - bat_w)/2, tunnel_t + tunnel_h + 3.0])
            r_box(bat_l, bat_w, bat_h, 3.0);
    }
}

// =============================================================================
// 5. CÁPSULA DERECHA TAPA (PANEL SOLAR 2)
// =============================================================================
module pod_right_lid() {
    color(col_body) {
        union() {
            difference() {
                hull() {
                    r_box(pod_l, pod_w, lid_h - 1.5, pod_r);
                    translate([1.5, 1.5, lid_h - 1.5])
                        r_box(pod_l - 3, pod_w - 3, 1.5, max(1, pod_r - 1.5));
                }

                // Alojamiento enrasado para Panel Solar 2 (55x60mm)
                translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, lid_h - solar_t]) {
                    r_box(solar_l + solar_tol, solar_w + solar_tol, solar_t + 2, 2.0);
                }

                // Orificio pasacables central bajo el panel
                translate([(pod_l - solar_l)/2 + 8 + solar_l/2, pod_w/2, -1])
                    cylinder(r=2.5, h=lid_h + 2, $fn=20);

                // Ranura estética ciega a juego en hombro X=8
                translate([8, (pod_w - 4.0)/2, lid_h - 1.5])
                    cube([4.0, 28.0, 3.0]);

                // Vaciado interior de la tapa
                translate([pod_wall + u_w + 1.0, pod_wall + u_w + 1.0, -1])
                    r_box(pod_l - 2*(pod_wall + u_w + 1.0), pod_w - 2*(pod_wall + u_w + 1.0), lid_h - 2.5, max(1, pod_r - pod_wall - u_w - 1.0));
            }

            // Lengüeta perimetral de compresión que baja al canal en U (precarga IP67)
            pod_compression_tongue();

            // Clips elásticos de traba perimetrales (Snap-Fit Hooks)
            pod_snap_hooks();
        }
    }
}

// =============================================================================
// 6. JUNTA ELÁSTICA TPU (GRADO IP67)
// =============================================================================
module gasket_tpu() {
    color(col_gasket) {
        translate([pod_wall + (u_w - gasket_w)/2, pod_wall + (u_w - gasket_w)/2, 0]) {
            difference() {
                r_box(pod_l - 2*(pod_wall + (u_w - gasket_w)/2), pod_w - 2*(pod_wall + (u_w - gasket_w)/2), gasket_d, max(1, pod_r - pod_wall));
                translate([gasket_w, gasket_w, -0.5])
                    r_box(pod_l - 2*(pod_wall + (u_w - gasket_w)/2 + gasket_w), pod_w - 2*(pod_wall + (u_w - gasket_w)/2 + gasket_w), 
                          gasket_d + 1, max(1, pod_r - pod_wall - gasket_w));
            }
        }
    }
}

// =============================================================================
// MOCKUP DE PANEL SOLAR (55x60mm)
// =============================================================================
module solar_panel_mockup() {
    color(col_solar) {
        difference() {
            r_box(solar_l, solar_w, solar_t, 2.0);
            for (i = [1:3]) {
                translate([i * 15, 1, solar_t - 0.2])
                    cube([0.5, solar_w - 2, 0.4]);
            }
            for (j = [1:2]) {
                translate([1, j * 18, solar_t - 0.2])
                    cube([solar_l - 2, 0.5, 0.4]);
            }
        }
    }
}

// =============================================================================
// ENSAMBLE COMPLETO EN POSICIÓN DE TRABAJO (ARCO GANADERO ERGONÓMICO)
// =============================================================================
module full_assembly() {
    // 1. Puente Dorsal Central Anatómico
    dorsal_bridge();

    ang = bridge_half_ang; // 32°
    
    // Extremo de acople
    x_j = bridge_r_inner * sin(ang);
    z_j = bridge_r_inner * cos(ang);

    // 2. Cápsula Derecha (Batería 21700-3P + Panel Solar 2 + Buzzer)
    translate([x_j, 0, z_j]) {
        rotate([0, ang, 0]) {
            translate([0, -pod_w/2, 0]) {
                pod_right_base();
                translate([0, 0, pod_base_h]) pod_right_lid();
                // Panel Solar 2
                translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, pod_base_h + lid_h - solar_t + 0.2])
                    solar_panel_mockup();
            }
        }
    }

    // 3. Cápsula Izquierda (Electrónica LILYGO + GNSS + Panel Solar 1 + LED)
    mirror([1, 0, 0]) {
        translate([x_j, 0, z_j]) {
            rotate([0, ang, 0]) {
                translate([0, -pod_w/2, 0]) {
                    pod_left_base();
                    translate([0, 0, pod_base_h]) pod_left_lid();
                    // Panel Solar 1
                    translate([(pod_l - solar_l)/2 + 8, (pod_w - solar_w)/2, pod_base_h + lid_h - solar_t + 0.2])
                        solar_panel_mockup();
                }
            }
        }
    }

    // 4. Correa Ganadera Continua (Cincha atravesando pods y puente dorsal - Opción A)
    color(col_strap, 0.85) {
        // Lado derecho (en pod derecho)
        translate([x_j, 0, z_j])
            rotate([0, ang, 0])
                translate([0, -strap_width/2, tunnel_t + 0.5])
                    cube([pod_l + 30, strap_width, 3.5]);

        // Lado izquierdo (en pod izquierdo)
        mirror([1, 0, 0])
            translate([x_j, 0, z_j])
                rotate([0, ang, 0])
                    translate([0, -strap_width/2, tunnel_t + 0.5])
                        cube([pod_l + 30, strap_width, 3.5]);

        // Tramo curvo continuo por el arco dorsal
        rotate([90, 0, 0]) {
            rotate([0, 0, 90 - ang])
                rotate_extrude(angle = 2 * ang, $fn=90)
                    translate([bridge_r_inner + tunnel_t + 0.5, -strap_width/2])
                        square([3.5, strap_width]);
        }
    }

    // 5. Arnés Pasacables Continuo (Ø7.0 mm sellado estanco de cápsula a cápsula)
    %color([0.20, 0.20, 0.22], 0.8) {
        // Tramo interior pod derecho
        translate([x_j, 0, z_j])
            rotate([0, ang, 0])
                translate([-2, 0, conduit_z])
                    rotate([0, 90, 0]) cylinder(r=3.5, h=16, $fn=24);

        // Tramo interior pod izquierdo
        mirror([1, 0, 0])
            translate([x_j, 0, z_j])
                rotate([0, ang, 0])
                    translate([-2, 0, conduit_z])
                        rotate([0, 90, 0]) cylinder(r=3.5, h=16, $fn=24);

        // Tramo curvo continuo por el puente dorsal
        rotate([90, 0, 0]) {
            rotate([0, 0, 90 - ang])
                rotate_extrude(angle = 2 * ang, $fn=90)
                    translate([bridge_r_inner + conduit_z, 0])
                        circle(r=3.5, $fn=24);
        }
    }
}

// =============================================================================
// DISPOSICIÓN PLANA PARA IMPRESIÓN 3D
// =============================================================================
module print_all_flat() {
    // Base Izquierda (Electrónica)
    translate([-pod_l/2 - 12, -pod_w/2 - 15, 0]) 
        pod_left_base();

    // Base Derecha (Batería 21700-3P)
    translate([pod_l/2 + 12, -pod_w/2 - 15, 0]) 
        pod_right_base();

    // Tapa Izquierda (Panel 1 + LED)
    translate([-pod_l/2 - 12, pod_w/2 + 25, 0]) 
        pod_left_lid();

    // Tapa Derecha (Panel 2)
    translate([pod_l/2 + 12, pod_w/2 + 25, 0]) 
        pod_right_lid();

    // Puente apoyado lateralmente para imprimir sin soportes complejos
    translate([0, -pod_w - 75, bridge_w_mid/2])
        rotate([90, 0, 0]) dorsal_bridge();
}

// =============================================================================
// SELECTOR DE PARTE
// =============================================================================
if (active_part == "assembly") {
    full_assembly();
} else if (active_part == "print_all_flat") {
    print_all_flat();
} else if (active_part == "bridge") {
    // Cuerpo estructural del puente con bajorrelieve (para exportar STL base)
    dorsal_bridge_body();
} else if (active_part == "bridge_text" || active_part == "logo_cowai_inlay") {
    // Texto y emblema COWAI independiente con coordenadas alineadas para OrcaSlicer / AMS
    dorsal_bridge_text();
} else if (active_part == "pod_left_base") {
    pod_left_base();
} else if (active_part == "pod_left_lid") {
    pod_left_lid();
} else if (active_part == "pod_right_base") {
    pod_right_base();
} else if (active_part == "pod_right_lid") {
    pod_right_lid();
} else if (active_part == "gaskets_tpu") {
    gasket_tpu();
}
