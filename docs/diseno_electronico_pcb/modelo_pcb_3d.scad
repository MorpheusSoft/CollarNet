// =============================================================================
// MODELADO 3D PARAMÉTRICO DE LAS PLACAS PCB - COLLARNET / COWAI V2
// Cara Superior (TOP) y Cara Inferior (BOTTOM)
// =============================================================================

$fn = 40;

// Colores realistas
C_PCB = [0.1, 0.25, 0.15];        // Verde FR4 profesional
C_PAD = [0.85, 0.7, 0.2];         // Oro ENIG
C_SILK = [0.95, 0.95, 0.95];      // Serigrafía blanca
C_IC = [0.15, 0.15, 0.15];        // Epoxi negro de chips
C_SHIELD = [0.8, 0.8, 0.82];      // Blindaje metálico niquelado (ESP32, SIM7670)
C_USB = [0.75, 0.75, 0.78];       // Conector metálico
C_TANTALUM = [0.75, 0.45, 0.1];   // Amarillo/Naranja tantalio
C_BUZZER = [0.1, 0.1, 0.1];       // Cilindro negro buzzer
C_COIL = [0.6, 0.2, 0.1];         // Mini bobina ferrita / cobre
C_CAP_HV = [0.8, 0.1, 0.1];       // Condensador rojo 1000V
C_ELECTRODE = [0.85, 0.85, 0.9];  // Pernos acero inox

// Selector de vista
// "top": Cara superior con chips
// "bottom": Cara inferior con pads, conectores y electrodos
// "both_side_by_side": Ambas caras desplegadas
view_mode = "both_side_by_side"; // [top, bottom, both_side_by_side]

module pcb_logica_top() {
    // Sustrato PCB 60 x 32 x 1.6 mm con esquinas redondeadas
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
    
    // Serigrafía COWAI LOGIC PCB
    color(C_SILK) {
        translate([16, 28.5, 1.61]) linear_extrude(0.05) text("COWAI LOGIC V2", size=2.0, font="Ubuntu:style=Bold");
        translate([40, 28.5, 1.61]) linear_extrude(0.05) text("ESP32-S3 + 4G/GNSS", size=1.4);
    }

    // ESP32-S3-WROOM-1 (18 x 25.5 x 3.2 mm)
    translate([8, 3, 1.6]) {
        color(C_SHIELD) cube([18, 25.5, 2.8]);
        // Antena PCB integrada
        color([0.2, 0.1, 0.05]) translate([0, 21.5, 2.8]) cube([18, 4, 0.4]);
        color(C_SILK) translate([2, 8, 2.85]) linear_extrude(0.05) text("ESP32-S3", size=1.8);
    }

    // SIMCom SIM7670SA Módem (24 x 24 x 2.4 mm)
    translate([29, 3, 1.6]) {
        color(C_SHIELD) cube([24, 24, 2.4]);
        color(C_SILK) {
            translate([2, 16, 2.45]) linear_extrude(0.05) text("SIM7670SA", size=2.0, font="Ubuntu:style=Bold");
            translate([2, 10, 2.45]) linear_extrude(0.05) text("LTE Cat-1 + GNSS", size=1.4);
        }
    }

    // Conector USB-C en el borde izquierdo
    translate([-1, 10, 1.6]) {
        color(C_USB) cube([7.5, 9, 3.2]);
    }

    // Conectores IPEX u.FL (LTE y GNSS)
    color(C_PAD) {
        translate([54.5, 8, 1.6]) cylinder(d=2.5, h=1.2);
        translate([54.5, 20, 1.6]) cylinder(d=2.5, h=1.2);
    }
    color(C_SILK) {
        translate([52, 5, 1.61]) linear_extrude(0.05) text("GPS", size=1.2);
        translate([52, 23, 1.61]) linear_extrude(0.05) text("LTE", size=1.2);
    }

    // Condensadores Tantalio 220uF (2x Case D)
    color(C_TANTALUM) {
        translate([26.5, 14, 1.6]) cube([7.3, 4.3, 2.8]);
        translate([26.5, 20, 1.6]) cube([7.3, 4.3, 2.8]);
    }

    // ICs SMD: CN3791 MPPT, SY8089 Buck, SC7A20 Acelerómetro
    color(C_IC) {
        translate([23, 4, 1.6]) cube([5, 4, 1.5]);      // CN3791 SOP-8
        translate([18, 4, 1.6]) cube([3, 2.8, 1.2]);    // SY8089 SOT-23-5
        translate([10, 28, 1.6]) cube([3, 3, 1.0]);     // SC7A20 LGA-16
    }
}

