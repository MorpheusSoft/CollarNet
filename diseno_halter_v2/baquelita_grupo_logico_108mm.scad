// ============================================================================
// BAQUELITA IMPRESA EN 3D — GRUPO LÓGICO COLLARNET (10.8 x 7.2 cm)
// Optimizada para Bambu Lab P1S con AMS (PETG Gris + PETG Verde)
// Módulos:
//   1. SIM800L EVB v2.0 (Arriba Izquierda - 39 x 27.5 mm)
//   2. GY-GPS6MV2 NEO-6M (Arriba Derecha - 36 x 24 mm)
//   3. ITG/MPU6050 GY-521 (Abajo Izquierda - 21.5 x 16 mm)
//   4. ESP-32 DevKit V1 30p USB-C (Abajo Derecha Horizontal - 51.5 x 28 mm)
// ============================================================================

$fn = 48;

// Dimensiones principales del boceto (10.8 cm x 7.2 cm)
board_w = 108.0;
board_d = 72.0;
board_h = 3.0;
corner_r = 4.0;

// Coordenadas centros de cada módulo (X, Y en plano 2D de OpenSCAD)
// Nota: En OpenSCAD +Y es Arriba ("Puente 10.8cm") y -Y es Abajo ("Correa")
sim_x = -27.0;  sim_y =  17.0;
gps_x =  26.0;  gps_y =  17.5;
mpu_x = -26.0;  mpu_y = -19.0;
esp_x =  21.0;  esp_y = -17.5;

module rounded_plate(w, d, h, r) {
    hull() {
        for (sx = [-1, 1], sy = [-1, 1]) {
            translate([sx * (w/2 - r), sy * (d/2 - r), 0])
                cylinder(r = r, h = h);
        }
    }
}

// 1. Palito de Soporte Liso Original (Hombro inferior + Espiga cilíndrica guía)
module smooth_support_pin(x, y, d_shoulder = 3.6, h_shoulder = 2.0) {
    translate([x, y, board_h]) {
        cylinder(d = d_shoulder, h = h_shoulder);
        translate([0, 0, h_shoulder])
            cylinder(d = 1.90, h = 2.85);
        translate([0, 0, h_shoulder + 2.85])
            cylinder(d1 = 1.90, d2 = 1.35, h = 0.35);
    }
}

// 2. Gancho de Bloqueo Bifurcado (Pinch-Release Snap-Fit PCB Locking Standoff)
module snap_hook_post(x, y, d_shoulder = 3.6, h_shoulder = 2.0, rot_deg = 0) {
    translate([x, y, board_h])
    rotate([0, 0, rot_deg]) {
        difference() {
            union() {
                // 1. Hombro de apoyo inferior (sostiene la placa del módulo)
                cylinder(d1 = d_shoulder + 0.4, d2 = d_shoulder, h = 0.55);
                translate([0, 0, 0.55])
                    cylinder(d = d_shoulder, h = h_shoulder - 0.55);
                // 2. Cuello de encaje para el espesor de la PCB del módulo (1.65 mm, Ø 1.92 mm)
                translate([0, 0, h_shoulder])
                    cylinder(d = 1.92, h = 1.65);
                // 3. Cabeza en flecha / Gancho de retención superior (Ø 2.84 mm -> punta Ø 1.56 mm)
                translate([0, 0, h_shoulder + 1.65])
                    cylinder(d1 = 1.92, d2 = 2.84, h = 0.25);
                translate([0, 0, h_shoulder + 1.90])
                    cylinder(d1 = 2.84, d2 = 1.56, h = 2.50);
                translate([0, 0, h_shoulder + 4.40])
                    cylinder(d1 = 1.56, d2 = 0.90, h = 0.40);
            }
            // Ranura central elástica (0.72 mm) para apretar las 2 patillas con los dedos y liberar el módulo
            translate([-d_shoulder, -0.36, h_shoulder - 0.65])
                cube([d_shoulder * 2, 0.72, 6.20]);
        }
    }
}

