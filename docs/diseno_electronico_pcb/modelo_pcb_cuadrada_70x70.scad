// ==============================================================================
// CollarNet V3 — Modelo 3D de PCB Cuadrada (70.0 x 70.0 mm) y Caja Puck IP67
// Microcontrolador ESP32-S3 | Módem SIM7670SA 4G+GNSS | Plano Masa 60x60mm
// Batería Panasonic NCR18650B (3400mAh) en Diagonal | Etapa Choque CDI 1000V
// ==============================================================================

$fn = 40;

// Selector de vista:
// "pcb"     -> Solo la baquelita con componentes y batería
// "top"     -> Vista superior de la PCB
// "bottom"  -> Vista inferior de la PCB con portapilas 18650
// "caja"    -> PCB dentro de la nueva caja cuadrada IP67
// "todo"    -> Ensamble completo explotado con panel solar 70x70mm
view_mode = "pcb"; 

// Dimensiones de la placa
pcb_w = 70.0;
pcb_h = 70.0;
pcb_t = 1.6;
corner_r = 4.0;
hole_d = 3.2;      // Taladros M2.5 / M3
hole_offset = 5.0; // Distancia a bordes (dx=60mm, dy=60mm)

// Colores realistas
c_fr4       = [0.08, 0.38, 0.22, 1.0]; // Verde Soldermask
c_gnd_plane = [0.85, 0.55, 0.20, 0.8]; // Plano de cobre / Gold ENIG
c_ic        = [0.12, 0.12, 0.12, 1.0]; // Silicio / Epoxi negro
c_shield    = [0.75, 0.78, 0.80, 1.0]; // Metal apantallamiento
c_gold      = [0.90, 0.75, 0.25, 1.0]; // Conectores dorados U.FL
c_cap       = [0.70, 0.20, 0.15, 1.0]; // Condensador rojo CBB21
c_bat       = [0.45, 0.80, 0.25, 1.0]; // Verde Panasonic NCR18650B
c_clip      = [0.70, 0.70, 0.72, 1.0]; // Níquel acero resorte
c_caja      = [0.92, 0.92, 0.94, 0.6]; // Carcasa ABS blanco / traslúcido
c_solar     = [0.10, 0.15, 0.25, 1.0]; // Célula monocristalina azul marino

// ------------------------------------------------------------------------------
// Módulo: Baquelita Base con Taladros y Ranura en "L"
// ------------------------------------------------------------------------------
module pcb_substrate() {
    difference() {
        // Sustrato con esquinas redondeadas
        hull() {
            translate([corner_r, corner_r, 0]) cylinder(r=corner_r, h=pcb_t);
            translate([pcb_w - corner_r, corner_r, 0]) cylinder(r=corner_r, h=pcb_t);
            translate([corner_r, pcb_h - corner_r, 0]) cylinder(r=corner_r, h=pcb_t);
            translate([pcb_w - corner_r, pcb_h - corner_r, 0]) cylinder(r=corner_r, h=pcb_t);
        }
        
        // 4 Taladros de fijación M3 (distancia 60 x 60 mm)
        translate([hole_offset, hole_offset, -0.5]) cylinder(d=hole_d, h=pcb_t + 1);
        translate([pcb_w - hole_offset, hole_offset, -0.5]) cylinder(d=hole_d, h=pcb_t + 1);
        translate([hole_offset, pcb_h - hole_offset, -0.5]) cylinder(d=hole_d, h=pcb_t + 1);
        translate([pcb_w - hole_offset, pcb_h - hole_offset, -0.5]) cylinder(d=hole_d, h=pcb_t + 1);
        
        // Ranura pasante fresada en "L" (2.0 mm ancho) para aislamiento de 1000V
        // Separa la esquina Sureste (x: 44 a 70, y: 0 a 44)
        translate([45, -1, -0.5]) cube([2.0, 46.0, pcb_t + 1]);
        translate([45, 45, -0.5]) cube([26.0, 2.0, pcb_t + 1]);
    }
}

// ------------------------------------------------------------------------------
// Módulo: Plano de Masa Continuo GND (60.0 x 60.0 mm)
// ------------------------------------------------------------------------------
module ground_plane_60x60() {
    color(c_gnd_plane)
    difference() {
        translate([5, 5, pcb_t + 0.02])
        cube([60.0, 60.0, 0.05]);
        
        // Exclusión de la zona de alta tensión
        translate([44, -1, pcb_t]) cube([30, 50, 0.1]);
    }
}

