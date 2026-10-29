/**
 * COWAI CollarNet V2 (Rev 2.1) - Aplicación CAD 3D Interactiva
 * Motor de visualización WebGL con Three.js, despiece paramétrico, planos de corte,
 * cotas tridimensionales e inspector de las 2 PCBs SMT, estímulo CDI y dispositivos.
 */

// =============================================================================
// 1. CONFIGURACIÓN GLOBAL Y ESTADO DE LA APLICACIÓN
// =============================================================================
const STATE = {
  theme: 'dark',
  explodeFactor: 0.0,
  isExploding: false,
  xrayOpacity: 1.0,
  wireframe: false,
  showDimensions: true,
  slicing: {
    enabled: false,
    axis: 'y', // 'x', 'y', 'z'
    value: 0,
    inverted: false
  },
  selectedPartId: null,
  activeTab: 'fit'
};

// Ángulos y cotas del collar Halter COWAI V2
const CAD_CONSTANTS = {
  ang_deg: 32.0,
  ang_rad: (32.0 * Math.PI) / 180.0,
  r_inner: 125.0,
  x_j: 125.0 * Math.sin((32.0 * Math.PI) / 180.0), // 66.24 mm
  z_j: 125.0 * Math.cos((32.0 * Math.PI) / 180.0), // 106.01 mm
  pod_l: 126.0,
  pod_w: 82.0,
  pod_base_h: 26.0,
  lid_h: 9.0,
  conduit_z: 17.0,
  tunnel_t: 3.0,
  tunnel_h: 5.5,
  strap_w: 52.0
};

