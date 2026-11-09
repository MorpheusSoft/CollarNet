#!/usr/bin/env python3
"""
Generador del Plano Maestro de Conexión, Soldadura y Enrutamiento PCBA
CollarNet V3 (70.0 × 70.0 mm) — Revisión 3.0 Oficial
Diseñadores: Renier Morales & Lindbergh Zambrano
Terminología 100% industrial neutral IoT.

Salidas:
1. docs/diseno_electronico_pcb/diagrama_conexion_placa_pcb.svg
2. docs/diseno_electronico_pcb/diagrama_conexion_placa_pcb.png (5400 × 3600 px)
3. Copias canónicas sincronizadas:
   - docs/diseno_electronico_pcb/diagrama_interconexion_pines_bom.svg / .png
   - docs/diseno_electronico_pcb/pcb_pistas_enrutamiento_70x70.svg / .png
"""

import os
import shutil

def build_master_svg():
    width = 5400
    height = 3600

    # Coordenadas y Escala de la Placa PCB 70.0 × 70.0 mm:
    # Scale: 37.0 px por mm -> 70.0 mm = 2590.0 px
    s = 37.0
    ox = 120.0
    oy = 280.0

    def to_px(x_mm, y_mm):
        return ox + x_mm * s, oy + y_mm * s

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">')
    svg.append('<defs>')
    svg.append('''
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="3" dy="5" stdDeviation="6" flood-color="#000000" flood-opacity="0.80"/>
      </filter>
      <filter id="shadow-soft" x="-3%" y="-3%" width="106%" height="106%">
        <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.55"/>
      </filter>
      <filter id="glow-trace" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#080d1a" />
        <stop offset="50%" stop-color="#121f38" />
        <stop offset="100%" stop-color="#080d1a" />
      </linearGradient>
      <linearGradient id="pcbFr4Grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#032519" />
        <stop offset="50%" stop-color="#053725" />
        <stop offset="100%" stop-color="#021c13" />
      </linearGradient>
      <linearGradient id="gndPlaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#d97706" stop-opacity="0.28" />
        <stop offset="100%" stop-color="#b45309" stop-opacity="0.18" />
      </linearGradient>
      <linearGradient id="enigGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="45%" stop-color="#facc15" />
        <stop offset="100%" stop-color="#b45309" />
      </linearGradient>
      <linearGradient id="solderPTHGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef9c3" />
        <stop offset="50%" stop-color="#eab308" />
        <stop offset="100%" stop-color="#854d0e" />
      </linearGradient>
      <pattern id="cadGridLarge" width="185" height="185" patternUnits="userSpaceOnUse">
        <path d="M 185 0 L 0 0 0 185" fill="none" stroke="#0e1726" stroke-width="1.5"/>
      </pattern>
      <pattern id="cadGridFine" width="37" height="37" patternUnits="userSpaceOnUse">
        <path d="M 37 0 L 0 0 0 37" fill="none" stroke="#090f1a" stroke-width="0.75"/>
      </pattern>
      <pattern id="viaPattern" width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="9" cy="9" r="3.2" fill="#ca8a04" stroke="#000000" stroke-width="0.8"/>
        <circle cx="9" cy="9" r="1.4" fill="#021a12" />
      </pattern>
      <pattern id="hatchHV" width="24" height="24" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="24" stroke="#ef4444" stroke-width="2.5" opacity="0.35"/>
      </pattern>
    ''')
    svg.append('</defs>')

    # 1. DARK CAD BACKGROUND
    svg.append(f'<rect width="{width}" height="{height}" fill="#050811"/>')
    svg.append(f'<rect width="{width}" height="{height}" fill="url(#cadGridFine)"/>')
    svg.append(f'<rect width="{width}" height="{height}" fill="url(#cadGridLarge)"/>')

    # 2. MASTER TITLE BLOCK & BANNER (TOP)
    svg.append(f'''
      <!-- ENCABEZADO OFICIAL DE INGENIERÍA Y CONTROL DE PLANOS -->
      <g filter="url(#shadow)">
        <rect x="50" y="30" width="{width - 100}" height="190" rx="12" fill="url(#headerGrad)" stroke="#38bdf8" stroke-width="2.5"/>
        <rect x="50" y="30" width="{width - 100}" height="8" rx="4" fill="#0284c7" />
        
        <!-- Emblema de Arquitectura V3 -->
        <circle cx="120" cy="125" r="46" fill="#0b1324" stroke="#38bdf8" stroke-width="2.5"/>
        <text x="120" y="118" font-family="'Courier New', monospace" font-size="28" font-weight="900" fill="#38bdf8" text-anchor="middle">V3</text>
        <text x="120" y="142" font-family="monospace" font-size="11" font-weight="bold" fill="#94a3b8" text-anchor="middle">70×70</text>
        
        <text x="190" y="88" font-family="'Segoe UI', Roboto, sans-serif" font-size="33" font-weight="900" fill="#ffffff" letter-spacing="1">COLLARNET V3 — PLANO MAESTRO DE CONEXIÓN, SOLDADURA Y ENRUTAMIENTO PCBA (70.0 × 70.0 mm)</text>
        <text x="190" y="124" font-family="'Segoe UI', Roboto, sans-serif" font-size="18.5" fill="#94a3b8">Conexionado Físico Pad a Pad de los <tspan fill="#38bdf8" font-weight="bold">28 Componentes BOM Oficial</tspan> | Ruteo Punto a Punto Top &amp; Bottom | Plano GNSS 60×60 mm | Ranura L 5kV | Puerto Magnético IP68</text>
        <text x="190" y="160" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" fill="#cbd5e1">Diseñadores / Autores del Hardware: <tspan fill="#38bdf8" font-weight="bold">Renier Morales &amp; Lindbergh Zambrano</tspan> | Revisión: <tspan fill="#10b981" font-weight="bold">3.0 Oficial (Producción 10 Prototipos PCBA China)</tspan></text>
        <text x="190" y="194" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#e2e8f0">Estándares de Fabricación: <tspan fill="#facc15" font-weight="bold">IPC-A-610G Clase 3 (Alta Fiabilidad Industrial)</tspan> | Seguridad Eléctrica: <tspan fill="#10b981" font-weight="bold">IEC 60335-2-76 (50 mJ CDI Ultra-Seguro)</tspan> | Estanquidad: <tspan fill="#38bdf8" font-weight="bold">IP68 Sumergible</tspan></text>
        
        <!-- Bloque de metadatos técnicos DFM a la derecha -->
        <g transform="translate({width - 980}, 50)">
          <rect width="880" height="150" rx="8" fill="#080f1e" stroke="#25354e" stroke-width="1.5"/>
          <text x="25" y="30" font-family="monospace" font-size="14.5" font-weight="bold" fill="#38bdf8">PARÁMETROS TÉCNICOS DE PRODUCCIÓN (JLCPCB / PCBWAY):</text>
          <text x="25" y="58" font-family="'Segoe UI', sans-serif" font-size="13.5" fill="#f8fafc">• Sustrato: 4 Capas FR-4 TG155 (L1 Signal/Pwr, L2 GND, L3 Pwr, L4 Signal/Bot) | Espesor: 1.6 mm</text>
          <text x="25" y="84" font-family="'Segoe UI', sans-serif" font-size="13.5" fill="#f8fafc">• Cobre: 1 oz (35 µm) | Acabado Superficial: ENIG Gold (Oro Químico 2µ") para soldadura SMT/PTH</text>
          <text x="25" y="110" font-family="'Segoe UI', sans-serif" font-size="13.5" fill="#f8fafc">• Pista Mínima: 0.25 mm (10 mil) | Separación Dieléctrica: 0.25 mm | Vías mínimas: 0.30 mm / 0.60 mm</text>
          <text x="25" y="136" font-family="'Segoe UI', sans-serif" font-size="13.5" fill="#10b981">• Aislamiento Galvánico: Creepage &gt;14.0 mm en Ranura 'L' (2.0 mm) pasante | Rigidez: 5,000 V RMS</text>
        </g>
      </g>
    ''')

    # =========================================================================
    # 3. SECCIÓN IZQUIERDA: PLACA PCB 70.0 × 70.0 mm (Scale = 37 px/mm -> 2590 × 2590 px)
    # =========================================================================
    pcb_w_px = 70.0 * s
    pcb_h_px = 70.0 * s
    corner_r_px = 4.0 * s

    svg.append(f'''
      <!-- ================= CONTENEDOR FÍSICO DE LA PLACA PCB ================= -->
      <!-- Sombra y sustrato FR-4 Verde Soldermask Real -->
      <g filter="url(#shadow)">
        <rect x="{ox}" y="{oy}" width="{pcb_w_px}" height="{pcb_h_px}" rx="{corner_r_px}" fill="url(#pcbFr4Grad)" stroke="#10b981" stroke-width="4"/>
      </g>
    ''')

    # Reglas milimétricas alrededor de la baquelita
    svg.append('<!-- REGLAS DE MEDIDA MILIMÉTRICA EN LOS 4 BORDES -->')
    for mm in range(0, 71, 1):
        if mm % 10 == 0:
            tick_len = 18
            stroke_w = 2.0
            col = "#cbd5e1"
        elif mm % 5 == 0:
            tick_len = 11
            stroke_w = 1.4
            col = "#94a3b8"
        else:
            tick_len = 5
            stroke_w = 0.8
            col = "#475569"

        # Eje X Superior
        m_x, m_y = to_px(mm, 0.0)
        svg.append(f'<line x1="{m_x}" y1="{oy - 4}" x2="{m_x}" y2="{oy - 4 - tick_len}" stroke="{col}" stroke-width="{stroke_w}"/>')
        if mm % 10 == 0:
            svg.append(f'<text x="{m_x}" y="{oy - 28}" font-family="monospace" font-size="13" font-weight="bold" fill="#38bdf8" text-anchor="middle">{mm}</text>')

        # Eje Y Izquierdo
        m_x, m_y = to_px(0.0, mm)
        svg.append(f'<line x1="{ox - 4}" y1="{m_y}" x2="{ox - 4 - tick_len}" y2="{m_y}" stroke="{col}" stroke-width="{stroke_w}"/>')
        if mm % 10 == 0:
            svg.append(f'<text x="{ox - 28}" y="{m_y + 4}" font-family="monospace" font-size="13" font-weight="bold" fill="#38bdf8" text-anchor="end">{mm}</text>')

    svg.append(f'''
      <text x="{ox + pcb_w_px / 2}" y="{oy - 48}" font-family="monospace" font-size="17" font-weight="900" fill="#38bdf8" text-anchor="middle">EJE X (0.00 mm a 70.00 mm) — ANCHO DE LA PLACA</text>
      <text x="{ox - 65}" y="{oy + pcb_h_px / 2}" font-family="monospace" font-size="17" font-weight="900" fill="#38bdf8" text-anchor="middle" transform="rotate(-90 {ox - 65} {oy + pcb_h_px / 2})">EJE Y (0.00 mm a 70.00 mm) — ALTO DE LA PLACA</text>
    ''')

    # PLANO DE COBRE RF GND CONTINUO 60.0 × 60.0 mm
    gnd_x1, gnd_y1 = to_px(5.0, 5.0)
    gnd_w, gnd_h = 60.0 * s, 60.0 * s
    cut_x, cut_y = to_px(44.0, 44.0)

    svg.append(f'''
      <!-- PLANO DE COBRE GND REFLECTIVO 60x60 mm (CAPA INTERNA L2 / REFLECTOR GNSS) -->
      <path d="M {gnd_x1} {gnd_y1} H {gnd_x1 + gnd_w} V {cut_y} H {cut_x} V {gnd_y1 + gnd_h} H {gnd_x1} Z" fill="url(#gndPlaneGrad)" stroke="#f59e0b" stroke-width="2" stroke-dasharray="12,6"/>
      <!-- Vías de apantallamiento RF perimetrales cada 3 mm -->
      <rect x="{gnd_x1 + 8}" y="{gnd_y1 + 8}" width="{gnd_w - 16}" height="28" fill="url(#viaPattern)" opacity="0.75"/>
      <rect x="{gnd_x1 + 8}" y="{gnd_y1 + 8}" width="28" height="{gnd_h - 16}" fill="url(#viaPattern)" opacity="0.75"/>
      <rect x="{gnd_x1 + 8}" y="{cut_y - 36}" width="{cut_x - gnd_x1}" height="28" fill="url(#viaPattern)" opacity="0.75"/>
      
      <g transform="translate({gnd_x1 + 45}, {gnd_y1 + 50})">
        <rect width="660" height="48" rx="6" fill="#091422" stroke="#f59e0b" stroke-width="1.8" opacity="0.90"/>
        <text x="18" y="24" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="900" fill="#fef08a" letter-spacing="1">PLANO DE COBRE RF GND CONTINUO (60.0 × 60.0 mm = 3,600 mm²)</text>
        <text x="18" y="42" font-family="'Segoe UI', sans-serif" font-size="12" fill="#cbd5e1">Plano reflector cenital de alta ganancia (+4.5 dB C/N₀) para antena de parche GNSS (J4)</text>
      </g>
    ''')

    # RANURA FRESADA EN "L" (2.0 mm pasante en Edge.Cuts)
    slot_x1, slot_y1 = to_px(44.0, 70.0)
    slot_corner_x, slot_corner_y = to_px(44.0, 44.0)
    slot_x2, slot_y2 = to_px(70.0, 44.0)
    slot_w_px = 2.0 * s

    svg.append(f'''
      <!-- BARRERA DE AISLAMIENTO: RANURA FRESADA EN L (Edge.Cuts) 2.0 mm -->
      <path d="M {slot_x1} {slot_y1 + 8} V {slot_corner_y} H {slot_x2 + 8}" fill="none" stroke="#050811" stroke-width="{slot_w_px}" stroke-linecap="round"/>
      <path d="M {slot_x1} {slot_y1 + 8} V {slot_corner_y} H {slot_x2 + 8}" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="12,6"/>
      
      <!-- Señalización de aislamiento de alta tensión -->
      <g transform="translate({slot_corner_x + 35}, {slot_corner_y - 52})">
        <rect width="470" height="40" rx="6" fill="#3b070c" stroke="#ef4444" stroke-width="2"/>
        <text x="18" y="26" font-family="monospace" font-size="14" font-weight="900" fill="#fecaca">⚡ RANURA FRESADA 2.0 mm (AISLAMIENTO 5kV RMS)</text>
      </g>
    ''')

    # 4 TALADROS DE MONTAJE M3 (Ø3.2mm con anillo ENIG Ø6.0mm)
    holes = [(5.0, 5.0, "H1"), (65.0, 5.0, "H2"), (5.0, 65.0, "H3"), (65.0, 65.0, "H4")]
    for hx, hy, hname in holes:
        hpx, hpy = to_px(hx, hy)
        svg.append(f'''
          <!-- Taladro M3 {hname} en ({hx}, {hy}) -->
          <circle cx="{hpx}" cy="{hpy}" r="{3.0 * s}" fill="none" stroke="#eab308" stroke-width="2.5"/>
          <circle cx="{hpx}" cy="{hpy}" r="{1.6 * s}" fill="#050811" stroke="#f59e0b" stroke-width="2"/>
          <text x="{hpx}" y="{hpy + 46}" font-family="monospace" font-size="12" font-weight="900" fill="#facc15" text-anchor="middle">{hname} (Ø3.2mm M3)</text>
        ''')

    # BATERÍA 18650 EN BOTTOM LAYER (PROYECCIÓN A 42° DIAGONAL)
    bat_cx, bat_cy = to_px(35.0, 35.0)
    svg.append(f'''
      <!-- Proyección Celda Panasonic NCR18650B (Cara Inferior / Bottom Layer 42° Diagonal) -->
      <g transform="translate({bat_cx}, {bat_cy}) rotate(42)" opacity="0.35" filter="url(#shadow-soft)">
        <!-- Keystone 1042 / 1048 clips -->
        <rect x="{-37.0 * s}" y="{-9.5 * s}" width="{3.5 * s}" height="{19.0 * s}" rx="6" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2.5"/>
        <rect x="{33.5 * s}" y="{-9.5 * s}" width="{3.5 * s}" height="{19.0 * s}" rx="6" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2.5"/>
        <!-- Cuerpo celda 18650 -->
        <rect x="{-32.6 * s}" y="{-9.2 * s}" width="{65.3 * s}" height="{18.5 * s}" rx="18" fill="#365314" stroke="#84cc16" stroke-width="3" stroke-dasharray="14,7"/>
        <circle cx="{-26.0 * s}" cy="0" r="{4.5 * s}" fill="#65a30d" />
        <text x="{-26.0 * s}" y="8" font-family="monospace" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">+</text>
        <circle cx="{26.0 * s}" cy="0" r="{4.5 * s}" fill="#65a30d" />
        <text x="{26.0 * s}" y="8" font-family="monospace" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">-</text>
        <text x="0" y="5" font-family="'Segoe UI', sans-serif" font-size="23" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">BT1: PANASONIC NCR18650B (3400mAh)</text>
        <text x="0" y="32" font-family="'Segoe UI', sans-serif" font-size="14" fill="#ecfccb" text-anchor="middle">MONTAJE EN CARA INFERIOR (BOTTOM) A 42° DIAGONAL</text>
      </g>
    ''')

    # =========================================================================
    # 4. PALETA DE COLORES DE REDES Y CONEXIONES (IPC STANDARDS)
    # =========================================================================
    c_vbat  = "#ef4444"     # Rojo Vivo: Riel de Potencia Batería (+3.7V - 4.2V)
    c_3v3   = "#06b6d4"     # Cian Brillante: Riel Digital +3.3V_SYS
    c_gnd   = "#f59e0b"     # Ámbar / Oro: Masa Digital y RF GND
    c_vbus  = "#f97316"     # Naranja Intenso: Entrada de Carga Solar y USB 5V
    c_usb   = "#38bdf8"     # Azul Cielo: Par Diferencial USB 90Ω (D- / D+)
    c_uart  = "#c084fc"     # Púrpura: Buses Serie UART y Control PWRKEY Módem
    c_i2c   = "#10b981"     # Verde Esmeralda: Bus I2C de Sensores (SDA / SCL)
    c_sim   = "#f472b6"     # Rosa Fucsia: Bus de Interfaz Nano-SIM
    c_rf    = "#eab308"     # Amarillo Oro: Guías de Onda Coplanar RF 50Ω
    c_hv    = "#dc2626"     # Rojo Alta Tensión: 1000V DC CDI
    c_hvgnd = "#a855f7"     # Violeta Aislado: Masa Galvánicamente Separada HV_GND
    c_trig  = "#fb923c"     # Naranja Disparo: Control de Compuertas MOSFET / SCR

    def draw_trace(points, width_mm, color, label="", dash=""):
        pts_str = " ".join([f"{to_px(p[0], p[1])[0]:.1f},{to_px(p[0], p[1])[1]:.1f}" for p in points])
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ''
        out_elems = [f'<polyline points="{pts_str}" fill="none" stroke="{color}" stroke-width="{width_mm * s:.2f}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"{dash_attr}/>']
        
        # Solder junction dots en puntos intermedios
        for p in points[1:-1]:
            px, py = to_px(p[0], p[1])
            out_elems.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{max(width_mm * s * 0.9, 3.5):.1f}" fill="{color}" stroke="#050811" stroke-width="1.2"/>')

        if label and len(points) >= 2:
            mid = len(points) // 2
            lx, ly = to_px(points[mid][0], points[mid][1])
            out_elems.append(f'''
              <g transform="translate({lx:.1f}, {ly:.1f})">
                <rect x="-48" y="-12" width="96" height="22" rx="4" fill="#080d1a" stroke="{color}" stroke-width="1.4"/>
                <text x="0" y="4" font-family="monospace" font-size="10" font-weight="900" fill="{color}" text-anchor="middle">{label}</text>
              </g>
            ''')
        return "\n".join(out_elems)

    svg.append('<!-- ================= ENRUTAMIENTO FÍSICO PUNTO A PUNTO EXACTO ================= -->')

    # 1. PAR DIFERENCIAL USB (J1 Magnético a ESP32 IO19 y IO20)
    # J1 Pin 2 (0.8, 27.0) -> ESP32 Pin 13 IO19 (6.0, 31.45)
    svg.append(draw_trace([(0.8, 27.0), (3.2, 27.0), (4.5, 31.45), (6.0, 31.45)], 0.35, c_usb, "USB_D-"))
    # J1 Pin 3 (0.8, 29.0) -> ESP32 Pin 14 IO20 (6.0, 32.80)
    svg.append(draw_trace([(0.8, 29.0), (3.2, 29.0), (4.5, 32.80), (6.0, 32.80)], 0.35, c_usb, "USB_D+"))

    # 2. VBUS +5V Y BUS DE CARGA SOLAR
    # J1 Pin 1 (+5V) -> D5 Ánodo (4.0, 28.0)
    svg.append(draw_trace([(0.8, 25.0), (2.8, 25.0), (2.8, 28.0), (4.0, 28.0)], 0.85, c_vbus, "VBUS_5V"))
    # D5 Cátodo (6.4, 28.0) hacia Bus Común VIN_CHG en X=7.5 mm
    svg.append(draw_trace([(6.4, 28.0), (7.5, 28.0), (7.5, 46.8)], 0.85, c_vbus, "VIN_CHG"))
    # Paneles Solares D1 y D2 hacia Bus VIN_CHG
    svg.append(draw_trace([(2.5, 48.0), (4.0, 48.0)], 0.85, c_vbus, "SOLAR1"))
    svg.append(draw_trace([(6.4, 48.0), (7.5, 48.0)], 0.85, c_vbus))
    svg.append(draw_trace([(2.5, 52.0), (4.0, 52.0)], 0.85, c_vbus, "SOLAR2"))
    svg.append(draw_trace([(6.4, 52.0), (7.5, 52.0)], 0.85, c_vbus))
    # VIN_CHG alimenta Q3 Pin 2 Source (17.8, 46.8) y U4 Pin 9 VCC (14.4, 51.0)
    svg.append(draw_trace([(7.5, 46.8), (17.8, 46.8)], 0.85, c_vbus, "VIN_Q3"))
    svg.append(draw_trace([(7.5, 51.0), (8.8, 51.0), (8.8, 49.2), (15.5, 49.2), (15.5, 51.0), (14.4, 51.0)], 0.6, c_vbus, "VCC_U4"))
    # Sensor ADC Solar hacia ESP32 Pin 12 IO2 (6.0, 30.1)
    svg.append(draw_trace([(7.5, 30.1), (6.0, 30.1)], 0.25, c_vbus, "ADC_SOL"))

    # 3. CARGADOR SOLAR MPPT CN3791 & ETAPA BUCK (U4 -> Q3 -> L2 -> VBAT)
    # U4 Pin 10 DRV (14.4, 50.0) -> Q3 Pin 1 Gate (17.8, 48.2)
    svg.append(draw_trace([(14.4, 50.0), (16.2, 50.0), (16.2, 48.2), (17.8, 48.2)], 0.35, c_trig, "DRV_GATE"))
    # Nodo de conmutación SW: Q3 Pin 3 Drain (19.2, 47.5) -> D3 Cátodo (19.7, 54.0) -> L2 Pin 1 SW (10.2, 57.0)
    svg.append(draw_trace([(19.2, 47.5), (20.5, 47.5), (20.5, 54.0), (19.7, 54.0)], 1.2, c_vbat, "SW_NODE"))
    svg.append(draw_trace([(20.5, 54.0), (20.5, 58.5), (10.2, 58.5), (10.2, 57.0)], 1.2, c_vbat))
    # D3 Ánodo (17.3, 54.0) a GND
    svg.append(draw_trace([(17.3, 54.0), (16.0, 54.0)], 0.8, c_gnd, "D3_GND"))
    # L2 Pin 2 BAT (13.8, 57.0) -> U4 Pin 8 CSP (14.4, 52.0) y Pin 7 BAT (14.4, 53.0)
    svg.append(draw_trace([(13.8, 57.0), (15.2, 57.0), (15.2, 52.0), (14.4, 52.0)], 1.2, c_vbat, "CSP_SENSE"))
    svg.append(draw_trace([(15.2, 53.0), (14.4, 53.0)], 0.8, c_vbat))

    # 4. RIEL PRINCIPAL DE BATERÍA VBAT (+3.7V a 4.2V)
    # Desde L2 / U4 hacia Borne Positivo BT_POS (18.0, 52.0)
    svg.append(draw_trace([(15.2, 52.0), (18.0, 52.0)], 1.5, c_vbat, "VBAT_4V"))
    # Distribución de VBAT:
    # A Buck U5 SY8089 Pin 4 IN (12.95, 63.35) y Pin 1 EN (11.05, 60.65)
    svg.append(draw_trace([(18.0, 52.0), (18.0, 55.5), (14.5, 55.5), (14.5, 63.35), (12.95, 63.35)], 1.2, c_vbat, "VBAT_BUCK"))
    svg.append(draw_trace([(14.5, 60.65), (11.05, 60.65)], 0.6, c_vbat, "EN_BUCK"))
    # A BMS U6 DW01A Pin 5 VCC (24.0, 47.0)
    svg.append(draw_trace([(18.0, 52.0), (21.5, 52.0), (21.5, 47.0), (24.0, 47.0)], 0.5, c_vbat, "VCC_BMS"))
    # A ESP32 Pin 11 IO1 (ADC_BAT) (6.0, 28.75)
    svg.append(draw_trace([(18.0, 52.0), (18.0, 38.0), (8.5, 38.0), (8.5, 28.75), (6.0, 28.75)], 0.3, c_vbat, "ADC_BAT"))
    # A Módem SIM7670 vía Condensadores C1 y C2 (2x 220µF Tantalio)
    svg.append(draw_trace([(18.0, 52.0), (22.5, 52.0), (22.5, 38.0), (33.0, 38.0), (33.0, 24.0), (35.5, 24.0)], 1.8, c_vbat, "VBAT_MODEM (1.8mm)"))
    svg.append(draw_trace([(33.0, 24.0), (33.0, 18.0), (35.5, 18.0)], 1.8, c_vbat))
    svg.append(draw_trace([(35.5, 24.0), (38.0, 24.0), (45.0, 16.0), (60.0, 22.0)], 1.8, c_vbat, "VBAT -> U2"))
    svg.append(draw_trace([(60.0, 22.0), (60.0, 24.0)], 1.8, c_vbat))
    # A Buzzer BZ1 Pin (+) (24.0, 60.0) y D4 Cátodo (26.3, 54.0)
    svg.append(draw_trace([(18.0, 55.5), (24.0, 55.5), (24.0, 60.0)], 0.8, c_vbat, "VBAT_BZ"))
    svg.append(draw_trace([(24.0, 55.5), (26.3, 55.5), (26.3, 54.0)], 0.5, c_vbat))
    # A Elevador Alta Tensión MOD_HV Pin 1 IN+ (49.0, 50.0)
    svg.append(draw_trace([(33.0, 38.0), (42.0, 38.0), (46.0, 42.0), (46.0, 50.0), (49.0, 50.0)], 1.0, c_vbat, "VBAT_HV"))

    # 5. GESTIÓN Y PROTECCIÓN BMS 1S (Línea Negativa de Batería)
    # Borne Negativo BT_NEG (52.0, 18.0) a U7 FS8205A S2 Pins 7/8 (27.0, 47.0)
    svg.append(draw_trace([(52.0, 18.0), (44.0, 26.0), (35.0, 35.0), (27.0, 43.0), (27.0, 47.0)], 1.5, c_gnd, "BT_NEG_LINE", "8,4"))
    # Conexión a U6 DW01A Pin 6 GND (23.0, 47.0)
    svg.append(draw_trace([(27.0, 47.0), (23.0, 47.0)], 0.5, c_gnd))
    # Compuertas de control OD y OC:
    # U6 Pin 1 OD (23.0, 45.0) -> U7 Pin 4 G1 (29.0, 45.0)
    svg.append(draw_trace([(23.0, 45.0), (26.0, 44.0), (29.0, 44.0), (29.0, 45.0)], 0.3, c_trig, "BMS_OD"))
    # U6 Pin 3 OC (25.0, 45.0) -> U7 Pin 5 G2 (29.0, 47.0)
    svg.append(draw_trace([(25.0, 45.0), (26.5, 45.8), (29.0, 45.8), (29.0, 47.0)], 0.3, c_trig, "BMS_OC"))
    # U7 S1 Pins 1/3 (27.0, 45.0) conectan al Riel GND del Sistema
    svg.append(draw_trace([(27.0, 45.0), (27.0, 41.0), (20.0, 41.0)], 1.5, c_gnd, "GND_SYS"))

    # 6. REGULADOR BUCK +3.3V_SYS (U5 SY8089 -> L1 -> ESP32 & Sensores)
    # U5 Pin 3 LX (12.95, 60.65) -> L1 Pin 1 (16.2, 62.0)
    svg.append(draw_trace([(12.95, 60.65), (14.8, 60.65), (14.8, 62.0), (16.2, 62.0)], 1.2, c_3v3, "LX_SW"))
    # L1 Pin 2 (19.8, 62.0) -> +3.3V_SYS Riel Lógico
    svg.append(draw_trace([(19.8, 62.0), (21.5, 62.0), (21.5, 36.0), (8.5, 36.0), (8.5, 16.6), (6.0, 16.6)], 1.2, c_3v3, "+3.3V_SYS (1.2mm)"))
    # Branch a U3 SC7A20 Pin 7 VDD (11.0, 43.0)
    svg.append(draw_trace([(8.5, 36.0), (8.5, 43.0), (11.0, 43.0)], 0.5, c_3v3, "3V3_IMU"))

    # 7. BUS I2C DE SENSORES (ESP32 IO8/IO9 a SC7A20 Acelerómetro)
    # ESP32 Pin 8 IO8 SDA (6.0, 24.7) -> U3 Pin 4 SDA (12.0, 43.6)
    svg.append(draw_trace([(6.0, 24.7), (8.0, 24.7), (8.0, 43.6), (12.0, 43.6)], 0.3, c_i2c, "I2C_SDA"))
    # ESP32 Pin 9 IO9 SCL (6.0, 26.05) -> U3 Pin 1 SCL (10.0, 43.6)
    svg.append(draw_trace([(6.0, 26.05), (7.2, 26.05), (7.2, 42.4), (10.0, 42.4), (10.0, 43.6)], 0.3, c_i2c, "I2C_SCL"))
    # ESP32 Pin 10 IO10 INT1 (6.0, 27.4) <- U3 Pin 11 INT1 (12.0, 44.4)
    svg.append(draw_trace([(12.0, 44.4), (9.0, 44.4), (9.0, 27.4), (6.0, 27.4)], 0.25, c_i2c, "ACC_INT1"))

    # 8. BUS UART Y CONTROL CELULAR (ESP32 a SIM7670SA)
    # ESP32 Pin 27 IO17 TXD (24.0, 15.25) -> U2 Pin 21 RXD (36.0, 24.0)
    svg.append(draw_trace([(24.0, 15.25), (30.0, 15.25), (30.0, 24.0), (36.0, 24.0)], 0.35, c_uart, "MODEM_TXD"))
    # ESP32 Pin 28 IO18 RXD (24.0, 16.6) <- U2 Pin 22 TXD (36.0, 26.0)
    svg.append(draw_trace([(36.0, 26.0), (29.0, 26.0), (29.0, 16.6), (24.0, 16.6)], 0.35, c_uart, "MODEM_RXD"))
    # ESP32 Pin 6 IO6 PWRKEY (6.0, 22.0) -> Q2 Pin 1 Gate (30.8, 25.8)
    svg.append(draw_trace([(6.0, 22.0), (5.0, 22.0), (5.0, 13.5), (30.8, 13.5), (30.8, 25.8)], 0.3, c_uart, "PWRKEY_CTRL"))
    # Q2 Pin 3 Drain (32.2, 26.5) -> U2 Pin 1 PWRKEY (36.0, 14.0)
    svg.append(draw_trace([(32.2, 26.5), (34.0, 26.5), (34.0, 14.0), (36.0, 14.0)], 0.3, c_uart, "PWRKEY_DRV"))
    # ESP32 Pin 7 IO7 STATUS (6.0, 23.35) <- U2 Pin 3 STATUS (36.0, 16.5)
    svg.append(draw_trace([(36.0, 16.5), (34.5, 16.5), (34.5, 12.0), (4.2, 12.0), (4.2, 23.35), (6.0, 23.35)], 0.25, c_uart, "MODEM_STATUS"))

    # 9. GUÍAS DE ONDA RF 50Ω (LTE & GNSS)
    # U2 Pin 32 LTE_ANT (48.0, 36.0) -> J3 Centro (38.0, 34.0)
    svg.append(draw_trace([(48.0, 36.0), (48.0, 38.0), (38.0, 38.0), (38.0, 34.0)], 0.65, c_rf, "RF_50Ω_LTE"))
    # U2 Pin 46 GNSS_ANT (60.0, 30.0) -> J4 Centro (58.0, 34.0)
    svg.append(draw_trace([(60.0, 30.0), (60.0, 34.0), (58.0, 34.0)], 0.65, c_rf, "RF_50Ω_GNSS"))

    # 10. BUS NANO-SIM 6P (U2 a J2)
    svg.append(draw_trace([(52.0, 12.0), (52.0, 10.5), (61.5, 10.5), (61.5, 16.5)], 0.3, c_sim, "SIM_VDD"))
    svg.append(draw_trace([(54.0, 12.0), (54.0, 11.5), (60.5, 11.5), (60.5, 20.0), (61.5, 20.0)], 0.3, c_sim, "SIM_RST"))
    svg.append(draw_trace([(56.0, 12.0), (56.0, 12.5), (59.5, 12.5), (59.5, 23.5), (61.5, 23.5)], 0.3, c_sim, "SIM_CLK"))
    svg.append(draw_trace([(58.0, 12.0), (58.0, 13.5), (68.5, 13.5), (68.5, 23.5)], 0.3, c_sim, "SIM_DATA"))

    # 11. ALERTA ACÚSTICA BUZZER BZ1 (ESP32 IO5 -> Q1 -> BZ1 + D4)
    # ESP32 Pin 5 IO5 BUZ (6.0, 20.65) -> Q1 Pin 1 Gate (19.8, 55.8)
    svg.append(draw_trace([(6.0, 20.65), (3.6, 20.65), (3.6, 56.5), (19.0, 56.5), (19.0, 55.8), (19.8, 55.8)], 0.3, c_trig, "BUZZER_PWM"))
    # Q1 Pin 3 Drain (21.2, 56.5) -> BZ1 Pin (-) (28.0, 60.0) y D4 Ánodo (24.7, 54.0)
    svg.append(draw_trace([(21.2, 56.5), (23.0, 56.5), (23.0, 54.0), (24.7, 54.0)], 0.5, c_trig, "BUZ_DRV"))
    svg.append(draw_trace([(23.0, 56.5), (28.0, 56.5), (28.0, 60.0)], 0.8, c_trig))

    # 12. CUADRANTE ALTA TENSIÓN 1000V CDI (GALVÁNICAMENTE AISLADO 5kV)
    # ESP32 Pin 4 IO4 IMPULSE_TRIG (6.0, 19.3) -> U8 Pin 1 Ánodo (43.0, 48.0)
    svg.append(draw_trace([(6.0, 19.3), (2.2, 19.3), (2.2, 38.0), (41.0, 38.0), (41.0, 48.0), (43.0, 48.0)], 0.35, c_trig, "IMPULSE_TRIG"))
    # U8 Pin 2 Cátodo (43.0, 50.0) -> GND Digital
    svg.append(draw_trace([(43.0, 50.0), (41.5, 50.0), (41.5, 46.0), (35.0, 46.0)], 0.4, c_gnd, "OPTO_GND"))
    
    # Cruzando la ranura fresada de 2.0 mm (Dominio Alta Tensión):
    # U8 Pin 4 Colector (47.0, 48.0) -> U9 Watchdog Pin 1 ~A (50.5, 45.95)
    svg.append(draw_trace([(47.0, 48.0), (49.0, 48.0), (49.0, 45.95), (50.5, 45.95)], 0.35, c_hv, "OPTO_OUT"))
    # U8 Pin 3 Emisor (47.0, 50.0) a HV_GND
    svg.append(draw_trace([(47.0, 50.0), (48.0, 50.0), (48.0, 52.0)], 0.4, c_hvgnd))
    # U9 Pin 5 Q salida (53.5, 48.05) -> D6 DB3 Pin 1 (60.0, 48.0)
    svg.append(draw_trace([(53.5, 48.05), (56.0, 48.05), (56.0, 48.0), (60.0, 48.0)], 0.4, c_trig, "WDT_OUT"))
    # D6 Pin 2 (61.6, 48.0) -> TH1 Pin 1 Gate (62.0, 55.5)
    svg.append(draw_trace([(61.6, 48.0), (62.0, 48.0), (62.0, 55.5)], 0.4, c_trig, "SCR_GATE"))
    # MOD_HV Pin 3 (+1000V DC) (63.0, 50.0) -> TH1 Pin 2/Tab Ánodo (64.0, 50.5) y C7 Pin 1 (+) (50.0, 64.0)
    svg.append(draw_trace([(63.0, 50.0), (64.0, 50.0), (64.0, 50.5)], 2.0, c_hv, "+1000V_ANODE"))
    svg.append(draw_trace([(63.0, 50.0), (50.0, 50.0), (50.0, 64.0)], 2.0, c_hv, "+1000V_CDI (2.0mm)"))
    # TH1 Pin 3 Cátodo (66.0, 55.5) -> Resistencia R_LIM 220Ω (2W) -> EL1 Terminal (+) (65.0, 60.0)
    svg.append(draw_trace([(66.0, 55.5), (66.0, 58.0), (65.0, 58.0), (65.0, 60.0)], 2.0, c_hv, "PULSE -> EL1"))
    # Riel Aislado HV_GND: MOD_HV Pin 4 (63.0, 58.0) + C7 Pin 2 (-) (62.0, 64.0) -> EL2 Terminal (-) (65.0, 66.0)
    svg.append(draw_trace([(63.0, 58.0), (62.0, 58.0), (62.0, 64.0)], 1.6, c_hvgnd, "HV_GND", "8,4"))
    svg.append(draw_trace([(62.0, 64.0), (62.0, 66.0), (65.0, 66.0)], 1.6, c_hvgnd, "RET -> EL2", "8,4"))

    # =========================================================================
    # 5. RENDERIZADO DETALLADO DE LOS 28 COMPONENTES BOM CON SUS PADS FÍSICOS
    # =========================================================================
    svg.append('<!-- ================= FOOTPRINTS Y PADS DE SOLDADURA FÍSICOS ================= -->')

    def draw_smd_pad(x_mm, y_mm, w_mm, h_mm, pnum, pname="", net_col="#facc15", is_th=False):
        cpx, cpy = to_px(x_mm, y_mm)
        wpx, hpx = w_mm * s, h_mm * s
        out_elems = [f'<g transform="translate({cpx:.1f}, {cpy:.1f})">']
        if is_th:
            out_elems.append(f'<circle cx="0" cy="0" r="{wpx/2:.1f}" fill="url(#solderPTHGrad)" stroke="#854d0e" stroke-width="1.8"/>')
            out_elems.append(f'<circle cx="0" cy="0" r="{hpx/2:.1f}" fill="#050811" stroke="#f59e0b" stroke-width="1.2"/>')
        else:
            out_elems.append(f'<rect x="{-wpx/2:.1f}" y="{-hpx/2:.1f}" width="{wpx:.1f}" height="{hpx:.1f}" rx="2" fill="url(#enigGoldGrad)" stroke="#b45309" stroke-width="1.2"/>')
            out_elems.append(f'<rect x="{-wpx/2 + 2:.1f}" y="{-hpx/2 + 2:.1f}" width="{wpx - 4:.1f}" height="{hpx - 4:.1f}" rx="1" fill="#fef08a" opacity="0.45"/>')
        
        # Pin number text
        txt_col = "#000000" if is_th else "#091421"
        out_elems.append(f'<text x="0" y="3.5" font-family="monospace" font-size="9" font-weight="900" fill="{txt_col}" text-anchor="middle">{pnum}</text>')
        if pname:
            out_elems.append(f'<text x="0" y="{-hpx/2 - 4:.1f}" font-family="monospace" font-size="8.5" font-weight="bold" fill="{net_col}" text-anchor="middle">{pname}</text>')
        out_elems.append('</g>')
        return "\n".join(out_elems)

    def draw_callout_badge(num, desig, x_mm, y_mm, color="#38bdf8"):
        cpx, cpy = to_px(x_mm, y_mm)
        out_elems = [f'<g transform="translate({cpx:.1f}, {cpy:.1f})">']
        out_elems.append(f'<circle cx="0" cy="0" r="15" fill="#091222" stroke="{color}" stroke-width="2.2" filter="url(#shadow-soft)"/>')
        out_elems.append(f'<text x="0" y="4.5" font-family="monospace" font-size="11" font-weight="900" fill="{color}" text-anchor="middle">[{num}]</text>')
        out_elems.append('</g>')
        return "\n".join(out_elems)

    # 1. U1: ESP32-S3-WROOM-1-N16R8 (15.0, 22.0)
    u1_cx, u1_cy = to_px(15.0, 22.0)
    u1_w_px = 18.0 * s
    u1_h_px = 25.5 * s
    svg.append(f'''
      <!-- U1: ESP32-S3-WROOM-1 -->
      <g transform="translate({u1_cx:.1f}, {u1_cy:.1f})" filter="url(#shadow)">
        <rect x="{-u1_w_px/2:.1f}" y="{-u1_h_px/2:.1f}" width="{u1_w_px:.1f}" height="{u1_h_px:.1f}" rx="5" fill="#111c30" stroke="#38bdf8" stroke-width="2"/>
        <!-- Antena PCB Wi-Fi / BLE -->
        <rect x="{-u1_w_px/2 + 10:.1f}" y="{-u1_h_px/2 + 10:.1f}" width="{u1_w_px - 20:.1f}" height="{5.5 * s:.1f}" rx="3" fill="#080f1d" stroke="#eab308" stroke-width="1.5"/>
        <path d="M {-u1_w_px/2 + 25:.1f} {-u1_h_px/2 + 30:.1f} H {u1_w_px/2 - 25:.1f} M {-u1_w_px/2 + 40:.1f} {-u1_h_px/2 + 50:.1f} H {u1_w_px/2 - 40:.1f}" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
        <text x="0" y="{-u1_h_px/2 + 70:.1f}" font-family="monospace" font-size="11" font-weight="bold" fill="#fef08a" text-anchor="middle">ANTENA PCB WI-FI / BLE (2.4GHz)</text>
        
        <!-- EPAD central térmico Pin 41 GND -->
        <rect x="{-3.0 * s:.1f}" y="{-3.0 * s:.1f}" width="{6.0 * s:.1f}" height="{6.0 * s:.1f}" rx="4" fill="url(#enigGoldGrad)" stroke="#b45309" stroke-width="2"/>
        <rect x="{-2.5 * s:.1f}" y="{-2.5 * s:.1f}" width="{5.0 * s:.1f}" height="{5.0 * s:.1f}" fill="url(#viaPattern)"/>
        <text x="0" y="4" font-family="monospace" font-size="12" font-weight="900" fill="#091421" text-anchor="middle">EPAD 41 (GND)</text>
        
        <text x="0" y="{6.2 * s:.1f}" font-family="'Segoe UI', sans-serif" font-size="17" font-weight="900" fill="#38bdf8" text-anchor="middle">U1: ESP32-S3-WROOM-1</text>
        <text x="0" y="{7.6 * s:.1f}" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">Xtensa Dual-Core 240MHz | 16MB Flash | 8MB PSRAM</text>
        <rect x="-65" y="{8.3 * s:.1f}" width="130" height="20" rx="3" fill="#0284c7"/>
        <text x="0" y="{8.3 * s + 14:.1f}" font-family="monospace" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">LCSC: C2913202</text>
      </g>
    ''')
    svg.append(draw_callout_badge("1", "U1", 6.0, 9.0, "#38bdf8"))

    # Pines Izquierdos U1 (X = 6.0 mm)
    u1_left_pins = [
        ("1", "GND", c_gnd), ("2", "3V3", c_3v3), ("3", "EN", "#94a3b8"), ("4", "TRIG", c_trig),
        ("5", "BUZ", c_trig), ("6", "PWRK", c_uart), ("7", "STAT", c_uart), ("8", "SDA", c_i2c),
        ("9", "SCL", c_i2c), ("10", "INT1", c_i2c), ("11", "VBAT", c_vbat), ("12", "VSOL", c_vbus),
        ("13", "D-", c_usb), ("14", "D+", c_usb)
    ]
    for idx, p in enumerate(u1_left_pins):
        py_mm = 22.0 - 12.75 + 6.0 + idx * 1.35
        svg.append(draw_smd_pad(6.0, py_mm, 1.5, 0.9, p[0], p[1], p[2]))

    # Pines Derechos U1 (X = 24.0 mm)
    u1_right_pins = [
        ("27", "TXD", c_uart), ("28", "RXD", c_uart), ("29", "IO15", "#94a3b8"), ("30", "IO16", "#94a3b8"),
        ("31", "IO0", "#94a3b8"), ("32", "IO3", "#94a3b8"), ("33", "IO46", "#94a3b8"), ("34", "IO47", "#94a3b8"),
        ("35", "IO48", "#94a3b8"), ("36", "IO45", "#94a3b8"), ("37", "NC", "#94a3b8"), ("38", "IO35", "#94a3b8"),
        ("39", "GND", c_gnd), ("40", "GND", c_gnd)
    ]
    for idx, p in enumerate(u1_right_pins):
        py_mm = 22.0 - 12.75 + 6.0 + idx * 1.35
        svg.append(draw_smd_pad(24.0, py_mm, 1.5, 0.9, p[0], p[1], p[2]))

    # 2. U2: SIM7670SA-MNGV (48.0, 24.0)
    u2_cx, u2_cy = to_px(48.0, 24.0)
    u2_w_px = 24.0 * s
    u2_h_px = 24.0 * s
    svg.append(f'''
      <!-- U2: SIM7670SA-MNGV -->
      <g transform="translate({u2_cx:.1f}, {u2_cy:.1f})" filter="url(#shadow)">
        <rect x="{-u2_w_px/2:.1f}" y="{-u2_h_px/2:.1f}" width="{u2_w_px:.1f}" height="{u2_h_px:.1f}" rx="6" fill="#1b253b" stroke="#0284c7" stroke-width="2.5"/>
        <circle cx="{-u2_w_px/2 + 25:.1f}" cy="{-u2_h_px/2 + 25:.1f}" r="6" fill="#facc15" />
        
        <rect x="{-4.0 * s:.1f}" y="{-4.0 * s:.1f}" width="{8.0 * s:.1f}" height="{8.0 * s:.1f}" rx="4" fill="url(#enigGoldGrad)" stroke="#b45309" stroke-width="2"/>
        <rect x="{-3.5 * s:.1f}" y="{-3.5 * s:.1f}" width="{7.0 * s:.1f}" height="{7.0 * s:.1f}" fill="url(#viaPattern)"/>
        <text x="0" y="4" font-family="monospace" font-size="13" font-weight="900" fill="#091421" text-anchor="middle">GND THERMAL (68P)</text>
        
        <text x="0" y="{-6.2 * s:.1f}" font-family="'Segoe UI', sans-serif" font-size="18" font-weight="900" fill="#38bdf8" text-anchor="middle">U2: SIM7670SA-MNGV</text>
        <text x="0" y="{-4.9 * s:.1f}" font-family="sans-serif" font-size="12" fill="#cbd5e1" text-anchor="middle">4G LTE Cat-1 + GNSS Alta Sensibilidad</text>
        <rect x="-65" y="{5.5 * s:.1f}" width="130" height="22" rx="4" fill="#0284c7"/>
        <text x="0" y="{5.5 * s + 15:.1f}" font-family="monospace" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">LCSC: C2892994</text>
      </g>
    ''')
    svg.append(draw_callout_badge("2", "U2", 36.0, 10.0, "#0284c7"))

    svg.append(draw_smd_pad(36.0, 14.0, 1.6, 0.8, "1", "PWRKEY", c_uart))
    svg.append(draw_smd_pad(36.0, 16.5, 1.6, 0.8, "3", "STATUS", c_uart))
    svg.append(draw_smd_pad(36.0, 24.0, 1.6, 0.8, "21", "RXD", c_uart))
    svg.append(draw_smd_pad(36.0, 26.0, 1.6, 0.8, "22", "TXD", c_uart))
    svg.append(draw_smd_pad(48.0, 36.0, 0.8, 1.6, "32", "LTE_ANT", c_rf))
    svg.append(draw_smd_pad(60.0, 22.0, 1.6, 0.8, "38", "VBAT", c_vbat))
    svg.append(draw_smd_pad(60.0, 24.0, 1.6, 0.8, "39", "VBAT", c_vbat))
    svg.append(draw_smd_pad(60.0, 30.0, 1.6, 0.8, "46", "GNSS_ANT", c_rf))
    svg.append(draw_smd_pad(52.0, 12.0, 0.8, 1.6, "52", "SIM_VDD", c_sim))
    svg.append(draw_smd_pad(54.0, 12.0, 0.8, 1.6, "53", "SIM_RST", c_sim))
    svg.append(draw_smd_pad(56.0, 12.0, 0.8, 1.6, "54", "SIM_CLK", c_sim))
    svg.append(draw_smd_pad(58.0, 12.0, 0.8, 1.6, "55", "SIM_DATA", c_sim))

    # 3. J3 & J4: Conectores Coaxiales U.FL RF 50Ω
    for j_name, j_x, j_sig in [("J3 (LTE)", 38.0, "LTE_50R"), ("J4 (GNSS)", 58.0, "GNSS_50R")]:
        jpx, jpy = to_px(j_x, 34.0)
        svg.append(f'''
          <g transform="translate({jpx:.1f}, {jpy:.1f})" filter="url(#shadow-soft)">
            <rect x="{-1.5 * s:.1f}" y="{-1.5 * s:.1f}" width="{3.0 * s:.1f}" height="{3.0 * s:.1f}" rx="3" fill="#080f1d" stroke="#eab308" stroke-width="1.5"/>
            <circle cx="0" cy="0" r="{1.2 * s:.1f}" fill="url(#enigGoldGrad)" stroke="#854d0e" stroke-width="1.2"/>
            <circle cx="0" cy="0" r="{0.35 * s:.1f}" fill="#050811" />
            <text x="0" y="{2.6 * s:.1f}" font-family="monospace" font-size="11" font-weight="bold" fill="#facc15" text-anchor="middle">{j_name}</text>
          </g>
        ''')
        svg.append(draw_smd_pad(j_x, 34.0, 0.8, 0.8, "1", j_sig, c_rf))
        svg.append(draw_smd_pad(j_x - 1.2, 34.0, 0.7, 1.2, "G", "GND", c_gnd))
        svg.append(draw_smd_pad(j_x + 1.2, 34.0, 0.7, 1.2, "G", "GND", c_gnd))
    svg.append(draw_callout_badge("26", "J3, J4", 38.0, 39.0, "#eab308"))

    # 4. J2: Socket Nano-SIM 6P Push-Pull (65.0, 20.0)
    j2px, j2py = to_px(65.0, 20.0)
    svg.append(f'''
      <!-- J2: Nano-SIM 6P -->
      <g transform="translate({j2px:.1f}, {j2py:.1f})" filter="url(#shadow-soft)">
        <rect x="{-4.5 * s:.1f}" y="{-6.0 * s:.1f}" width="{9.0 * s:.1f}" height="{12.0 * s:.1f}" rx="4" fill="#1e183a" stroke="#ec4899" stroke-width="2"/>
        <text x="0" y="{-6.6 * s:.1f}" font-family="monospace" font-size="11" font-weight="bold" fill="#f472b6" text-anchor="middle">J2: NANO-SIM-6P</text>
        <text x="0" y="{7.4 * s:.1f}" font-family="sans-serif" font-size="9" fill="#cbd5e1" text-anchor="middle">LCSC: C2838382</text>
      </g>
    ''')
    sim_pads = [
        ("C1", "VDD", -3.5, -3.5, c_sim), ("C2", "RST", -3.5, 0.0, c_sim), ("C3", "CLK", -3.5, 3.5, c_sim),
        ("C5", "GND", 3.5, -3.5, c_gnd), ("C6", "VPP", 3.5, 0.0, "#94a3b8"), ("C7", "DATA", 3.5, 3.5, c_sim)
    ]
    for sp in sim_pads:
        svg.append(draw_smd_pad(65.0 + sp[2], 20.0 + sp[3], 1.2, 1.0, sp[0], sp[1], sp[4]))
    svg.append(draw_callout_badge("25", "J2", 65.0, 12.0, "#ec4899"))

    # 5. C1, C2: Tantalio 220µF 6.3V Case-D 7343 (38.0, 18.0 / 24.0)
    for c_name, cy in [("C1", 18.0), ("C2", 24.0)]:
        cpx, cpy = to_px(38.0, cy)
        svg.append(f'''
          <g transform="translate({cpx:.1f}, {cpy:.1f})" filter="url(#shadow-soft)">
            <rect x="{-3.6 * s:.1f}" y="{-2.1 * s:.1f}" width="{7.3 * s:.1f}" height="{4.3 * s:.1f}" rx="3" fill="#450a0a" stroke="#ef4444" stroke-width="1.8"/>
            <rect x="{-3.6 * s:.1f}" y="{-2.1 * s:.1f}" width="{1.2 * s:.1f}" height="{4.3 * s:.1f}" rx="2" fill="#ef4444" />
            <text x="{-2.4 * s:.1f}" y="4" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">+</text>
            <text x="{0.8 * s:.1f}" y="4" font-family="monospace" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">{c_name}: 220µF</text>
          </g>
        ''')
        svg.append(draw_smd_pad(35.5, cy, 1.8, 2.8, "+", "VBAT", c_vbat))
        svg.append(draw_smd_pad(40.5, cy, 1.8, 2.8, "-", "GND", c_gnd))
    svg.append(draw_callout_badge("21", "C1,C2", 38.0, 14.5, "#ef4444"))

    # 6. J1: Conector Magnético Pogo-Pin 4P IP68 en borde X=0.0
    j1px, j1py = to_px(0.0, 28.0)
    svg.append(f'''
      <!-- J1: Conector Magnético 4P IP68 -->
      <g transform="translate({j1px:.1f}, {j1py:.1f})" filter="url(#shadow)">
        <rect x="{-10}" y="{-3.5 * s:.1f}" width="{4.0 * s:.1f}" height="{7.0 * s:.1f}" rx="6" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
        <circle cx="{0.8 * s:.1f}" cy="{-2.5 * s:.1f}" r="{0.7 * s:.1f}" fill="#cbd5e1" stroke="#475569" stroke-width="1.2"/>
        <text x="{0.8 * s:.1f}" y="{-2.5 * s + 3:.1f}" font-family="sans-serif" font-size="8" font-weight="bold" fill="#000" text-anchor="middle">N</text>
        <circle cx="{0.8 * s:.1f}" cy="{2.5 * s:.1f}" r="{0.7 * s:.1f}" fill="#cbd5e1" stroke="#475569" stroke-width="1.2"/>
        <text x="{0.8 * s:.1f}" y="{2.5 * s + 3:.1f}" font-family="sans-serif" font-size="8" font-weight="bold" fill="#000" text-anchor="middle">S</text>
        <text x="{4.6 * s:.1f}" y="{-3.6 * s:.1f}" font-family="monospace" font-size="12" font-weight="900" fill="#f59e0b">J1: MAG-4P IP68</text>
      </g>
    ''')
    svg.append(draw_smd_pad(0.8, 25.0, 1.2, 1.2, "1", "+5V", c_vbus))
    svg.append(draw_smd_pad(0.8, 27.0, 1.2, 1.2, "2", "D-", c_usb))
    svg.append(draw_smd_pad(0.8, 29.0, 1.2, 1.2, "3", "D+", c_usb))
    svg.append(draw_smd_pad(0.8, 31.0, 1.2, 1.2, "4", "GND", c_gnd))
    svg.append(draw_callout_badge("24", "J1", 0.0, 22.0, "#f59e0b"))

    # D5: SS34 Diodo Anti-retorno VBUS
    svg.append(draw_smd_pad(4.0, 28.0, 1.8, 1.4, "A", "VBUS", c_vbus))
    svg.append(draw_smd_pad(6.4, 28.0, 1.8, 1.4, "K", "VIN", c_vbus))
    svg.append(f'<text x="{to_px(5.2, 26.2)[0]:.1f}" y="{to_px(5.2, 26.2)[1]:.1f}" font-family="monospace" font-size="9" font-weight="bold" fill="#facc15" text-anchor="middle">D5: SS34</text>')
    svg.append(draw_callout_badge("17", "D5", 5.2, 24.5, "#facc15"))

    # 7. U3: SC7A20TR Acelerómetro LGA-12 (11.0, 44.0)
    u3px, u3py = to_px(11.0, 44.0)
    svg.append(f'''
      <!-- U3: SC7A20TR -->
      <g transform="translate({u3px:.1f}, {u3py:.1f})" filter="url(#shadow-soft)">
        <rect x="{-1.0 * s:.1f}" y="{-1.0 * s:.1f}" width="{2.0 * s:.1f}" height="{2.0 * s:.1f}" rx="2" fill="#022c22" stroke="#10b981" stroke-width="1.5"/>
        <text x="0" y="{-1.4 * s:.1f}" font-family="monospace" font-size="10" font-weight="bold" fill="#10b981" text-anchor="middle">U3: SC7A20</text>
        <circle cx="{-0.6 * s:.1f}" cy="{-0.6 * s:.1f}" r="2" fill="#facc15" />
      </g>
    ''')
    svg.append(draw_smd_pad(10.0, 43.6, 0.45, 0.6, "1", "SCL", c_i2c))
    svg.append(draw_smd_pad(12.0, 43.6, 0.45, 0.6, "4", "SDA", c_i2c))
    svg.append(draw_smd_pad(11.0, 43.0, 0.6, 0.45, "7", "3V3", c_3v3))
    svg.append(draw_smd_pad(11.0, 45.0, 0.6, 0.45, "6", "GND", c_gnd))
    svg.append(draw_smd_pad(12.0, 44.4, 0.45, 0.6, "11", "INT1", c_i2c))
    svg.append(draw_callout_badge("3", "U3", 11.0, 41.0, "#10b981"))

    # 8. U4: CN3791 Cargador Solar MPPT SSOP-10 (12.0, 52.0)
    u4px, u4py = to_px(12.0, 52.0)
    svg.append(f'''
      <!-- U4: CN3791 MPPT -->
      <g transform="translate({u4px:.1f}, {u4py:.1f})" filter="url(#shadow-soft)">
        <rect x="{-2.4 * s:.1f}" y="{-2.0 * s:.1f}" width="{4.8 * s:.1f}" height="{4.0 * s:.1f}" rx="3" fill="#091422" stroke="#10b981" stroke-width="2"/>
        <circle cx="{-1.8 * s:.1f}" cy="{-1.4 * s:.1f}" r="3" fill="#facc15"/>
        <text x="0" y="{-2.5 * s:.1f}" font-family="monospace" font-size="11" font-weight="900" fill="#34d399" text-anchor="middle">U4: CN3791 MPPT</text>
        <text x="0" y="3" font-family="sans-serif" font-size="9" fill="#cbd5e1" text-anchor="middle">Vmp=6.0V | 1.2A</text>
        <text x="0" y="{3.0 * s:.1f}" font-family="monospace" font-size="9" fill="#94a3b8" text-anchor="middle">LCSC: C154992</text>
      </g>
    ''')
    # SSOP-10 Pads con nombres reales de pines:
    # Izquierda (1-5): VG, GND, ~CHRG, ~DONE, COM
    u4_left_pins = [("1", "VG", "#94a3b8"), ("2", "GND", c_gnd), ("3", "CHRG", "#94a3b8"), ("4", "DONE", "#94a3b8"), ("5", "COM", "#94a3b8")]
    for idx, p in enumerate(u4_left_pins):
        svg.append(draw_smd_pad(9.6, 50.0 + idx * 1.0, 1.2, 0.5, p[0], p[1], p[2]))
    # Derecha (10-6): DRV, VCC, CSP, BAT, MPPT
    u4_right_pins = [("10", "DRV", c_trig), ("9", "VCC", c_vbus), ("8", "CSP", c_vbat), ("7", "BAT", c_vbat), ("6", "MPPT", c_vbus)]
    for idx, p in enumerate(u4_right_pins):
        svg.append(draw_smd_pad(14.4, 50.0 + idx * 1.0, 1.2, 0.5, p[0], p[1], p[2]))
    svg.append(draw_callout_badge("4", "U4", 12.0, 47.2, "#34d399"))

    # Q3 AO3401A P-MOSFET (18.5, 47.5)
    svg.append(draw_smd_pad(17.8, 48.2, 0.9, 1.1, "1", "G", c_trig))
    svg.append(draw_smd_pad(17.8, 46.8, 0.9, 1.1, "2", "S", c_vbus))
    svg.append(draw_smd_pad(19.2, 47.5, 0.9, 1.1, "3", "D", c_vbat))
    svg.append(f'<text x="{to_px(18.5, 45.2)[0]:.1f}" y="{to_px(18.5, 45.2)[1]:.1f}" font-family="monospace" font-size="10" font-weight="bold" fill="#34d399">Q3: AO3401A</text>')
    svg.append(draw_callout_badge("14", "Q3", 18.5, 43.5, "#34d399"))

    # L2 Inductor 10µH (12.0, 57.0)
    l2px, l2py = to_px(12.0, 57.0)
    svg.append(f'''
      <g transform="translate({l2px:.1f}, {l2py:.1f})" filter="url(#shadow-soft)">
        <rect x="{-2.0 * s:.1f}" y="{-2.0 * s:.1f}" width="{4.0 * s:.1f}" height="{4.0 * s:.1f}" rx="4" fill="#334155" stroke="#10b981" stroke-width="1.8"/>
        <text x="0" y="4" font-family="monospace" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">L2: 10µH</text>
      </g>
    ''')
    svg.append(draw_smd_pad(10.2, 57.0, 1.2, 2.5, "1", "SW", c_vbat))
    svg.append(draw_smd_pad(13.8, 57.0, 1.2, 2.5, "2", "BAT", c_vbat))
    svg.append(draw_callout_badge("20", "L2", 12.0, 60.5, "#10b981"))

    # D3 Diodo Catch SS34 (18.5, 54.0)
    svg.append(draw_smd_pad(17.3, 54.0, 1.8, 1.4, "A", "GND", c_gnd))
    svg.append(draw_smd_pad(19.7, 54.0, 1.8, 1.4, "K", "SW", c_vbat))
    svg.append(f'<text x="{to_px(18.5, 52.4)[0]:.1f}" y="{to_px(18.5, 52.4)[1]:.1f}" font-family="monospace" font-size="9" font-weight="bold" fill="#facc15" text-anchor="middle">D3: SS34</text>')
    svg.append(draw_callout_badge("16", "D3", 18.5, 50.8, "#facc15"))

    # D1 & D2 Diodos Paneles Solares (5.2, 48.0 / 52.0)
    svg.append(draw_smd_pad(4.0, 48.0, 1.8, 1.4, "A", "SOL1", c_vbus))
    svg.append(draw_smd_pad(6.4, 48.0, 1.8, 1.4, "K", "VIN", c_vbus))
    svg.append(draw_smd_pad(4.0, 52.0, 1.8, 1.4, "A", "SOL2", c_vbus))
    svg.append(draw_smd_pad(6.4, 52.0, 1.8, 1.4, "K", "VIN", c_vbus))
    svg.append(f'<text x="{to_px(5.2, 46.4)[0]:.1f}" y="{to_px(5.2, 46.4)[1]:.1f}" font-family="monospace" font-size="9" font-weight="bold" fill="#facc15" text-anchor="middle">D1,D2: SS34</text>')
    svg.append(draw_callout_badge("15", "D1,D2", 5.2, 44.8, "#facc15"))

    # 9. U5: SY8089AAAC Buck 3.3V SOT-23-5 (12.0, 62.0) + L1 (2.2µH)
    u5px, u5py = to_px(12.0, 62.0)
    svg.append(f'''
      <!-- U5: SY8089AAAC -->
      <g transform="translate({u5px:.1f}, {u5py:.1f})" filter="url(#shadow-soft)">
        <rect x="{-1.5 * s:.1f}" y="{-1.5 * s:.1f}" width="{3.0 * s:.1f}" height="{3.0 * s:.1f}" rx="2" fill="#091422" stroke="#38bdf8" stroke-width="1.8"/>
        <text x="0" y="{-1.9 * s:.1f}" font-family="monospace" font-size="10" font-weight="900" fill="#38bdf8" text-anchor="middle">U5: SY8089</text>
        <text x="0" y="3" font-family="sans-serif" font-size="8" fill="#cbd5e1" text-anchor="middle">3.3V / 2A</text>
      </g>
    ''')
    svg.append(draw_smd_pad(11.05, 60.65, 0.6, 1.0, "1", "EN", c_vbat))
    svg.append(draw_smd_pad(12.0, 60.65, 0.6, 1.0, "2", "GND", c_gnd))
    svg.append(draw_smd_pad(12.95, 60.65, 0.6, 1.0, "3", "LX", c_3v3))
    svg.append(draw_smd_pad(12.95, 63.35, 0.6, 1.0, "4", "IN", c_vbat))
    svg.append(draw_smd_pad(11.05, 63.35, 0.6, 1.0, "5", "FB", c_3v3))
    svg.append(draw_callout_badge("5", "U5", 8.5, 62.0, "#38bdf8"))

    # L1 Inductor 2.2µH (18.0, 62.0)
    l1px, l1py = to_px(18.0, 62.0)
    svg.append(f'''
      <g transform="translate({l1px:.1f}, {l1py:.1f})" filter="url(#shadow-soft)">
        <rect x="{-2.0 * s:.1f}" y="{-2.0 * s:.1f}" width="{4.0 * s:.1f}" height="{4.0 * s:.1f}" rx="4" fill="#334155" stroke="#38bdf8" stroke-width="1.8"/>
        <text x="0" y="4" font-family="monospace" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">L1: 2.2µH</text>
      </g>
    ''')
    svg.append(draw_smd_pad(16.2, 62.0, 1.2, 2.5, "1", "LX", c_3v3))
    svg.append(draw_smd_pad(19.8, 62.0, 1.2, 2.5, "2", "3V3", c_3v3))
    svg.append(draw_callout_badge("19", "L1", 18.0, 65.5, "#38bdf8"))

    # 10. BZ1: Piezo Buzzer 95dB (26.0, 60.0) + Q1 + D4
    bzpx, bzpy = to_px(26.0, 60.0)
    svg.append(f'''
      <!-- BZ1: Piezo Buzzer -->
      <g transform="translate({bzpx:.1f}, {bzpy:.1f})" filter="url(#shadow)">
        <circle cx="0" cy="0" r="{6.2 * s:.1f}" fill="#0a1220" stroke="#cbd5e1" stroke-width="2.5"/>
        <circle cx="0" cy="0" r="{1.5 * s:.1f}" fill="#050811" />
        <text x="0" y="4" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">BZ1</text>
        <text x="0" y="24" font-family="sans-serif" font-size="9.5" fill="#94a3b8" text-anchor="middle">95dB 4kHz</text>
      </g>
    ''')
    svg.append(draw_smd_pad(24.0, 60.0, 1.8, 1.8, "+", "VBAT", c_vbat, is_th=True))
    svg.append(draw_smd_pad(28.0, 60.0, 1.8, 1.8, "-", "DRV", c_trig, is_th=True))
    svg.append(draw_callout_badge("23", "BZ1", 26.0, 67.5, "#cbd5e1"))

    # Q1 AO3400A Driver Buzzer (20.5, 56.5)
    svg.append(draw_smd_pad(19.8, 55.8, 0.9, 1.1, "1", "G", c_trig))
    svg.append(draw_smd_pad(19.8, 57.2, 0.9, 1.1, "2", "S", c_gnd))
    svg.append(draw_smd_pad(21.2, 56.5, 0.9, 1.1, "3", "D", c_trig))
    svg.append(f'<text x="{to_px(20.5, 54.4)[0]:.1f}" y="{to_px(20.5, 54.4)[1]:.1f}" font-family="monospace" font-size="10" font-weight="bold" fill="#fb923c">Q1: AO3400A</text>')
    svg.append(draw_callout_badge("12", "Q1", 20.5, 52.8, "#fb923c"))

    # D4 1N4148W Clamp (25.5, 54.0)
    svg.append(draw_smd_pad(24.7, 54.0, 1.2, 0.8, "A", "-", c_trig))
    svg.append(draw_smd_pad(26.3, 54.0, 1.2, 0.8, "K", "+", c_vbat))
    svg.append(f'<text x="{to_px(25.5, 52.6)[0]:.1f}" y="{to_px(25.5, 52.6)[1]:.1f}" font-family="monospace" font-size="9" font-weight="bold" fill="#facc15" text-anchor="middle">D4: 1N4148W</text>')
    svg.append(draw_callout_badge("18", "D4", 25.5, 51.0, "#facc15"))

    # 11. GESTIÓN BATERÍA BMS: U6 (DW01A) & U7 (FS8205A) (24.0, 46.0 / 28.0, 46.0)
    svg.append(f'''
      <!-- U6 & U7 BMS 1S -->
      <g transform="translate({to_px(26.0, 46.0)[0]:.1f}, {to_px(26.0, 46.0)[1]:.1f})" filter="url(#shadow-soft)">
        <rect x="{-3.5 * s:.1f}" y="{-2.2 * s:.1f}" width="{7.0 * s:.1f}" height="{4.4 * s:.1f}" rx="3" fill="#091422" stroke="#10b981" stroke-width="1.8"/>
        <text x="0" y="{-2.6 * s:.1f}" font-family="monospace" font-size="11" font-weight="bold" fill="#34d399" text-anchor="middle">BMS 1S: U6 DW01A + U7 FS8205A</text>
      </g>
    ''')
    svg.append(draw_smd_pad(23.0, 45.0, 0.6, 0.9, "1", "OD", c_trig))
    svg.append(draw_smd_pad(24.0, 45.0, 0.6, 0.9, "2", "CS", c_gnd))
    svg.append(draw_smd_pad(25.0, 45.0, 0.6, 0.9, "3", "OC", c_trig))
    svg.append(draw_smd_pad(25.0, 47.0, 0.6, 0.9, "4", "TD", "#94a3b8"))
    svg.append(draw_smd_pad(24.0, 47.0, 0.6, 0.9, "5", "VCC", c_vbat))
    svg.append(draw_smd_pad(23.0, 47.0, 0.6, 0.9, "6", "GND", c_gnd))
    svg.append(draw_callout_badge("6", "U6", 24.0, 42.5, "#34d399"))

    svg.append(draw_smd_pad(27.0, 45.0, 0.5, 0.9, "1", "S1", c_gnd))
    svg.append(draw_smd_pad(27.65, 45.0, 0.5, 0.9, "2", "D1", "#94a3b8"))
    svg.append(draw_smd_pad(28.35, 45.0, 0.5, 0.9, "3", "S1", c_gnd))
    svg.append(draw_smd_pad(29.0, 45.0, 0.5, 0.9, "4", "G1", c_trig))
    svg.append(draw_smd_pad(29.0, 47.0, 0.5, 0.9, "5", "G2", c_trig))
    svg.append(draw_smd_pad(28.35, 47.0, 0.5, 0.9, "6", "D2", "#94a3b8"))
    svg.append(draw_smd_pad(27.65, 47.0, 0.5, 0.9, "7", "S2", c_gnd))
    svg.append(draw_smd_pad(27.0, 47.0, 0.5, 0.9, "8", "S2", c_gnd))
    svg.append(draw_callout_badge("7", "U7", 28.0, 42.5, "#34d399"))

    # Q2 AO3400A PWRKEY Driver (31.5, 26.5)
    svg.append(draw_smd_pad(30.8, 25.8, 0.9, 1.1, "1", "G", c_uart))
    svg.append(draw_smd_pad(30.8, 27.2, 0.9, 1.1, "2", "S", c_gnd))
    svg.append(draw_smd_pad(32.2, 26.5, 0.9, 1.1, "3", "D", c_uart))
    svg.append(f'<text x="{to_px(31.5, 24.4)[0]:.1f}" y="{to_px(31.5, 24.4)[1]:.1f}" font-family="monospace" font-size="10" font-weight="bold" fill="#c084fc">Q2: AO3400A</text>')
    svg.append(draw_callout_badge("13", "Q2", 31.5, 22.8, "#c084fc"))

    # BT1 Keystone Clips Solder Points
    svg.append(draw_smd_pad(18.0, 52.0, 4.0, 4.0, "+", "BT_POS", c_vbat, is_th=True))
    svg.append(draw_smd_pad(52.0, 18.0, 4.0, 4.0, "-", "BT_NEG", c_gnd, is_th=True))
    svg.append(draw_callout_badge("27", "BT1", 18.0, 55.5, "#84cc16"))

    # 12. CUADRANTE SURESTE: ALTA TENSIÓN 1000V DC (CDI AISLADA)
    # Fondo de advertencia rayado
    hv_box_px, hv_box_py = to_px(44.0, 44.0)
    svg.append(f'''
      <!-- ZONA DE ALTA TENSIÓN 1000V CON AISLAMIENTO DIELECTRICO -->
      <path d="M {hv_box_px} {to_px(44.0, 70.0)[1]} V {hv_box_py} H {to_px(70.0, 44.0)[0]} V {to_px(70.0, 66.0)[1]} A {corner_r_px} {corner_r_px} 0 0 1 {to_px(66.0, 70.0)[0]} {to_px(70.0, 70.0)[1]} H {hv_box_px} Z" fill="url(#hatchHV)"/>
    ''')

    # U8: EL817S1(C) Optoacoplador SOP-4 (45.0, 49.0)
    u8px, u8py = to_px(45.0, 49.0)
    svg.append(f'''
      <!-- U8: Optoacoplador EL817 (Aislamiento 5kV) -->
      <g transform="translate({u8px:.1f}, {u8py:.1f})" filter="url(#shadow)">
        <rect x="{-2.2 * s:.1f}" y="{-3.0 * s:.1f}" width="{4.4 * s:.1f}" height="{6.0 * s:.1f}" rx="3" fill="#1e1014" stroke="#f43f5e" stroke-width="2"/>
        <line x1="0" y1="{-3.0 * s:.1f}" x2="0" y2="{3.0 * s:.1f}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3"/>
        <text x="0" y="{-3.5 * s:.1f}" font-family="monospace" font-size="11" font-weight="900" fill="#f43f5e" text-anchor="middle">U8: EL817 (5kV)</text>
      </g>
    ''')
    svg.append(draw_smd_pad(43.0, 48.0, 1.2, 1.8, "1", "ANODE", c_trig))
    svg.append(draw_smd_pad(43.0, 50.0, 1.2, 1.8, "2", "CATH", c_gnd))
    svg.append(draw_smd_pad(47.0, 50.0, 1.2, 1.8, "3", "EMIT", c_hvgnd))
    svg.append(draw_smd_pad(47.0, 48.0, 1.2, 1.8, "4", "COLL", c_hv))
    svg.append(draw_callout_badge("8", "U8", 45.0, 44.5, "#f43f5e"))

    # U9: 74LVC1G123DCK Watchdog VSSOP-8 (52.0, 47.0)
    u9px, u9py = to_px(52.0, 47.0)
    svg.append(f'''
      <!-- U9: Watchdog 74LVC1G123 -->
      <g transform="translate({u9px:.1f}, {u9py:.1f})" filter="url(#shadow-soft)">
        <rect x="{-1.8 * s:.1f}" y="{-1.6 * s:.1f}" width="{3.6 * s:.1f}" height="{3.2 * s:.1f}" rx="2" fill="#091422" stroke="#ef4444" stroke-width="1.8"/>
        <text x="0" y="{-2.0 * s:.1f}" font-family="monospace" font-size="10" font-weight="900" fill="#fca5a5" text-anchor="middle">U9: WDT 1000ms</text>
      </g>
    ''')
    u9_left_pins = [("1", "~A", c_hv), ("2", "B", "#94a3b8"), ("3", "CLR", "#94a3b8"), ("4", "GND", c_hvgnd)]
    for idx, p in enumerate(u9_left_pins):
        svg.append(draw_smd_pad(50.5, 45.95 + idx * 0.7, 0.8, 0.45, p[0], p[1], p[2]))
    u9_right_pins = [("8", "VCC", c_hv), ("7", "C", "#94a3b8"), ("6", "RC", "#94a3b8"), ("5", "Q", c_trig)]
    for idx, p in enumerate(u9_right_pins):
        svg.append(draw_smd_pad(53.5, 45.95 + idx * 0.7, 0.8, 0.45, p[0], p[1], p[2]))
    svg.append(draw_callout_badge("9", "U9", 52.0, 44.0, "#ef4444"))

    # MOD_HV: Flyback Resonante 18x14mm (56.0, 54.0)
    modpx, modpy = to_px(56.0, 54.0)
    svg.append(f'''
      <!-- MOD_HV: Flyback 1000V -->
      <g transform="translate({modpx:.1f}, {modpy:.1f})" filter="url(#shadow)">
        <rect x="{-9.0 * s:.1f}" y="{-7.0 * s:.1f}" width="{18.0 * s:.1f}" height="{14.0 * s:.1f}" rx="6" fill="#18181b" stroke="#ef4444" stroke-width="2.5"/>
        <text x="0" y="{-4.0 * s:.1f}" font-family="monospace" font-size="15" font-weight="900" fill="#f87171" text-anchor="middle">MOD_HV: FLYBACK 1000V DC</text>
        <text x="0" y="{-2.2 * s:.1f}" font-family="sans-serif" font-size="11" fill="#cbd5e1" text-anchor="middle">Micro-Convertidor Resonante Potted Epoxy</text>
        <text x="0" y="10" font-family="monospace" font-size="12" fill="#fca5a5" text-anchor="middle">Vin: 3.7V -&gt; Vout: 1,000V DC</text>
      </g>
    ''')
    svg.append(draw_smd_pad(49.0, 50.0, 2.0, 2.0, "1", "IN+", c_vbat, is_th=True))
    svg.append(draw_smd_pad(49.0, 58.0, 2.0, 2.0, "2", "IN-", c_gnd, is_th=True))
    svg.append(draw_smd_pad(63.0, 50.0, 2.0, 2.0, "3", "HV+", c_hv, is_th=True))
    svg.append(draw_smd_pad(63.0, 58.0, 2.0, 2.0, "4", "HV-", c_hvgnd, is_th=True))
    svg.append(draw_callout_badge("28", "MOD_HV", 56.0, 45.0, "#f87171"))

    # C7: 0.1µF 1000V CBB21 (56.0, 64.0)
    c7px, c7py = to_px(56.0, 64.0)
    svg.append(f'''
      <!-- C7: Condensador CDI 0.1uF 1kV -->
      <g transform="translate({c7px:.1f}, {c7py:.1f})" filter="url(#shadow)">
        <rect x="{-8.0 * s:.1f}" y="{-3.5 * s:.1f}" width="{16.0 * s:.1f}" height="{7.0 * s:.1f}" rx="4" fill="#7f1d1d" stroke="#ef4444" stroke-width="2"/>
        <text x="0" y="4" font-family="monospace" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">C7: 0.1µF 1000V CBB21 (50mJ)</text>
      </g>
    ''')
    svg.append(draw_smd_pad(50.0, 64.0, 2.4, 2.4, "1", "HV+", c_hv, is_th=True))
    svg.append(draw_smd_pad(62.0, 64.0, 2.4, 2.4, "2", "HV-", c_hvgnd, is_th=True))
    svg.append(draw_callout_badge("22", "C7", 56.0, 68.5, "#ef4444"))

    # TH1: TYN1225RG TO-252 SCR (64.0, 52.0) + D6 DB3
    th1px, th1py = to_px(64.0, 52.0)
    svg.append(f'''
      <!-- TH1: TYN1225RG SCR -->
      <g transform="translate({th1px:.1f}, {th1py:.1f})" filter="url(#shadow)">
        <rect x="{-3.0 * s:.1f}" y="{-3.5 * s:.1f}" width="{6.0 * s:.1f}" height="{5.0 * s:.1f}" rx="3" fill="url(#enigGoldGrad)" stroke="#b45309" stroke-width="1.8"/>
        <text x="0" y="{-1.0 * s:.1f}" font-family="monospace" font-size="12" font-weight="900" fill="#091421" text-anchor="middle">ANODE / TAB</text>
        <text x="0" y="{3.5 * s:.1f}" font-family="monospace" font-size="11" font-weight="900" fill="#f87171" text-anchor="middle">TH1: TYN1225RG</text>
      </g>
    ''')
    svg.append(draw_smd_pad(62.0, 55.5, 1.2, 1.8, "1", "GATE", c_trig))
    svg.append(draw_smd_pad(66.0, 55.5, 1.2, 1.8, "3", "CATH", c_hv))
    svg.append(draw_callout_badge("10", "TH1", 64.0, 46.8, "#ef4444"))

    # D6 Diac DB3 (60.8, 48.0)
    svg.append(draw_smd_pad(60.0, 48.0, 1.5, 1.0, "1", "DIAC", c_trig))
    svg.append(draw_smd_pad(61.6, 48.0, 1.5, 1.0, "2", "GATE", c_trig))
    svg.append(f'<text x="{to_px(60.8, 46.5)[0]:.1f}" y="{to_px(60.8, 46.5)[1]:.1f}" font-family="monospace" font-size="9" font-weight="bold" fill="#facc15" text-anchor="middle">D6: DB3</text>')
    svg.append(draw_callout_badge("11", "D6", 60.8, 45.0, "#facc15"))

    # EL1 & EL2: Bornes de Salida M4 Inox 316 (65.0, 60.0) y (65.0, 66.0)
    for el_name, ely, el_col in [("EL1 (+)", 60.0, c_hv), ("EL2 (-)", 66.0, c_hvgnd)]:
        elpx, elpy = to_px(65.0, ely)
        svg.append(f'''
          <!-- Borne {el_name} -->
          <g transform="translate({elpx:.1f}, {elpy:.1f})" filter="url(#shadow)">
            <circle cx="0" cy="0" r="{3.0 * s:.1f}" fill="url(#enigGoldGrad)" stroke="#b45309" stroke-width="2"/>
            <circle cx="0" cy="0" r="{1.6 * s:.1f}" fill="#050811" stroke="#f59e0b" stroke-width="1.5"/>
            <text x="{-4.0 * s:.1f}" y="4" font-family="monospace" font-size="11" font-weight="bold" fill="{el_col}" text-anchor="end">{el_name} M4 INOX</text>
          </g>
        ''')
    svg.append(draw_callout_badge("29", "EL1,EL2", 65.0, 69.5, "#ef4444"))

    # =========================================================================
    # 6. PANEL INFERIOR IZQUIERDO: DETALLES DFM Y APILADO DE CAPAS (L1-L4)
    # =========================================================================
    st_x = 120
    st_y = 2920
    st_w = 2590
    st_h = 610

    svg.append(f'''
      <!-- PANEL DE ESPECIFICACIONES TÉCNICAS DFM Y APILADO 4-LAYER -->
      <g transform="translate({st_x}, {st_y})" filter="url(#shadow)">
        <rect width="{st_w}" height="{st_h}" rx="10" fill="#080e1a" stroke="#38bdf8" stroke-width="2"/>
        <rect width="{st_w}" height="38" rx="10" fill="#132038"/>
        <rect y="28" width="{st_w}" height="10" fill="#132038"/>
        <text x="25" y="26" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="900" fill="#38bdf8">ESPECIFICACIÓN DE APILADO DE CAPAS (PCB 4-LAYER STACKUP) &amp; REGLAS DE AISLAMIENTO</text>
        
        <!-- Stackup diagram -->
        <g transform="translate(30, 60)">
          <!-- L1 Top -->
          <rect x="0" y="0" width="800" height="28" rx="4" fill="#10b981" stroke="#059669" stroke-width="1.5"/>
          <text x="15" y="19" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff">CAPA 1 (TOP LAYER): Señales de Alta Velocidad, Componentes SMT/BOM, Rieles VBAT, +3.3V, USB</text>
          <text x="820" y="19" font-family="monospace" font-size="12" fill="#cbd5e1">1 oz Cu (35µm) + ENIG Gold 2µ"</text>
          
          <!-- Dielectric 1 -->
          <rect x="0" y="32" width="800" height="18" fill="#334155" opacity="0.6"/>
          <text x="15" y="45" font-family="sans-serif" font-size="10.5" fill="#94a3b8">Prepreg FR-4 TG155 (0.21 mm)</text>
          
          <!-- L2 Inner 1 GND -->
          <rect x="0" y="54" width="800" height="28" rx="4" fill="#b45309" stroke="#f59e0b" stroke-width="1.5"/>
          <text x="15" y="73" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff">CAPA 2 (INNER 1 / GND): Plano de Tierra Reflectivo GNSS (60×60 mm) &amp; Retorno de Corriente RF</text>
          <text x="820" y="73" font-family="monospace" font-size="12" fill="#cbd5e1">1 oz Cu (35µm) Plano Continuo</text>
          
          <!-- Core -->
          <rect x="0" y="86" width="800" height="30" fill="#1e293b" opacity="0.8"/>
          <text x="15" y="105" font-family="sans-serif" font-size="11" fill="#94a3b8">Núcleo Central FR-4 Core TG155 Aislante de Alta Tensión (1.00 mm)</text>
          
          <!-- L3 Inner 2 Power -->
          <rect x="0" y="120" width="800" height="28" rx="4" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>
          <text x="15" y="139" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff">CAPA 3 (INNER 2 / PWR): Planos de Distribución de Potencia +3.3V_SYS y Filtrado Desacople</text>
          <text x="820" y="139" font-family="monospace" font-size="12" fill="#cbd5e1">1 oz Cu (35µm) Coplanar</text>
          
          <!-- Dielectric 2 -->
          <rect x="0" y="152" width="800" height="18" fill="#334155" opacity="0.6"/>
          <text x="15" y="165" font-family="sans-serif" font-size="10.5" fill="#94a3b8">Prepreg FR-4 TG155 (0.21 mm)</text>
          
          <!-- L4 Bottom -->
          <rect x="0" y="174" width="800" height="28" rx="4" fill="#047857" stroke="#10b981" stroke-width="1.5"/>
          <text x="15" y="193" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff">CAPA 4 (BOTTOM LAYER): Montaje Diagonal Celda 18650 (Keystone 1042/1048), Pistas de Retorno</text>
          <text x="820" y="193" font-family="monospace" font-size="12" fill="#cbd5e1">1 oz Cu (35µm) + ENIG Gold</text>
        </g>
        
        <!-- Bloque de Certificación y Firmas Oficiales -->
        <g transform="translate(1350, 55)">
          <rect width="1200" height="520" rx="8" fill="#0a1222" stroke="#25354e" stroke-width="1.5"/>
          <text x="25" y="32" font-family="sans-serif" font-size="15" font-weight="bold" fill="#38bdf8">CONTROL DE CALIDAD, PRODUCCIÓN Y SEGURIDAD INDUSTRIAL:</text>
          <text x="25" y="65" font-family="sans-serif" font-size="13" fill="#cbd5e1">• Autores del Diseño PCBA: <tspan font-weight="bold" fill="#ffffff">Renier Morales &amp; Lindbergh Zambrano</tspan></text>
          <text x="25" y="92" font-family="sans-serif" font-size="13" fill="#cbd5e1">• Dispositivo IoT: <tspan font-weight="bold" fill="#38bdf8">CollarNet V3 (PCB Monolítica 70.00 × 70.00 mm)</tspan></text>
          <text x="25" y="119" font-family="sans-serif" font-size="13" fill="#cbd5e1">• Tolerancia Dimensional: <tspan fill="#facc15">±0.10 mm (Corte CNC Router) | Biselado 45° en esquinas R=4.0mm</tspan></text>
          <text x="25" y="146" font-family="sans-serif" font-size="13" fill="#cbd5e1">• Seguridad Operativa: <tspan font-weight="bold" fill="#10b981">IEC 60335-2-76 (Energía limitada estrictamente a 0.050 J / 50 mJ)</tspan></text>
          <text x="25" y="173" font-family="sans-serif" font-size="13" fill="#cbd5e1">• Resistencia Dieléctrica: <tspan font-weight="bold" fill="#10b981">5,000V RMS (Optoacoplador EL817 + Ranura en 'L' pasante)</tspan></text>
          <text x="25" y="200" font-family="sans-serif" font-size="13" fill="#cbd5e1">• Soldabilidad SMT: <tspan fill="#ffffff">Pasta sin plomo SAC305 (Sn96.5/Ag3.0/Cu0.5) Reflujo Perfil IPC J-STD-020</tspan></text>
          <text x="25" y="227" font-family="sans-serif" font-size="13" fill="#cbd5e1">• Inspección Óptica: <tspan fill="#ffffff">AOI 100% en fábrica + Rayos X (AXI) para EPAD central U1 y U2</tspan></text>
          
          <line x1="25" y1="245" x2="1175" y2="245" stroke="#25354e" stroke-width="1.2"/>
          <text x="25" y="272" font-family="monospace" font-size="12" font-weight="bold" fill="#38bdf8">RESUMEN DE REDES ELÉCTRICAS PRINCIPALES (NETLIST):</text>
          <text x="25" y="298" font-family="monospace" font-size="11.5" fill="#f87171">• VBAT_PWR: 3.7V - 4.2V (Alimenta U2 SIM7670, U4 CN3791, U5 Buck, BZ1, MOD_HV)</text>
          <text x="25" y="322" font-family="monospace" font-size="11.5" fill="#38bdf8">• +3.3V_SYS: 3.318V regulado a 2A (Alimenta ESP32-S3, SC7A20 y polarizaciones)</text>
          <text x="25" y="346" font-family="monospace" font-size="11.5" fill="#f59e0b">• GND_SYS: Plano común L2 + vías térmicas (Retorno lógico y celular)</text>
          <text x="25" y="370" font-family="monospace" font-size="11.5" fill="#fb923c">• VBUS_5V / SOLAR_VIN: Entrada protegida por D5 (Pogo) y D1/D2 (Paneles 6V)</text>
          <text x="25" y="394" font-family="monospace" font-size="11.5" fill="#c084fc">• UART_MODEM: TXD/RXD cruzado a 115200 bps + PWRKEY N-MOSFET Q2</text>
          <text x="25" y="418" font-family="monospace" font-size="11.5" fill="#10b981">• I2C_BUS: SDA/SCL con pull-ups 4.7k a +3.3V (SC7A20 Acelerómetro)</text>
          <text x="25" y="442" font-family="monospace" font-size="11.5" fill="#ef4444">• +1000V_CDI / HV_GND: Circuito resonante impulsivo aislado por ranura L 2.0mm</text>
          <text x="25" y="468" font-family="monospace" font-size="11.5" fill="#64748b">Hash Firma DFM: CN-V3-70x70-CAD-MASTER-REV3.0-202611-VERIFIED</text>
        </g>
      </g>
    ''')

    # =========================================================================
    # 7. SECCIÓN DERECHA SUPERIOR: DIAGRAMA DE INTERCONEXIÓN DE CIRCUITOS (SCHEMATIC FLOW)
    # =========================================================================
    rx = 2770
    rw = 2550
    topo_y = 240
    topo_h = 1600

    svg.append(f'''
      <!-- ================= DIAGRAMA COMPLETO DE INTERCONEXIÓN DE CIRCUITOS ================= -->
      <g transform="translate({rx}, {topo_y})" filter="url(#shadow)">
        <rect width="{rw}" height="{topo_h}" rx="10" fill="#080d19" stroke="#38bdf8" stroke-width="2.5"/>
        <rect width="{rw}" height="42" rx="10" fill="#121f38"/>
        <rect y="30" width="{rw}" height="12" fill="#121f38"/>
        <text x="25" y="28" font-family="'Segoe UI', sans-serif" font-size="17" font-weight="900" fill="#38bdf8">DIAGRAMA ESQUEMÁTICO DE INTERCONEXIÓN ENTRE CIRCUITOS (CIRCUIT INTERCONNECT TOPOLOGY)</text>
        <text x="{rw - 25}" y="28" font-family="monospace" font-size="13" font-weight="bold" fill="#10b981" text-anchor="end">ARQUITECTURA DE ENERGÍA, CONTROL Y TELECOMUNICACIONES</text>

        <!-- ================= FILA 1: FUENTES DE ENERGÍA Y GESTIÓN DE BATERÍA ================= -->
        <!-- Bloque 1: Entradas de Energía -->
        <g transform="translate(30, 65)">
          <rect width="460" height="230" rx="8" fill="#101828" stroke="#f59e0b" stroke-width="2"/>
          <rect width="460" height="32" rx="8" fill="#1f293d"/>
          <text x="18" y="22" font-family="monospace" font-size="13.5" font-weight="900" fill="#f59e0b">[1] ENTRADAS DE ENERGÍA (5V - 6V)</text>
          
          <text x="18" y="58" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Puerto Magnético J1 (4 Pines IP68):</text>
          <text x="32" y="78" font-family="sans-serif" font-size="12" fill="#cbd5e1">Pin 1: +5V VBUS | Pin 4: GND | Pin 2/3: USB D-/D+</text>
          <text x="32" y="96" font-family="sans-serif" font-size="12" fill="#cbd5e1">Diodo D5 (SS34): Impide retorno (0.00V en reposo)</text>
          
          <text x="18" y="126" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Entradas Paneles Solares (6.0V Vmp):</text>
          <text x="32" y="146" font-family="sans-serif" font-size="12" fill="#cbd5e1">Panel 1 -&gt; Diodo D1 (SS34 40V/3A) -&gt; Bus VIN</text>
          <text x="32" y="164" font-family="sans-serif" font-size="12" fill="#cbd5e1">Panel 2 -&gt; Diodo D2 (SS34 40V/3A) -&gt; Bus VIN</text>
          <text x="18" y="196" font-family="monospace" font-size="12" font-weight="bold" fill="#f59e0b">SALIDA: Bus VIN_CHG común hacia Cargador MPPT</text>
        </g>

        <!-- Flecha 1 -> 2 -->
        <path d="M 490 180 H 540" stroke="#f59e0b" stroke-width="4" fill="none"/>
        <polygon points="540,175 555,180 540,185" fill="#f59e0b"/>
        <text x="515" y="168" font-family="monospace" font-size="11" font-weight="bold" fill="#f59e0b" text-anchor="middle">VIN (6V)</text>

        <!-- Bloque 2: MPPT Charger CN3791 -->
        <g transform="translate(560, 65)">
          <rect width="520" height="230" rx="8" fill="#101828" stroke="#10b981" stroke-width="2"/>
          <rect width="520" height="32" rx="8" fill="#1f293d"/>
          <text x="18" y="22" font-family="monospace" font-size="13.5" font-weight="900" fill="#34d399">[2] CARGADOR SOLAR MPPT (U4 CN3791)</text>
          
          <text x="18" y="58" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Convertidor Reductor Sincrónico MPPT:</text>
          <text x="32" y="78" font-family="sans-serif" font-size="12" fill="#cbd5e1">P-MOSFET Q3 (AO3401A) conmutado por pin 10 (DRV)</text>
          <text x="32" y="96" font-family="sans-serif" font-size="12" fill="#cbd5e1">Inductor Blindado L2 (10µH / 2.5A) + D3 (SS34 Catch)</text>
          <text x="18" y="126" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Control y Algoritmo MPPT:</text>
          <text x="32" y="146" font-family="sans-serif" font-size="12" fill="#cbd5e1">Punto de Máxima Potencia Vmp = 6.00V fijado por divisor</text>
          <text x="32" y="164" font-family="sans-serif" font-size="12" fill="#cbd5e1">Resistencia sensora R_CS 0.1Ω fijando I_chg = 1.20A</text>
          <text x="18" y="196" font-family="monospace" font-size="12" font-weight="bold" fill="#34d399">SALIDA: Pin 7 (BAT) -&gt; Riel VBAT Celda 18650</text>
        </g>

        <!-- Flecha 2 -> 3 -->
        <path d="M 1080 180 H 1130" stroke="#ef4444" stroke-width="5" fill="none"/>
        <polygon points="1130,174 1145,180 1130,186" fill="#ef4444"/>
        <text x="1105" y="168" font-family="monospace" font-size="11" font-weight="bold" fill="#ef4444" text-anchor="middle">VBAT</text>

        <!-- Bloque 3: BMS 1S & Batería 18650 -->
        <g transform="translate(1150, 65)">
          <rect width="640" height="230" rx="8" fill="#101828" stroke="#84cc16" stroke-width="2"/>
          <rect width="640" height="32" rx="8" fill="#1f293d"/>
          <text x="18" y="22" font-family="monospace" font-size="13.5" font-weight="900" fill="#84cc16">[3] PROTECCIÓN BMS 1S &amp; BATERÍA 18650</text>
          
          <text x="18" y="58" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Almacenamiento Celda BT1 (3400mAh):</text>
          <text x="32" y="78" font-family="sans-serif" font-size="12" fill="#cbd5e1">Panasonic NCR18650B en clips Keystone 1042/1048 (Cara Inferior 42°)</text>
          <text x="32" y="96" font-family="sans-serif" font-size="12" fill="#cbd5e1">Borne BT_POS conectado directamente a Riel VBAT (3.7V - 4.2V)</text>
          <text x="18" y="126" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Protección Activa Hardware U6 (DW01A) + U7 (FS8205A):</text>
          <text x="32" y="146" font-family="sans-serif" font-size="12" fill="#cbd5e1">Corte por Sobredescarga: OD abre compuerta G1 si Vcell &lt; 2.40V</text>
          <text x="32" y="164" font-family="sans-serif" font-size="12" fill="#cbd5e1">Corte por Sobrecarga: OC abre compuerta G2 si Vcell &gt; 4.28V</text>
          <text x="18" y="196" font-family="monospace" font-size="12" font-weight="bold" fill="#84cc16">Protección Cortocircuito: Detección &lt;10µs con MOSFET Dual 25mΩ</text>
        </g>

        <!-- Flecha 3 -> 4 -->
        <path d="M 1790 180 H 1840" stroke="#06b6d4" stroke-width="4" fill="none"/>
        <polygon points="1840,175 1855,180 1840,185" fill="#06b6d4"/>
        <text x="1815" y="168" font-family="monospace" font-size="11" font-weight="bold" fill="#06b6d4" text-anchor="middle">+3.3V</text>

        <!-- Bloque 4: Buck SY8089 -->
        <g transform="translate(1860, 65)">
          <rect width="650" height="230" rx="8" fill="#101828" stroke="#06b6d4" stroke-width="2"/>
          <rect width="650" height="32" rx="8" fill="#1f293d"/>
          <text x="18" y="22" font-family="monospace" font-size="13.5" font-weight="900" fill="#06b6d4">[4] REGULADOR BUCK +3.3V_SYS (U5 SY8089)</text>
          
          <text x="18" y="58" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Conversión Reductora DC-DC de Alta Eficiencia (93%):</text>
          <text x="32" y="78" font-family="sans-serif" font-size="12" fill="#cbd5e1">Frecuencia de Conmutación: 1.5 MHz fija | Corriente: 2.0A máx</text>
          <text x="32" y="96" font-family="sans-serif" font-size="12" fill="#cbd5e1">Filtro de Salida: Inductor blindado L1 (2.2µH) + 2x 22µF cerámicos X7R</text>
          <text x="18" y="126" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Alimentación a Subsistemas Lógicos:</text>
          <text x="32" y="146" font-family="sans-serif" font-size="12" fill="#cbd5e1">Microcontrolador ESP32-S3 (Pin 2: +3.3V_SYS)</text>
          <text x="32" y="164" font-family="sans-serif" font-size="12" fill="#cbd5e1">Sensor SC7A20 Acelerómetro (Pins 7/8 VDD/VDDIO)</text>
          <text x="18" y="196" font-family="monospace" font-size="12" font-weight="bold" fill="#06b6d4">SALIDA: Riel Primario +3.3V_SYS Limpio y Estable</text>
        </g>

        <!-- ================= FILA 2: MICROCONTROLADOR, SENSORES Y TELECOMUNICACIONES ================= -->
        <!-- Bloque 5: ESP32-S3 Central -->
        <g transform="translate(30, 340)">
          <rect width="780" height="340" rx="8" fill="#0b172a" stroke="#38bdf8" stroke-width="2.5"/>
          <rect width="780" height="34" rx="8" fill="#1b2a47"/>
          <text x="18" y="24" font-family="monospace" font-size="14.5" font-weight="900" fill="#38bdf8">[5] MICROCONTROLADOR PRINCIPAL: U1 ESP32-S3-WROOM-1</text>
          
          <text x="18" y="60" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">Xtensa® 32-bit LX7 Dual-Core a 240 MHz | 16MB Flash | 8MB PSRAM | Wi-Fi 2.4GHz / BLE 5.0</text>
          <text x="18" y="86" font-family="monospace" font-size="12.5" fill="#38bdf8">INTERFACES Y PINES DE COMUNICACIÓN FÍSICOS:</text>
          <text x="25" y="110" font-family="sans-serif" font-size="12" fill="#cbd5e1">• <tspan font-weight="bold" fill="#38bdf8">USB D- / D+ (IO19/IO20):</tspan> Conectado a J1 Pogo 4P (Pines 2 y 3) para flasheo y depuración USB nativo</text>
          <text x="25" y="132" font-family="sans-serif" font-size="12" fill="#cbd5e1">• <tspan font-weight="bold" fill="#c084fc">UART Módem (IO17 TX / IO18 RX):</tspan> Enlace directo AT commands hacia SIM7670SA a 115,200 bps</text>
          <text x="25" y="154" font-family="sans-serif" font-size="12" fill="#cbd5e1">• <tspan font-weight="bold" fill="#c084fc">Control Encendido (IO6 / IO7):</tspan> IO6 comanda Q2 (PWRKEY); IO7 lee pin STATUS de red celular</text>
          <text x="25" y="176" font-family="sans-serif" font-size="12" fill="#cbd5e1">• <tspan font-weight="bold" fill="#10b981">Bus I2C (IO8 SDA / IO9 SCL):</tspan> Interroga SC7A20 Acelerómetro con pull-ups de 4.7 kΩ</text>
          <text x="25" y="198" font-family="sans-serif" font-size="12" fill="#cbd5e1">• <tspan font-weight="bold" fill="#10b981">Interrupción Wakeup (IO10):</tspan> Despierta la CPU de Deep Sleep ante movimiento detectado por INT1</text>
          <text x="25" y="220" font-family="sans-serif" font-size="12" fill="#cbd5e1">• <tspan font-weight="bold" fill="#fb923c">Alerta Acústica PWM (IO5):</tspan> Modula MOSFET Q1 (AO3400A) para generar tono de 4kHz en Buzzer BZ1</text>
          <text x="25" y="242" font-family="sans-serif" font-size="12" fill="#cbd5e1">• <tspan font-weight="bold" fill="#ef4444">Disparo CDI (IO4 IMPULSE_TRIG):</tspan> Genera pulso de 100ms hacia optoacoplador U8 (Aislamiento 5kV)</text>
          <text x="25" y="264" font-family="sans-serif" font-size="12" fill="#cbd5e1">• <tspan font-weight="bold" fill="#facc15">Monitoreo ADC (IO1 / IO2):</tspan> Divisores resistivos miden tensión de celda VBAT e insolación solar</text>
          <text x="18" y="300" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">CONEXIÓN DE ALIMENTACIÓN: Pin 2 (+3.3V_SYS) | Pin 1 y Pad 41 Térmico central a GND (9 vías)</text>
        </g>

        <!-- Bloque 6: SC7A20 Sensor IMU -->
        <g transform="translate(850, 340)">
          <rect width="400" height="340" rx="8" fill="#081816" stroke="#10b981" stroke-width="2"/>
          <rect width="400" height="34" rx="8" fill="#112d26"/>
          <text x="18" y="24" font-family="monospace" font-size="14" font-weight="900" fill="#34d399">[6] SENSOR: U3 SC7A20TR</text>
          
          <text x="18" y="60" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">Acelerómetro MEMS 3 Ejes LGA-12</text>
          <text x="18" y="85" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Consumo Ultra-Bajo: <tspan fill="#34d399" font-weight="bold">6 µA</tspan> en reposo</text>
          <text x="18" y="110" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Sensibilidad Programable: ±2g / ±4g / ±8g</text>
          <text x="18" y="135" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Bus I2C: Pin 4 (SDA), Pin 1 (SCL)</text>
          <text x="18" y="160" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Dirección I2C: 0x18 (Pin SDO a GND)</text>
          <text x="18" y="185" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Pin 11 (INT1): Despertador de movimiento</text>
          <text x="18" y="210" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Pines 7/8: +3.3V_SYS desacoplado 100nF</text>
          <text x="18" y="250" font-family="monospace" font-size="11.5" fill="#facc15">FUNCIÓN EN COLLARNET:</text>
          <text x="18" y="275" font-family="sans-serif" font-size="12" fill="#cbd5e1">Detecta actividad cinética del dispositivo para entrar o salir de hibernación energética.</text>
        </g>

        <!-- Bloque 7: Telecom Módem SIM7670SA -->
        <g transform="translate(1290, 340)">
          <rect width="1220" height="340" rx="8" fill="#0d1b33" stroke="#0284c7" stroke-width="2.5"/>
          <rect width="1220" height="34" rx="8" fill="#1a325a"/>
          <text x="18" y="24" font-family="monospace" font-size="14.5" font-weight="900" fill="#38bdf8">[7] TELECOMUNICACIONES: U2 SIM7670SA-MNGV (4G LTE CAT-1 + GNSS) &amp; PERIFÉRICOS</text>
          
          <g transform="translate(20, 50)">
            <text x="0" y="20" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Módulo Celular Multibanda &amp; Satelital:</text>
            <text x="15" y="42" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">Bandas LTE-FDD: B1/B2/B3/B4/B5/B7/B8/B28 | Receptor GNSS integrado (GPS, GLONASS, BeiDou, Galileo)</text>
            <text x="15" y="64" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">Alimentación Pines 38/39 (VBAT): 3.4V a 4.2V con soporte de corrientes de ráfaga de 2.0A pico</text>
            
            <text x="0" y="96" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Banco de Filtrado de Pico C1, C2 (440 µF Tantalio Low-ESR Case-D):</text>
            <text x="15" y="118" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">2 condensadores de 220µF 6.3V soldados a &lt;2 mm de los pines 38 y 39 para absorber transitorios sin caída de tensión</text>
            
            <text x="0" y="150" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Interfaz de Antenas RF 50Ω (J3 &amp; J4 U.FL) sobre Plano GND de 60×60 mm:</text>
            <text x="15" y="172" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">J3: Conector coaxial para Antena Celular LTE de alta ganancia montada en carcasa estanca</text>
            <text x="15" y="194" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">J4: Antena Cerámica de Parche GNSS (25×25×4 mm) con ganancia cenital de +4.5 dB C/N₀ acoplada al plano GND</text>
            
            <text x="0" y="226" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Socket Nano-SIM J2 (Push-Pull 6 Contactos Chapados en Oro):</text>
            <text x="15" y="248" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">Pines SIM_VDD (C1), SIM_RST (C2), SIM_CLK (C3), SIM_DATA (C7) con arrays de diodos TVS de protección electrostática ESD</text>
          </g>
        </g>

        <!-- ================= FILA 3: ACTUADORES DISUASORIOS Y ETAPA CDI DE ALTA TENSIÓN ================= -->
        <!-- Bloque 8: Buzzer Acústico -->
        <g transform="translate(30, 715)">
          <rect width="780" height="280" rx="8" fill="#18150c" stroke="#fb923c" stroke-width="2"/>
          <rect width="780" height="34" rx="8" fill="#2d220e"/>
          <text x="18" y="24" font-family="monospace" font-size="14" font-weight="900" fill="#fb923c">[8] ALERTA ACÚSTICA: BZ1 (95dB / 4kHz) + DRIVER MOSFET Q1</text>
          
          <g transform="translate(20, 50)">
            <text x="0" y="20" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Transductor Piezoeléctrico Resonante BZ1 (PTH Ø12.4 mm):</text>
            <text x="15" y="42" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">Presión Sonora: 95 dB SPL a 10 cm con frecuencia de resonancia de 4.0 kHz ± 0.5 kHz</text>
            <text x="15" y="64" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">Borne Positivo (+) conectado al riel de potencia VBAT (3.7V - 4.2V)</text>
            
            <text x="0" y="96" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">• Etapa de Conmutación N-MOSFET Q1 (AO3400A) + D4 (1N4148W):</text>
            <text x="15" y="118" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">Compuerta (Gate) excitada por ESP32 GPIO5 con modulación PWM a 4kHz</text>
            <text x="15" y="140" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">Diodo de rueda libre D4 (1N4148W) conectado en paralelo invertido con BZ1 para absorber sobretensiones inductivas</text>
            
            <text x="0" y="172" font-family="monospace" font-size="12" font-weight="bold" fill="#fb923c">FUNCIÓN OPERATIVA EN SISTEMA IOT:</text>
            <text x="15" y="194" font-family="sans-serif" font-size="12.5" fill="#cbd5e1">Emite advertencias acústicas progresivas de aviso preventivo antes de cualquier activación de pulso disuasorio.</text>
          </g>
        </g>

        <!-- Bloque 9: Etapa CDI de Alta Tensión 1000V -->
        <g transform="translate(850, 715)">
          <rect width="1660" height="280" rx="8" fill="#25060a" stroke="#ef4444" stroke-width="2.5"/>
          <rect width="1660" height="34" rx="8" fill="#4c0d15"/>
          <text x="18" y="24" font-family="monospace" font-size="14.5" font-weight="900" fill="#fecaca">[9] GENERADOR CDI 1000V DC (AISLAMIENTO GALVÁNICO 5kV &amp; WATCHDOG HARDWARE ≤1s)</text>
          
          <g transform="translate(20, 50)">
            <text x="0" y="20" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff">• U8: EL817S1(C) Optoacoplador de Barrera Galvánica (5,000V RMS):</text>
            <text x="15" y="42" font-family="sans-serif" font-size="12" fill="#cbd5e1">Montado a horcajadas sobre la ranura fresada de 2.0 mm (Creepage &gt;14 mm). Separa absolutamente la masa digital GND de la masa aislada HV_GND.</text>
            
            <text x="0" y="74" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff">• U9: 74LVC1G123DCK Temporizador Monoestable de Seguridad Irrevocable:</text>
            <text x="15" y="96" font-family="sans-serif" font-size="12" fill="#cbd5e1">Temporizador analógico por hardware fijado por R=1MΩ / C=1µF: <tspan fill="#fca5a5" font-weight="bold">imposible que el pulso supere 1,000 ms</tspan> aún con bloqueo total del software.</text>
            
            <text x="0" y="128" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff">• Generador Elevador Resonante MOD_HV (3.7V -&gt; 1000V DC Potted Epoxy):</text>
            <text x="15" y="150" font-family="sans-serif" font-size="12" fill="#cbd5e1">Micro-convertidor flyback apantallado que eleva la energía de la celda de litio para cargar el condensador de pulso C7 (0.1µF 1000V CBB21).</text>
            
            <text x="950" y="20" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff">• Descarga Capacitiva CDI: TH1 (TYN1225RG 1200V / 25A) + D6 (DB3):</text>
            <text x="965" y="42" font-family="sans-serif" font-size="12" fill="#cbd5e1">Tiristor SCR conmutado por avalancha mediante Diac DB3 al superar 32V, logrando un flanco de descarga ultra-rápido (&lt;50 ns).</text>
            
            <text x="950" y="74" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff">• Limitación de Seguridad IEC 60335-2-76 (R_LIM 220Ω / 2W):</text>
            <text x="965" y="96" font-family="sans-serif" font-size="12" fill="#cbd5e1">Energía almacenada: <tspan fill="#facc15" font-weight="bold">E = ½·C·V² = 50 mJ</tspan> (100 veces por debajo del límite seguro de 5.0 Joules). Corriente pico limitada a 4.5A.</text>
            
            <text x="950" y="128" font-family="monospace" font-size="13" font-weight="bold" fill="#ffffff">• Bornes de Salida Dérmicos EL1 (+) y EL2 (-):</text>
            <text x="965" y="150" font-family="sans-serif" font-size="12" fill="#38bdf8">Tornillería pasante M4 de Acero Inoxidable 316 grado marino con arandelas grower y sellado con junta tórica O-Ring IP68.</text>
          </g>
        </g>

        <!-- ================= LÍNEAS DE INTERCONEXIÓN ENTRE BLOQUES ================= -->
        <!-- Bus 5V de Bloque 1 a ESP32 USB -->
        <path d="M 120 295 V 340" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6,4" fill="none"/>
        <text x="125" y="325" font-family="monospace" font-size="10" font-weight="bold" fill="#38bdf8">USB D-/D+</text>
        
        <!-- Bus VBAT a ESP32 ADC -->
        <path d="M 1200 295 V 320 H 600 V 340" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="6,4" fill="none"/>
        <text x="800" y="315" font-family="monospace" font-size="10" font-weight="bold" fill="#ef4444">VBAT_SENSE</text>

        <!-- Bus +3.3V de Buck a ESP32 y SC7A20 -->
        <path d="M 2000 295 V 325 H 750 V 340" stroke="#06b6d4" stroke-width="3" fill="none"/>
        <path d="M 1050 325 V 340" stroke="#06b6d4" stroke-width="2.5" fill="none"/>
        
        <!-- Bus UART entre ESP32 y Módem -->
        <path d="M 810 480 H 1290" stroke="#c084fc" stroke-width="3.5" fill="none"/>
        <polygon points="1285,475 1295,480 1285,485" fill="#c084fc"/>
        <polygon points="815,475 805,480 815,485" fill="#c084fc"/>
        <text x="1050" y="472" font-family="monospace" font-size="12" font-weight="bold" fill="#c084fc" text-anchor="middle">UART_BUS (TXD1 / RXD1) + PWRKEY / STATUS</text>

        <!-- Bus I2C entre ESP32 y SC7A20 -->
        <path d="M 810 540 H 850" stroke="#10b981" stroke-width="3" fill="none"/>
        <polygon points="845,536 852,540 845,544" fill="#10b981"/>
        <polygon points="815,536 808,540 815,544" fill="#10b981"/>
        <text x="830" y="530" font-family="monospace" font-size="10" font-weight="bold" fill="#10b981" text-anchor="middle">I2C</text>

        <!-- Bus PWM a Buzzer -->
        <path d="M 420 680 V 715" stroke="#fb923c" stroke-width="3" fill="none"/>
        <polygon points="416,710 420,718 424,710" fill="#fb923c"/>
        <text x="430" y="702" font-family="monospace" font-size="11" font-weight="bold" fill="#fb923c">BUZZER_PWM (IO5)</text>

        <!-- Disparo HV desde ESP32 a U8 -->
        <path d="M 750 680 V 705 H 950 V 715" stroke="#ef4444" stroke-width="3" fill="none"/>
        <polygon points="946,710 950,718 954,710" fill="#ef4444"/>
        <text x="850" y="700" font-family="monospace" font-size="11" font-weight="bold" fill="#ef4444">IMPULSE_TRIG (IO4)</text>

        <!-- VBAT a MOD_HV -->
        <path d="M 1300 295 V 315 H 1700 V 715" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="8,4" fill="none"/>
        <text x="1710" y="500" font-family="monospace" font-size="10" font-weight="bold" fill="#ef4444" transform="rotate(90 1710 500)">VBAT -&gt; MOD_HV</text>

        <!-- ================= PANEL INFORMATIVO DE INTERCONEXIÓN ================= -->
        <g transform="translate(30, 1020)">
          <rect width="{rw - 60}" height="540" rx="8" fill="#0b1324" stroke="#25354e" stroke-width="1.8"/>
          <text x="25" y="32" font-family="sans-serif" font-size="15" font-weight="bold" fill="#38bdf8">INSTRUCCIONES CLAVE DE ENSAMBLE Y SOLDADURA FÍSICA PARA FABRICACIÓN:</text>
          
          <g transform="translate(25, 55)" font-family="'Segoe UI', sans-serif" font-size="13" fill="#cbd5e1">
            <text x="0" y="20" font-weight="bold" fill="#ffffff">1. Secuencia de Reflujo SMT (Cara Superior - Top Layer):</text>
            <text x="15" y="42">• Aplicar pasta de estaño sin plomo SAC305 (Sn96.5/Ag3.0/Cu0.5) con estarcido (stencil) cortado con láser electro-pulido (espesor 0.12 mm).</text>
            <text x="15" y="64">• Soldar en horno de reflujo por zonas con temperatura pico de 245°C. Verificar con AXI (Rayos X) la unión del pad central 41 de U1 y pad central 68 de U2.</text>
            
            <text x="0" y="100" font-weight="bold" fill="#ffffff">2. Montaje y Soldadura PTH (Cara Inferior - Bottom Layer &amp; Conectores Pasantes):</text>
            <text x="15" y="122">• Portacelda BT1 (Keystone 1042/1048): Soldar a mano con estaño con núcleo de resina 63/37 a 330°C asegurando rellenado total de los taladros pasantes.</text>
            <text x="15" y="144">• Buzzer BZ1 (PTH Ø12.4mm): Insertar respetando la serigrafía (+) hacia el riel VBAT; recortar terminales a 1.0 mm de la cara opuesta.</text>
            <text x="15" y="166">• Bornes EL1 y EL2 (M4 Inox 316): Fijar con tuerca autoblocante de acero inoxidable y arandela de cobre ENIG asegurando torque de 1.8 N·m.</text>
            
            <text x="0" y="202" font-weight="bold" fill="#ffffff">3. Verificación de Barrera de Aislamiento y Pruebas Dieléctricas de Seguridad:</text>
            <text x="15" y="224">• Inspeccionar visualmente que la ranura pasante de 2.0 mm (Edge.Cuts) esté completamente libre de rebabas, virutas o puentes de soldadura.</text>
            <text x="15" y="246">• Medir resistencia de aislamiento con megóhmetro a 1,000V DC entre el plano GND digital y el plano HV_GND aislado: debe ser <tspan fill="#10b981" font-weight="bold">&gt; 100 GΩ</tspan>.</text>
            <text x="15" y="268">• Comprobar que el optoacoplador U8 (EL817) sea el único puente galvánico que cruce por el aire la ranura dieléctrica de la baquelita.</text>

            <text x="0" y="304" font-weight="bold" fill="#ffffff">4. Puntos de Prueba y Calibración en Banco (Test Points):</text>
            <text x="15" y="326">• <tspan fill="#38bdf8" font-weight="bold">TP_3V3 &amp; TP_GND:</tspan> Comprobar que la tensión del conversor buck SY8089 sea exactamente +3.318V ± 0.05V.</text>
            <text x="15" y="348">• <tspan fill="#f59e0b" font-weight="bold">TP_VBUS &amp; TP_POGO:</tspan> Con cargador magnético desconectado, verificar con multímetro que la tensión exterior sea <tspan fill="#10b981" font-weight="bold">0.00V</tspan>.</text>
            <text x="15" y="370">• <tspan fill="#ef4444" font-weight="bold">TP_CDI &amp; TP_HVGND:</tspan> Al pulsar botón de test, verificar con sonda atenuada 1000:1 que el pulso se corte estrictamente antes de 1,000 ms.</text>
          </g>
        </g>
      </g>
    ''')

    # =========================================================================
    # 8. SECCIÓN DERECHA INFERIOR: TABLA MAESTRA DE SOLDADURA PIN A PIN (28 BOM)
    # =========================================================================
    table_y = 1880
    table_h = 1650

    svg.append(f'''
      <!-- ================= TABLA MAESTRA DE SOLDADURA PIN A PIN ================= -->
      <g transform="translate({rx}, {table_y})" filter="url(#shadow)">
        <rect width="{rw}" height="{table_h}" rx="10" fill="#070c17" stroke="#334155" stroke-width="2"/>
        <rect width="{rw}" height="42" rx="10" fill="#121f38"/>
        <rect y="30" width="{rw}" height="12" fill="#121f38"/>
        <text x="25" y="28" font-family="'Segoe UI', sans-serif" font-size="17" font-weight="900" fill="#facc15">TABLA MAESTRA DE SOLDADURA PIN A PIN — LISTA OFICIAL BOM JLCPCB (28 PARTES)</text>
        <text x="{rw - 25}" y="28" font-family="monospace" font-size="13" font-weight="bold" fill="#38bdf8" text-anchor="end">DETALLE DE PADS, COORDENADAS, LCSC PART # Y DESTINOS DE RED</text>

        <!-- Encabezados de tabla -->
        <g transform="translate(25, 60)" font-family="monospace" font-size="12" font-weight="bold" fill="#38bdf8">
          <text x="0" y="0">CALLOUT</text>
          <text x="85" y="0">DESIG</text>
          <text x="160" y="0">COMPONENTE / VALOR</text>
          <text x="440" y="0">ENCAPSULADO</text>
          <text x="610" y="0">LCSC PART #</text>
          <text x="750" y="0">CARA</text>
          <text x="820" y="0">COORD (X, Y)</text>
          <text x="960" y="0">PROCESO SOLDADURA Y CONEXIÓN PIN A PIN DE LOS CIRCUITOS</text>
          <line x1="0" y1="12" x2="{rw - 50}" y2="12" stroke="#334155" stroke-width="1.8"/>
        </g>
    ''')

    bom_rows = [
        ("[1]", "U1", "ESP32-S3-WROOM-1-N16R8", "MODULE-ESP32-S3", "C2913202", "Top", "15.0, 22.0", "SMT Reflow | Pin 1/41: GND | Pin 2: +3.3V | Pin 4: TRIG | Pin 5: BUZ | Pin 6/7: PWRKEY/STAT | Pin 8/9: I2C | Pin 13/14: USB"),
        ("[2]", "U2", "SIM7670SA-MNGV 4G+GNSS", "LCC-LGA-68", "C2892994", "Top", "48.0, 24.0", "SMT Reflow + AXI | Pin 38/39: VBAT 4V (2A) | Pin 21/22: UART | Pin 1: PWRKEY | Pin 32: LTE 50Ω | Pin 46: GNSS 50Ω | Pin 52-55: SIM"),
        ("[3]", "U3", "SC7A20TR Acelerómetro", "LGA-12", "C392477", "Top", "11.0, 44.0", "SMT Reflow | Pin 1: SCL (IO9) | Pin 4: SDA (IO8) | Pin 11: INT1 (IO10 Wakeup) | Pin 7/8: +3.3V_SYS | Pin 6: GND"),
        ("[4]", "U4", "CN3791 Cargador Solar MPPT", "SSOP-10", "C154992", "Top", "12.0, 52.0", "SMT Reflow | Pin 9: VCC (Solar/VBUS) | Pin 10: DRV Gate Q3 | Pin 8: CSP 0.1Ω | Pin 7: BAT (VBAT) | Pin 6: MPPT 6V | Pin 2: GND"),
        ("[5]", "U5", "SY8089AAAC Buck 3.3V 2A", "SOT-23-5", "C78988", "Top", "12.0, 62.0", "SMT Reflow | Pin 4: IN (VBAT) | Pin 1: EN (VBAT) | Pin 2: GND | Pin 3: LX (a L1 2.2µH) | Pin 5: FB (Salida +3.318V estable)"),
        ("[6]", "U6", "DW01A-G Protección BMS", "SOT-23-6", "C351410", "Top", "24.0, 46.0", "SMT Reflow | Pin 5: VCC (BT_POS) | Pin 6: GND (BT_NEG) | Pin 1: OD (Corte 2.4V a G1) | Pin 3: OC (Corte 4.28V a G2) | Pin 2: CS"),
        ("[7]", "U7", "FS8205A Dual N-MOSFET", "TSSOP-8", "C32254", "Top", "28.0, 46.0", "SMT Reflow | Pin 1/3: S1 (GND_SYS) | Pin 4: G1 (desde OD) | Pin 5: G2 (desde OC) | Pin 7/8: S2 (Borne BT_NEG Batería 18650)"),
        ("[8]", "U8", "EL817S1(C) Optoacoplador", "SOP-4", "C4999", "Top", "45.0, 49.0", "SMT Reflow | Pin 1: Ánodo (IO4) | Pin 2: Cátodo (GND_SYS) || Ranura L 5kV || Pin 3: Emisor (HV_GND) | Pin 4: Colector (U9 A)"),
        ("[9]", "U9", "74LVC1G123 Watchdog ≤1s", "VSSOP-8", "C128362", "Top", "52.0, 47.0", "SMT Reflow | Pin 1: ~A (Disparo Opto) | Pin 4: HV_GND | Pin 5: Q (Pulso salida ≤1000ms a Diac D6) | Pin 6/7: RC (1MΩ + 1µF)"),
        ("[10]", "TH1", "TYN1225RG SCR Tiristor", "TO-252-2 (DPAK)", "C14486", "Top", "64.0, 52.0", "SMT Reflow | Pin 1: Gate (Disparo Diac DB3) | Pin 2/Tab: Ánodo (+1000V C7) | Pin 3: Cátodo (Salida a R_LIM 220Ω 2W -> EL1)"),
        ("[11]", "D6", "DB3 Diac Bidireccional 32V", "SOD-123", "C139750", "Top", "60.8, 48.0", "SMT Reflow | En serie entre Pin 5 de U9 y Gate de TH1: ruptura por avalancha rápida a 32V para conmutación limpia &lt;50ns"),
        ("[12]", "Q1", "AO3400A N-MOS (Driver Buzzer)", "SOT-23", "C20917", "Top", "20.5, 56.5", "SMT Reflow | Pin 1: Gate (ESP32 IO5 PWM) | Pin 2: Source (GND_SYS) | Pin 3: Drain (conduce polo negativo de BZ1 y ánodo D4)"),
        ("[13]", "Q2", "AO3400A N-MOS (Control PWRKEY)", "SOT-23", "C20917", "Top", "31.5, 26.5", "SMT Reflow | Pin 1: Gate (ESP32 IO6) | Pin 2: Source (GND_SYS) | Pin 3: Drain (activa PWRKEY a nivel bajo en SIM7670)"),
        ("[14]", "Q3", "AO3401A P-MOS (Conmutador MPPT)", "SOT-23", "C15127", "Top", "18.5, 47.5", "SMT Reflow | Pin 1: Gate (CN3791 DRV) | Pin 2: Source (VIN Solar 6V) | Pin 3: Drain (conmuta a L2 10µH y cátodo de D3)"),
        ("[15]", "D1,D2", "SS34 Schottky 40V/3A (Solar)", "SMA", "C8678", "Top", "5.2, 50.0", "SMT Reflow | Diodos OR-ing de desacople para dos paneles solares de 6V independientes hacia el bus común VIN_CHG"),
        ("[16]", "D3", "SS34 Schottky (Catch Diode)", "SMA", "C8678", "Top", "18.5, 54.0", "SMT Reflow | Diodo flyback de retorno rápido entre masa GND y nodo de conmutación de L2 en convertidor reductor MPPT"),
        ("[17]", "D5", "SS34 Schottky (Anti-Retorno)", "SMA", "C8678", "Top", "5.2, 28.0", "SMT Reflow | En serie con J1 Pin 1 (+5V VBUS): garantiza voltaje en reposo de exactamente 0.00V en los pines exteriores"),
        ("[18]", "D4", "1N4148W Diodo Rápido de Clamp", "SOD-123", "C81598", "Top", "25.5, 54.0", "SMT Reflow | En paralelo invertido con BZ1 (Cátodo a VBAT, Ánodo a Drain Q1) para suprimir picos inductivos de 4kHz"),
        ("[19]", "L1", "2.2µH 3.0A Inductor Buck 3.3V", "SMD-0420", "C167733", "Top", "18.0, 62.0", "SMT Reflow | Pin 1 al nodo LX de U5; Pin 2 a riel de salida +3.3V_SYS desacoplado con 2x 22µF cerámicos X7R"),
        ("[20]", "L2", "10µH 2.5A Inductor MPPT Solar", "SMD-0430", "C38117", "Top", "12.0, 57.0", "SMT Reflow | Pin 1 al nodo de conmutación Q3/D3; Pin 2 a resistencia sensora CSP (0.1Ω) y riel de batería VBAT"),
        ("[21]", "C1,C2", "2x 220µF 6.3V Tantalio Low-ESR", "CASE-D_7343", "C7187", "Top", "38.0, 21.0", "SMT Reflow | Pin (+) a menos de 2 mm de pines 38/39 de U2; Pin (-) con 4 vías a plano GND. Absorbe transitorios celulares 2A"),
        ("[22]", "C7", "0.1µF 1000V CBB21 Polipropileno", "SMD-1812/PTH", "C2839151", "Top", "56.0, 64.0", "SMT/PTH | Condensador CDI de energía (E = 50 mJ a 1000V DC). Pin 1 a HV+ y ánodo TH1; Pin 2 a masa aislada HV_GND"),
        ("[23]", "BZ1", "Piezo Buzzer 95dB 4kHz Resonante", "PTH-D12.4mm", "C253457", "Top", "26.0, 60.0", "PTH Soldadura a Mano | Pin (+) a VBAT; Pin (-) a Drain de Q1 y D4. Emite advertencias acústicas disuasorias"),
        ("[24]", "J1", "Conector Magnético Pogo 4P IP68", "POGO-4PIN-MAG", "Custom-POGO", "Top", "0.8, 28.0", "SMT/Pogo | Pin 1: +5V (a D5) | Pin 2: USB D- (IO19) | Pin 3: USB D+ (IO20) | Pin 4: GND | 2x Imanes de neodimio N52"),
        ("[25]", "J2", "Socket Portatarjeta Nano-SIM 6P", "PUSH-PULL", "C2838382", "Top", "65.0, 20.0", "SMT Reflow | Contactos dorados con blindaje lateral. Líneas SIM_VDD, RST, CLK, DATA filtradas con array ESD antiestático"),
        ("[26]", "J3,J4", "2x Conectores Coaxiales 50Ω U.FL", "SMD-IPEX", "C88373", "Top", "38/58, 34", "SMT Reflow | J3: Pista de 50Ω a Pin 32 (Módem LTE) | J4: Pista de 50Ω a Pin 46 (Antena Parche GNSS sobre plano GND 60×60)"),
        ("[27]", "BT1", "Keystone 1042 / 1048 Clips 18650", "PTH-18650", "Keystone-1042", "Bot", "35.0, 35.0", "PTH Cara Inferior | Montaje a 42° diagonal para celda Panasonic NCR18650B (3400mAh). Borne (+) en (18,52), Borne (-) en (52,18)"),
        ("[28]", "MOD_HV","Flyback Resonante 3.7V -&gt; 1000V", "Potted-18x14", "Custom-MOD-HV", "Top", "56.0, 54.0", "PTH Epoxi | Pin 1/2 Entrada: VBAT y control U9. Pin 3/4 Salida: +1000V DC y HV_GND aislada galvánicamente 5kV"),
        ("[29]", "EL1,EL2","Bornes M4 Inox 316 Grado Marino", "PAD-M4-8MM", "Hardware-M4", "Top", "65.0, 63.0", "Tornillería Pasante M4 | EL1: Pulso de choque CDI (+1000V vía R_LIM 220Ω 2W) | EL2: Retorno directo a masa aislada HV_GND")
    ]

    for idx, row in enumerate(bom_rows):
        row_y = 85 + idx * 51
        bg_col = "#0e182b" if idx % 2 == 0 else "#080e1a"
        svg.append(f'''
          <rect x="25" y="{table_y + row_y - 20}" width="{rw - 50}" height="44" rx="4" fill="{bg_col}" opacity="0.80"/>
          <g transform="translate(25, {table_y + row_y})" font-family="monospace" font-size="12" fill="#cbd5e1">
            <text x="0" y="8" font-weight="900" fill="#facc15">{row[0]}</text>
            <text x="85" y="8" font-weight="900" fill="#38bdf8">{row[1]}</text>
            <text x="160" y="8" font-weight="bold" fill="#ffffff">{row[2]}</text>
            <text x="440" y="8" fill="#94a3b8">{row[3]}</text>
            <text x="610" y="8" fill="#facc15">{row[4]}</text>
            <text x="750" y="8" fill="#34d399">{row[5]}</text>
            <text x="820" y="8" fill="#e2e8f0">{row[6]}</text>
            <text x="960" y="8" font-size="11.5" fill="#cbd5e1">{row[7]}</text>
          </g>
        ''')
    svg.append('</g>')

    svg.append('</svg>')
    return "\n".join(svg)

