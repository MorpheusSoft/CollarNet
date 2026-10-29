// =============================================================================
// COMPONENTES Y DISPOSITIVOS INTERNOS - COLLAR GANADERO COWAI V2 (REV 2.1)
// Modela con exactitud milimétrica las 2 PCBs a medida (Lógica/RF y Potencia/CDI),
// batería Li-Ion 21700 + BMS, antenas GNSS y 4G LTE FPC, zumbador 95dB,
// electrodos inox 316 M4, visor LED, paneles solares RY9-414, cincha y arnés 5P.
// =============================================================================

caller_part = "none";
include <collar_halter_v2.scad>

$fn = 32;

// -----------------------------------------------------------------------------
// 1. BATERÍA LI-ION 21700 (3.7V / 5000 mAh - PACK 21700-3P CON BMS 1S)
// Tamaño: 72.0 mm (largo) x 65.4 mm (ancho) x 21.2 mm (alto)
// Encaja en cavidad de 76.0 x 70.0 x 24.0 mm (Holguras: +4.0mm X, +4.6mm Y, +2.8mm Z)
// -----------------------------------------------------------------------------
module comp_bateria_21700_3p() {
    cell_d = 21.2;
    cell_l = 70.0;
    
    union() {
        // Celdas cilíndricas Li-Ion 21700 Grado A (3.7V)
        color([0.15, 0.45, 0.85]) {
            hull() {
                translate([cell_l/2, cell_d/2, cell_d/2])
                    rotate([0, 90, 0]) cylinder(r=cell_d/2, h=cell_l, center=true);
                translate([cell_l/2, cell_d + cell_d/2, cell_d/2])
                    rotate([0, 90, 0]) cylinder(r=cell_d/2, h=cell_l, center=true);
                translate([cell_l/2, 2*cell_d + cell_d/2, cell_d/2])
                    rotate([0, 90, 0]) cylinder(r=cell_d/2, h=cell_l, center=true);
            }
        }
        
        // Pletinas de níquel puro en los polos frontales y traseros
        color([0.85, 0.85, 0.90]) {
            translate([-0.5, cell_d/2 - 4, cell_d/2 - 4])
                cube([1.0, 2*cell_d + 8, 8]);
            translate([cell_l - 0.5, cell_d/2 - 4, cell_d/2 - 4])
                cube([1.0, 2*cell_d + 8, 8]);
        }
        
        // Placa BMS 1S (DW01A + FS8205A + Fusible PPTC 3.0A)
        color([0.1, 0.6, 0.3]) {
            translate([8, -1.8, cell_d/2 - 3])
                cube([cell_l - 16, 2.0, 6.0]);
        }
        
        // Cables de salida de silicona hacia Placa de Potencia
        color([0.9, 0.1, 0.1]) {
            translate([cell_l, cell_d, cell_d - 3])
                rotate([0, 90, 0]) cylinder(r=1.2, h=14, $fn=16);
        }
        color([0.1, 0.1, 0.1]) {
            translate([cell_l, 2*cell_d, cell_d - 3])
                rotate([0, 90, 0]) cylinder(r=1.2, h=14, $fn=16);
        }
    }
}

// -----------------------------------------------------------------------------
// 2. PLACA PCB LÓGICA Y TELECOMUNICACIONES RF COWAI V2 (CÁPSULA IZQUIERDA)
// Dimensiones PCB: 60.0 mm x 32.0 mm x 1.6 mm (2 Capas FR4 ENIG Oro)
// Integra: ESP32-S3-WROOM-1-N16R8 + SIM7670SA 4G/GNSS + MPPT CN3791 +
//          Buck SY8089 3.3V/2A + Acelerómetro SC7A20 (6uA) + 2x Tantalio 220uF +
//          USB-C 16P + Porta Nano-SIM (Bottom) + 2x IPEX u.FL + Arnés Dorsal 5P
// -----------------------------------------------------------------------------
module comp_placa_logica_rf() {
    pcb_l_real = 60.0;
    pcb_w_real = 32.0;
    pcb_t = 1.6;
    
