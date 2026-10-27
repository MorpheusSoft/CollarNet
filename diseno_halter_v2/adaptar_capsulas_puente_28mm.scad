// =============================================================================
// ADAPTADOR PARAMÉTRICO DE PRECISIÓN (OPCIÓN 1) - HALTER V2 COWAI
// Conserva el 100% del diseño interior del compañero (postes cuadrados de
// presión, cuna de batería en L, rejilla de buzzer, tapas y clips ocultos)
// y adapta milimétricamente la interfaz exterior al Puente Dorsal TPU impreso
// (espiga de 28.0 mm, túnel Z=3.0..8.5 mm, sello IP67 Ø12.0x1.8 mm @ Z=17.0 mm,
// ventanas de click X=15.5..26.5 mm, chaflanes guía 30°/45° y libre paso de tapa).
// =============================================================================

$fn = 36;

// Parámetros fijos del Puente Dorsal TPU ya impreso (INTOCABLE)
pod_l = 126.0;
pod_w = 82.0;
pod_base_h = 26.0;
pod_r = 7.0;
pod_wall = 2.8;
u_w = 2.4;
u_d = 2.8;

cradle_depth = 28.0;     // Profundidad exacta del bolsillo del puente impreso
cradle_wall = 2.8;       // Escalón lateral de la espiga
cradle_floor = 8.5;      // Escalón inferior de la espiga
strap_slot_w = 52.0;     // Ancho del túnel de la correa (Y = 15.0 a 67.0)
tunnel_t = 3.0;          // Piso inferior del túnel (Z = 0.0 a 3.0)
tunnel_h = 5.5;          // Altura del túnel de la correa (Z = 3.0 a 8.5)

conduit_z = 17.0;        // Altura exacta del pasacables y cuello IP67 del puente
conduit_d = 8.0;         // Diámetro interior del pasacables
gland_pocket_d = 12.0;   // Diámetro cajera IP67 (recibe cuello TPU Ø12.0 -> Ø11.4)
gland_pocket_depth = 1.8;// Profundidad 1.80 mm (comprime 0.40 mm el cuello de 2.20 mm)
gland_inner_d = 11.0;    // Cajera interior pasamuros
gland_inner_depth = 1.2;

click_x = 16.0;          // Posición X del diente de click en el puente
click_l = 10.0;          // Largo del diente de click en el puente (16.0 a 26.0)
click_h = 7.0;           // Alto del diente de click en el puente (13.75 a 20.75)
click_z = 17.25;         // Centro Z del diente de click en el puente
click_depth = 2.1;       // Profundidad de la muesca en pared de 2.8 mm (deja 0.7 mm sólidos)

// Caja redondeada con radio frontal y trasero independientes
module r_box_front_r(l, w, h, r_front, r_back) {
    hull() {
        translate([r_front, r_front, 0]) cylinder(r=r_front, h=h);
        translate([r_front, w - r_front, 0]) cylinder(r=r_front, h=h);
        translate([l - r_back, r_back, 0]) cylinder(r=r_back, h=h);
        translate([l - r_back, w - r_back, 0]) cylinder(r=r_back, h=h);
    }
}

// =============================================================================
// MÓDULO ADAPTADOR PARA BASES (IZQUIERDA Y DERECHA)
// =============================================================================
module adapt_colleague_base(stl_path, is_right=false) {
    difference() {
        union() {
            // 1. Malla original del compañero recortando únicamente el bloque inferior antiguo (Z < 8.50 en X >= 34)
            difference() {
                import(stl_path, convexity=10);
                translate([34.0, -2.0, -1.0])
                    cube([pod_l - 32.0, pod_w + 4.0, cradle_floor + 0.02]);
            }

            // 2. Nuevo bloque inferior exacto desde X = 28.0 mm hasta X = 126.0 mm (Z = 0.0 a 8.55 mm)
            translate([cradle_depth, 0, 0])
                r_box_front_r(pod_l - cradle_depth, pod_w, cradle_floor + 0.05, 2.0, pod_r);

            // 3. Extensión de las paredes laterales exteriores de 82 mm desde X = 35.0 hasta X = 28.0 mm (Z = 8.5 a 26.0)
            //    Solo actúa en las franjas exteriores Y=[0, 5.55] y Y=[76.45, 82.0] en X=[28.0, 42.5] para no tocar el interior
            intersection() {
                translate([cradle_depth, 0, cradle_floor])
                    r_box_front_r(pod_l - cradle_depth, pod_w, pod_base_h - cradle_floor, 2.0, pod_r);
                union() {
                    translate([cradle_depth, -1.0, cradle_floor])
                        cube([14.5, pod_wall + u_w + 0.35 + 1.0, pod_base_h - cradle_floor + 1.0]);
                    translate([cradle_depth, pod_w - (pod_wall + u_w + 0.35), cradle_floor])
                        cube([14.5, pod_wall + u_w + 0.35 + 1.0, pod_base_h - cradle_floor + 1.0]);
                }
            }

            // 4. Relleno previo de las muescas de click antiguas (X = 14.5 a 28.0) para tallar las nuevas exactas
            translate([14.5, cradle_wall, 12.5])
                cube([13.6, pod_wall, 9.5]);
            translate([14.5, pod_w - cradle_wall - pod_wall, 12.5])
                cube([13.6, pod_wall, 9.5]);

            // 5. Relleno previo del pasacables antiguo en la pared frontal (X = 0.0 a 5.6) para tallar el sello IP67 exacto
            translate([0.0, pod_w/2 - 9.0, 9.5])
                cube([5.6, 18.0, 13.6]);
        }

        // --- CORTES DE PRECISIÓN PARA EL PUENTE IMPRESO ---

        // A. Túnel pasacorreas continuo de 52.0 x 5.5 mm (Z = 3.0 a 8.5 mm) desde X = 28.0 mm
        translate([cradle_depth - 0.5, (pod_w - strap_slot_w)/2, tunnel_t])
            cube([pod_l - cradle_depth + 2.0, strap_slot_w, tunnel_h + 0.06]);

        // B. En la cápsula derecha, mantener libre la salida acústica inferior del buzzer (X=28, Y=16) hacia el túnel
        if (is_right) {
            translate([28.0, 16.0, tunnel_t])
                cylinder(r=5.0, h=cradle_floor - tunnel_t + 0.1, $fn=28);
        }

        // C. Continuidad del canal perimetral en U (Y = [2.8, 5.2] y [76.8, 79.2], Z = 23.2 a 26.0) en la zona X = 28.0..43.0
        translate([cradle_depth - 0.5, pod_wall, pod_base_h - u_d])
            cube([15.5, u_w, u_d + 1.0]);
        translate([cradle_depth - 0.5, pod_w - pod_wall - u_w, pod_base_h - u_d])
            cube([15.5, u_w, u_d + 1.0]);

        // D. Ventanas laterales de click exactas para el diente del puente (X = 15.5 a 26.5 mm, Z = 13.25 a 21.25 mm)
        translate([click_x - 0.5, cradle_wall - 0.5, click_z - click_h/2 - 0.5])
            cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);
        translate([click_x - 0.5, pod_w - cradle_wall - click_depth, click_z - click_h/2 - 0.5])
            cube([click_l + 1.0, click_depth + 0.5, click_h + 1.0]);