// =============================================================================
// 2. BASE DE DATOS ACTUALIZADA DE DISPOSITIVOS Y ANÁLISIS DE HOLGURAS (REV 2.1)
// =============================================================================
const COMPONENTS_DB = {
  'lilygo': {
    name: 'Placa PCB 1: Lógica, RF 4G/GNSS & MPPT (COWAI V2)',
    category: 'Cápsula Izquierda • Computación, Telecomunicaciones y Carga Solar',
    partId: 'lilygo',
    meshKey: 'comp_lilygo',
    color: '#0f5132',
    lcsc: 'U1: C2913202 | U2: C2892994 | U3: C392477 | U4: C154992 | U5: C78988',
    dim_comp: { x: 60.0, y: 32.0, z: 6.2 },
    dim_cavity: { x: 70.0, y: 70.8, z: 15.5 },
    clearance: { x: 10.0, y: 38.8, z: 9.3 },
    fit_status: 'ok',
    fit_label: 'PCBA Custom 60×32 mm (+10 mm X, +38.8 mm Y)',
    description: 'Placa PCB a medida de 2 capas FR4 (1.6 mm, acabado ENIG Oro) diseñada para ensamblaje SMT en JLCPCB. Integra el MCU Espressif ESP32-S3-WROOM-1-N16R8 (16MB Flash / 8MB PSRAM), módem celular SIMCom SIM7670SA-MNGV (4G LTE Cat-1 + GNSS), cargador solar MPPT CN3791 (6V / 1.2A con 2 diodos Schottky SS34), regulador Buck síncrono SY8089 (3.3V / 2A), acelerómetro Silan SC7A20 (6 µA en reposo), 2 condensadores de tantalio de 220µF, conector USB-C 16P nativo, porta Nano-SIM Push-Pull en cara inferior y 2 conectores coaxiales IPEX de 50 Ω.',
    notes: 'Montada sobre 4 postes M2.5 de 4.5 mm de altura (centros a 53.0 × 25.0 mm). Al integrar el cargador MPPT CN3791 en esta placa y aislar la alta tensión en la cápsula derecha, se logra inmunidad electromagnética (EMC/EMI) total para el receptor satelital y el módem LTE.'
  },
  'mppt': {
    name: 'Placa PCB 2: Potencia, Audio y Descarga CDI (POWER & SHOCK V2)',
    category: 'Cápsula Derecha • BMS, Audio 95dB y Estímulo de Cerca Virtual',
    partId: 'mppt',
    meshKey: 'comp_mppt',
    color: '#166534',
    lcsc: 'U6: C351410 | U7: C32254 | U8: C4999 | U9: C128362 | C7: C2839151 | TH1: C14486',
    dim_comp: { x: 26.0, y: 32.0, z: 9.1 },
    dim_cavity: { x: 28.0, y: 34.0, z: 15.5 },
    clearance: { x: 2.0, y: 2.0, z: 6.4 },
    fit_status: 'ok',
    fit_label: 'Aislamiento Galvánico 5 kV + Watchdog 1s',
    description: 'Placa PCB de potencia de 2 capas FR4 (26.0 × 32.0 × 1.6 mm, ENIG Oro) con ranura fresada de 1.5 mm para aislamiento galvánico. Integra: (1) Protección BMS 1S (DW01A + MOSFET dual FS8205A + Fusible PPTC 3.0A); (2) Driver MOSFET AO3400A + Diodo Flyback 1N4148W para el zumbador de 95 dB; y (3) Generador de pulso capacitivo CDI (800V–1000V / 0.05J) con optoacoplador EL817C (5 kV), temporizador monoestable hardware 74LVC1G123 (corte forzoso a 1000 ms), bobina elevadora Flyback HV, condensador CBB21 0.1µF 1000V, tiristor SCR TYN1225RG y resistencia limitadora 220Ω/2W.',
    notes: 'Alojada en su bahía tabicada detrás del compartimento de batería. La tierra de alta tensión (HV_GND) está físicamente separada de la masa lógica (GND_SYS) mediante el optoacoplador EL817C.'
  },
  'bateria': {
    name: 'Batería Li-Ion 21700 (3.7V / 5000 mAh - Pack 1S3P 15Ah)',
    category: 'Cápsula Derecha • Almacenamiento Primario de Energía',
    partId: 'bateria',
    meshKey: 'comp_bateria',
    color: '#1e88e5',
    lcsc: 'BAT1: Celda 21700 Grado A (3.7V 5000mAh) + BMS 1S DW01A/FS8205A',
    dim_comp: { x: 72.0, y: 65.4, z: 21.2 },
    dim_cavity: { x: 76.0, y: 70.0, z: 24.0 },
    clearance: { x: 4.0, y: 4.6, z: 2.8 },
    fit_status: 'ok',
    fit_label: 'Ajuste Óptimo (+4.0 mm X, +4.6 mm Y)',
    description: 'Almacenamiento primario Li-Ion 21700 (admite desde 1 celda de 5.000 mAh hasta pack 1S3P de 15.000 mAh en paralelo) protegido por circuito BMS 1S (corte sobrecarga 4.28V, sobredescarga 2.40V) y fusible térmico reseteable PPTC de 3.0A.',
    notes: 'La cavidad ofrece +4.0 mm de holgura longitudinal y +4.6 mm lateral para revestimiento amortiguador de espuma EVA de 1.5 mm contra golpes del ganado.'
  },
  'buzzer': {
    name: 'Zumbador Piezoeléctrico Pasivo 95 dB (4000 Hz)',
    category: 'Cápsula Derecha • Estímulo Auditivo Progresivo de Geocerca',
    partId: 'buzzer',
    meshKey: 'comp_buzzer',
    color: '#212121',
    lcsc: 'BZ1: C253457 / C2904128 (PTH Ø12.4 × 8.0 mm, 4000 Hz)',
    dim_comp: { x: 12.4, y: 12.4, z: 8.0 },
    dim_cavity: { x: 12.8, y: 12.8, z: 12.0 },
    clearance: { x: 0.4, y: 0.4, z: 4.0 },
    fit_status: 'ok',
    fit_label: 'Cámara Acústica Cónica (+0.4 mm Ø)',
    description: 'Transductor acústico piezoeléctrico pasivo excitado a su frecuencia de resonancia de 4000 Hz mediante PWM (ESP32 GPIO 5 -> Hilo 3 del arnés -> Driver MOSFET AO3400A alimentado desde VBAT).',
    notes: 'Acoplado sobre una tobera acústica cónica inferior que proyecta los 95 dB hacia el cuello de la res para el pre-aviso auditivo antes de aplicar cualquier estímulo eléctrico.'
  },
  'electrodos': {
    name: '2× Electrodos de Cuello Acero Inoxidable 316 (M4)',
    category: 'Cápsula Derecha • Contacto Disuasorio de Cerca Virtual',
    partId: 'electrodos',
    meshKey: 'comp_electrodos',
    color: '#94a3b8',
    lcsc: 'EL1, EL2: Pernos M4 Semiesféricos Inox 316 Marino + O-Ring EPDM',
    dim_comp: { x: 21.2, y: 7.2, z: 24.9 },
    dim_cavity: { x: 22.0, y: 7.6, z: 25.5 },
    clearance: { x: 0.8, y: 0.4, z: 0.6 },
    fit_status: 'ok',
    fit_label: 'Pasamuros Sellado con O-Ring EPDM',
    description: 'Par de bornes de acero inoxidable 316 calidad marina (rosca M4, separación 14.0 mm entre centros) con puntas semiesféricas pulidas que sobresalen 7.5 mm por la base inferior de la cápsula derecha.',
    notes: 'Situados en Y = 72.0 mm (completamente fuera del túnel de 52 mm de la cincha ganadera) y sellados con junta tórica EPDM en su cajera inferior para mantener el grado IP67.'
  },
  'antena': {
    name: 'Antena Cerámica GNSS Patch (GPS / GLONASS / Galileo)',
    category: 'Cápsula Izquierda • Posicionamiento Satelital Cenital',
    partId: 'antena',
    meshKey: 'comp_antena',
    color: '#b0bec5',
    lcsc: 'ANT_GPS + Conector Coaxial IPEX J3 (C88373)',
    dim_comp: { x: 25.5, y: 25.5, z: 5.2 },
    dim_cavity: { x: 26.0, y: 26.0, z: 10.0 },
    clearance: { x: 0.5, y: 0.5, z: 4.8 },
    fit_status: 'ok',
    fit_label: 'Cuna Cenital Antivibración (+0.5 mm)',
    description: 'Parche cerámico dieléctrico de alta ganancia con plano de masa metálico de 26×26 mm conectado por línea de 50 Ω al puerto GNSS_ANT (J3) del módem SIM7670SA.',
    notes: 'Alojada en su cuna sobreelevada dedicada para apuntar perpendicularmente al cielo en el lomo del animal.'
  },
  'antena_lte': {
    name: 'Antena 4G LTE FPC Adhesiva + Coaxial IPEX',
    category: 'Cápsula Izquierda • Enlace Celular Multibanda',
    partId: 'antena_lte',
    meshKey: 'comp_antena_lte',
    color: '#d97706',
    lcsc: 'ANT_LTE FPC + Conector Coaxial IPEX J4 (C88373)',
    dim_comp: { x: 40.0, y: 1.5, z: 13.0 },
    dim_cavity: { x: 45.0, y: 4.0, z: 15.5 },
    clearance: { x: 5.0, y: 2.5, z: 2.5 },
    fit_status: 'ok',
    fit_label: 'Fijación Lateral Interna (50 Ω)',
    description: 'Antena dipolo flexible en poliimida (FPC) para bandas celulares 4G LTE Cat-1 (APN Digitel), con adhesivo 3M y cable coaxial 1.13 mm hacia el conector u.FL/IPEX J4 (MAIN_ANT).',
    notes: 'Adherida a la pared interior de ASA de la cápsula izquierda, alejada del plano de masa y libre de apantallamiento.'
  },
  'led_status': {
    name: 'Barra Difusora Vertical LED de Estado',
    category: 'Cápsula Izquierda • Diagnóstico Visual en Campo',
    partId: 'led_status',
    meshKey: 'comp_led_status',
    color: '#00e676',
    lcsc: 'STATUS_LED (ESP32-S3 GPIO 2) + Inserto Translúcido PETG/Acrílico',
    dim_comp: { x: 3.0, y: 26.0, z: 7.5 },
    dim_cavity: { x: 4.0, y: 28.0, z: 8.5 },
    clearance: { x: 1.0, y: 2.0, z: 1.0 },
    fit_status: 'ok',
    fit_label: 'Hombro Frontal Sellado',
    description: 'Visor difusor luminoso vertical en el hombro frontal de la tapa izquierda que transmite los destellos del indicador STATUS_LED (GPIO 2) para confirmar enlace 4G, fijación GNSS y estado de geocerca.',
    notes: 'Se sella con resina epoxi o poliuretano transparente para conservar el hermetismo IP67 de la tapa.'
  },
  'solar': {
    name: 'Paneles Solares Monocristalinos RY9-414 (×2)',
    category: 'Ambas Tapas • Cosecha Fotovoltaica Dual Continua',
    partId: 'solar',
    meshKey: 'comp_solar',
    color: '#0d2149',
    lcsc: '2× Paneles RY9-414 (6.0V / 120mA) + 2× Diodos Schottky SS34 (C8678)',
    dim_comp: { x: 60.0, y: 55.0, z: 2.1 },
    dim_cavity: { x: 61.0, y: 56.0, z: 2.2 },
    clearance: { x: 1.0, y: 1.0, z: 0.1 },
    fit_status: 'ok',
    fit_label: 'Encastre Enrasado (Flush-Mount)',
    description: 'Dos paneles fotovoltaicos monocristalinos encapsulados en epoxi (60.0 × 55.0 × 2.2 mm, 6V nominales) inclinados a ±32° a babor y estribor para captar sol de mañana, mediodía y tarde.',
    notes: 'Cada panel ingresa al cargador MPPT CN3791 a través de su propio diodo Schottky SS34, evitando que un panel en sombra descargue al panel iluminado.'
  },
  'solar_left': {
    name: 'Panel Solar 1 Izquierdo (RY9-414 6V)',
    category: 'Tapa Izquierda • Cosecha Solar Directa a PCB Lógica',
    partId: 'solar_left',
    meshKey: 'comp_solar',
    color: '#0d2149',
    lcsc: 'SOLAR_IZQ: Epoxi Monocristalino 60×55×2.2 mm + Diodo SS34 (C8678)',
    dim_comp: { x: 60.0, y: 55.0, z: 2.1 },
    dim_cavity: { x: 61.0, y: 56.0, z: 2.2 },
    clearance: { x: 1.0, y: 1.0, z: 0.1 },
    fit_status: 'ok',
    fit_label: 'Flush-Mount (+1.0 mm perimetral)',
    description: 'Panel solar monocristalino izquierdo alojado a ras de la tapa izquierda. Se conecta directamente a la entrada solar de la PCB 1 (Lógica & MPPT CN3791).',
    notes: 'El montaje enrasado con cordón perimetral de Sikaflex 221 impide que ramas o cercas lo desprendan.'
  },
  'solar_right': {
    name: 'Panel Solar 2 Derecho (RY9-414 6V)',
    category: 'Tapa Derecha • Cosecha Solar vía Hilo 5 del Arnés',
    partId: 'solar_right',
    meshKey: 'comp_solar',
    color: '#0d2149',
    lcsc: 'SOLAR_DER: Epoxi Monocristalino 60×55×2.2 mm -> Hilo 5 (SOLAR_DER_IN)',
    dim_comp: { x: 60.0, y: 55.0, z: 2.1 },
    dim_cavity: { x: 61.0, y: 56.0, z: 2.2 },
    clearance: { x: 1.0, y: 1.0, z: 0.1 },
    fit_status: 'ok',
    fit_label: 'Flush-Mount (+1.0 mm perimetral)',
    description: 'Panel solar monocristalino derecho alojado a ras de la tapa derecha. Envía su corriente (5.5V–6.5V) por el Hilo 5 (SOLAR_DER_IN) del arnés dorsal hacia el cargador MPPT CN3791 en la cápsula izquierda.',
    notes: 'Garantiza recarga continua incluso cuando el animal pasta de costado respecto al sol.'
  },
  'arnes': {
    name: 'Arnés Dorsal de 5 Hilos de Baja Tensión (< 5V)',
    category: 'Puente Dorsal • Interconexión Eléctrica Segura Inter-Cápsulas',
    partId: 'arnes',
    meshKey: 'comp_arnes',
    color: '#37474f',
    lcsc: 'Mazo Blindado 5 Conductores (AWG24 Potencia / AWG26 Control)',
    dim_comp: { x: 186.4, y: 7.0, z: 7.0 },
    dim_cavity: { x: 186.4, y: 8.0, z: 8.0 },
    clearance: { x: 0.0, y: 1.0, z: 1.0 },
    fit_status: 'ok',
    fit_label: 'Conducto Estanco Ø8.0 mm (Z=17 mm)',
    description: 'Mazo flexible de 5 conductores con funda de silicona de Ø7.0 mm: [1] VBAT_PWR (3.4–4.2V), [2] GND_SYS (0V), [3] BUZZER_PWM (4000Hz desde GPIO 5), [4] IMPULSE_TRIG (disparo 1s desde GPIO 4) y [5] SOLAR_DER_IN (retorno panel derecho 6V).',
    notes: 'CERO ALTA TENSIÓN EN EL LOMO: Ningún cable de alto voltaje cruza el puente dorsal; toda la elevación a 1000V ocurre localmente en la cápsula derecha.'
  },
  'cincha': {
    name: 'Cincha Ganadera Continua (Opción A)',
    category: 'Estructura • Sujeción de Alta Tenacidad y Contrapeso',
    partId: 'cincha',
    meshKey: 'comp_cincha',
    color: '#ff6d00',
    lcsc: 'Correa Nylon Trenzado 38 mm a 50 mm × 3.0 mm',
    dim_comp: { x: 387.0, y: 50.0, z: 3.0 },
    dim_cavity: { x: 404.0, y: 52.0, z: 5.5 },
    clearance: { x: 0.0, y: 2.0, z: 2.5 },
    fit_status: 'ok',
    fit_label: 'Túnel Continuo 52 × 5.5 mm',
    description: 'Correa continua que atraviesa sin cortes las dos cápsulas de ASA y el puente central de TPU, cerrándose en la papada inferior con hebilla de contrapeso.',
    notes: 'Separada del conducto pasacables por un tabique macizo de 4.5 mm de TPU y libre de interferencia con los electrodos M4 (situados en Y=72 mm).'
  },
  'puente': {
    name: 'Puente Dorsal Anatómico COWAI (TPU 95A)',
    category: 'Estructura Flexible • Ergonomía y Absorción de Impactos',
    partId: 'puente',
    meshKey: 'puente_dorsal_cowai',
    color: '#262930',
    lcsc: 'Impresión 3D FDM en TPU 95A (R=125 mm, ±32°)',
    dim_comp: { x: 219.3, y: 82.0, z: 63.6 },
    dim_cavity: { x: 219.3, y: 82.0, z: 63.6 },
    clearance: { x: 0.3, y: 0.3, z: 0.3 },
    fit_status: 'ok',
    fit_label: 'Cunas Snap-Fit 35 mm + Cuello IP67',
    description: 'Arco dorsal flexible con radio interior anatómico de 125 mm, canales de ventilación en el intradós, bolsillos envolventes de 35 mm con dientes de click y cuellos anulares de estanqueidad IP67 (Ø12×2.2 mm).',
    notes: '100% libre de tornillos metálicos en la zona de apoyo sobre la cruz del animal.'
  },
  'texto_cowai': {
    name: 'Emblema y Logotipo 3D COWAI (Inlay Multicolor)',
    category: 'Identidad Visual • Inserto Co-Impreso en Cresta Dorsal',
    partId: 'texto_cowai',
    meshKey: 'puente_texto_cowai',
    color: '#f8fafc',
    lcsc: 'Co-Impresión Multicolor OrcaSlicer / Bambu Lab AMS (TPU Blanco)',
    dim_comp: { x: 50.4, y: 11.8, z: 3.4 },
    dim_cavity: { x: 50.4, y: 11.8, z: 3.4 },
    clearance: { x: 0.0, y: 0.0, z: 0.0 },
    fit_status: 'ok',
    fit_label: 'Origen Coordenado Compartido (0,0,0)',
    description: 'Inserto 3D en bajorrelieve con el icono de ondas satelitales IoT, logotipo principal COWAI y subtítulo SMART CATTLE IoT en la cima del puente dorsal.',
    notes: 'Comparte el mismo sistema de coordenadas que puente_dorsal_cowai.stl para fusión multimaterial directa en el laminador.'
  },
  'pod_right_base': {
    name: 'Cápsula Derecha Base (Potencia, Audio & CDI)',
    category: 'Chasis Rígido • ASA resistente UV e Impacto',
    partId: 'pod_right_base',
    meshKey: 'capsula_derecha_base_bateria_21700',
    color: '#dae2ec',
    lcsc: 'Impresión 3D en ASA (Pared 2.8 mm, 5 Perímetros, Giroide 40%)',
    dim_comp: { x: 126.0, y: 82.0, z: 26.0 },
    dim_cavity: { x: 114.8, y: 70.8, z: 15.5 },
    clearance: { x: 0.3, y: 0.3, z: 0.3 },
    fit_status: 'ok',
    fit_label: 'Lengüeta Snap-Fit 35 mm + Canal en U',
    description: 'Chasis derecho con compartimento para batería 21700, bahía aislada de 28×34 mm para la PCB de Potencia y Descarga CDI, cámara acústica con tobera cónica para el buzzer de 95 dB y 2 pasamuros con asiento O-Ring para los electrodos M4.',
    notes: 'Incluye cajera frontal Ø12×1.8 mm para compresión del cuello IP67 del puente y cajera interna para sellador Sikaflex 221.'
  },
  'pod_right_lid': {
    name: 'Cápsula Derecha Tapa Solar (ASA)',
    category: 'Cierre Clamshell Snap-Fit • 7 Clips + Lengüeta IP67',
    partId: 'pod_right_lid',
    meshKey: 'capsula_derecha_tapa_solar',
    color: '#b0bec5',
    lcsc: 'Impresión 3D en ASA con Cuna Solar Flush-Mount (61×56×2.2 mm)',
    dim_comp: { x: 126.8, y: 83.6, z: 16.5 },
    dim_cavity: { x: 126.0, y: 82.0, z: 9.0 },
    clearance: { x: 0.0, y: 0.0, z: -0.4 },
    fit_status: 'ok',
    fit_label: '7 Clips Cantilever + Lengüeta Compresora',
    description: 'Tapa superior derecha con cuna enrasada para el Panel Solar 2 (RY9-414), lengüeta perimetral de compresión sobre la junta tórica y 7 ganchos snap-fit.',
    notes: 'Al insertar la cápsula en el bolsillo de TPU del puente, los clips delanteros quedan bloqueados mecánicamente contra apertura accidental.'
  },
  'pod_left_base': {
    name: 'Cápsula Izquierda Base (Lógica, RF 4G & GNSS)',
    category: 'Chasis Rígido • ASA resistente UV e Impacto',
    partId: 'pod_left_base',
    meshKey: 'capsula_izquierda_base_lilygo',
    color: '#dae2ec',
    lcsc: 'Impresión 3D en ASA (4 Postes M2.5 a 53×25 mm + Cuna GNSS)',
    dim_comp: { x: 126.0, y: 82.0, z: 26.0 },
    dim_cavity: { x: 114.8, y: 70.8, z: 15.5 },
    clearance: { x: 0.3, y: 0.3, z: 0.3 },
    fit_status: 'ok',
    fit_label: 'Postes PCB 60×32 mm + Cuna GNSS',
    description: 'Chasis izquierdo actualizado con 4 postes M2.5 (53.0 × 25.0 mm) para la PCB Lógica & RF de 60×32 mm, cuna sobreelevada para la antena cerámica GNSS de 25.5×25.5 mm y pared lateral libre para la antena 4G LTE FPC.',
    notes: 'Garantiza separación total entre los postes de la PCB y la cuna satelital GNSS.'
  },
  'pod_left_lid': {
    name: 'Cápsula Izquierda Tapa Solar y Visor LED (ASA)',
    category: 'Cierre Clamshell Snap-Fit • 7 Clips + Ventana LED',
    partId: 'pod_left_lid',
    meshKey: 'capsula_izquierda_tapa_solar',
    color: '#b0bec5',
    lcsc: 'Impresión 3D en ASA con Cuna Solar (61×56 mm) y Ranura LED',
    dim_comp: { x: 126.8, y: 83.6, z: 17.0 },
    dim_cavity: { x: 126.0, y: 82.0, z: 9.0 },
    clearance: { x: 0.0, y: 0.0, z: -0.4 },
    fit_status: 'ok',
    fit_label: '7 Clips Cantilever + Ranura Visor LED',
    description: 'Tapa superior izquierda con alojamiento enrasado para el Panel Solar 1 (RY9-414), ventana en hombro frontal para la barra difusora LED de estado y lengüeta compresora IP67.',
    notes: 'Cierre 100% libre de tornillos con precarga uniforme sobre el cordón elástico de TPU 85A.'
  },
  'junta_right': {
    name: 'Junta Tórica Perimetral IP67 Derecha (TPU 85A)',
    category: 'Sellado Hermético • Machihembrado Laberíntico en U',
    partId: 'junta_right',
    meshKey: 'junta_estanca_tpu_ip67',
    color: '#00e676',
    lcsc: 'Cordón Elástico Impreso en TPU 85A / Silicona (Sección 2.0×2.0 mm)',
    dim_comp: { x: 120.0, y: 76.0, z: 2.0 },
    dim_cavity: { x: 120.4, y: 76.4, z: 2.8 },
    clearance: { x: 0.2, y: 0.2, z: -0.4 },
    fit_status: 'ok',
    fit_label: '20%–25% Compresión Elástica IP67',
    description: 'Junta perimetral continua alojada en el canal en U de la base derecha y comprimida axialmente por la lengüeta de la tapa solar.',
    notes: 'Impide el ingreso de lluvia torrencial, polvo y lodo.'
  },
  'junta_left': {
    name: 'Junta Tórica Perimetral IP67 Izquierda (TPU 85A)',
    category: 'Sellado Hermético • Machihembrado Laberíntico en U',
    partId: 'junta_left',
    meshKey: 'junta_estanca_tpu_ip67',
    color: '#00e676',
    lcsc: 'Cordón Elástico Impreso en TPU 85A / Silicona (Sección 2.0×2.0 mm)',
    dim_comp: { x: 120.0, y: 76.0, z: 2.0 },
    dim_cavity: { x: 120.4, y: 76.4, z: 2.8 },
    clearance: { x: 0.2, y: 0.2, z: -0.4 },
    fit_status: 'ok',
    fit_label: '20%–25% Compresión Elástica IP67',
    description: 'Junta perimetral continua alojada en el canal en U de la base izquierda y comprimida axialmente por la lengüeta de la tapa solar.',
    notes: 'Protege la electrónica lógica, módem 4G y ranura Nano-SIM frente a humedad extrema.'
  }
};