    union() {
        // Sustrato PCB FR4 2 Capas (60.0 x 32.0 x 1.6 mm) con 4 taladros M2.5
        difference() {
            r_box(pcb_l_real, pcb_w_real, pcb_t, 2.0);
            translate([3.5, 3.5, -0.5]) cylinder(d=2.6, h=pcb_t + 1.0, $fn=20);
            translate([56.5, 3.5, -0.5]) cylinder(d=2.6, h=pcb_t + 1.0, $fn=20);
            translate([56.5, 28.5, -0.5]) cylinder(d=2.6, h=pcb_t + 1.0, $fn=20);
            translate([3.5, 28.5, -0.5]) cylinder(d=2.6, h=pcb_t + 1.0, $fn=20);
        }
        
        // U1: Microcontrolador Espressif ESP32-S3-WROOM-1-N16R8 (18.0 x 25.5 x 3.2 mm)
        translate([7.0, 3.2, pcb_t]) {
            cube([18.0, 21.5, 3.0]);
            // Antena PCB integrada Wi-Fi/BLE
            translate([0, 21.5, 0]) cube([18.0, 4.0, 0.8]);
        }
        
        // U2: Módem Celular 4G LTE Cat-1 + GNSS SIMCom SIM7670SA-MNGV (24.0 x 24.0 x 2.4 mm)
        translate([28.5, 3.2, pcb_t]) {
            cube([24.0, 24.0, 2.5]);
        }
        
        // C1, C2: 2x Condensadores de Tantalio Baja ESR 220uF 6.3V (Case D 7.3 x 4.3 x 2.8 mm)
        translate([26.0, 27.6, pcb_t]) cube([7.3, 3.8, 2.8]);
        translate([34.5, 27.6, pcb_t]) cube([7.3, 3.8, 2.8]);
        
        // U4: Cargador Solar MPPT CN3791 (SOP-10) + L2 Inductor Blindado 10uH + Diodos SS34
        translate([43.0, 27.6, pcb_t]) cube([5.0, 3.8, 1.6]);
        translate([49.0, 27.5, pcb_t]) cube([4.0, 4.0, 3.0]); // Inductor L2 10uH
        
        // U5: Regulador Buck Síncrono SY8089 (3.3V 2A) + L1 Inductor 2.2uH
        translate([18.0, 28.0, pcb_t]) cube([3.0, 2.8, 1.4]);
        translate([21.8, 27.6, pcb_t]) cube([3.5, 3.5, 2.0]); // Inductor L1 2.2uH
        
        // U3: Acelerómetro Digital 3 Ejes Silan SC7A20 (LGA-12, 6uA reposo)
        translate([12.0, 28.2, pcb_t]) cube([3.0, 3.0, 1.1]);
        
        // J1: Conector USB-C Hembra 16P (USB 2.0 Nativo D+/D-)
        translate([-1.2, 11.5, pcb_t]) cube([7.5, 9.0, 3.2]);
        
        // J3, J4: 2x Conectores Coaxiales RF 50 Ohms u.FL / IPEX (GNSS y 4G LTE)
        translate([55.0, 9.5, pcb_t]) cylinder(d=2.6, h=1.2, $fn=20);
        translate([55.0, 21.5, pcb_t]) cylinder(d=2.6, h=1.2, $fn=20);
        
        // Cara Inferior (Bottom Layer): J2 Porta Nano-SIM Push-Pull (12.5 x 11.5 x 1.4 mm)
        translate([30.0, 9.5, -1.4]) cube([12.5, 11.5, 1.4]);
        
        // TB1: Conector Arnés Puente Dorsal 5 Pines (1:VBAT, 2:GND, 3:BUZ, 4:IMP, 5:SOL)
        translate([7.5, 7.0, -1.2]) cube([4.0, 12.5, 1.2]);
    }
}

// -----------------------------------------------------------------------------
// 3. ANTENA CERÁMICA PATCH GNSS (GPS + GLONASS + GALILEO)
// Dimensiones: 25.5 x 25.5 x 5.2 mm en cuna sobreelevada apuntando al cielo
// -----------------------------------------------------------------------------
module comp_antena_gnss() {
    union() {
        // Plano de masa metálico inferior
        translate([0, 0, 0])
            r_box(26.0, 26.0, 0.8, 1.0);
                
        // Parche dieléctrico cerámico de alta permitividad
        translate([0.5, 0.5, 0.8])
            r_box(25.0, 25.0, 4.0, 1.0);
                
        // Electrodo resonador de plata en la cara superior
        translate([2.5, 2.5, 4.8])
            cube([21.0, 21.0, 0.15]);
                
