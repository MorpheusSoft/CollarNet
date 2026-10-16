// =============================================================================
// COMPONENTES Y DISPOSITIVOS INTERNOS - COLLAR GANADERO COWAI V2
// Modela con exactitud milimétrica los componentes electrónicos, pack de batería,
// sensores, arnés y accesorios para el visualizador 3D y análisis de holguras.
// =============================================================================

caller_part = "none";
include <collar_halter_v2.scad>

$fn = 32;

// -----------------------------------------------------------------------------
// 1. PACK DE BATERÍA 21700-3P (3 CELDAS EN PARALELO, BMS Y CABLES)
// Tamaño del pack: 72.0 mm (largo) x 64.0 mm (ancho) x 21.5 mm (alto)
// Encaja en cavidad de 76.0 x 70.0 x 24.0 mm (Holguras: +4.0mm X, +6.0mm Y, +2.5mm Z)
// -----------------------------------------------------------------------------
module comp_bateria_21700_3p() {
    cell_d = 21.2;
    cell_l = 70.0;
    
    union() {
        // Envoltura / Pack termorretráctil exterior unificado
        color([0.15, 0.45, 0.85]) { // Azul batería Li-ion
            hull() {
                translate([cell_l/2, cell_d/2, cell_d/2])
                    rotate([0, 90, 0]) cylinder(r=cell_d/2, h=cell_l, center=true);
                translate([cell_l/2, cell_d + cell_d/2, cell_d/2])
                    rotate([0, 90, 0]) cylinder(r=cell_d/2, h=cell_l, center=true);
                translate([cell_l/2, 2*cell_d + cell_d/2, cell_d/2])
                    rotate([0, 90, 0]) cylinder(r=cell_d/2, h=cell_l, center=true);
            }
        }
        
        // Pletinas de níquel en los polos frontales (X = 0)
        color([0.85, 0.85, 0.90]) {
            translate([-0.5, cell_d/2 - 4, cell_d/2 - 4])
                cube([1.0, 2*cell_d + 8, 8]);
            // Pletinas traseras (X = cell_l)
            translate([cell_l - 0.5, cell_d/2 - 4, cell_d/2 - 4])
                cube([1.0, 2*cell_d + 8, 8]);
        }
        
        // Placa BMS integrada en el lateral (protección sobrecarga/descarga 1S)
        color([0.1, 0.6, 0.3]) {
            translate([8, -1.8, cell_d/2 - 3])
                cube([cell_l - 16, 2.0, 6.0]);
        }
        
        // Cables de salida de silicona 18AWG con conectores
        color([0.9, 0.1, 0.1]) { // Positivo (Rojo)
            translate([-1, cell_d, cell_d - 3])
                rotate([0, -90, 0]) cylinder(r=1.2, h=15, $fn=16);
        }
        color([0.1, 0.1, 0.1]) { // Negativo (Negro)
            translate([-1, 2*cell_d, cell_d - 3])
                rotate([0, -90, 0]) cylinder(r=1.2, h=15, $fn=16);
        }
    }
}

// -----------------------------------------------------------------------------
// 2. PLACA PRINCIPAL LILYGO T-A7670X-S3 (ESP32-S3 + 4G LTE + GPS)
// Dimensiones PCB: 75.0 mm x 44.0 mm x 1.6 mm (+ componentes 8 mm)
// Encaja en cavidad de 85.0 x 74.0 x 15.5 mm sobre 4 postes de 4.5 mm
// -----------------------------------------------------------------------------
module comp_placa_lilygo() {
    pcb_w_real = 44.0;
    pcb_l_real = 75.0;
    pcb_t = 1.6;
    
    union() {
        // Sustrato PCB en fibra de vidrio azul/negro mate
        color([0.08, 0.22, 0.38]) {
            difference() {
                r_box(pcb_l_real, pcb_w_real, pcb_t, 2.0);
                // 4 taladros de montaje M2.5
                translate([4, 4, -1]) cylinder(r=1.3, h=pcb_t + 2, $fn=16);
                translate([pcb_l_real - 4, 4, -1]) cylinder(r=1.3, h=pcb_t + 2, $fn=16);
                translate([4, pcb_w_real - 4, -1]) cylinder(r=1.3, h=pcb_t + 2, $fn=16);
                translate([pcb_l_real - 4, pcb_w_real - 4, -1]) cylinder(r=1.3, h=pcb_t + 2, $fn=16);
            }
        }
        