// ------------------------------------------------------------------------------
// Módulo: Componentes Cara Superior (TOP)
// ------------------------------------------------------------------------------
module top_components() {
    // 1. ESP32-S3-WROOM-1 (Noroeste)
    translate([6, 38, pcb_t]) {
        color(c_ic) cube([18, 25.5, 0.8]);            // Módulo PCB
        color(c_shield) translate([1, 6, 0.8]) cube([16, 18, 2.4]); // Blindaje RF
        color([0.2, 0.2, 0.2]) translate([2, 0.5, 0.8]) cube([14, 4.5, 0.5]); // Antena PCB 2.4GHz
    }
    
    // 2. Módem SIM7670SA 4G LTE Cat-1 + GNSS (Noreste)
    translate([36, 40, pcb_t]) {
        color(c_shield) cube([24, 24, 2.6]);
        // Conectores IPEX / U.FL dorados (LTE + GNSS)
        color(c_gold) translate([3, 2, 2.6]) cylinder(d=2.0, h=1.0);
        color(c_gold) translate([21, 2, 2.6]) cylinder(d=2.0, h=1.0);
    }
    
    // 3. Antena Parche Cerámica GPS (25 x 25 x 4 mm) centrada en Plano de Masa
    translate([16, 12, pcb_t]) {
        color([0.85, 0.85, 0.82]) cube([25, 25, 4.0]); // Cerámica
        color(c_shield) translate([11, 11, 4.0]) cylinder(d=3.0, h=0.2); // Pin central
    }
    
    // 4. Cargador Solar MPPT CN3791 (SSOP-10) + Inductor 10uH (Suroeste)
    translate([4, 12, pcb_t]) {
        color(c_ic) cube([5, 4, 1.2]); // CN3791
        color([0.3, 0.3, 0.3]) translate([0, 5, 0]) cube([4.5, 4.5, 3.0]); // Inductor SWPA
    }
    
    // 5. Regulador Buck SY8089 3.3V / 2A (SOT-23-5)
    translate([4, 24, pcb_t]) {
        color(c_ic) cube([3, 2.8, 1.1]);
    }
    
    // 6. Acelerómetro I2C SC7A20 (LGA-12)
    translate([12, 34, pcb_t]) {
        color(c_ic) cube([2, 2, 1.0]);
    }
    
    // 7. Zumbador Piezoeléctrico 95dB (Dorsal)
    translate([10, pcb_h - 10, pcb_t]) {
        color(c_ic) cylinder(d=12.0, h=5.0);
        color([0.05, 0.05, 0.05]) translate([0, 0, 5.0]) cylinder(d=2.5, h=0.2); // Puerto acústico
    }
    
    // 8. Conector Magnético Pogo-Pin IP68 (4 Pines: +5V, D-, D+, GND)
    translate([-2.0, 24, pcb_t]) {
        color([0.15, 0.15, 0.15]) cube([6.0, 16.0, 3.5]); // Carcasa conector
        // 2 Imanes de neodimio laterales (N/S inverso para polaridad segura)
        color(c_shield) translate([0.5, 2.0, 1.75]) rotate([0, 90, 0]) cylinder(d=2.8, h=1.2);
        color(c_shield) translate([0.5, 14.0, 1.75]) rotate([0, 90, 0]) cylinder(d=2.8, h=1.2);
        // 4 Pines Pogo dorados (+5V, USB D-, USB D+, GND)
        color(c_gold) {
            translate([0.5, 5.0, 1.75]) rotate([0, 90, 0]) cylinder(d=1.3, h=1.2);
            translate([0.5, 7.2, 1.75]) rotate([0, 90, 0]) cylinder(d=1.3, h=1.2);
            translate([0.5, 9.4, 1.75]) rotate([0, 90, 0]) cylinder(d=1.3, h=1.2);
            translate([0.5, 11.6, 1.75]) rotate([0, 90, 0]) cylinder(d=1.3, h=1.2);
        }
    }
    
    // 9. Slot para tarjeta Nano-SIM (Lateral)
    translate([pcb_w - 12.5, pcb_h - 4, pcb_t]) {
        color(c_shield) cube([12, 10, 1.5]);
    }
    