        // Pin de alimentación central RF
        translate([13.0, 13.0, 4.95])
            cylinder(r=0.9, h=0.3, $fn=16);
    }
}

// -----------------------------------------------------------------------------
// 4. ANTENA 4G LTE FPC ADHESIVA INTERNA + PIGTAIL COAXIAL IPEX
// Dimensiones: 40.0 x 14.0 x 1.2 mm adherida a la pared interior de la cápsula
// -----------------------------------------------------------------------------
module comp_antena_lte_fpc() {
    union() {
        // Lámina flexible de poliimida FPC con dipolo multibanda 4G LTE
        r_box(40.0, 1.2, 13.0, 0.5);
        // Relieve de pistas radiantes de cobre en la cara interior
        translate([3.0, 1.1, 2.0]) cube([14.0, 0.3, 9.0]);
        translate([21.0, 1.1, 2.0]) cube([16.0, 0.3, 9.0]);
        // Punto de soldadura del cable coaxial RF 1.13mm hacia conector IPEX J4
        translate([19.0, 1.2, 6.5]) rotate([-90, 0, 0]) cylinder(d=2.2, h=4.5, $fn=16);
    }
}

// -----------------------------------------------------------------------------
// 5. BARRA DIFUSORA VERTICAL LED DE ESTADO (HOMBRO CÁPSULA IZQUIERDA)
// Dimensiones: 3.0 x 26.0 x 7.5 mm (Acrílico / PETG Translúcido Verde)
// -----------------------------------------------------------------------------
module comp_led_status() {
    r_box(3.0, 26.0, 7.5, 0.8);
}

// -----------------------------------------------------------------------------
// 6. PLACA PCB DE POTENCIA, AUDIO Y DESCARGA CDI (CÁPSULA DERECHA)
// Dimensiones: 26.0 mm (X) x 32.0 mm (Y) x 1.6 mm (2 Capas FR4 ENIG)
// Integra: BMS 1S (DW01A+FS8205A+PPTC 3A) + Driver Buzzer (AO3400A) +
//          Optoacoplador EL817C (5kV) + Watchdog Hardware 1000ms (74LVC1G123) +
//          Bobina Flyback HV (1000V) + Condensador CDI 0.1uF 1kV (CBB21) +
//          Tiristor SCR (TYN1225RG / MCR100-6) + Ranura fresada de aislamiento 1.5mm
// -----------------------------------------------------------------------------
module comp_placa_potencia_cdi() {
    pwr_x = 26.0;
    pwr_y = 32.0;
    pcb_t = 1.6;
    
    union() {
        // Sustrato PCB con ranura fresada de aislamiento galvánico (1.5 mm) y 2 taladros M2.5
        difference() {
            r_box(pwr_x, pwr_y, pcb_t, 2.0);
            // 2 taladros de montaje M2.5
            translate([3.5, 3.5, -0.5]) cylinder(d=2.6, h=pcb_t + 1.0, $fn=20);
            translate([22.5, 3.5, -0.5]) cylinder(d=2.6, h=pcb_t + 1.0, $fn=20);
            // Ranura fresada de aislamiento galvánico (Milling Slot 1.5 mm) entre lógica y 1000V
            translate([4.0, 13.5, -0.5]) cube([18.0, 1.5, pcb_t + 1.0]);
        }
        
        // Zona Baja Tensión (Y = 0..13.5):
        // U6 (DW01A) + U7 (FS8205A) + F1 (Fusible PPTC 3.0A) + Q1 (Driver Buzzer AO3400A)
        translate([6.5, 2.5, pcb_t]) cube([3.0, 3.0, 1.2]);   // DW01A
        translate([11.0, 2.5, pcb_t]) cube([4.5, 3.2, 1.2]);  // FS8205A
        translate([17.0, 2.5, pcb_t]) cube([4.5, 3.2, 1.0]);  // PPTC 3.0A
        translate([6.5, 8.0, pcb_t]) cube([3.0, 2.5, 1.2]);   // AO3400A MOSFET
        translate([11.5, 8.0, pcb_t]) cube([3.2, 3.0, 1.3]);  // U9: 74LVC1G123 Watchdog 1000ms
        
        // U8: Optoacoplador EL817C (SOP-4, puenteando la ranura de aislamiento galvánico 5kV)
        translate([10.5, 12.2, pcb_t]) cube([4.6, 4.2, 2.0]);
        