        // Módulo MCU ESP32-S3 (Blindaje metálico plateado)
        color([0.80, 0.82, 0.85]) {
            translate([8, 12, pcb_t])
                cube([18.0, 25.5, 3.2]);
        }
        
        // Módulo Módem Celular SIMCom A7670X (Blindaje metálico)
        color([0.75, 0.77, 0.80]) {
            translate([34, 10, pcb_t])
                cube([24.0, 24.0, 2.8]);
        }
        
        // Conector USB-C en el borde exterior
        color([0.88, 0.88, 0.90]) {
            translate([-1.5, pcb_w_real/2 - 4.5, pcb_t])
                cube([7.5, 9.0, 3.2]);
        }
        
        // Ranura para tarjeta MicroSIM / NanoSIM
        color([0.85, 0.75, 0.35]) {
            translate([60, 14, pcb_t])
                cube([12.5, 15.0, 1.8]);
        }
        
        // Conectores coaxiales IPEX / u.FL para antenas LTE y GPS
        color([0.90, 0.78, 0.25]) { // Dorado
            translate([59, 36, pcb_t]) cylinder(r=1.2, h=1.5, $fn=16);
            translate([28, 38, pcb_t]) cylinder(r=1.2, h=1.5, $fn=16);
        }
    }
}

// -----------------------------------------------------------------------------
// 3. ANTENA CERÁMICA PATCH GNSS (GPS + GLONASS + GALILEO)
// Dimensiones: 25.0 x 25.0 x 4.0 mm en cuna de 26.0 x 26.0 x 10.0 mm
// -----------------------------------------------------------------------------
module comp_antena_gnss() {
    union() {
        // Plano de masa metálico inferior
        color([0.85, 0.85, 0.85])
            translate([0, 0, 0])
                r_box(26.0, 26.0, 0.8, 1.0);
                
        // Parche dieléctrico cerámico de alta permitividad
        color([0.65, 0.60, 0.55])
            translate([0.5, 0.5, 0.8])
                r_box(25.0, 25.0, 4.0, 1.0);
                
        // Electrodo resonador de plata en la cara superior
        color([0.90, 0.90, 0.92])
            translate([2.5, 2.5, 4.8])
                cube([21.0, 21.0, 0.1]);
                
        // Pin de alimentación central plateado / dorado
        color([0.95, 0.82, 0.25])
            translate([13.0, 13.0, 4.85])
                cylinder(r=0.9, h=0.3, $fn=16);
    }
}

// -----------------------------------------------------------------------------
// 4. MÓDULO CARGADOR SOLAR MPPT (CN3791 / TP4056)
// Dimensiones: 20.0 x 24.0 x 8.0 mm en bahía de 24.0 x 26.0 x 15.0 mm
// -----------------------------------------------------------------------------
module comp_modulo_mppt() {
    union() {
        // PCB del módulo (rojo / azul)
        color([0.75, 0.15, 0.15])
            r_box(20.0, 24.0, 1.6, 1.5);
            
        // Inductor toroidal / apantallado de potencia MPPT
        color([0.15, 0.15, 0.15])
            translate([5, 4, 1.6])
                cube([9.0, 9.0, 4.8]);
                
        // Condensador de filtro electrolítico / tantalio
        color([0.25, 0.25, 0.25])
            translate([6, 15, 1.6])
                cylinder(r=3.2, h=6.0, $fn=20);
                
        // CI Controlador MPPT CN3791 con disipador
        color([0.10, 0.10, 0.10])
            translate([15, 10, 1.6])
                cube([4.0, 5.0, 1.5]);
                
        // LEDs indicadores de estado (Carga = Rojo, Completo = Verde)
        color([0.9, 0.1, 0.1]) translate([16, 20, 1.6]) cube([1.6, 0.8, 0.8]);
        color([0.1, 0.9, 0.1]) translate([16, 22, 1.6]) cube([1.6, 0.8, 0.8]);
    }
}