// =============================================================================
// 3. INICIALIZACIÓN DE LA ESCENA THREE.JS
// =============================================================================
let scene, camera, renderer, controls;
let container;
let clipPlane;
let meshes = {};
let partKeyToMesh = {};
let nodeGroups = {};
let dimensionLinesGroup;
let raycaster, mouse;
let gridHelper;
let materials = {};

function init() {
  container = document.getElementById('canvas-container');

  // 1. Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12151b);
  scene.fog = new THREE.FogExp2(0x12151b, 0.0018);

  // 2. Cámara
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 3000);
  camera.up.set(0, 0, 1); // Z es vertical en CAD
  camera.position.set(280, -320, 240);

  // 3. Renderizador
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  // 4. Controles Orbitales (CAD Navigation)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 1400;
  controls.minDistance = 30;
  controls.target.set(0, 0, 95);
  controls.update();

  // 5. Iluminación de Estudio CAD
  setupLighting();

  // 6. Cuadrícula de Referencia (Plano de Tierra mm)
  setupGrid();

  // 7. Plano de Corte (Clipping Plane)
  clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

  // 8. Grupo para Cotas y Líneas Dimensionales
  dimensionLinesGroup = new THREE.Group();
  scene.add(dimensionLinesGroup);

  // 9. Raycasting para selección interactiva con clic
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // 10. Cargar y Ensamblar Modelos Actualizados
  buildAssembly();

  // 11. Crear Cotas CAD 3D
  build3DDimensions();

  // 12. Listeners de Eventos UI
  setupUIEventListeners();

  // 13. Inicializar Modo Oscuro / Claro
  initTheme();

  // 14. Loop de Animación
  window.addEventListener('resize', onWindowResize, false);
  renderer.domElement.addEventListener('pointerdown', onCanvasClick, false);

  animate();
}