        // Zona Alta Tensión Aislada (Y = 15..32):
        // MOD_HV / TX1: Mini Bobina / Módulo Elevador Flyback HV (3.7V a 800-1000V)
        translate([2.5, 17.5, pcb_t]) cube([10.5, 11.5, 6.5]);
        
        // C7: Condensador de Descarga Pulso Cerca Virtual CDI 0.1uF 1000V (CBB21 Polipropileno)
        translate([14.5, 17.5, pcb_t]) cube([9.5, 5.2, 7.5]);
        
        // TH1: Tiristor SCR 1200V (TYN1225RG / MCR100-6) + Resistencia Limitadora 220R 2W
        translate([14.5, 24.5, pcb_t]) cube([6.5, 5.5, 2.3]);
        translate([22.0, 24.0, pcb_t]) cylinder(d=2.8, h=6.0, $fn=16); // R_LIMIT 220 Ohm 2W
    }
}

// -----------------------------------------------------------------------------
// 7. ZUMBADOR PIEZOELÉCTRICO PASIVO 95 dB @ 4000 Hz (CÁPSULA DERECHA)
// Dimensiones: Ø12.4 mm x 8.0 mm en cámara acústica con cono resonador
// -----------------------------------------------------------------------------
module comp_buzzer() {
    union() {
        difference() {
            cylinder(r=12.4/2, h=8.0, $fn=32);
            translate([0, 0, 6.5])
                cylinder(r=1.6, h=2.0, $fn=20);
        }
        // Símbolo (+) en relieve
        translate([3.2, 3.2, 8.0]) cube([1.6, 0.4, 0.15], center=true);
        translate([3.2, 3.2, 8.0]) cube([0.4, 1.6, 0.15], center=true);
    }
}

// -----------------------------------------------------------------------------
// 8. 2x ELECTRODOS DE CUELLO ACERO INOXIDABLE 316 M4 + O-RINGS EPDM
// Ubicados en X = 94.0 y X = 108.0, Y = 72.0 (base inferior cápsula derecha)
// Sobresalen hacia el cuello de la res para transmitir el pulso CDI de 0.05J
// -----------------------------------------------------------------------------
module single_electrode_m4() {
    union() {
        // Tuerca y terminal superior de conexión en el interior de la cápsula (Z = 10.5..13.5)
        translate([0, 0, 10.5]) cylinder(d=7.0, h=2.8, $fn=6);
        // Vástago roscado M4 de acero inoxidable marino 316 atravesando el piso
        translate([0, 0, -7.5]) cylinder(d=4.0, h=21.5, $fn=24);
        // Junta tórica de estanqueidad EPDM (O-Ring) en la cajera inferior (Z = 0)
        translate([0, 0, -0.8]) cylinder(d=7.2, h=1.8, $fn=24);
        // Cabeza de contacto semiesférica pulida anti-rozaduras hacia el cuello (Z = -7.5)
        translate([0, 0, -7.5]) sphere(d=6.8, $fn=28);
    }
}

module comp_electrodos_inox() {
    union() {
        translate([0, 0, 0]) single_electrode_m4();
        translate([14.0, 0, 0]) single_electrode_m4();
    }
}

// -----------------------------------------------------------------------------
// 9. PANEL SOLAR MONOCRISTALINO EPOXI RY9-414 (60.0 x 55.0 x 2.2 mm)
// Orientado exactamente según la cajera enrasada de las tapas (solar_l=60, solar_w=55)
// -----------------------------------------------------------------------------
module comp_panel_solar() {
    union() {
        // Sustrato y encapsulado epoxi resistente UV (60.0 x 55.0 x 2.0 mm)
        r_box(60.0, 55.0, 2.0, 2.0);
            
        // Células fotovoltaicas de silicio monocristalino
        for (ix = [0:2]) {
            for (iy = [0:1]) {
                translate([3.0 + ix*18.5, 3.0 + iy*25.0, 1.85])
                    cube([17.5, 24.0, 0.25]);
            }
        }
        
        // Busbars colectores metálicos
        for (iy = [0:1]) {
            translate([2.0, 3.0 + iy*25.0 + 7.5, 2.0]) cube([56.0, 0.6, 0.12]);
            translate([2.0, 3.0 + iy*25.0 + 16.5, 2.0]) cube([56.0, 0.6, 0.12]);
        }
    }
}

