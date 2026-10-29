// =============================================================================
// MODELADO 3D PARAMÉTRICO DE LAS PLACAS PCB - COLLARNET / COWAI V2
// Soporta Opción 1 (Modular 2 Placas) y Opción 2 (Monolítica All-In-One 110.6x33.1mm)
// =============================================================================

$fn = 36;

// Selector de Opción de Placa:
// "opcion1": 2 Placas Modulares (Lógica 60x32 mm + Potencia 32x26 mm)
// "opcion2": Placa Única Monolítica con Portapilas Integrado (110.6 x 33.1 mm)
// "ambas_comparativa": Despliega ambas opciones juntas para comparación dimensional
board_option = "opcion2"; // [opcion1, opcion2, ambas_comparativa]

// Selector de vista:
// "top": Solo Cara Superior con componentes SMT principales
// "bottom": Solo Cara Inferior con portapilas / pads / conectores
// "both_side_by_side": Ambas caras desplegadas (Arriba TOP, Abajo BOTTOM)
view_mode = "both_side_by_side"; // [top, bottom, both_side_by_side]

// Colores realistas
C_PCB = [0.08, 0.22, 0.12];        // Verde FR4 profesional oscuro
C_PAD = [0.85, 0.70, 0.20];        // Oro ENIG químico
C_SILK = [0.95, 0.95, 0.95];       // Serigrafía blanca
C_IC = [0.15, 0.15, 0.15];         // Epoxi negro de circuitos integrados
C_SHIELD = [0.80, 0.80, 0.82];     // Blindaje metálico niquelado (ESP32, SIM7670)
C_USB = [0.75, 0.75, 0.78];        // Conector USB niquelado
C_TANTALUM = [0.75, 0.45, 0.10];    // Amarillo/Naranja tantalio Case D
C_BUZZER = [0.10, 0.10, 0.10];      // Cilindro negro buzzer 95dB
C_COIL = [0.60, 0.20, 0.10];        // Mini bobina ferrita / hilo de cobre
C_CAP_HV = [0.80, 0.10, 0.10];      // Condensador rojo CBB21 1000V
C_ELECTRODE = [0.88, 0.88, 0.92];   // Pernos acero inox pulido M4
C_HOLDER = [0.18, 0.18, 0.20];      // Soporte plástico negro portapilas
C_CELL = [0.10, 0.50, 0.25];        // Celda Li-Ion 18650 verde esmeralda

// =============================================================================
// MÓDULOS OPCIÓN 1: MODULAR (LÓGICA 60x32 mm + POTENCIA 32x26 mm)
// =============================================================================