// -----------------------------------------------------------------------------
// Iluminación
// -----------------------------------------------------------------------------
function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.58);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff5ea, 0.85);
  keyLight.position.set(250, -250, 400);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 50;
  keyLight.shadow.camera.far = 1000;
  keyLight.shadow.camera.left = -250;
  keyLight.shadow.camera.right = 250;
  keyLight.shadow.camera.top = 250;
  keyLight.shadow.camera.bottom = -250;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x90caf9, 0.45);
  fillLight.position.set(-250, 200, 300);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.40);
  rimLight.position.set(0, 350, -100);
  scene.add(rimLight);
}

// -----------------------------------------------------------------------------
// Rejilla de Suelo de Ingeniería
// -----------------------------------------------------------------------------
function setupGrid() {
  gridHelper = new THREE.GridHelper(600, 60, 0x00e5ff, 0x263238);
  gridHelper.rotation.x = Math.PI / 2;
  gridHelper.position.z = 0;
  scene.add(gridHelper);
}

// =============================================================================
// 4. CREACIÓN Y ENSAMBLAJE DE LAS MALLAS 3D ACTUALIZADAS (CAD ASSEMBLY REV 2.1)
// =============================================================================
function createBufferGeometryFromBase64(b64Data) {
  const binary = atob(b64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const floatArray = new Float32Array(bytes.buffer);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(floatArray, 3));
  geom.computeVertexNormals();
  return geom;
}

function registerMesh(partKey, mesh) {
  meshes[partKey] = mesh;
  partKeyToMesh[partKey] = mesh;
}