    // 10. ZONA DE ALTA TENSIÓN 1000V (Cuadrante Sureste, Aislado por ranura)
    // Micro-módulo Elevador Flyback 1000V
    translate([49, 6, pcb_t]) {
        color([0.15, 0.15, 0.18]) cube([18, 14, 11.0]); // Epoxi negro
    }
    // Condensador C7 (0.1uF 1000V CBB21)
    translate([49, 23, pcb_t]) {
        color(c_cap) cube([18, 7.5, 13.0]); // Rojo Faratronic
    }
    // Tiristor SCR TYN1225RG (TO-252)
    translate([52, 34, pcb_t]) {
        color(c_ic) cube([6.5, 6.0, 2.3]);
        color(c_shield) translate([1, -2, 0]) cube([4.5, 2.0, 0.5]); // Tab
    }
    // Optoacoplador EL817C cruzando la ranura de aislamiento
    translate([43, 38, pcb_t]) {
        color(c_ic) cube([5.0, 7.0, 3.5]);
    }
    // Pernos para electrodos de cuello (M4 Inox 316)
    translate([62, 12, pcb_t]) {
        color(c_clip) cylinder(d=4.0, h=8.0);
    }
    translate([62, 26, pcb_t]) {
        color(c_clip) cylinder(d=4.0, h=8.0);
    }
}

// ------------------------------------------------------------------------------
// Módulo: Batería Panasonic NCR18650B en Diagonal (Cara BOTTOM)
// ------------------------------------------------------------------------------
module bottom_battery_diagonal() {
    // La batería va orientada a 42° para aprovechar la diagonal de 98.9 mm
    translate([35, 35, -9.5])
    rotate([0, 0, 42]) {
        // Cuerpo de la Celda 18650 (65.3 x 18.5 mm)
        color(c_bat)
        rotate([0, 90, 0])
        translate([0, 0, -32.65])
        cylinder(d=18.5, h=65.3);
        
        // Terminal Positivo plano (Flat Top)
        color([0.8, 0.8, 0.8])
        rotate([0, 90, 0])
        translate([0, 0, 32.65])
        cylinder(d=8.0, h=0.4);

        // Terminal Negativo
        color([0.7, 0.7, 0.7])
        rotate([0, 90, 0])
        translate([0, 0, -33.0])
        cylinder(d=10.0, h=0.4);
        
        // Clips Keystone 1042 / 1048 soldados en PCB
        color(c_clip) {
            // Clip Positivo
            translate([34.0, -10.0, 4.0]) cube([3.5, 20.0, 7.5]);
            // Clip Negativo con resorte
            translate([-37.5, -10.0, 4.0]) cube([3.5, 20.0, 7.5]);
        }
    }
}

// ------------------------------------------------------------------------------
// Módulo: Serigrafía y Pads de la Cara Inferior (BOTTOM)
// ------------------------------------------------------------------------------
module bottom_silkscreen() {
    color([1.0, 1.0, 1.0, 0.9]) {
        // Marcado de Batería y Polaridad
        translate([35, 35, -0.01])
        rotate([0, 0, 42]) {
            // Contorno serigrafiado de la celda 18650
            difference() {
                cube([72, 21, 0.02], center=true);
                cube([70, 19, 0.04], center=true);
            }
            // Signo positivo (+)
            translate([24, 0, 0]) {
                cube([5, 1.2, 0.02], center=true);
                cube([1.2, 5, 0.02], center=true);
            }
            // Signo negativo (-)
            translate([-24, 0, 0]) {
                cube([5, 1.2, 0.02], center=true);
            }
        }
        
        // Textos de ingeniería en cara inferior (orientados en el plano inferior)
        translate([32, 43, -0.01])
        rotate([0, 180, -48])
        linear_extrude(0.02)
        text("COLLARNET V3", size=1.9, font="Liberation Sans:style=Bold");

        translate([28, 38, -0.01])
        rotate([0, 180, -48])
        linear_extrude(0.02)
        text("RENIER MORALES & LINDBERGH ZAMBRANO", size=1.2, font="Liberation Sans:style=Bold");

        translate([24, 33, -0.01])
        rotate([0, 180, -48])
        linear_extrude(0.02)
        text("BATTERY: 1x 18650 (3.7V / 3400mAh)", size=1.1, font="Liberation Sans");

        translate([20, 28, -0.01])
        rotate([0, 180, -48])
        linear_extrude(0.02)
        text("BOTTOM LAYER - SMT / THT ASSEMBLY", size=1.0, font="Liberation Sans");
    }

    // Pads de soldadura y vias doradas en Bottom (ENIG)
    color(c_gold) {
        // Pads de clips Keystone
        translate([35, 35, -0.02])
        rotate([0, 0, 42]) {
            translate([34.0, 0, 0]) cube([6.0, 10.0, 0.04], center=true);
            translate([-34.0, 0, 0]) cube([6.0, 10.0, 0.04], center=true);
        }
        // Pads de electrodos de alta tensión en Bottom
        translate([62, 12, -0.02]) cylinder(d=7.0, h=0.04);
        translate([62, 26, -0.02]) cylinder(d=7.0, h=0.04);
        // Pads de módulo HV y condensador
        translate([49, 10, -0.02]) cylinder(d=3.0, h=0.04);
        translate([49, 23, -0.02]) cylinder(d=3.0, h=0.04);
    }
}