def export_svg_to_png(svg_path, png_path):
    import gi
    gi.require_version('Rsvg', '2.0')
    from gi.repository import Rsvg
    print(f"Cargando SVG: {svg_path}...")
    handle = Rsvg.Handle.new_from_file(svg_path)
    pixbuf = handle.get_pixbuf()
    print(f"Pixbuf generado: {pixbuf.get_width()}x{pixbuf.get_height()} px. Guardando PNG...")
    pixbuf.savev(png_path, 'png', [], [])
    size_mb = os.path.getsize(png_path) / (1024 * 1024)
    print(f"PNG guardado exitosamente: {png_path} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    out_svg = "docs/diseno_electronico_pcb/diagrama_conexion_placa_pcb.svg"
    out_png = "docs/diseno_electronico_pcb/diagrama_conexion_placa_pcb.png"
    
    print("1. Generando contenido SVG de ultra-alta definición (5400 × 3600 px)...")
    svg_code = build_master_svg()
    with open(out_svg, "w", encoding="utf-8") as f:
        f.write(svg_code)
    print(f"SVG generado: {out_svg} ({len(svg_code)} bytes)")
    
    print("2. Renderizando PNG de ultra-alta definición...")
    export_svg_to_png(out_svg, out_png)
    
    print("3. Sincronizando copias canónicas de planos...")
    shutil.copyfile(out_svg, "docs/diseno_electronico_pcb/diagrama_interconexion_pines_bom.svg")
    shutil.copyfile(out_png, "docs/diseno_electronico_pcb/diagrama_interconexion_pines_bom.png")
    shutil.copyfile(out_svg, "docs/diseno_electronico_pcb/pcb_pistas_enrutamiento_70x70.svg")
    shutil.copyfile(out_png, "docs/diseno_electronico_pcb/pcb_pistas_enrutamiento_70x70.png")
    print("Generación maestra completada con éxito rotundo!")