// -----------------------------------------------------------------------------
// 5. ZUMBADOR PIEZOELÉCTRICO (BUZZER ACÚSTICO GANADERO)
// Dimensiones: Ø12.0 mm x 9.5 mm en cavidad cilíndrica de Ø12.4 x 12.0 mm
// -----------------------------------------------------------------------------
module comp_buzzer() {
    union() {
        // Cilindro negro de la caja acústica
        color([0.15, 0.15, 0.15]) {
            difference() {
                cylinder(r=12.0/2, h=9.5, $fn=32);
                // Orificio resonador de salida de sonido
                translate([0, 0, 8.0])
                    cylinder(r=1.5, h=2.0, $fn=20);
            }
        }
        // Indicador de polaridad (+)
        color([0.9, 0.9, 0.9]) {
            translate([3.5, 3.5, 9.45])
                cube([1.6, 0.4, 0.1], center=true);
            translate([3.5, 3.5, 9.45])
                cube([0.4, 1.6, 0.1], center=true);
        }
    }
}

// -----------------------------------------------------------------------------
// 6. PANEL SOLAR MONOCRISTALINO (55 x 60 x 2 mm)
// -----------------------------------------------------------------------------
module comp_panel_solar() {
    union() {
        // Marco y encapsulado epoxy protector
        color([0.12, 0.18, 0.32])
            r_box(55.0, 60.0, 2.0, 2.0);
            
        // Células fotovoltaicas de silicio monocristalino texturado
        color([0.06, 0.10, 0.22]) {
            for (ix = [0:1]) {
                for (iy = [0:2]) {
                    translate([3 + ix*25, 3 + iy*18.5, 1.8])
                        cube([23.5, 17.5, 0.25]);
                }
            }
        }
        
        // Busbars metálicos plateados conductores de corriente
        color([0.85, 0.85, 0.88]) {
            for (ix = [0:1]) {
                translate([3 + ix*25 + 7.5, 2, 2.0]) cube([0.6, 56.0, 0.1]);
                translate([3 + ix*25 + 16.0, 2, 2.0]) cube([0.6, 56.0, 0.1]);
            }
        }
    }
}

// -----------------------------------------------------------------------------
// 7. CINCHA GANADERA COMPLETA CONTINUA (OPCIÓN A - 50 mm x 3.0 mm)
// Recorrido exacto a través del collar: cápsula izq -> puente -> cápsula der
// -----------------------------------------------------------------------------
module comp_cincha_ganadera_completa() {
    ang = bridge_half_ang;
    x_j = bridge_r_inner * sin(ang);
    z_j = bridge_r_inner * cos(ang);
    w = 50.0;
    t = 3.0;

    color([0.92, 0.42, 0.12]) { // Naranja alta visibilidad ganadera
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
// 8. ARNÉS DE CABLES INTER-CÁPSULAS CONTINUO (Ø7.0 mm a Z = 17.0 mm)
// Conecta la electrónica LILYGO con el pack de batería y el sensor solar
// -----------------------------------------------------------------------------
module comp_arnes_cables_completo() {
    ang = bridge_half_ang;
    x_j = bridge_r_inner * sin(ang);
    z_j = bridge_r_inner * cos(ang);

    color([0.22, 0.22, 0.25]) { // Funda de silicona negra
        // Tramo derecho hacia compartimento de batería
        translate([x_j, 0, z_j])
            rotate([0, ang, 0])
                translate([-3, 0, conduit_z])
                    rotate([0, 90, 0]) cylinder(r=3.5, h=22, $fn=24);

        // Tramo izquierdo hacia compartimento de electrónica LILYGO
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
} else if (part_comp == "lilygo") {
    comp_placa_lilygo();
} else if (part_comp == "antena") {
    comp_antena_gnss();
} else if (part_comp == "mppt") {
    comp_modulo_mppt();
} else if (part_comp == "buzzer") {
    comp_buzzer();
} else if (part_comp == "solar") {
    comp_panel_solar();
} else if (part_comp == "cincha") {
    comp_cincha_ganadera_completa();
} else if (part_comp == "arnes") {
    comp_arnes_cables_completo();
} else {
    // Vista general de los componentes
    translate([0, 0, 0]) comp_bateria_21700_3p();
    translate([100, 0, 0]) comp_placa_lilygo();
    translate([100, 60, 0]) comp_antena_gnss();
    translate([0, 80, 0]) comp_modulo_mppt();
    translate([40, 80, 0]) comp_buzzer();
    translate([-80, 0, 0]) comp_panel_solar();
}