        // E. Pasacables central Ø8.0 mm y Cajera de Compresión IP67 Ø12.0 x 1.80 mm en Z = 17.00 mm
        translate([-2.0, pod_w/2, conduit_z])
            rotate([0, 90, 0]) cylinder(r=conduit_d/2, h=10.0, $fn=28);

        // Cajera exterior IP67 (1.80 mm de profundidad -> comprime 0.40 mm el cuello de 2.20 mm del puente)
        translate([-0.5, pod_w/2, conduit_z])
            rotate([0, 90, 0]) cylinder(r=gland_pocket_d/2, h=gland_pocket_depth + 0.5, $fn=36);

        // Cajera interior pasamuros para sellador (1.20 mm de profundidad desde X = 5.6 hacia adentro)
        translate([5.6 - gland_inner_depth, pod_w/2, conduit_z])
            rotate([0, 90, 0]) cylinder(r=gland_inner_d/2, h=gland_inner_depth + 0.5, $fn=32);

        // F. Chaflanes guía delanteros en X = 0 (30° laterales y 45° inferior) para inserción suave en el TPU
        translate([0, cradle_wall, cradle_floor - 1.0])
            rotate([0, 0, 30])
                translate([-8, -10, 0])
                    cube([16, 10, pod_base_h + 5]);

        translate([0, pod_w - cradle_wall, cradle_floor - 1.0])
            rotate([0, 0, -30])
                translate([-8, 0, 0])
                    cube([16, 10, pod_base_h + 5]);

        translate([0, -1, cradle_floor])
            rotate([0, 45, 0])
                translate([-2.0, 0, -2.0])
                    cube([2.0, pod_w + 2, 4.0]);
    }
}

// =============================================================================
// MÓDULO ADAPTADOR PARA TAPAS (IZQUIERDA Y DERECHA)
// Libera el labio superior elástico del puente TPU en X = 0..28.0 mm (Z_global = 24.5..27.0 mm)
// =============================================================================
module adapt_colleague_lid(stl_path) {
    lip_clear_x = cradle_depth + 0.15; // 28.15 mm
    lip_clear_y = 4.15;                // Libera el labio TPU que llega a Y = 4.00 mm (holgura 0.15 mm)
    lip_clear_z = 1.15;                // Libera el labio TPU que sube a Z_global = 27.00 mm (Z_lid = 1.00 mm)

    difference() {
        import(stl_path, convexity=10);

        // 1. Rebaje escalonado lateral en los primeros 28.15 mm para que el labio superior del puente TPU
        //    abrace la unión base-tapa sin chocar con el faldón de la tapa
        translate([-1.0, -1.0, -2.0])
            cube([lip_clear_x + 1.0, lip_clear_y + 1.0, lip_clear_z + 2.0]);

        translate([-1.0, pod_w - lip_clear_y, -2.0])
            cube([lip_clear_x + 1.0, lip_clear_y + 1.0, lip_clear_z + 2.0]);

        // 2. Chaflán frontal en las esquinas de X = 0 de la tapa para acompañar la entrada en la cuna
        translate([0, cradle_wall, -2.0])
            rotate([0, 0, 30])
                translate([-8, -10, 0])
                    cube([16, 10, 20]);

        translate([0, pod_w - cradle_wall, -2.0])
            rotate([0, 0, -30])
                translate([-8, 0, 0])
                    cube([16, 10, 20]);
    }
}

part = "none";
orig_dir = "/home/lzambrano/Desarrollo/CollarNet/diseno_halter_v2/versiones_anteriores/originales_companero_35mm/";

if (part == "left_base") {
    adapt_colleague_base(str(orig_dir, "capsula_izquierda_base_lilygo.stl"), false);
} else if (part == "right_base") {
    adapt_colleague_base(str(orig_dir, "capsula_derecha_base_bateria_21700.stl"), true);
} else if (part == "left_lid") {
    adapt_colleague_lid(str(orig_dir, "capsula_izquierda_tapa_solar.stl"));
} else if (part == "right_lid") {
    adapt_colleague_lid(str(orig_dir, "capsula_derecha_tapa_solar.stl"));
}