// Parte 1: Cuerpo Base en PETG Gris (con perforaciones de pines y canales inferiores)
module baquelita_base_petg_gris() {
    difference() {
        // Placa sólida principal
        rounded_plate(board_w, board_d, board_h, corner_r);

        // 1. 4 Agujeros de fijación M3 en las esquinas
        for (sx = [-1, 1], sy = [-1, 1]) {
            translate([sx * 50.0, sy * 32.0, -0.5])
                cylinder(d = 3.2, h = board_h + 1.0);
        }

        // 2. Ranura y huecos para los 7 pines del SIM800L EVB (borde derecho)
        for (i = [-3 : 3]) {
            translate([sim_x + 17.5, sim_y - 1.0 + i * 2.54, -0.5])
                cylinder(d = 1.35, h = board_h + 1.0);
        }
        translate([sim_x + 17.5 - 1.2, sim_y - 1.0 - 9.5, -0.5])
            cube([2.4, 19.0, 1.4]); // Canal inferior de soldadura

        // 3. Ranura y huecos para los 4 pines del GY-GPS6MV2 (borde izquierdo)
        for (i = [-1.5 : 1 : 1.5]) {
            translate([gps_x - 15.5, gps_y + i * 2.54, -0.5])
                cylinder(d = 1.35, h = board_h + 1.0);
        }
        translate([gps_x - 15.5 - 1.2, gps_y - 5.5, -0.5])
            cube([2.4, 11.0, 1.4]);

        // 4. Ranura y huecos para los 8 pines del ITG/MPU6050 (borde superior)
        for (i = [0 : 7]) {
            translate([mpu_x - 8.89 + i * 2.54, mpu_y + 6.0, -0.5])
                cylinder(d = 1.35, h = board_h + 1.0);
        }
        translate([mpu_x - 10.5, mpu_y + 6.0 - 1.2, -0.5])
            cube([21.0, 2.4, 1.4]);

        // 5. Doble fila de 15 pines del ESP-32 Horizontal (separación entre filas = 25.4 mm)
        for (i = [0 : 14]) {
            // Fila Superior (VIN, GND, D13, D12, D14, D27, D26...)
            translate([esp_x - 18.78 + i * 2.54, esp_y + 12.7, -0.5])
                cylinder(d = 1.35, h = board_h + 1.0);
            // Fila Inferior (3V3, GND, D15, D2, D4, RX2, TX2, D5, D18, D19, D21, RX0, TX0, D22, D23)
            translate([esp_x - 18.78 + i * 2.54, esp_y - 12.7, -0.5])
                cylinder(d = 1.35, h = board_h + 1.0);
        }

        // 6. Entrada central de 5V y GND + Capacitor de 1000uF
        translate([-2.0, -4.0, -0.5]) cylinder(d = 1.4, h = board_h + 1.0);
        translate([-2.0, -6.54, -0.5]) cylinder(d = 1.4, h = board_h + 1.0);
        translate([-2.0,  5.0, -0.5]) cylinder(d = 1.2, h = board_h + 1.0);
        translate([-2.0,  8.5, -0.5]) cylinder(d = 1.2, h = board_h + 1.0);

        // 7. Canales guía inferiores (cara Z = 0 a Z = 1.3 mm) para alojar las pistas y cables
        translate([-12.0, -14.0, -0.1]) cube([24.0, 32.0, 1.3]); // Canal troncal central
        translate([esp_x - 20.0, esp_y - 14.0, -0.1]) cube([39.0, 2.6, 1.3]);
        translate([esp_x - 20.0, esp_y + 11.4, -0.1]) cube([39.0, 2.6, 1.3]);
        translate([mpu_x - 10.0, -33.0, -0.1]) cube([38.0, 2.4, 1.3]);
    }
}

// Parte 2: Soportes Mixtos en PETG Verde (2 Ganchos Snap-Fit en diagonal + 2 Palitos de Soporte en la otra diagonal)
module baquelita_cunas_petg_verde() {
    // Marco perimetral superior de refuerzo (0.8 mm de altura)
    translate([0, 0, board_h]) {
        difference() {
            rounded_plate(board_w, board_d, 0.8, corner_r);
            translate([0, 0, -0.5])
                rounded_plate(board_w - 4.0, board_d - 4.0, 2.0, corner_r - 1.0);
            // Liberar paso para conector USB-C o cables laterales
            for (sx = [-1, 1], sy = [-1, 1]) {
                translate([sx * 50.0, sy * 32.0, -0.5])
                    cylinder(d = 6.5, h = 2.0);
            }
        }
    }

    // 1. SIM800L EVB: 2 Ganchos Snap-Fit (Inf-Izq y Sup-Der) + 2 Palitos de Soporte (Sup-Izq y Inf-Der)
    snap_hook_post(sim_x - 17.75, sim_y - 11.2, 3.7, 2.2, 0);
    snap_hook_post(sim_x + 17.75, sim_y + 11.2, 3.7, 2.2, 0);
    smooth_support_pin(sim_x - 17.75, sim_y + 11.2, 3.4, 2.2);
    smooth_support_pin(sim_x + 17.75, sim_y - 11.2, 3.7, 2.2);

    // 2. GY-GPS6MV2: 2 Ganchos Snap-Fit (Sup-Izq y Inf-Der) + 2 Palitos de Soporte (Inf-Izq y Sup-Der)
    snap_hook_post(gps_x - 15.0, gps_y + 9.5, 3.6, 2.0, 0);
    snap_hook_post(gps_x + 15.0, gps_y - 9.5, 3.6, 2.0, 0);
    smooth_support_pin(gps_x - 15.0, gps_y - 9.5, 3.6, 2.0);
    smooth_support_pin(gps_x + 15.0, gps_y + 9.5, 3.6, 2.0);

    // 3. ITG/MPU6050: 1 Gancho Snap-Fit (Izq) + 1 Palito de Soporte (Der)
    snap_hook_post(mpu_x - 8.2, mpu_y - 5.8, 3.6, 2.0, 90);
    smooth_support_pin(mpu_x + 8.2, mpu_y - 5.8, 3.6, 2.0);

    // 4. ESP-32: 2 Ganchos Snap-Fit (Sup-Izq y Inf-Der) + 2 Palitos de Soporte (Inf-Izq y Sup-Der)
    snap_hook_post(esp_x - 22.0, esp_y + 12.5, 3.6, 2.0, 0);
    snap_hook_post(esp_x + 22.0, esp_y - 12.5, 3.6, 2.0, 0);
    smooth_support_pin(esp_x - 22.0, esp_y - 12.5, 3.6, 2.0);
    smooth_support_pin(esp_x + 22.0, esp_y + 12.5, 3.6, 2.0);
}

// Visualización / Exportación combinada
color("#64748b") baquelita_base_petg_gris();
color("#16a34a") baquelita_cunas_petg_verde();