// ------------------------------------------------------------------------------
// Módulo: Ensamblaje Completo de la PCB Cuadrada
// ------------------------------------------------------------------------------
module pcb_cuadrada_completa() {
    color(c_fr4) pcb_substrate();
    ground_plane_60x60();
    top_copper_traces();
    top_components();
    bottom_battery_diagonal();
    bottom_silkscreen();
}

// ------------------------------------------------------------------------------
// Módulo: Pistas de Cobre Físicas (Top Layer - Pistas de Señal, Potencia y RF)
// ------------------------------------------------------------------------------
module top_copper_traces() {
    c_trace_sig   = [0.95, 0.40, 0.30, 1.0]; // Cobre / Señal
    c_trace_pwr   = [0.92, 0.20, 0.20, 1.0]; // Rojo Potencia
    c_trace_3v3   = [0.25, 0.70, 0.95, 1.0]; // Azul +3.3V
    c_trace_rf    = [0.95, 0.80, 0.20, 1.0]; // Dorado RF 50Ω
    c_trace_hv    = [0.85, 0.10, 0.15, 1.0]; // Rojo carmesí 1000V
    
    t_z = pcb_t + 0.04;
    t_h = 0.06; // Espesor de cobre 35µm + relieve visual

    // 1. Pistas USB D- y D+ (J1 a ESP32)
    color(c_trace_sig) {
        translate([1.5, 27.2, t_z]) cube([6.5, 0.35, t_h]);
        translate([7.5, 25.5, t_z]) cube([3.0, 0.35, t_h]);
        translate([1.5, 28.8, t_z]) cube([6.5, 0.35, t_h]);
        translate([7.5, 27.0, t_z]) cube([3.0, 0.35, t_h]);
    }

    // 2. Pistas UART Módem (ESP32 a SIM7670)
    color(c_trace_sig) {
        translate([24.0, 48.0, t_z]) cube([12.0, 0.35, t_h]);
        translate([24.0, 50.0, t_z]) cube([12.0, 0.35, t_h]);
        translate([24.0, 45.0, t_z]) cube([12.0, 0.35, t_h]);
    }

    // 3. Pistas I2C Sensores (ESP32 a SC7A20)
    color(c_trace_sig) {
        translate([13.0, 36.0, t_z]) cube([0.35, 6.0, t_h]);
        translate([15.0, 36.0, t_z]) cube([0.35, 6.0, t_h]);
    }

    // 4. Pistas de Potencia +3.3V (SY8089 a ESP32 y sensores)
    color(c_trace_3v3) {
        translate([7.0, 24.0, t_z]) cube([1.2, 14.0, t_h]);
        translate([7.0, 38.0, t_z]) cube([1.2, 18.0, t_h]);
    }

    // 5. Pista de Potencia VBAT Principal
    color(c_trace_pwr) {
        translate([16.0, 44.0, t_z]) cube([20.0, 1.8, t_h]);
        translate([34.0, 38.0, t_z]) cube([1.8, 12.0, t_h]);
    }

    // 6. Líneas RF de 50 Ohms (SIM7670 a U.FL LTE y GNSS)
    color(c_trace_rf) {
        translate([38.5, 38.0, t_z]) cube([0.8, 4.0, t_h]);
        translate([56.5, 38.0, t_z]) cube([0.8, 4.0, t_h]);
    }

    // 7. Señal de Disparo IMPULSE_TRIG hacia U8
    color(c_trace_sig) {
        translate([24.0, 40.0, t_z]) cube([19.0, 0.4, t_h]);
    }

    // 8. Pistas de Alta Tensión 1000V (Cuadrante Sureste Aislado)
    color(c_trace_hv) {
        translate([52.0, 18.0, t_z]) cube([2.0, 6.0, t_h]);
        translate([54.0, 26.0, t_z]) cube([10.0, 2.0, t_h]);
        translate([62.0, 14.0, t_z]) cube([2.0, 12.0, t_h]);
    }
}

// ------------------------------------------------------------------------------
// Módulo: Carcasa Puck IP67 Cuadrada (85 x 85 mm) con Base Ergonómica
// Idéntica al modelo CAD de producción evaluado por el equipo
// ------------------------------------------------------------------------------
module caja_puck_ip67() {
    c_w = 85.0;
    c_h = 85.0;
    c_z = 36.0;
    c_r = 6.0;
    