// -----------------------------------------------------------------------------
// 10. CINCHA GANADERA COMPLETA CONTINUA (OPCIÓN A - 50 mm x 3.0 mm)
// -----------------------------------------------------------------------------
module comp_cincha_ganadera_completa() {
    ang = bridge_half_ang;
    x_j = bridge_r_inner * sin(ang);
    z_j = bridge_r_inner * cos(ang);
    w = 50.0;
    t = 3.0;

    union() {
        // Tramo derecho
        translate([x_j, 0, z_j])
            rotate([0, ang, 0])
                translate([-5, -w/2, tunnel_t + 0.5])
                    cube([pod_l + 25, w, t]);
                    
        // Tramo izquierdo
        mirror([1, 0, 0])
            translate([x_j, 0, z_j])
                rotate([0, ang, 0])
                    translate([-5, -w/2, tunnel_t + 0.5])
                        cube([pod_l + 25, w, t]);

        // Arco continuo central por el túnel del puente
        rotate([90, 0, 0]) {
            rotate([0, 0, 90 - ang])
                rotate_extrude(angle = 2 * ang, $fn=90)
                    translate([bridge_r_inner + tunnel_t + 0.5, -w/2])
                        square([t, w]);
        }
    }
}

// -----------------------------------------------------------------------------
// 11. ARNÉS DE 5 HILOS DE BAJA TENSIÓN INTER-CÁPSULAS (Ø7.0 mm a Z = 17.0 mm)
// Hilos: 1:VBAT_PWR, 2:GND_SYS, 3:BUZZER_PWM, 4:IMPULSE_TRIG, 5:SOLAR_DER_IN
// -----------------------------------------------------------------------------
module comp_arnes_cables_completo() {
    ang = bridge_half_ang;
    x_j = bridge_r_inner * sin(ang);
    z_j = bridge_r_inner * cos(ang);

    union() {
        // Tramo derecho hacia cápsula de potencia
        translate([x_j, 0, z_j])
            rotate([0, ang, 0])
                translate([-3, 0, conduit_z])
                    rotate([0, 90, 0]) cylinder(r=3.5, h=22, $fn=24);

        // Tramo izquierdo hacia cápsula lógica
        mirror([1, 0, 0])
            translate([x_j, 0, z_j])
                rotate([0, ang, 0])
                    translate([-3, 0, conduit_z])
                        rotate([0, 90, 0]) cylinder(r=3.5, h=22, $fn=24);

        // Arco continuo a través del puente dorsal
        rotate([90, 0, 0]) {
            rotate([0, 0, 90 - ang])
                rotate_extrude(angle = 2 * ang, $fn=90)
                    translate([bridge_r_inner + conduit_z, 0])
                        circle(r=3.5, $fn=24);
        }
    }
}

// Selector de exportación individual para STL
part_comp = "all";

if (part_comp == "bateria") {
    comp_bateria_21700_3p();
} else if (part_comp == "lilygo" || part_comp == "pcb_logica") {
    comp_placa_logica_rf();
} else if (part_comp == "antena") {
    comp_antena_gnss();
} else if (part_comp == "antena_lte") {
    comp_antena_lte_fpc();
} else if (part_comp == "led_status") {
    comp_led_status();
} else if (part_comp == "mppt" || part_comp == "pcb_potencia") {
    comp_placa_potencia_cdi();
} else if (part_comp == "buzzer") {
    comp_buzzer();
} else if (part_comp == "electrodos") {
    comp_electrodos_inox();
} else if (part_comp == "solar") {
    comp_panel_solar();
} else if (part_comp == "cincha") {
    comp_cincha_ganadera_completa();
} else if (part_comp == "arnes") {
    comp_arnes_cables_completo();
} else {
    translate([0, 0, 0]) comp_bateria_21700_3p();
    translate([100, 0, 0]) comp_placa_logica_rf();
    translate([100, 50, 0]) comp_antena_gnss();
    translate([140, 50, 0]) comp_antena_lte_fpc();
    translate([0, 80, 0]) comp_placa_potencia_cdi();
    translate([40, 80, 0]) comp_buzzer();
    translate([65, 80, 0]) comp_electrodos_inox();
    translate([-80, 0, 0]) comp_panel_solar();
}