function buildAssembly() {
  const models = window.COWAI_MODELS;
  if (!models) {
    console.error("COWAI_MODELS no encontrado en modelos_geometrias.js");
    return;
  }

  // Materiales PBR Paramétricos de Ingeniería
  materials = {
    tpu: new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide
    }),
    tpuText: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.05,
      side: THREE.DoubleSide
    }),
    asa: new THREE.MeshStandardMaterial({
      color: 0xdae2ec,
      roughness: 0.42,
      metalness: 0.06,
      side: THREE.DoubleSide
    }),
    gasket: new THREE.MeshStandardMaterial({
      color: 0x00e676,
      roughness: 0.35,
      metalness: 0.0,
      side: THREE.DoubleSide
    }),
    battery: new THREE.MeshStandardMaterial({
      color: 0x1e88e5,
      roughness: 0.35,
      metalness: 0.25,
      side: THREE.DoubleSide
    }),
    pcbLogic: new THREE.MeshStandardMaterial({
      color: 0x0f5132, // Máscara de soldadura verde FR4 profesional (PCB 1)
      roughness: 0.34,
      metalness: 0.30,
      side: THREE.DoubleSide
    }),
    pcbPower: new THREE.MeshStandardMaterial({
      color: 0x166534, // Verde FR4 con bobina HV y condensador CDI (PCB 2)
      roughness: 0.36,
      metalness: 0.28,
      side: THREE.DoubleSide
    }),
    antenna: new THREE.MeshStandardMaterial({
      color: 0xb0bec5,
      roughness: 0.45,
      metalness: 0.20,
      side: THREE.DoubleSide
    }),
    antennaLte: new THREE.MeshStandardMaterial({
      color: 0xd97706, // Poliimida FPC cobre/ámbar
      roughness: 0.40,
      metalness: 0.35,
      side: THREE.DoubleSide
    }),
    ledStatus: new THREE.MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00c853,
      emissiveIntensity: 0.45,
      roughness: 0.20,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    }),
    buzzer: new THREE.MeshStandardMaterial({
      color: 0x212121,
      roughness: 0.65,
      metalness: 0.12,
      side: THREE.DoubleSide
    }),
    electrodos: new THREE.MeshStandardMaterial({
      color: 0xcbd5e1, // Acero Inoxidable 316 Marino pulido
      roughness: 0.20,
      metalness: 0.85,
      side: THREE.DoubleSide
    }),
    solar: new THREE.MeshStandardMaterial({
      color: 0x0d2149,
      roughness: 0.18,
      metalness: 0.35,
      side: THREE.DoubleSide
    }),
    strap: new THREE.MeshStandardMaterial({
      color: 0xff6d00,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide
    }),
    arnes: new THREE.MeshStandardMaterial({
      color: 0x263238,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide
    })
  };

  // Decodificar geometrías desde COWAI_MODELS
  const geoms = {};
  for (let key in models) {
    geoms[key] = createBufferGeometryFromBase64(models[key].data);
  }

  // 1. Grupo Raíz del Ensamble
  const assemblyGroup = new THREE.Group();
  scene.add(assemblyGroup);
  nodeGroups.assembly = assemblyGroup;

  // 2. Puente Dorsal Central y Emblema 3D COWAI
  const bridgeGroup = new THREE.Group();
  assemblyGroup.add(bridgeGroup);
  nodeGroups.bridge = bridgeGroup;

  const bridgeMesh = new THREE.Mesh(geoms['puente_dorsal_cowai'], materials.tpu);
  bridgeMesh.castShadow = true;
  bridgeMesh.receiveShadow = true;
  bridgeMesh.userData = { id: 'puente', name: 'Puente Dorsal TPU 95A', type: 'structure' };
  bridgeGroup.add(bridgeMesh);
  registerMesh('puente', bridgeMesh);

  const badgeMesh = new THREE.Mesh(geoms['puente_texto_cowai'], materials.tpuText);
  badgeMesh.userData = { id: 'texto_cowai', name: 'Emblema y Logotipo 3D COWAI', type: 'badge' };
  bridgeGroup.add(badgeMesh);
  registerMesh('texto_cowai', badgeMesh);

  // 3. Cincha Ganadera (Opción A) y Arnés Dorsal de 5 Hilos (Z=17 mm)
  const strapMesh = new THREE.Mesh(geoms['comp_cincha'], materials.strap);
  strapMesh.castShadow = true;
  strapMesh.userData = { id: 'cincha', name: 'Cincha Ganadera 50mm (Túnel Continuo)' };
  assemblyGroup.add(strapMesh);
  registerMesh('cincha', strapMesh);

  const arnesMesh = new THREE.Mesh(geoms['comp_arnes'], materials.arnes);
  arnesMesh.userData = { id: 'arnes', name: 'Arnés Dorsal 5 Hilos Baja Tensión (Ø7 mm)' };
  assemblyGroup.add(arnesMesh);
  registerMesh('arnes', arnesMesh);

  // ---------------------------------------------------------------------------
  // 4. Cápsula Derecha (Batería 21700 + PCB 2 Potencia/CDI + Buzzer 95dB + 2x Electrodos M4 + Panel Solar 2)
  // ---------------------------------------------------------------------------
  const ang = CAD_CONSTANTS.ang_rad;
  const x_j = CAD_CONSTANTS.x_j;
  const z_j = CAD_CONSTANTS.z_j;

  const rightPodGroup = new THREE.Group();
  rightPodGroup.position.set(x_j, 0, z_j);
  rightPodGroup.rotation.y = ang;
  assemblyGroup.add(rightPodGroup);
  nodeGroups.rightPod = rightPodGroup;

  const rightLocal = new THREE.Group();
  rightLocal.position.set(0, -CAD_CONSTANTS.pod_w / 2, 0);
  rightPodGroup.add(rightLocal);
  nodeGroups.rightLocal = rightLocal;

  // Base Derecha ASA
  const rightBaseMesh = new THREE.Mesh(geoms['capsula_derecha_base_bateria_21700'], materials.asa);
  rightBaseMesh.castShadow = true;
  rightBaseMesh.receiveShadow = true;
  rightBaseMesh.userData = { id: 'pod_right_base', name: 'Cápsula Derecha Base (ASA)' };
  rightLocal.add(rightBaseMesh);
  registerMesh('pod_right_base', rightBaseMesh);

  // Tapa Derecha ASA
  const rightLidGroup = new THREE.Group();
  rightLidGroup.position.set(0, 0, CAD_CONSTANTS.pod_base_h);
  rightLocal.add(rightLidGroup);
  nodeGroups.rightLid = rightLidGroup;

  const rightLidMesh = new THREE.Mesh(geoms['capsula_derecha_tapa_solar'], materials.asa);
  rightLidMesh.castShadow = true;
  rightLidMesh.userData = { id: 'pod_right_lid', name: 'Cápsula Derecha Tapa Solar (ASA)' };
  rightLidGroup.add(rightLidMesh);
  registerMesh('pod_right_lid', rightLidMesh);

  // Junta Tórica Derecha (IP67)
  const rightGasketGroup = new THREE.Group();
  rightGasketGroup.position.set(0, 0, CAD_CONSTANTS.pod_base_h - 2.8);
  rightLocal.add(rightGasketGroup);
  nodeGroups.rightGasket = rightGasketGroup;

  const rightGasketMesh = new THREE.Mesh(geoms['junta_estanca_tpu_ip67'], materials.gasket);
  rightGasketMesh.userData = { id: 'junta_right', name: 'Junta Tórica Estanca IP67 Derecha' };
  rightGasketGroup.add(rightGasketMesh);
  registerMesh('junta_right', rightGasketMesh);

  // Panel Solar 2 Derecho (RY9-414: 60.0 x 55.0 mm en cuna [(126-60)/2 + 8, (82-55)/2])
  const rightSolarGroup = new THREE.Group();
  rightSolarGroup.position.set((CAD_CONSTANTS.pod_l - 60.0) / 2 + 8.0, (CAD_CONSTANTS.pod_w - 55.0) / 2, CAD_CONSTANTS.pod_base_h + CAD_CONSTANTS.lid_h - 2.2 + 0.2);
  rightLocal.add(rightSolarGroup);
  nodeGroups.rightSolar = rightSolarGroup;

  const rightSolarMesh = new THREE.Mesh(geoms['comp_solar'], materials.solar);
  rightSolarMesh.userData = { id: 'solar_right', name: 'Panel Solar 2 Derecho RY9-414 (60×55 mm)' };
  rightSolarGroup.add(rightSolarMesh);
  registerMesh('solar_right', rightSolarMesh);

  // Batería Li-Ion 21700 + BMS 1S
  const rightBatGroup = new THREE.Group();
  rightBatGroup.position.set(11.5, (CAD_CONSTANTS.pod_w - 65.4) / 2, 10.5);
  rightLocal.add(rightBatGroup);
  nodeGroups.rightBat = rightBatGroup;

  const batMesh = new THREE.Mesh(geoms['comp_bateria'], materials.battery);
  batMesh.castShadow = true;
  batMesh.userData = { id: 'bateria', name: 'Batería Li-Ion 21700 + BMS 1S' };
  rightBatGroup.add(batMesh);
  registerMesh('bateria', batMesh);

  // Placa PCB 2: Potencia, Audio y Descarga CDI (26.0 x 32.0 mm en bahía X=88, Y=26)
  const rightMpptGroup = new THREE.Group();
  rightMpptGroup.position.set(89.0, 27.0, 11.5);
  rightLocal.add(rightMpptGroup);
  nodeGroups.rightMppt = rightMpptGroup;

  const mpptMesh = new THREE.Mesh(geoms['comp_mppt'], materials.pcbPower);
  mpptMesh.castShadow = true;
  mpptMesh.userData = { id: 'mppt', name: 'Placa PCB 2: Potencia, Audio y Descarga CDI (1000V)' };
  rightMpptGroup.add(mpptMesh);
  registerMesh('mppt', mpptMesh);

  // Zumbador Piezoeléctrico 95 dB (4000 Hz, Ø12.4 mm en X=102, Y=14)
  const rightBuzzerGroup = new THREE.Group();
  rightBuzzerGroup.position.set(102.0, 14.0, 10.5);
  rightLocal.add(rightBuzzerGroup);
  nodeGroups.rightBuzzer = rightBuzzerGroup;

  const buzzerMesh = new THREE.Mesh(geoms['comp_buzzer'], materials.buzzer);
  buzzerMesh.userData = { id: 'buzzer', name: 'Zumbador Piezoeléctrico 95dB (4000 Hz)' };
  rightBuzzerGroup.add(buzzerMesh);
  registerMesh('buzzer', buzzerMesh);

  // 2x Electrodos de Cuello de Acero Inoxidable 316 M4 + O-Rings EPDM (en X=94, 108 y Y=72)
  const rightElectrodosGroup = new THREE.Group();
  rightElectrodosGroup.position.set(94.0, 72.0, 0.0);
  rightLocal.add(rightElectrodosGroup);
  nodeGroups.rightElectrodos = rightElectrodosGroup;

  if (geoms['comp_electrodos']) {
    const electrodosMesh = new THREE.Mesh(geoms['comp_electrodos'], materials.electrodos);
    electrodosMesh.castShadow = true;
    electrodosMesh.userData = { id: 'electrodos', name: '2× Electrodos de Cuello Inox 316 M4' };
    rightElectrodosGroup.add(electrodosMesh);
    registerMesh('electrodos', electrodosMesh);
  }

  // ---------------------------------------------------------------------------
  // 5. Cápsula Izquierda (PCB 1 Lógica/RF/MPPT 60x32mm + Antena GNSS + Antena 4G LTE FPC + Barra LED + Panel Solar 1)
  // ---------------------------------------------------------------------------
  const leftPodGroup = new THREE.Group();
  leftPodGroup.position.set(-x_j, 0, z_j);
  leftPodGroup.rotation.y = -ang;
  leftPodGroup.scale.set(-1, 1, 1);
  assemblyGroup.add(leftPodGroup);
  nodeGroups.leftPod = leftPodGroup;

  const leftLocal = new THREE.Group();
  leftLocal.position.set(0, -CAD_CONSTANTS.pod_w / 2, 0);
  leftPodGroup.add(leftLocal);
  nodeGroups.leftLocal = leftLocal;

  // Base Izquierda ASA
  const leftBaseMesh = new THREE.Mesh(geoms['capsula_izquierda_base_lilygo'], materials.asa);
  leftBaseMesh.castShadow = true;
  leftBaseMesh.receiveShadow = true;
  leftBaseMesh.userData = { id: 'pod_left_base', name: 'Cápsula Izquierda Base (ASA)' };
  leftLocal.add(leftBaseMesh);
  registerMesh('pod_left_base', leftBaseMesh);

  // Tapa Izquierda ASA
  const leftLidGroup = new THREE.Group();
  leftLidGroup.position.set(0, 0, CAD_CONSTANTS.pod_base_h);
  leftLocal.add(leftLidGroup);
  nodeGroups.leftLid = leftLidGroup;

  const leftLidMesh = new THREE.Mesh(geoms['capsula_izquierda_tapa_solar'], materials.asa);
  leftLidMesh.castShadow = true;
  leftLidMesh.userData = { id: 'pod_left_lid', name: 'Cápsula Izquierda Tapa Solar (ASA)' };
  leftLidGroup.add(leftLidMesh);
  registerMesh('pod_left_lid', leftLidMesh);

  // Barra Difusora Vertical LED de Estado (Hombro X=8.5, Y=28, Z=27.5)
  const leftLedGroup = new THREE.Group();
  leftLedGroup.position.set(8.5, (CAD_CONSTANTS.pod_w - 26.0) / 2, CAD_CONSTANTS.pod_base_h + 1.5);
  leftLocal.add(leftLedGroup);
  nodeGroups.leftLed = leftLedGroup;

  if (geoms['comp_led_status']) {
    const ledMesh = new THREE.Mesh(geoms['comp_led_status'], materials.ledStatus);
    ledMesh.userData = { id: 'led_status', name: 'Barra Difusora Vertical LED de Estado' };
    leftLedGroup.add(ledMesh);
    registerMesh('led_status', ledMesh);
  }

  // Junta Tórica Izquierda
  const leftGasketGroup = new THREE.Group();
  leftGasketGroup.position.set(0, 0, CAD_CONSTANTS.pod_base_h - 2.8);
  leftLocal.add(leftGasketGroup);
  nodeGroups.leftGasket = leftGasketGroup;

  const leftGasketMesh = new THREE.Mesh(geoms['junta_estanca_tpu_ip67'], materials.gasket);
  leftGasketMesh.userData = { id: 'junta_left', name: 'Junta Tórica Estanca IP67 Izquierda' };
  leftGasketGroup.add(leftGasketMesh);
  registerMesh('junta_left', leftGasketMesh);

  // Panel Solar 1 Izquierdo (RY9-414: 60.0 x 55.0 mm)
  const leftSolarGroup = new THREE.Group();
  leftSolarGroup.position.set((CAD_CONSTANTS.pod_l - 60.0) / 2 + 8.0, (CAD_CONSTANTS.pod_w - 55.0) / 2, CAD_CONSTANTS.pod_base_h + CAD_CONSTANTS.lid_h - 2.2 + 0.2);
  leftLocal.add(leftSolarGroup);
  nodeGroups.leftSolar = leftSolarGroup;

  const leftSolarMesh = new THREE.Mesh(geoms['comp_solar'], materials.solar);
  leftSolarMesh.userData = { id: 'solar_left', name: 'Panel Solar 1 Izquierdo RY9-414 (60×55 mm)' };
  leftSolarGroup.add(leftSolarMesh);
  registerMesh('solar_left', leftSolarMesh);

  // Placa PCB 1: Lógica, RF 4G/GNSS & MPPT COWAI V2 (60.0 x 32.0 mm sobre 4 postes en X=14, Y=12, Z=15)
  const leftLilygoGroup = new THREE.Group();
  leftLilygoGroup.position.set(14.0, 12.0, 15.0);
  leftLocal.add(leftLilygoGroup);
  nodeGroups.leftLilygo = leftLilygoGroup;

  const lilygoMesh = new THREE.Mesh(geoms['comp_lilygo'], materials.pcbLogic);
  lilygoMesh.castShadow = true;
  lilygoMesh.userData = { id: 'lilygo', name: 'Placa PCB 1: Lógica, RF 4G/GNSS & MPPT V2 (60×32 mm)' };
  leftLilygoGroup.add(lilygoMesh);
  registerMesh('lilygo', lilygoMesh);

  // Antena Cerámica GNSS Patch (en cuna sobreelevada X=86, Y=42, Z=12.5)
  const leftAntennaGroup = new THREE.Group();
  leftAntennaGroup.position.set(CAD_CONSTANTS.pod_l - 42.0 + 2.0, CAD_CONSTANTS.pod_w - 42.0 + 2.0, 12.5);
  leftLocal.add(leftAntennaGroup);
  nodeGroups.leftAntenna = leftAntennaGroup;

  const antennaMesh = new THREE.Mesh(geoms['comp_antena'], materials.antenna);
  antennaMesh.userData = { id: 'antena', name: 'Antena Cerámica GNSS Patch (25.5×25.5 mm)' };
  leftAntennaGroup.add(antennaMesh);
  registerMesh('antena', antennaMesh);

  // Antena 4G LTE FPC Adhesiva (en pared interior lateral X=24, Y=6.0, Z=11.5)
  const leftAntennaLteGroup = new THREE.Group();
  leftAntennaLteGroup.position.set(24.0, 6.0, 11.5);
  leftLocal.add(leftAntennaLteGroup);
  nodeGroups.leftAntennaLte = leftAntennaLteGroup;

  if (geoms['comp_antena_lte']) {
    const antennaLteMesh = new THREE.Mesh(geoms['comp_antena_lte'], materials.antennaLte);
    antennaLteMesh.userData = { id: 'antena_lte', name: 'Antena 4G LTE FPC Adhesiva (40×13 mm)' };
    leftAntennaLteGroup.add(antennaLteMesh);
    registerMesh('antena_lte', antennaLteMesh);
  }
}