module pcb_logica_top() {
    color(C_PCB)
    difference() {
        hull() {
            translate([2, 2, 0]) cylinder(r=2, h=1.6);
            translate([58, 2, 0]) cylinder(r=2, h=1.6);
            translate([58, 30, 0]) cylinder(r=2, h=1.6);
            translate([2, 30, 0]) cylinder(r=2, h=1.6);
        }
        // 4 Taladros de fijación M2.5
        translate([3.5, 3.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([56.5, 3.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([56.5, 28.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([3.5, 28.5, -0.5]) cylinder(d=2.6, h=2.6);
    }
    
    // Serigrafía
    color(C_SILK) {
        translate([16, 28.5, 1.61]) linear_extrude(0.05) text("COWAI LOGIC V2", size=1.8, font="Liberation Sans:style=Bold");
        translate([40, 28.5, 1.61]) linear_extrude(0.05) text("60x32mm", size=1.4);
    }

    // ESP32-S3-WROOM-1 (18 x 25.5 x 2.8 mm)
    translate([8, 3, 1.6]) {
        color(C_SHIELD) cube([18, 25.5, 2.8]);
        color([0.2, 0.1, 0.05]) translate([0, 21.5, 2.8]) cube([18, 4, 0.4]);
        color(C_SILK) translate([2, 8, 2.85]) linear_extrude(0.05) text("ESP32-S3", size=1.6);
    }

    // SIM7670SA Módem (24 x 24 x 2.4 mm)
    translate([29, 3, 1.6]) {
        color(C_SHIELD) cube([24, 24, 2.4]);
        color(C_SILK) {
            translate([2, 14, 2.45]) linear_extrude(0.05) text("SIM7670SA", size=1.8, font="Liberation Sans:style=Bold");
            translate([2, 8, 2.45]) linear_extrude(0.05) text("4G + GNSS", size=1.3);
        }
    }

    // Conector USB-C en el borde izquierdo
    translate([-1, 10, 1.6]) color(C_USB) cube([7.5, 9, 3.2]);

    // Puertos IPEX RF
    color(C_PAD) {
        translate([54.5, 8, 1.6]) cylinder(d=2.5, h=1.2);
        translate([54.5, 20, 1.6]) cylinder(d=2.5, h=1.2);
    }

    // Condensadores Tantalio 220uF (2x Case D)
    color(C_TANTALUM) {
        translate([26.5, 14, 1.6]) cube([7.3, 4.3, 2.8]);
        translate([26.5, 20, 1.6]) cube([7.3, 4.3, 2.8]);
    }

    // ICs SMD
    color(C_IC) {
        translate([23, 4, 1.6]) cube([5, 4, 1.5]);      // CN3791 MPPT
        translate([18, 4, 1.6]) cube([3, 2.8, 1.2]);    // SY8089 Buck
        translate([10, 28, 1.6]) cube([3, 3, 1.0]);     // SC7A20 IMU
    }
}

module pcb_logica_bottom() {
    color(C_PCB)
    difference() {
        hull() {
            translate([2, 2, 0]) cylinder(r=2, h=1.6);
            translate([58, 2, 0]) cylinder(r=2, h=1.6);
            translate([58, 30, 0]) cylinder(r=2, h=1.6);
            translate([2, 30, 0]) cylinder(r=2, h=1.6);
        }
        translate([3.5, 3.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([56.5, 3.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([56.5, 28.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([3.5, 28.5, -0.5]) cylinder(d=2.6, h=2.6);
    }

    // Ranura Porta Nano-SIM Push-Pull (12.5 x 11.5 mm)
    translate([30, 8, 1.6]) {
        color(C_USB) cube([12.5, 11.5, 1.4]);
        color([0.2, 0.2, 0.2]) translate([2, 2, 0.5]) cube([9, 7.5, 0.8]);
    }

    // Conector Arnés Dorsal J5 (5 Pines)
    translate([8, 6, 1.6]) {
        color(C_PAD) {
            for(i=[0:4]) translate([i*2.5, 0, 0]) cube([1.5, 3, 0.2]);
        }
        color(C_SILK) {
            translate([18, 3.5, 1.61]) mirror([1,0,0]) linear_extrude(0.05) text("J5: ARNÉS DORSAL 5P", size=1.1);
        }
    }
}

module pcb_potencia_top() {
    color(C_PCB)
    difference() {
        hull() {
            translate([2, 2, 0]) cylinder(r=2, h=1.6);
            translate([30, 2, 0]) cylinder(r=2, h=1.6);
            translate([30, 24, 0]) cylinder(r=2, h=1.6);
            translate([2, 24, 0]) cylinder(r=2, h=1.6);
        }
        translate([3.5, 3.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([3.5, 22.5, -0.5]) cylinder(d=2.6, h=2.6);
    }

    // Serigrafía
    color(C_SILK) {
        translate([6, 23.5, 1.61]) linear_extrude(0.05) text("POWER & SHOCK", size=1.4, font="Liberation Sans:style=Bold");
    }

    // Buzzer Piezoeléctrico (D=12.4mm, H=8mm)
    translate([23, 13, 1.6]) {
        color(C_BUZZER) cylinder(d=12.4, h=8.0);
        color([0.3, 0.3, 0.3]) translate([0, 0, 7.8]) cylinder(d=2.5, h=0.3);
    }

    // Mini Bobina Flyback HV (8 x 8 x 6 mm)
    translate([7, 12, 1.6]) color(C_COIL) cube([8, 8, 6]);

    // Condensador Rojo CDI 0.1uF 1000V
    translate([7, 4, 1.6]) color(C_CAP_HV) cube([10, 4.5, 8]);

    // Optoacoplador EL817C + Tiristor
    color(C_IC) {
        translate([17, 4, 1.6]) cube([4.5, 4, 2.0]);
        translate([17, 9, 1.6]) cube([3, 2, 1.5]);
    }
}

module pcb_potencia_bottom() {
    color(C_PCB)
    difference() {
        hull() {
            translate([2, 2, 0]) cylinder(r=2, h=1.6);
            translate([30, 2, 0]) cylinder(r=2, h=1.6);
            translate([30, 24, 0]) cylinder(r=2, h=1.6);
            translate([2, 24, 0]) cylinder(r=2, h=1.6);
        }
        translate([3.5, 3.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([3.5, 22.5, -0.5]) cylinder(d=2.6, h=2.6);
    }

    // 2 Electrodos Inox M4
    translate([12, 13, 0]) {
        color(C_ELECTRODE) {
            cylinder(d=4.0, h=10);
            translate([0,0,10]) sphere(d=5.0);
        }
    }
    translate([24, 13, 0]) {
        color(C_ELECTRODE) {
            cylinder(d=4.0, h=10);
            translate([0,0,10]) sphere(d=5.0);
        }
    }

    // Conector Arnés J6 (5 Pines)
    translate([4, 6, 1.6]) {
        color(C_PAD) {
            for(i=[0:4]) translate([i*2.2, 0, 0]) cube([1.4, 2.8, 0.2]);
        }
        color(C_SILK) {
            translate([15, 3.5, 1.61]) mirror([1,0,0]) linear_extrude(0.05) text("J6: ARNÉS DORSAL", size=1.0);
        }
    }
}

// =============================================================================
// MÓDULOS OPCIÓN 2: MONOLÍTICA ALL-IN-ONE (110.6 x 33.1 mm)
// Compatible 100% con caja_3d/caja_lilygo_t7670x.scad (dx=27.75, dy=105.55mm)
// =============================================================================

mono_w = 33.1;
mono_l = 110.6;
mono_t = 1.6;
mono_dx = 27.75;
mono_dy = 105.55;

module pcb_monolitica_sustrato() {
    difference() {
        // Sustrato con esquinas redondeadas R=3.0mm
        hull() {
            translate([3, 3, 0]) cylinder(r=3, h=mono_t);
            translate([mono_w - 3, 3, 0]) cylinder(r=3, h=mono_t);
            translate([mono_w - 3, mono_l - 3, 0]) cylinder(r=3, h=mono_t);
            translate([3, mono_l - 3, 0]) cylinder(r=3, h=mono_t);
        }

        // 4 Taladros de fijación M2.5 coincidentes exactamente con los postes 3D
        translate([(mono_w - mono_dx)/2, (mono_l - mono_dy)/2, -0.5]) cylinder(d=2.6, h=mono_t + 1);
        translate([mono_w - (mono_w - mono_dx)/2, (mono_l - mono_dy)/2, -0.5]) cylinder(d=2.6, h=mono_t + 1);
        translate([mono_w - (mono_w - mono_dx)/2, mono_l - (mono_l - mono_dy)/2, -0.5]) cylinder(d=2.6, h=mono_t + 1);
        translate([(mono_w - mono_dx)/2, mono_l - (mono_l - mono_dy)/2, -0.5]) cylinder(d=2.6, h=mono_t + 1);

        // RANURA DE AISLAMIENTO FRESADA PASANTE 2.0 mm (CREEPAGE SLOT IEC 60664-1)
        // Ubicada a Y = 85.0 mm, longitud 23.0 mm (deja puente de borde para el optoacoplador)
        translate([2.0, 84.0, -0.5]) {
            hull() {
                translate([1.0, 1.0, 0]) cylinder(r=1.0, h=mono_t + 1);
                translate([22.0, 1.0, 0]) cylinder(r=1.0, h=mono_t + 1);
            }
        }
    }
}

module pcb_monolitica_top() {
    color(C_PCB) pcb_monolitica_sustrato();

    // Serigrafía de identificación
    color(C_SILK) {
        translate([6, 105.0, mono_t + 0.01]) linear_extrude(0.05) text("COWAI ALL-IN-ONE V2", size=1.8, font="Liberation Sans:style=Bold");
        translate([6, 101.5, mono_t + 0.01]) linear_extrude(0.05) text("110.6 x 33.1 mm · 4-LAYERS", size=1.2);
        translate([4, 82.5, mono_t + 0.01]) linear_extrude(0.05) text("BARRIER >5kV", size=1.0);
    }

    // 1. Conector USB-C en borde inferior
    translate([mono_w/2 - 4.5, -1.0, mono_t]) color(C_USB) cube([9.0, 7.5, 3.2]);

    // 2. Microcontrolador ESP32-S3-WROOM-1 (Y = 10 a 35.5 mm)
    translate([mono_w/2 - 9.0, 10.0, mono_t]) {
        color(C_SHIELD) cube([18.0, 25.5, 2.8]);
        color([0.2, 0.1, 0.05]) translate([0, 21.5, 2.8]) cube([18.0, 4.0, 0.4]); // Antena PCB
        color(C_SILK) translate([2, 10, 2.85]) linear_extrude(0.05) text("ESP32-S3", size=1.8);
    }

    // 3. Módem SIM7670SA 4G LTE + GNSS Combo (Y = 38 a 62 mm)
    translate([mono_w/2 - 12.0, 38.0, mono_t]) {
        color(C_SHIELD) cube([24.0, 24.0, 2.4]);
        color(C_SILK) {
            translate([2, 15, 2.45]) linear_extrude(0.05) text("SIM7670SA", size=2.0, font="Liberation Sans:style=Bold");
            translate([2, 9, 2.45]) linear_extrude(0.05) text("4G LTE + GPS", size=1.3);
        }
    }

    // Puertos IPEX u.FL RF
    color(C_PAD) {
        translate([mono_w - 4.5, 42.0, mono_t]) cylinder(d=2.5, h=1.2); // GPS
        translate([mono_w - 4.5, 54.0, mono_t]) cylinder(d=2.5, h=1.2); // LTE
    }

    // 4. Acelerómetro SC7A20 (Y = 22 mm, lateral)
    color(C_IC) translate([2.0, 22.0, mono_t]) cube([3.0, 3.0, 1.0]);

    // 5. Regulador Buck SY8089 3.3V + Inductor blindado 2.2uH (Y = 28 mm)
    color(C_IC) translate([2.0, 28.0, mono_t]) cube([3.0, 2.8, 1.2]);
    color(C_COIL) translate([2.0, 32.0, mono_t]) cube([4.0, 4.0, 2.0]);

    // 6. Cargador Solar MPPT CN3791 (Y = 64 mm)
    color(C_IC) translate([4.0, 64.0, mono_t]) cube([5.0, 4.0, 1.5]);
    color(C_COIL) translate([10.0, 64.0, mono_t]) cube([5.0, 5.0, 3.0]); // Inductor 10uH

    // 7. Zumbador Piezoeléctrico Pasivo Ø12.4mm x 8.0mm (Y = 71 mm)
    translate([mono_w/2, 74.0, mono_t]) {
        color(C_BUZZER) cylinder(d=12.4, h=8.0);
        color([0.3, 0.3, 0.3]) translate([0, 0, 7.8]) cylinder(d=2.5, h=0.3);
    }

    // 8. Optoacoplador EL817C cruzando la ranura de aislamiento (Y = 84 mm, X = 25 mm)
    translate([24.5, 82.5, mono_t]) {
        color(C_IC) cube([5.0, 5.0, 2.2]);
        color(C_PAD) {
            translate([-1, 1, 0]) cube([1, 1, 0.2]);
            translate([-1, 3, 0]) cube([1, 1, 0.2]);
            translate([5, 1, 0]) cube([1, 1, 0.2]);
            translate([5, 3, 0]) cube([1, 1, 0.2]);
        }
    }

    // 9. SECTOR DE ALTA TENSIÓN (Y = 86 a 110 mm)
    // Temporizador Watchdog 74LVC1G123
    color(C_IC) translate([4.0, 87.0, mono_t]) cube([3.0, 2.5, 1.0]);

    // Mini Bobina Flyback HV (3.7V -> 1000V)
    translate([10.0, 87.0, mono_t]) color(C_COIL) cube([8.5, 8.5, 6.0]);

    // Condensador CDI CBB21 0.1uF 1000V (0.05J)
    translate([4.0, 97.0, mono_t]) color(C_CAP_HV) cube([10.0, 4.5, 8.0]);

    // Tiristor SCR + Resistencia Limitadora 220R 2W
    color(C_IC) translate([16.0, 97.0, mono_t]) cube([4.5, 4.0, 1.8]);
    color([0.2, 0.5, 0.2]) translate([22.0, 97.0, mono_t]) cube([7.0, 3.0, 2.5]);

    // 2 Pads de salida para Electrodos Inox M4
    color(C_PAD) {
        translate([9.0, 106.0, mono_t]) cylinder(d=6.0, h=0.2);
        translate([24.0, 106.0, mono_t]) cylinder(d=6.0, h=0.2);
    }
}

module pcb_monolitica_bottom() {
    color(C_PCB) pcb_monolitica_sustrato();

    // Serigrafía Cara Inferior
    color(C_SILK) {
        translate([mono_w - 6, 105.0, mono_t + 0.01]) mirror([1,0,0]) linear_extrude(0.05) text("BOTTOM: BATTERY & SIM", size=1.6);
        translate([mono_w - 6, 101.5, mono_t + 0.01]) mirror([1,0,0]) linear_extrude(0.05) text("STANDOFF CAVITY: 24.5mm", size=1.2);
    }

    // 1. BASE / PORTAPILAS INTEGRADO 18650 (Keystone 1042 Clips SMD)
    // Spanning de Y = 16 mm a Y = 92 mm (longitud 76 mm)
    translate([mono_w/2, 54.0, mono_t]) {
        // Clips de contacto metálicos en extremos
        color(C_PAD) {
            translate([-6.0, -38.0, 0]) cube([12.0, 4.0, 12.0]); // Polo Negativo (-)
            translate([-6.0, 34.0, 0]) cube([12.0, 4.0, 12.0]);  // Polo Positivo (+)
        }
        // Celda Li-Ion 18650 simulada (D=18.5mm, L=65.0mm)
        translate([0, 0, 9.5]) {
            rotate([-90, 0, 0]) {
                color(C_CELL) cylinder(d=18.5, h=65.0, center=true);
                // Borne positivo dorado
                translate([0, 0, 32.5]) color(C_PAD) cylinder(d=6.0, h=1.5);
            }
        }
    }

    // 2. Ranura Porta Nano-SIM Push-Pull (Y = 10 mm, lateral a la batería)
    translate([2.0, 6.0, mono_t]) {
        color(C_USB) cube([12.5, 11.5, 1.4]);
        color([0.2, 0.2, 0.2]) translate([2, 2, 0.5]) cube([9.0, 7.5, 0.8]);
    }

    // 3. Conector JST Entrada Solar (Paneles Solares)
    translate([mono_w - 8.0, 6.0, mono_t]) {
        color([0.9, 0.9, 0.9]) cube([6.0, 8.0, 5.0]);
        color(C_PAD) {
            translate([1.5, 2, 5]) cylinder(d=0.8, h=1.5);
            translate([4.5, 2, 5]) cylinder(d=0.8, h=1.5);
        }
    }

    // 4. 2 Condensadores Tantalio 220uF bajo el módem SIM7670
    color(C_TANTALUM) {
        translate([2.5, 42.0, mono_t]) cube([7.3, 4.3, 2.8]);
        translate([2.5, 48.0, mono_t]) cube([7.3, 4.3, 2.8]);
    }

    // 5. Electrodos Inox M4 sobresaliendo hacia el cuello
    translate([9.0, 106.0, 0]) {
        color(C_ELECTRODE) {
            cylinder(d=4.0, h=12.0);
            translate([0, 0, 12.0]) sphere(d=5.5);
        }
    }
    translate([24.0, 106.0, 0]) {
        color(C_ELECTRODE) {
            cylinder(d=4.0, h=12.0);
            translate([0, 0, 12.0]) sphere(d=5.5);
        }
    }
}

// =============================================================================
// RENDERIZADO GLOBAL SEGÚN OPCIONES
// =============================================================================

if (board_option == "opcion1") {
    // Renderizado Opción 1: Modular (Lógica + Potencia)
    if (view_mode == "top") {
        pcb_logica_top();
        translate([70, 0, 0]) pcb_potencia_top();
    } else if (view_mode == "bottom") {
        rotate([180, 0, 0]) pcb_logica_bottom();
        translate([70, 0, 0]) rotate([180, 0, 0]) pcb_potencia_bottom();
    } else {
        // Both sides
        translate([0, 15, 0]) pcb_logica_top();
        translate([70, 15, 0]) pcb_potencia_top();
        translate([0, -25, 0]) rotate([180, 0, 0]) pcb_logica_bottom();
        translate([70, -25, 0]) rotate([180, 0, 0]) pcb_potencia_bottom();
    }
} else if (board_option == "opcion2") {
    // Renderizado Opción 2: Monolítica Integrada All-In-One (110.6 x 33.1 mm)
    if (view_mode == "top") {
        pcb_monolitica_top();
    } else if (view_mode == "bottom") {
        rotate([180, 0, 0]) pcb_monolitica_bottom();
    } else {
        // Both sides side-by-side
        translate([-22, 0, 0]) pcb_monolitica_top();
        translate([22, 0, 0]) rotate([0, 180, 0]) pcb_monolitica_bottom();
    }
} else {
    // Comparativa Directa Ambas Opciones Lado a Lado
    // Izquierda: Opción 1 Modular (60x32 + 32x26)
    translate([-60, 0, 0]) {
        pcb_logica_top();
        translate([70, 0, 0]) pcb_potencia_top();
    }
    // Derecha: Opción 2 Monolítica (110.6x33.1)
    translate([60, 0, 0]) {
        pcb_monolitica_top();
    }
}