    // 1. BASE DE FIJACIÓN ERGONÓMICA CURVADA (Radio R=95mm para montaje superficial)
    color([0.22, 0.28, 0.35])
    difference() {
        // Bloque curvado
        translate([c_w/2, c_h/2, -18])
        rotate([0, 90, 0])
        difference() {
            cylinder(r=95, h=c_w, center=true);
            cylinder(r=88, h=c_w + 2, center=true);
        }
        // Recorte para dejar solo el arco superior útil (largo 140 mm)
        translate([-5, -35, -120]) cube([c_w + 10, c_h + 70, 100]);
        translate([-5, -35, 10]) cube([c_w + 10, c_h + 70, 50]);
    }

    // 2. CUERPO PRINCIPAL DE LA CAJA (85.0 x 85.0 x 36.0 mm)
    color([0.18, 0.22, 0.28])
    difference() {
        // Bloque exterior redondeado con labios laterales elevados
        union() {
            hull() {
                translate([c_r, c_r, -14]) cylinder(r=c_r, h=c_z);
                translate([c_w - c_r, c_r, -14]) cylinder(r=c_r, h=c_z);
                translate([c_r, c_h - c_r, -14]) cylinder(r=c_r, h=c_z);
                translate([c_w - c_r, c_h - c_r, -14]) cylinder(r=c_r, h=c_z);
            }
            // Labios laterales superiores de protección contra ramas
            translate([0, 0, c_z - 14]) cube([4.0, c_h, 6.0]);
            translate([c_w - 4.0, 0, c_z - 14]) cube([4.0, c_h, 6.0]);
        }
        
        // Vaciado interior para alojar la PCB 70x70 y la batería 18650
        translate([7.5, 7.5, -12]) cube([70.5, 70.5, c_z]);
        
        // Cajeado rehundido en la tapa superior para el panel solar (Área Azul)
        translate([4.0, 4.0, c_z - 16]) cube([56.0, c_h - 8.0, 3.5]);

        // Alojamiento / ventana rectangular central para Antena GNSS (en el centro del panel)
        translate([24.0, c_h/2 - 10.0, c_z - 18]) cube([16.0, 20.0, 8.0]);
        
        // Cajeado lateral empotrado para puerto magnético IP68
        translate([-1.0, 7.5 + 23.0, 0.5]) cube([4.5, 18.0, 6.0]);

        // Túnel pasante curvado para la correa del collar de 45 mm
        translate([-2, c_h/2 - 22.5, -14]) cube([c_w + 4, 45.0, 6.0]);
    }

    // 2b. Conector Magnético Exterior IP68 al ras de la carcasa
    translate([1.5, 7.5 + 24.0, pcb_t]) {
        color(c_shield) translate([0, 2.0, 1.75]) rotate([0, 90, 0]) cylinder(d=2.8, h=1.5);
        color(c_shield) translate([0, 14.0, 1.75]) rotate([0, 90, 0]) cylinder(d=2.8, h=1.5);
        color(c_gold) {
            translate([0, 5.0, 1.75]) rotate([0, 90, 0]) cylinder(d=1.3, h=1.5);
            translate([0, 7.2, 1.75]) rotate([0, 90, 0]) cylinder(d=1.3, h=1.5);
            translate([0, 9.4, 1.75]) rotate([0, 90, 0]) cylinder(d=1.3, h=1.5);
            translate([0, 11.6, 1.75]) rotate([0, 90, 0]) cylinder(d=1.3, h=1.5);
        }
    }
    
    // 3. PANEL SOLAR MONOCRISTALINO EN LA TAPA (Área Azul de la simulación)
    color([0.15, 0.65, 0.95]) // Azul cian característico
    difference() {
        translate([4.5, 4.5, c_z - 15.5]) cube([55.0, c_h - 9.0, 2.5]);
        // Hueco para paso de la antena GPS libre de apantallamiento
        translate([24.0, c_h/2 - 10.0, c_z - 17]) cube([16.0, 20.0, 6.0]);
    }
}

// ------------------------------------------------------------------------------
// Ejecución según selector de vista
// ------------------------------------------------------------------------------
if (view_mode == "pcb") {
    pcb_cuadrada_completa();
} else if (view_mode == "bottom_3d") {
    // Invertir placa para mostrar la cara inferior (BOTTOM) en perspectiva isométrica
    translate([0, pcb_h, 0])
    rotate([180, 0, 0])
    pcb_cuadrada_completa();
} else if (view_mode == "caja") {
    translate([7.5, 7.5, 0]) pcb_cuadrada_completa();
    caja_puck_ip67();
} else if (view_mode == "todo") {
    translate([7.5, 7.5, 0]) pcb_cuadrada_completa();
    caja_puck_ip67();
}