// =============================================================================
// 5. COTAS DIMENSIONALES 3D (CAD BLUEPRINT OVERLAYS)
// =============================================================================
function create3DDimensionLine(start, end, text, color = 0x00e5ff) {
  const group = new THREE.Group();

  const material = new THREE.LineBasicMaterial({ color: color, depthTest: false, transparent: true, opacity: 0.9 });
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  group.add(line);

  const dir = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
  const tickLength = 5.0;

  const perp = new THREE.Vector3(0, 0, 1);
  if (Math.abs(dir.dot(perp)) > 0.9) perp.set(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(dir, perp).normalize().multiplyScalar(tickLength);

  const tick1Geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3().subVectors(points[0], side),
    new THREE.Vector3().addVectors(points[0], side)
  ]);
  const tick2Geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3().subVectors(points[1], side),
    new THREE.Vector3().addVectors(points[1], side)
  ]);

  group.add(new THREE.Line(tick1Geom, material));
  group.add(new THREE.Line(tick2Geom, material));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 280;
  canvas.height = 64;

  ctx.fillStyle = 'rgba(15, 18, 24, 0.88)';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  if (ctx.roundRect) {
    ctx.roundRect(4, 4, 272, 56, 12);
  } else {
    ctx.rect(4, 4, 272, 56);
  }
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 22px JetBrains Mono, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 140, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(32, 8, 1);

  const mid = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
  mid.add(new THREE.Vector3(0, 0, 6));
  sprite.position.copy(mid);
  group.add(sprite);

  return group;
}

function build3DDimensions() {
  dimensionLinesGroup.clear();

  // 1. Cota: Envergadura total del collar (404.5 mm)
  dimensionLinesGroup.add(create3DDimensionLine([-202.2, -60, 40], [202.2, -60, 40], "404.5 mm (Envergadura)", 0x00e5ff));

  // 2. Cota: Radio Interior del Puente (R = 125.0 mm)
  dimensionLinesGroup.add(create3DDimensionLine([0, 0, 0], [0, 0, 125], "R 125.0 mm (Intradós)", 0x2979ff));

  // 3. Cota: Altura de la Cresta del Puente (26.0 mm espesor)
  dimensionLinesGroup.add(create3DDimensionLine([0, 48, 125], [0, 48, 151], "26.0 mm (Cima)", 0xffb300));

  // 4. Cota: Túnel de Cincha Ganadera (52.0 mm x 5.5 mm)
  dimensionLinesGroup.add(create3DDimensionLine([0, -26, 128 + 2.75], [0, 26, 128 + 2.75], "52.0 x 5.5 mm (Túnel Cincha)", 0xff9100));

  // 5. Cota: Arnés 5 Hilos Baja Tensión y Tabique Macizo de 4.5 mm
  dimensionLinesGroup.add(create3DDimensionLine([0, 0, 133.5], [0, 0, 138.0], "4.5 mm (Tabique TPU)", 0x00e676));
  dimensionLinesGroup.add(create3DDimensionLine([0, 12, 142.0], [0, 20, 142.0], "Ø8 mm (Arnés 5P Z=17)", 0x00e5ff));

  // 6. Cota: Cápsula Derecha Externa (126.0 mm)
  const x_j = CAD_CONSTANTS.x_j;
  const z_j = CAD_CONSTANTS.z_j;
  const ang = CAD_CONSTANTS.ang_rad;

  dimensionLinesGroup.add(create3DDimensionLine(
    [x_j, -55, z_j - 10],
    [x_j + 126 * Math.cos(ang), -55, z_j - 126 * Math.sin(ang) - 10],
    "126.0 mm (Cápsula)",
    0xd500f9
  ));

  dimensionLinesGroup.visible = STATE.showDimensions;
}