module pcb_logica_bottom() {
    // Sustrato PCB visto desde abajo
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

    // Serigrafía Cara Inferior
    color(C_SILK) {
        translate([52, 28, 1.61]) mirror([1,0,0]) linear_extrude(0.05) text("BOTTOM LAYER", size=1.8);
        translate([52, 6, 1.61]) mirror([1,0,0]) linear_extrude(0.05) text("COWAI DORSAL HARNESS", size=1.5);
    }

    // Ranura Porta Nano-SIM Push-Pull (12.5 x 11.5 mm)
    translate([30, 8, 1.6]) {
        color(C_USB) cube([12.5, 11.5, 1.4]);
        color([0.2, 0.2, 0.2]) translate([2, 2, 0.5]) cube([9, 7.5, 0.8]);
    }

    // Conector Header / Pads para Arnés Dorsal (5 Pines de 1.25mm)
    translate([8, 6, 1.6]) {
        color(C_PAD) {
            for(i=[0:4]) {
                translate([i*2.5, 0, 0]) cube([1.5, 3, 0.2]);
            }
        }
        color(C_SILK) {
            translate([18, 3.5, 1.61]) mirror([1,0,0]) linear_extrude(0.05) text("1:VBAT 2:GND 3:BUZ 4:IMP 5:SOL", size=1.2);
        }
    }
}

module pcb_potencia_top() {
    // Placa de Potencia 32 x 26 x 1.6 mm
    color(C_PCB)
    difference() {
        hull() {
            translate([2, 2, 0]) cylinder(r=2, h=1.6);
            translate([30, 2, 0]) cylinder(r=2, h=1.6);
            translate([30, 24, 0]) cylinder(r=2, h=1.6);
            translate([2, 24, 0]) cylinder(r=2, h=1.6);
        }
        // 2 Taladros M2.5
        translate([3.5, 3.5, -0.5]) cylinder(d=2.6, h=2.6);
        translate([3.5, 22.5, -0.5]) cylinder(d=2.6, h=2.6);
    }

    color(C_SILK) {
        translate([6, 23.5, 1.61]) linear_extrude(0.05) text("POWER & SHOCK", size=1.6, font="Ubuntu:style=Bold");
    }

    // Buzzer Piezoeléctrico (D=12.4mm, H=8mm)
    translate([23, 13, 1.6]) {
        color(C_BUZZER) cylinder(d=12.4, h=8.0);
        color([0.3, 0.3, 0.3]) translate([0, 0, 7.8]) cylinder(d=2.5, h=0.3); // Orificio acústico
    }

    // Mini Bobina Flyback HV (8 x 8 x 6 mm)
    translate([7, 12, 1.6]) {
        color(C_COIL) cube([8, 8, 6]);
    }

    // Condensador Rojo CDI 0.1uF 1000V
    translate([7, 4, 1.6]) {
        color(C_CAP_HV) cube([10, 4.5, 8]);
    }

    // Optoacoplador EL817C (SOP-4) + Tiristor MCR100
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

    // 2 Electrodos Inox M4 que sobresalen hacia el cuello
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

    color(C_SILK) {
        translate([26, 22, 1.61]) mirror([1,0,0]) linear_extrude(0.05) text("COW NECK ELECTRODES", size=1.4);
    }
}

// Renderizado según modo seleccionado
if (view_mode == "top") {
    // Solo cara superior
    pcb_logica_top();
    translate([70, 0, 0]) pcb_potencia_top();
} else if (view_mode == "bottom") {
    // Solo cara inferior (rotada)
    rotate([180, 0, 0]) pcb_logica_bottom();
    translate([70, 0, 0]) rotate([180, 0, 0]) pcb_potencia_bottom();
} else {
    // Desplegado simultáneo: Arriba TOP, Abajo BOTTOM
    // Fila 1: CARA SUPERIOR (TOP)
    translate([0, 15, 0]) pcb_logica_top();
    translate([70, 15, 0]) pcb_potencia_top();
    
    // Fila 2: CARA INFERIOR (BOTTOM)
    translate([0, -25, 0]) rotate([180, 0, 0]) pcb_logica_bottom();
    translate([70, -25, 0]) rotate([180, 0, 0]) pcb_potencia_bottom();
}