// =============================================================================
// 6. CONTROLADOR DE DESPIECE INTERACTIVO (EXPLODED VIEW)
// =============================================================================
function updateExplosion(val) {
  STATE.explodeFactor = val;

  const f = val;
  const ang = CAD_CONSTANTS.ang_rad;
  const x_j = CAD_CONSTANTS.x_j;
  const z_j = CAD_CONSTANTS.z_j;

  // 1. Desplazamiento exterior de las cápsulas en su ángulo natural de 32°
  const slideDist = f * 55.0;
  if (nodeGroups.rightPod) {
    nodeGroups.rightPod.position.set(
      x_j + slideDist * Math.cos(ang),
      0,
      z_j - slideDist * Math.sin(ang)
    );
  }
  if (nodeGroups.leftPod) {
    nodeGroups.leftPod.position.set(
      -x_j - slideDist * Math.cos(ang),
      0,
      z_j - slideDist * Math.sin(ang)
    );
  }

  // 2. Elevación de Tapas en Z local (+48 mm)
  if (nodeGroups.rightLid) nodeGroups.rightLid.position.z = CAD_CONSTANTS.pod_base_h + f * 48.0;
  if (nodeGroups.leftLid) nodeGroups.leftLid.position.z = CAD_CONSTANTS.pod_base_h + f * 48.0;
  if (nodeGroups.leftLed) nodeGroups.leftLed.position.z = (CAD_CONSTANTS.pod_base_h + 1.5) + f * 56.0;

  // 3. Elevación de Juntas Tóricas (+26 mm)
  if (nodeGroups.rightGasket) nodeGroups.rightGasket.position.z = (CAD_CONSTANTS.pod_base_h - 2.8) + f * 26.0;
  if (nodeGroups.leftGasket) nodeGroups.leftGasket.position.z = (CAD_CONSTANTS.pod_base_h - 2.8) + f * 26.0;

  // 4. Elevación de Paneles Solares (+68 mm)
  const baseSolarZ = CAD_CONSTANTS.pod_base_h + CAD_CONSTANTS.lid_h - 2.2 + 0.2;
  if (nodeGroups.rightSolar) nodeGroups.rightSolar.position.z = baseSolarZ + f * 68.0;
  if (nodeGroups.leftSolar) nodeGroups.leftSolar.position.z = baseSolarZ + f * 68.0;

  // 5. Despiece de Dispositivos Internos y Electrodos
  if (nodeGroups.rightBat) nodeGroups.rightBat.position.z = 10.5 + f * 32.0;
  if (nodeGroups.rightMppt) nodeGroups.rightMppt.position.z = 11.5 + f * 36.0;
  if (nodeGroups.rightBuzzer) nodeGroups.rightBuzzer.position.z = 10.5 + f * 28.0;
  if (nodeGroups.rightElectrodos) nodeGroups.rightElectrodos.position.z = -f * 26.0; // Descienden hacia el cuello
  if (nodeGroups.leftLilygo) nodeGroups.leftLilygo.position.z = 15.0 + f * 34.0;
  if (nodeGroups.leftAntenna) nodeGroups.leftAntenna.position.z = 12.5 + f * 38.0;
  if (nodeGroups.leftAntennaLte) nodeGroups.leftAntennaLte.position.z = 11.5 + f * 26.0;

  // 6. Elevación del Emblema 3D COWAI sobre la cresta del puente
  if (meshes.texto_cowai) meshes.texto_cowai.position.z = f * 16.0;

  const label = document.getElementById('explode-value');
  if (label) label.textContent = Math.round(f * 100) + '%';
}

// =============================================================================
// 7. PLANO DE CORTE TRANSVERSAL DINÁMICO (SECTION SLICING)
// =============================================================================
function updateSlicing() {
  if (!STATE.slicing.enabled) {
    renderer.clippingPlanes = [];
    return;
  }

  const axis = STATE.slicing.axis;
  const val = STATE.slicing.value;
  const sign = STATE.slicing.inverted ? -1 : 1;

  if (axis === 'x') {
    clipPlane.set(new THREE.Vector3(sign, 0, 0), -sign * val);
  } else if (axis === 'y') {
    clipPlane.set(new THREE.Vector3(0, sign, 0), -sign * val);
  } else if (axis === 'z') {
    clipPlane.set(new THREE.Vector3(0, 0, sign), -sign * val);
  }

  renderer.clippingPlanes = [clipPlane];
}

// =============================================================================
// 8. MODO RAYOS X / TRANSPARENCIA
// =============================================================================
function updateXRayOpacity(val) {
  STATE.xrayOpacity = val;
  const isTransparent = val < 0.98;

  const shellMeshes = [
    meshes.puente,
    meshes.pod_right_base,
    meshes.pod_right_lid,
    meshes.pod_left_base,
    meshes.pod_left_lid
  ];

  shellMeshes.forEach(mesh => {
    if (mesh && mesh.material) {
      mesh.material.transparent = isTransparent;
      mesh.material.opacity = val;
      mesh.material.depthWrite = !isTransparent;
      mesh.material.needsUpdate = true;
    }
  });

  const label = document.getElementById('xray-value');
  if (label) label.textContent = Math.round(val * 100) + '%';
}

// =============================================================================
// 9. VISTAS DE CÁMARA PREESTABLECIDAS
// =============================================================================
function setCameraPreset(preset) {
  const duration = 800;
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  let endPos, endTarget;

  switch (preset) {
    case 'iso':
      endPos = new THREE.Vector3(280, -320, 240);
      endTarget = new THREE.Vector3(0, 0, 95);
      break;
    case 'top':
      endPos = new THREE.Vector3(0, 0, 480);
      endTarget = new THREE.Vector3(0, 0, 95);
      break;
    case 'front':
      endPos = new THREE.Vector3(0, -450, 95);
      endTarget = new THREE.Vector3(0, 0, 95);
      break;
    case 'side':
      endPos = new THREE.Vector3(450, 0, 95);
      endTarget = new THREE.Vector3(0, 0, 95);
      break;
    case 'pod_right': // Enfoque en Cápsula Derecha (Potencia, Batería 21700, PCB CDI y Electrodos M4)
      endPos = new THREE.Vector3(230, -185, 155);
      endTarget = new THREE.Vector3(CAD_CONSTANTS.x_j + 45, 0, CAD_CONSTANTS.z_j - 25);
      selectComponent('mppt');
      break;
    case 'pod_left': // Enfoque en Cápsula Izquierda (PCB Lógica/RF/MPPT, GNSS y Antena LTE)
      endPos = new THREE.Vector3(-230, -185, 155);
      endTarget = new THREE.Vector3(-CAD_CONSTANTS.x_j - 45, 0, CAD_CONSTANTS.z_j - 25);
      selectComponent('lilygo');
      break;
    case 'bridge': // Enfoque en Puente Dorsal y Arnés de 5 Hilos
      endPos = new THREE.Vector3(0, -180, 175);
      endTarget = new THREE.Vector3(0, 0, 135);
      selectComponent('arnes');
      break;
  }

  const startTime = performance.now();
  function tweenCamera(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1.0);
    const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();

    if (progress < 1.0) {
      requestAnimationFrame(tweenCamera);
    }
  }
  requestAnimationFrame(tweenCamera);

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === preset);
  });
}

// =============================================================================
// 10. INTERACCIÓN Y SELECCIÓN DE COMPONENTES (CLICK TO INSPECT)
// =============================================================================
function selectComponent(compKey) {
  STATE.selectedPartId = compKey;
  const comp = COMPONENTS_DB[compKey] || COMPONENTS_DB['lilygo'];
  if (!comp) return;

  switchTab('inspector');

  const formatClearance = (v) => (v >= 0 ? `+${v} mm` : `${v} mm`);

  const container = document.getElementById('inspector-content');
  if (container) {
    container.innerHTML = `
      <div class="fit-card">
        <div class="fit-card-header">
          <div class="fit-card-title">
            <span class="part-color-dot" style="background:${comp.color};"></span>
            ${comp.name}
          </div>
          <span class="fit-badge ${comp.fit_status}">${comp.fit_label}</span>
        </div>

        <div style="font-size: 11px; color: var(--accent-cyan); font-family: var(--font-mono); padding: 4px 8px; background: rgba(0, 229, 255, 0.08); border-radius: 6px; border: 1px solid rgba(0, 229, 255, 0.2);">
          <strong>BOM / LCSC:</strong> ${comp.lcsc || 'Componente Estructural CAD'}
        </div>

        <table class="dim-table">
          <thead>
            <tr>
              <th>Dimensión</th>
              <th>Dispositivo</th>
              <th>Alojamiento</th>
              <th>Holgura / Sello</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Longitud (X)</td>
              <td>${comp.dim_comp.x} mm</td>
              <td>${comp.dim_cavity.x} mm</td>
              <td class="clearance-val">${formatClearance(comp.clearance.x)}</td>
            </tr>
            <tr>
              <td>Ancho (Y)</td>
              <td>${comp.dim_comp.y} mm</td>
              <td>${comp.dim_cavity.y} mm</td>
              <td class="clearance-val">${formatClearance(comp.clearance.y)}</td>
            </tr>
            <tr>
              <td>Altura (Z)</td>
              <td>${comp.dim_comp.z} mm</td>
              <td>${comp.dim_cavity.z} mm</td>
              <td class="clearance-val">${formatClearance(comp.clearance.z)}</td>
            </tr>
          </tbody>
        </table>

        <div class="fit-card-notes">
          <strong>Categoría:</strong> ${comp.category}<br><br>
          <strong>Arquitectura y Especificación:</strong> ${comp.description}<br><br>
          <strong>Criterio de Ingeniería:</strong> ${comp.notes}
        </div>
      </div>
    `;
  }

  document.querySelectorAll('.tree-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.part === compKey);
  });
}

function onCanvasClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const interactableMeshes = Object.values(partKeyToMesh).filter(m => m && m.visible);
  const intersects = raycaster.intersectObjects(interactableMeshes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const partId = hit.userData.id;

    if (COMPONENTS_DB[partId]) {
      selectComponent(partId);
    } else if (partId && partId.includes('right')) {
      selectComponent('mppt');
    } else if (partId && partId.includes('left')) {
      selectComponent('lilygo');
    } else if (partId && (partId.includes('bridge') || partId.includes('puente'))) {
      selectComponent('puente');
    }
  }
}

// =============================================================================
// 11. GESTIÓN DE UI, PESTAÑAS Y EVENTOS
// =============================================================================
function switchTab(tabId) {
  STATE.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });
}

// =============================================================================
// GESTIÓN DE MODO CLARO / OSCURO (STUDIO CAD THEME)
// =============================================================================
function setTheme(themeName) {
  STATE.theme = themeName;
  try {
    localStorage.setItem('cowai_cad_theme', themeName);
  } catch (e) {}

  const themeBtn = document.getElementById('btn-theme-toggle');
  const isLight = (themeName === 'light');

  if (isLight) {
    document.body.classList.add('theme-light');
    if (themeBtn) {
      themeBtn.innerHTML = '🌙';
      themeBtn.title = 'Cambiar a Modo Oscuro (Studio)';
    }
    if (scene) {
      scene.background.setHex(0xf8fafc);
      if (scene.fog) scene.fog.color.setHex(0xf8fafc);
    }
    if (gridHelper) {
      scene.remove(gridHelper);
      gridHelper = new THREE.GridHelper(600, 60, 0x0284c7, 0xcbd5e1);
      gridHelper.rotation.x = Math.PI / 2;
      gridHelper.position.z = 0;
      scene.add(gridHelper);
    }
    if (materials && materials.asa) {
      materials.asa.color.setHex(0xcfd8dc);
    }
  } else {
    document.body.classList.remove('theme-light');
    if (themeBtn) {
      themeBtn.innerHTML = '☀️';
      themeBtn.title = 'Cambiar a Modo Claro (Studio)';
    }
    if (scene) {
      scene.background.setHex(0x12151b);
      if (scene.fog) scene.fog.color.setHex(0x12151b);
    }
    if (gridHelper) {
      scene.remove(gridHelper);
      gridHelper = new THREE.GridHelper(600, 60, 0x00e5ff, 0x263238);
      gridHelper.rotation.x = Math.PI / 2;
      gridHelper.position.z = 0;
      scene.add(gridHelper);
    }
    if (materials && materials.asa) {
      materials.asa.color.setHex(0xdae2ec);
    }
  }

  if (dimensionLinesGroup) {
    dimensionLinesGroup.traverse((child) => {
      if (child.isLine && child.material) {
        child.material.color.setHex(isLight ? 0x0284c7 : 0x00e5ff);
      }
    });
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function initTheme() {
  let saved = 'dark';
  try {
    saved = localStorage.getItem('cowai_cad_theme') || 'dark';
  } catch (e) {}
  setTheme(saved);
}

function setupUIEventListeners() {
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = (STATE.theme === 'dark') ? 'light' : 'dark';
      setTheme(nextTheme);
    });
  }

  const explodeSlider = document.getElementById('explode-slider');
  if (explodeSlider) {
    explodeSlider.addEventListener('input', (e) => {
      updateExplosion(parseFloat(e.target.value));
    });
  }

  const playExplodeBtn = document.getElementById('btn-play-explode');
  if (playExplodeBtn) {
    playExplodeBtn.addEventListener('click', () => {
      STATE.isExploding = !STATE.isExploding;
      playExplodeBtn.textContent = STATE.isExploding ? '⏸ Pausar' : '▶ Animar Despiece';
    });
  }

  const xraySlider = document.getElementById('xray-slider');
  if (xraySlider) {
    xraySlider.addEventListener('input', (e) => {
      updateXRayOpacity(parseFloat(e.target.value));
    });
  }

  const dimToggle = document.getElementById('toggle-dimensions');
  if (dimToggle) {
    dimToggle.addEventListener('change', (e) => {
      STATE.showDimensions = e.target.checked;
      dimensionLinesGroup.visible = STATE.showDimensions;
    });
  }

  const wireToggle = document.getElementById('toggle-wireframe');
  if (wireToggle) {
    wireToggle.addEventListener('change', (e) => {
      STATE.wireframe = e.target.checked;
      Object.values(partKeyToMesh).forEach(m => {
        if (m && m.material) m.material.wireframe = STATE.wireframe;
      });
    });
  }

  const sliceToggle = document.getElementById('toggle-slicing');
  if (sliceToggle) {
    sliceToggle.addEventListener('change', (e) => {
      STATE.slicing.enabled = e.target.checked;
      const sliceControls = document.getElementById('slice-controls');
      if (sliceControls) sliceControls.style.display = e.target.checked ? 'flex' : 'none';
      updateSlicing();
    });
  }

  document.querySelectorAll('.slice-axis-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.slice-axis-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.slicing.axis = btn.dataset.axis;
      updateSlicing();
    });
  });

  const sliceSlider = document.getElementById('slice-slider');
  if (sliceSlider) {
    sliceSlider.addEventListener('input', (e) => {
      STATE.slicing.value = parseFloat(e.target.value);
      const valLabel = document.getElementById('slice-value');
      if (valLabel) valLabel.textContent = e.target.value + ' mm';
      updateSlicing();
    });
  }

  const sliceInvert = document.getElementById('btn-slice-invert');
  if (sliceInvert) {
    sliceInvert.addEventListener('click', () => {
      STATE.slicing.inverted = !STATE.slicing.inverted;
      updateSlicing();
    });
  }

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setCameraPreset(btn.dataset.view);
    });
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Árbol de Piezas (Tree View - Visibilidad y Selección)
  document.querySelectorAll('.tree-item').forEach(item => {
    const partKey = item.dataset.part;
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('vis-btn') && !e.target.classList.contains('solo-btn')) {
        selectComponent(partKey);
      }
    });

    const visBtn = item.querySelector('.vis-btn');
    if (visBtn) {
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetMesh = partKeyToMesh[partKey];
        if (targetMesh) {
          targetMesh.visible = !targetMesh.visible;
          visBtn.textContent = targetMesh.visible ? '👁' : '🚫';
          visBtn.classList.toggle('visible', targetMesh.visible);
        }
      });
    }

    const soloBtn = item.querySelector('.solo-btn');
    if (soloBtn) {
      soloBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Object.entries(partKeyToMesh).forEach(([k, m]) => {
          if (m) m.visible = (k === partKey);
        });
        document.querySelectorAll('.vis-btn').forEach(b => {
          const p = b.closest('.tree-item').dataset.part;
          b.textContent = (p === partKey) ? '👁' : '🚫';
          b.classList.toggle('visible', p === partKey);
        });
        selectComponent(partKey);
      });
    }
  });

  const resetVisBtn = document.getElementById('btn-reset-vis');
  if (resetVisBtn) {
    resetVisBtn.addEventListener('click', () => {
      Object.values(partKeyToMesh).forEach(m => { if (m) m.visible = true; });
      document.querySelectorAll('.vis-btn').forEach(b => {
        b.textContent = '👁';
        b.classList.add('visible');
      });
    });
  }

  const screenshotBtn = document.getElementById('btn-screenshot');
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', () => {
      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'COWAI_CollarNet_V2_1_CAD_Inspection.png';
      link.href = dataURL;
      link.click();
    });
  }

  const helpBtn = document.getElementById('btn-help');
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('btn-close-help');

  if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => { helpModal.style.display = 'flex'; });
  }
  if (closeHelpBtn && helpModal) {
    closeHelpBtn.addEventListener('click', () => { helpModal.style.display = 'none'; });
  }
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.style.display = 'none';
    });
  }
}

// -----------------------------------------------------------------------------
// Redimensión de Ventana
// -----------------------------------------------------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// =============================================================================
// 12. LOOP DE ANIMACIÓN Y RENDERIZADO
// =============================================================================
let animDirection = 1;
function animate() {
  requestAnimationFrame(animate);

  if (STATE.isExploding) {
    let newExplode = STATE.explodeFactor + 0.006 * animDirection;
    if (newExplode >= 1.0) {
      newExplode = 1.0;
      animDirection = -1;
    } else if (newExplode <= 0.0) {
      newExplode = 0.0;
      animDirection = 1;
    }
    const slider = document.getElementById('explode-slider');
    if (slider) slider.value = newExplode;
    updateExplosion(newExplode);
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);
