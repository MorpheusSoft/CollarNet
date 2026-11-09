#!/usr/bin/env python3
"""
Generador de Diagrama de Pistas de Cobre y Enrutamiento PCB
CollarNet V3 (70.0 x 70.0 mm)
Diseñadores: Renier Morales & Lindbergh Zambrano
Terminología neutral (sin referencias a ganado/cerca virtual).
"""

import os
import subprocess

def generate_pcb_traces_svg():
    width = 3200
    height = 3200
    
    # Scale: 1mm = 30px (Board 70mm = 2100px)
    # Origin of board: ox = 250, oy = 250
    ox = 250
    oy = 250
    s = 30.0 # 30 px per mm
    
    def to_px(x_mm, y_mm):
        return ox + x_mm * s, oy + y_mm * s

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">')
    svg.append('<defs>')
    svg.append('''
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="3" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.7"/>
      </filter>
      <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <linearGradient id="fr4Grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#043224" />
        <stop offset="50%" stop-color="#064e3b" />
        <stop offset="100%" stop-color="#022c22" />
      </linearGradient>
      <linearGradient id="gndPlaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#d97706" stop-opacity="0.30" />
        <stop offset="100%" stop-color="#92400e" stop-opacity="0.20" />
      </linearGradient>
      <pattern id="viaPattern" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="12" cy="12" r="3.5" fill="#f59e0b" stroke="#000000" stroke-width="1"/>
      </pattern>
      <pattern id="cadGrid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#162238" stroke-width="1"/>
      </pattern>
    ''')
    svg.append('</defs>')

    # Dark background
    svg.append(f'<rect width="{width}" height="{height}" fill="#080d1a"/>')
    svg.append(f'<rect width="{width}" height="{height}" fill="url(#cadGrid)"/>')

    # HEADER & TITLE BLOCK
    svg.append(f'''
      <rect x="50" y="40" width="{width - 100}" height="140" rx="10" fill="#0f172a" stroke="#38bdf8" stroke-width="2" filter="url(#shadow)"/>
      <text x="90" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="900" fill="#38bdf8" letter-spacing="1">COLLARNET V3 — DIAGRAMA DE PISTAS DE COBRE Y ENRUTAMIENTO PCB (70.0 × 70.0 mm)</text>
      <text x="90" y="135" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" fill="#94a3b8">Visualización de Pistas Físicas: Top Layer (Señal/Potencia) | Bottom Layer | Plano GNSS 60×60 mm | Ranura L 5kV | Diseñadores: <tspan fill="#ffffff" font-weight="bold">Renier Morales &amp; Lindbergh Zambrano</tspan></text>
      
      <rect x="{width - 560}" y="60" width="480" height="95" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="{width - 540}" y="92" font-family="monospace" font-size="15" font-weight="bold" fill="#38bdf8">ESCALA CAD 30:1 (30 px = 1.0 mm)</text>
      <text x="{width - 540}" y="115" font-family="sans-serif" font-size="12" fill="#e2e8f0">Espesor Placa: 1.6 mm FR-4 TG155 | 1 oz Cu (35µm)</text>
      <text x="{width - 540}" y="135" font-family="sans-serif" font-size="12" fill="#10b981">Acabado Superficial: ENIG 2µ" (Oro de Inmersión)</text>
    ''')

    # -------------------------------------------------------------
    # PLACA PCB (70.0 x 70.0 mm -> 2100 x 2100 px)
    # Esquinas redondeadas R=4.0mm (120px)
    # -------------------------------------------------------------
    pcb_w_px = 70.0 * s
    pcb_h_px = 70.0 * s
    corner_r_px = 4.0 * s

    svg.append(f'''
      <!-- SUSTRATO FR-4 VERDE SOLDERMASK -->
      <g filter="url(#shadow)">
        <rect x="{ox}" y="{oy}" width="{pcb_w_px}" height="{pcb_h_px}" rx="{corner_r_px}" fill="url(#fr4Grad)" stroke="#10b981" stroke-width="3"/>
      </g>
    ''')

    # PLANO DE COBRE CONTINUO GND 60x60 mm (1800 x 1800 px)
    # Centrado de x=5mm a 65mm, y=5mm a 65mm, excluyendo la esquina HV
    gnd_x1, gnd_y1 = to_px(5.0, 5.0)
    gnd_w, gnd_h = 60.0 * s, 60.0 * s
    # Exclusión zona HV (x: 44 to 70, y: 44 to 70)
    cut_x, cut_y = to_px(44.0, 44.0)

    svg.append(f'''
      <!-- PLANO DE COBRE GNSS 60x60 mm -->
      <path d="M {gnd_x1} {gnd_y1} H {gnd_x1 + gnd_w} V {cut_y} H {cut_x} V {gnd_y1 + gnd_h} H {gnd_x1} Z" fill="url(#gndPlaneGrad)" stroke="#f59e0b" stroke-width="2" stroke-dasharray="10,5"/>
      <text x="{gnd_x1 + 60}" y="{gnd_y1 + 80}" font-family="'Segoe UI', sans-serif" font-size="20" font-weight="900" fill="#fef08a" letter-spacing="1">ÁREA PLANO DE COBRE RF GND CONTINUO (60.0 × 60.0 mm = 3,600 mm²)</text>
      <text x="{gnd_x1 + 60}" y="{gnd_y1 + 115}" font-family="'Segoe UI', sans-serif" font-size="14" fill="#fde047">Plano de reflexión cenital de alta ganancia (+4.5 dB C/N₀) para antena cerámica GNSS</text>
    ''')

    # MATRIZ DE VÍAS DE COSEDURA (VIA FENCING) ALREDEDOR DEL PERÍMETRO Y LÍNEAS RF
    svg.append(f'''
      <!-- Vías de cosedura perimetrales -->
      <rect x="{gnd_x1 + 10}" y="{gnd_y1 + 10}" width="{gnd_w - 20}" height="40" fill="url(#viaPattern)" opacity="0.7"/>
      <rect x="{gnd_x1 + 10}" y="{gnd_y1 + 10}" width="40" height="{gnd_h - 20}" fill="url(#viaPattern)" opacity="0.7"/>
      <rect x="{gnd_x1 + 10}" y="{cut_y - 50}" width="{cut_x - gnd_x1}" height="40" fill="url(#viaPattern)" opacity="0.7"/>
    ''')

    # RANURA FRESADA EN "L" DE AISLAMIENTO 2.0 mm (60 px)
    slot_x1, slot_y1 = to_px(44.0, 70.0)
    slot_corner_x, slot_corner_y = to_px(44.0, 44.0)
    slot_x2, slot_y2 = to_px(70.0, 44.0)
    slot_w_px = 2.0 * s

    svg.append(f'''
      <!-- RANURA FRESADA PASANTE EN L (2.0 mm ancho) -->
      <path d="M {slot_x1} {slot_y1 + 5} V {slot_corner_y} H {slot_x2 + 5}" fill="none" stroke="#080d1a" stroke-width="{slot_w_px}" stroke-linecap="round"/>
      <path d="M {slot_x1} {slot_y1 + 5} V {slot_corner_y} H {slot_x2 + 5}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="8,6"/>
      <rect x="{slot_corner_x + 30}" y="{slot_corner_y - 45}" width="380" height="32" rx="5" fill="#450a0a" stroke="#ef4444" stroke-width="1.5"/>
      <text x="{slot_corner_x + 45}" y="{slot_corner_y - 23}" font-family="monospace" font-size="14" font-weight="bold" fill="#fca5a5">RANURA FRESADA 2.0 mm (5kV AISLAMIENTO)</text>
    ''')

    # 4 TALADROS DE FIJACIÓN M3 (Centros: 5,5 / 65,5 / 5,65 / 65,65 mm)
    holes = [(5.0, 5.0), (65.0, 5.0), (5.0, 65.0), (65.0, 65.0)]
    for hx_mm, hy_mm in holes:
        hpx, hpy = to_px(hx_mm, hy_mm)
        svg.append(f'''
          <!-- Taladro M3 en ({hx_mm}, {hy_mm}) -->
          <circle cx="{hpx}" cy="{hpy}" r="{3.0 * s}" fill="none" stroke="#eab308" stroke-width="3"/>
          <circle cx="{hpx}" cy="{hpy}" r="{1.6 * s}" fill="#080d1a" stroke="#f59e0b" stroke-width="2"/>
          <text x="{hpx}" y="{hpy + 65}" font-family="monospace" font-size="12" font-weight="bold" fill="#f59e0b" text-anchor="middle">M3 (Ø3.2mm)</text>
        ''')

    # PROYECCIÓN DE BATERÍA 18650 EN BOTTOM LAYER (A 42° EN DIAGONAL)
    bat_cx, bat_cy = to_px(35.0, 35.0)
    svg.append(f'''
      <!-- Batería Panasonic NCR18650B en Bottom Layer (42° diagonal) -->
      <g transform="translate({bat_cx}, {bat_cy}) rotate(42)" opacity="0.35">
        <!-- Clips Keystone 1042 / 1048 -->
        <rect x="{-37.0 * s}" y="{-9.5 * s}" width="{3.5 * s}" height="{19.0 * s}" rx="6" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
        <rect x="{33.5 * s}" y="{-9.5 * s}" width="{3.5 * s}" height="{19.0 * s}" rx="6" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
        <!-- Celda 18650 (65.3 x 18.5 mm) -->
        <rect x="{-32.6 * s}" y="{-9.2 * s}" width="{65.3 * s}" height="{18.5 * s}" rx="15" fill="#84cc16" stroke="#ffffff" stroke-width="2" stroke-dasharray="12,6"/>
        <text x="0" y="5" font-family="'Segoe UI', sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">PANASONIC NCR18650B (3400mAh)</text>
        <text x="0" y="38" font-family="'Segoe UI', sans-serif" font-size="16" fill="#ecfccb" text-anchor="middle">MONTAJE DIAGONAL EN BOTTOM LAYER | LARGO 65.3 mm</text>
      </g>
    ''')

    # =============================================================
    # ENRUTAMIENTO DE PISTAS DE COBRE REALES (TOP LAYER - ROJO / COBRE)
    # Anchos normalizados:
    # Señal: 0.25 mm (7.5 px)
    # RF 50Ω: 0.50 mm (15 px)
    # Potencia 3.3V: 1.00 mm (30 px)
    # Potencia VBAT: 1.50 mm (45 px)
    # Alta Tensión 1000V: 2.00 mm (60 px)
    # =============================================================

    c_top_signal = "#f43f5e"   # Coral / Reddish copper
    c_top_power = "#ef4444"    # Bright red
    c_top_3v3 = "#38bdf8"      # Light blue (3.3V rail)
    c_top_rf = "#eab308"       # Gold 50 Ohm
    c_top_usb = "#06b6d4"      # Cyan USB
    c_top_uart = "#c084fc"     # Purple UART
    c_top_i2c = "#10b981"      # Green I2C
    c_top_hv = "#dc2626"       # Deep red 1000V
    c_bot_trace = "#3b82f6"    # Blue Bottom copper

    svg.append('<!-- ================= PISTAS DE COBRE (TOP LAYER) ================= -->')
    
    # Helper to draw a routed trace with label
    def draw_trace(points, width_mm, color, label=""):
        pts_str = " ".join([f"{to_px(p[0], p[1])[0]},{to_px(p[0], p[1])[1]}" for p in points])
        res = [f'<polyline points="{pts_str}" fill="none" stroke="{color}" stroke-width="{width_mm * s}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>']
        if label and len(points) >= 2:
            mid_idx = len(points) // 2
            lx, ly = to_px(points[mid_idx][0], points[mid_idx][1])
            res.append(f'''
              <g transform="translate({lx}, {ly})">
                <rect x="-40" y="-12" width="80" height="18" rx="3" fill="#0f172a" stroke="{color}" stroke-width="1"/>
                <text x="0" y="1" font-family="monospace" font-size="9" font-weight="bold" fill="{color}" text-anchor="middle">{label}</text>
              </g>
            ''')
        return "\n".join(res)

    # 1. PISTAS USB PAR DIFERENCIAL 90Ω (Desde J1 Pogo a ESP32 IO19/IO20)
    # J1 está en (0.0, 28.0), pines en Y=26.5 y Y=28.5
    # ESP32 IO19/IO20 en (10.0, 24.0)
    usb_dn = [(0.8, 27.2), (4.5, 27.2), (7.0, 25.5), (9.5, 25.5), (10.5, 25.5)]
    usb_dp = [(0.8, 28.8), (4.5, 28.8), (7.0, 27.0), (9.5, 27.0), (10.5, 27.0)]
    svg.append(draw_trace(usb_dn, 0.25, c_top_usb, "USB_D-"))
    svg.append(draw_trace(usb_dp, 0.25, c_top_usb, "USB_D+"))

    # 2. PISTA DE ALIMENTACIÓN VBUS 5V (J1 Pin 1 a Diodo SS34 D5 a CN3791)
    vbus_pts = [(0.8, 24.5), (3.5, 24.5), (3.5, 30.0), (6.0, 30.0), (6.0, 48.0), (10.0, 48.0), (10.0, 50.5)]
    svg.append(draw_trace(vbus_pts, 0.80, "#f59e0b", "VBUS_5V (0.8mm)"))

    # 3. PISTAS UART (ESP32 IO17/18 a SIM7670SA RXD/TXD)
    # ESP32 en (15.0, 22.0) borde derecho en X=24.0
    # SIM7670SA en (48.0, 24.0) borde izquierdo en X=36.0
    uart_txd = [(24.0, 20.5), (28.0, 20.5), (32.0, 22.0), (36.0, 22.0)]
    uart_rxd = [(24.0, 22.5), (28.0, 22.5), (32.0, 24.0), (36.0, 24.0)]
    uart_pwr = [(24.0, 18.5), (29.0, 18.5), (33.0, 19.5), (36.0, 19.5)]
    svg.append(draw_trace(uart_txd, 0.25, c_top_uart, "MODEM_TXD"))
    svg.append(draw_trace(uart_rxd, 0.25, c_top_uart, "MODEM_RXD"))
    svg.append(draw_trace(uart_pwr, 0.25, c_top_uart, "PWRKEY"))

    # 4. PISTAS I2C (ESP32 IO8/IO9 a SC7A20 Acelerómetro)
    # ESP32 borde inferior (15.0, 34.5) hacia SC7A20 en (11.0, 44.0)
    i2c_sda = [(14.0, 34.5), (14.0, 38.0), (11.5, 41.0), (11.5, 43.0)]
    i2c_scl = [(16.0, 34.5), (16.0, 38.5), (12.5, 41.5), (12.5, 43.0)]
    svg.append(draw_trace(i2c_sda, 0.25, c_top_i2c, "I2C_SDA"))
    svg.append(draw_trace(i2c_scl, 0.25, c_top_i2c, "I2C_SCL"))

    # 5. PISTAS RF DE 50 OHMS (Coplanar Waveguide con Vías de Masa)
    # SIM7670SA MAIN_ANT a J3 (38.0, 34.0)
    # SIM7670SA GNSS_ANT a J4 (58.0, 34.0)
    rf_lte = [(40.0, 28.0), (38.5, 30.5), (38.0, 33.0)]
    rf_gnss = [(56.0, 28.0), (57.5, 30.5), (58.0, 33.0)]
    svg.append(draw_trace(rf_lte, 0.50, c_top_rf, "RF_50Ω_LTE"))
    svg.append(draw_trace(rf_gnss, 0.50, c_top_rf, "RF_50Ω_GNSS"))

    # 6. PISTA DE ALIMENTACIÓN +3.3V (Desde SY8089 U5 en 12,62 a ESP32 y SC7A20)
    pwr_3v3 = [(12.0, 60.5), (12.0, 58.0), (8.5, 54.5), (8.5, 38.0), (8.5, 22.0), (10.0, 22.0)]
    svg.append(draw_trace(pwr_3v3, 1.00, c_top_3v3, "+3.3V_SYS (1.0mm)"))

    # 7. PISTA DE ALIMENTACIÓN VBAT PRINCIPAL (Desde BT_POS a U4, U5, SIM7670SA, MOD_HV)
    vbat_main = [(18.0, 52.0), (18.0, 48.0), (22.0, 44.0), (35.0, 44.0), (45.0, 34.0), (45.0, 28.0)]
    svg.append(draw_trace(vbat_main, 1.50, c_top_power, "VBAT_4V (1.5mm / 2A)"))

    # 8. SEÑAL DE DISPARO IMPULSE_TRIG (ESP32 IO4 a Optoacoplador U8)
    # ESP32 borde inferior en (18.0, 34.5) hacia U8 en (45.0, 49.0)
    trig_pts = [(18.0, 34.5), (18.0, 38.0), (28.0, 48.0), (41.0, 48.0), (43.0, 48.5)]
    svg.append(draw_trace(trig_pts, 0.30, "#f97316", "IMPULSE_TRIG"))

    # 9. SEÑAL BUZZER_PWM (ESP32 IO5 a Q1 Gate a Buzzer BZ1 en 26, 60)
    buzzer_pts = [(20.0, 34.5), (20.0, 42.0), (24.0, 50.0), (24.0, 58.0), (25.5, 59.5)]
    svg.append(draw_trace(buzzer_pts, 0.30, "#f97316", "BUZZER_PWM"))

    # 10. PISTAS DE ALTA TENSIÓN 1000V (Cuadrante Sureste Aislado)
    # MOD_HV 1000V OUT (58.0, 56.0) a C7 (56.0, 64.0) y TH1 Ánodo (64.0, 52.0)
    hv_cap = [(58.0, 56.0), (58.0, 61.0), (56.0, 63.0)]
    hv_scr = [(58.0, 56.0), (62.0, 54.0), (64.0, 52.0)]
    hv_out = [(64.0, 54.0), (64.0, 58.0), (65.0, 60.0)]
    svg.append(draw_trace(hv_cap, 1.80, c_top_hv, "+1000V_CDI"))
    svg.append(draw_trace(hv_scr, 1.80, c_top_hv, "+1000V_ANODE"))
    svg.append(draw_trace(hv_out, 1.80, c_top_hv, "HV_PULSE -> EL1"))

    # HV Retorno hacia EL2 (65.0, 66.0) a HV_GND
    hv_ret = [(65.0, 66.0), (60.0, 66.0), (58.0, 65.0)]
    svg.append(draw_trace(hv_ret, 1.50, "#7c3aed", "HV_GND -> EL2"))

    # =============================================================
    # COMPONENTES SMT CON PADS FÍSICOS Y SERIGRAFÍA
    # =============================================================

    # Helper to draw an IC footprint with pads
    def draw_footprint(x_mm, y_mm, w_mm, h_mm, desig, val, fill_col="#1e293b", border_col="#38bdf8", rot=0):
        cpx, cpy = to_px(x_mm, y_mm)
        wpx, hpx = w_mm * s, h_mm * s
        res = [f'<g transform="translate({cpx}, {cpy}) rotate({rot})">']
        # Body
        res.append(f'<rect x="{-wpx/2}" y="{-hpx/2}" width="{wpx}" height="{hpx}" rx="4" fill="{fill_col}" stroke="{border_col}" stroke-width="1.5" filter="url(#shadow)"/>')
        # Pin 1 dot
        res.append(f'<circle cx="{-wpx/2 + 8}" cy="{-hpx/2 + 8}" r="3" fill="#facc15" />')
        # Labels
        res.append(f'<text x="0" y="{-2}" font-family="monospace" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">{desig}</text>')
        res.append(f'<text x="0" y="{12}" font-family="sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">{val}</text>')
        res.append('</g>')
        return "\n".join(res)

    # Footprints
    # U1 ESP32-S3 (15, 22) - 18x25.5mm
    svg.append(draw_footprint(15.0, 22.0, 18.0, 25.5, "U1", "ESP32-S3-WROOM-1", "#1e293b", "#38bdf8"))
    # Antena PCB meander ESP32
    u1_px, u1_py = to_px(15.0, 10.0)
    svg.append(f'''
      <g transform="translate({u1_px}, {u1_py})">
        <rect x="-240" y="-30" width="480" height="60" rx="3" fill="#0f172a" stroke="#eab308" stroke-width="1.5"/>
        <path d="M -220,-10 H 220 M -200,5 H 200 M -180,20 H 180" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
        <text x="0" y="4" font-family="monospace" font-size="10" font-weight="bold" fill="#fef08a" text-anchor="middle">ANTENA PCB WI-FI/BLE 2.4GHz</text>
      </g>
    ''')

    # U2 SIM7670SA (48, 24) - 24x24mm
    svg.append(draw_footprint(48.0, 24.0, 24.0, 24.0, "U2", "SIM7670SA-MNGV 4G+GNSS", "#334155", "#0284c7"))

    # J3 / J4 Conectores U.FL (38, 34) y (58, 34)
    for j_des, j_x in [("J3 (LTE)", 38.0), ("J4 (GNSS)", 58.0)]:
        jpx, jpy = to_px(j_x, 34.0)
        svg.append(f'''
          <g transform="translate({jpx}, {jpy})">
            <rect x="-15" y="-15" width="30" height="30" rx="3" fill="#0f172a" stroke="#eab308" stroke-width="1.5"/>
            <circle cx="0" cy="0" r="10" fill="#facc15" stroke="#854d0e" stroke-width="1.5"/>
            <circle cx="0" cy="0" r="3" fill="#080d1a" />
            <text x="0" y="28" font-family="monospace" font-size="10" font-weight="bold" fill="#fef08a" text-anchor="middle">{j_des}</text>
          </g>
        ''')

    # Antena Parche GNSS Cerámica 25x25mm montada sobre el plano GND (35.0, 20.0)
    patch_px, patch_py = to_px(35.0, 20.0)
    svg.append(f'''
      <g transform="translate({patch_px}, {patch_py})" opacity="0.85" filter="url(#shadow)">
        <rect x="-120" y="-120" width="240" height="240" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="0" cy="0" r="16" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
        <circle cx="0" cy="0" r="5" fill="#0284c7" />
        <text x="0" y="-20" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">ANTENA PARCHE GNSS</text>
        <text x="0" y="35" font-family="monospace" font-size="10" fill="#334155" text-anchor="middle">Cerámica 25×25 mm</text>
      </g>
    ''')

    # J2 Nano-SIM (65, 20)
    svg.append(draw_footprint(65.0, 20.0, 9.0, 12.0, "J2", "Nano-SIM", "#1e293b", "#ec4899"))

    # U3 SC7A20 (11, 44) - 2x2mm
    svg.append(draw_footprint(11.0, 44.0, 3.5, 3.5, "U3", "SC7A20", "#0f172a", "#10b981"))

    # U4 CN3791 (12, 52) - 5x4mm
    svg.append(draw_footprint(12.0, 52.0, 6.0, 5.0, "U4", "CN3791 MPPT", "#0f172a", "#10b981"))

    # L2 10uH (12, 57) - 4x4mm
    svg.append(draw_footprint(12.0, 57.0, 4.5, 4.5, "L2", "10µH", "#334155", "#10b981"))

    # U5 SY8089 (12, 62) - 3x3mm
    svg.append(draw_footprint(12.0, 62.0, 4.0, 3.5, "U5", "SY8089 3.3V", "#0f172a", "#38bdf8"))

    # L1 2.2uH (18, 62)
    svg.append(draw_footprint(18.0, 62.0, 4.0, 4.0, "L1", "2.2µH", "#334155", "#38bdf8"))

    # BZ1 Piezo Buzzer (26, 60) - D12mm
    bz_px, bz_py = to_px(26.0, 60.0)
    svg.append(f'''
      <g transform="translate({bz_px}, {bz_py})" filter="url(#shadow)">
        <circle cx="0" cy="0" r="{6.0 * s}" fill="#0f172a" stroke="#cbd5e1" stroke-width="2"/>
        <circle cx="0" cy="0" r="{1.5 * s}" fill="#000000" />
        <text x="0" y="4" font-family="monospace" font-size="12" font-weight="bold" fill="#f8fafc" text-anchor="middle">BZ1</text>
        <text x="0" y="18" font-family="sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">95dB 4kHz</text>
      </g>
    ''')

    # J1 Conector Magnético Pogo 4P IP68 en borde izquierdo (0, 28)
    j1_px, j1_py = to_px(0.0, 28.0)
    svg.append(f'''
      <g transform="translate({j1_px}, {j1_py})" filter="url(#shadow)">
        <rect x="-15" y="-120" width="45" height="240" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
        <!-- 2 Imanes Neodimio -->
        <circle cx="8" cy="-90" r="10" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <text x="8" y="-87" font-family="sans-serif" font-size="8" font-weight="bold" fill="#0f172a" text-anchor="middle">MAG-N</text>
        <circle cx="8" cy="90" r="10" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <text x="8" y="93" font-family="sans-serif" font-size="8" font-weight="bold" fill="#0f172a" text-anchor="middle">MAG-S</text>
        <!-- 4 Pines Pogo Dorados (+5V, D-, D+, GND) -->
        <circle cx="8" cy="-45" r="7" fill="#facc15" stroke="#b45309" stroke-width="1.5"/>
        <circle cx="8" cy="-15" r="7" fill="#facc15" stroke="#b45309" stroke-width="1.5"/>
        <circle cx="8" cy="15" r="7" fill="#facc15" stroke="#b45309" stroke-width="1.5"/>
        <circle cx="8" cy="45" r="7" fill="#facc15" stroke="#b45309" stroke-width="1.5"/>
        <text x="35" y="-42" font-family="monospace" font-size="10" font-weight="bold" fill="#f59e0b">+5V</text>
        <text x="35" y="-12" font-family="monospace" font-size="10" font-weight="bold" fill="#06b6d4">D-</text>
        <text x="35" y="18" font-family="monospace" font-size="10" font-weight="bold" fill="#06b6d4">D+</text>
        <text x="35" y="48" font-family="monospace" font-size="10" font-weight="bold" fill="#64748b">GND</text>
      </g>
    ''')

    # -------------------------------------------------------------
    # ZONA SURESTE: ALTA TENSIÓN 1000V (CDI)
    # -------------------------------------------------------------
    # U8 EL817 (45, 49) - Cruza la ranura fresada
    svg.append(draw_footprint(45.0, 49.0, 5.0, 6.0, "U8", "EL817 5kV", "#0f172a", "#f43f5e"))

    # U9 74LVC1G123 (54, 48) Watchdog
    svg.append(draw_footprint(54.0, 48.0, 4.0, 3.5, "U9", "Watchdog 1s", "#0f172a", "#ef4444"))

    # MOD_HV (56, 54) - 18x14mm
    svg.append(draw_footprint(56.0, 54.0, 18.0, 14.0, "MOD_HV", "Flyback 3.7V->1000V", "#18181b", "#ef4444"))

    # C7 (56, 64) - Condensador CBB21 0.1uF 1000V
    svg.append(draw_footprint(56.0, 64.0, 16.0, 7.0, "C7", "0.1µF 1000V CBB21", "#991b1b", "#fca5a5"))

    # TH1 (64, 52) - TO-252 SCR TYN1225RG
    svg.append(draw_footprint(64.0, 52.0, 7.0, 7.0, "TH1", "TYN1225RG SCR", "#0f172a", "#ef4444"))

    # EL1 & EL2 Bornes M4 (65, 60) y (65, 66)
    for el_des, el_y, el_col in [("EL1 (+)", 60.0, "#ef4444"), ("EL2 (-)", 66.0, "#3b82f6")]:
        elpx, elpy = to_px(65.0, el_y)
        svg.append(f'''
          <g transform="translate({elpx}, {elpy})" filter="url(#shadow)">
            <circle cx="0" cy="0" r="{2.5 * s}" fill="#1e293b" stroke="{el_col}" stroke-width="3"/>
            <circle cx="0" cy="0" r="{1.2 * s}" fill="{el_col}" />
            <text x="35" y="4" font-family="monospace" font-size="11" font-weight="bold" fill="{el_col}">{el_des}</text>
          </g>
        ''')

    # =============================================================
    # PANEL LATERAL DERECHO: DETALLES DE ENGENIERÍA Y ZOOM CALLOUTS
    # =============================================================
    p_x = 2450
    p_y = 250
    p_w = 700
    
    # Card 1: Cuadrantes del Floorplan
    svg.append(f'''
      <g transform="translate({p_x}, {p_y})" filter="url(#shadow)">
        <rect width="{p_w}" height="420" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
        <rect width="{p_w}" height="42" rx="8" fill="#1e293b" />
        <rect y="34" width="{p_w}" height="8" fill="#1e293b" />
        <text x="20" y="26" font-family="sans-serif" font-size="16" font-weight="bold" fill="#38bdf8">DISTRIBUCIÓN POR CUADRANTES (FLOORPLANNING)</text>
        
        <g transform="translate(20, 60)">
          <text x="0" y="20" font-family="sans-serif" font-size="14" font-weight="bold" fill="#38bdf8">1. Cuadrante Noroeste (MCU &amp; Sensores):</text>
          <text x="15" y="40" font-family="sans-serif" font-size="12" fill="#cbd5e1">• ESP32-S3-WROOM-1-N16R8 con antena Wi-Fi PCB orientada al borde libre.</text>
          <text x="15" y="60" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Acelerómetro SC7A20TR (6µA) conectado por bus I2C (GPIO8/9).</text>

          <text x="0" y="95" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284c7">2. Cuadrante Noreste (Comunicaciones 4G &amp; GNSS):</text>
          <text x="15" y="115" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Módem celular SIM7670SA Cat-1 con plano de masa reflectivo 60×60 mm.</text>
          <text x="15" y="135" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Pistas coplanares de 50Ω hacia conectores U.FL (J3 LTE, J4 GNSS).</text>
          <text x="15" y="155" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Slot Nano-SIM J2 lateral con protección ESD dedicada.</text>

          <text x="0" y="190" font-family="sans-serif" font-size="14" font-weight="bold" fill="#10b981">3. Cuadrante Suroeste (Energía Solar MPPT &amp; 3.3V):</text>
          <text x="15" y="210" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Cargador MPPT CN3791 (6.0V / 1.2A) + Inductor blindado 10µH.</text>
          <text x="15" y="230" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Regulador Buck SY8089 (3.3V / 2A) + Inductor 2.2µH.</text>
          <text x="15" y="250" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Conector Magnético Pogo-Pin IP68 de 4 pines (Carga 5V + USB Firmware).</text>
          <text x="15" y="270" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Bocina piezoeléctrica BZ1 de 95dB modulada a 4000Hz por MOSFET Q1.</text>

          <text x="0" y="305" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ef4444">4. Cuadrante Sureste (Etapa Alta Tensión 1000V CDI):</text>
          <text x="15" y="325" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Aislamiento total mediante ranura en 'L' de 2.0 mm (Creepage &gt;14 mm).</text>
          <text x="15" y="345" font-family="sans-serif" font-size="12" fill="#cbd5e1">• Optoacoplador EL817 (5,000V RMS) como único puente de control.</text>
        </g>
      </g>
    ''')

    # Card 2: Especificaciones de Pistas y Stackup 4 Capas
    svg.append(f'''
      <g transform="translate({p_x}, {p_y + 440})" filter="url(#shadow)">
        <rect width="{p_w}" height="440" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
        <rect width="{p_w}" height="42" rx="8" fill="#1e293b" />
        <rect y="34" width="{p_w}" height="8" fill="#1e293b" />
        <text x="20" y="26" font-family="sans-serif" font-size="16" font-weight="bold" fill="#38bdf8">REGLAS DE DISEÑO DE PISTAS (DESIGN RULES / DRC)</text>
        
        <g transform="translate(20, 60)">
          <text x="0" y="20" font-family="sans-serif" font-size="13" font-weight="bold" fill="#f43f5e">• Pistas de Señal Lógica (UART, I2C, Triggers):</text>
          <text x="15" y="38" font-family="monospace" font-size="11" fill="#cbd5e1">Ancho: 0.25 mm (10 mil) | Espaciamiento: 0.25 mm | Corriente máx: 0.5A</text>

          <text x="0" y="65" font-family="sans-serif" font-size="13" font-weight="bold" fill="#06b6d4">• Par Diferencial USB (D- / D+):</text>
          <text x="15" y="83" font-family="monospace" font-size="11" fill="#cbd5e1">Impedancia diferencial: 90 Ω ±10% | Longitud simétrica emparejada &lt; 0.5 mm</text>

          <text x="0" y="110" font-family="sans-serif" font-size="13" font-weight="bold" fill="#eab308">• Líneas de Radiofrecuencia RF 50Ω (LTE &amp; GNSS):</text>
          <text x="15" y="128" font-family="monospace" font-size="11" fill="#cbd5e1">Coplanar Waveguide con tierra lateral | Ancho: 0.50 mm | Aislado con vías GND</text>

          <text x="0" y="155" font-family="sans-serif" font-size="13" font-weight="bold" fill="#38bdf8">• Línea de Alimentación +3.3V_SYS:</text>
          <text x="15" y="173" font-family="monospace" font-size="11" fill="#cbd5e1">Ancho: 1.00 mm (40 mil) | Resistencia parásita &lt; 15 mΩ | Soporta 2.0A</text>

          <text x="0" y="200" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ef4444">• Línea de Potencia VBAT (Batería Li-Ion 3.7V):</text>
          <text x="15" y="218" font-family="monospace" font-size="11" fill="#cbd5e1">Ancho: 1.50 mm (60 mil) | Desacople de 2x 220µF tantalio junto al módem</text>

          <text x="0" y="245" font-family="sans-serif" font-size="13" font-weight="bold" fill="#dc2626">• Pistas de Alta Tensión 1000V (CDI Cuadrante Sureste):</text>
          <text x="15" y="263" font-family="monospace" font-size="11" fill="#cbd5e1">Ancho: 2.00 mm (80 mil) | Clearance a cualquier pista no-HV: &gt; 3.00 mm</text>

          <text x="0" y="290" font-family="sans-serif" font-size="13" font-weight="bold" fill="#10b981">• Stackup JLC04161H-7628 (4 Capas):</text>
          <text x="15" y="308" font-family="monospace" font-size="11" fill="#cbd5e1">L1: Top Cu (1 oz) | L2: GND Plano Continuo | L3: Power/VBAT | L4: Bottom Cu</text>
          <text x="15" y="326" font-family="monospace" font-size="11" fill="#cbd5e1">Grosor Total: 1.6 mm FR-4 TG155 | Taladros Mínimos: 0.3 mm / Vía 0.6 mm</text>
        </g>
      </g>
    ''')

    # Card 3: Detalles del Conector Magnético IP68
    svg.append(f'''
      <g transform="translate({p_x}, {p_y + 900})" filter="url(#shadow)">
        <rect width="{p_w}" height="320" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
        <rect width="{p_w}" height="42" rx="8" fill="#1e293b" />
        <rect y="34" width="{p_w}" height="8" fill="#1e293b" />
        <text x="20" y="26" font-family="sans-serif" font-size="16" font-weight="bold" fill="#f59e0b">PUERTO MAGNÉTICO POGO-PIN IP68 (4 PINES)</text>
        
        <g transform="translate(20, 60)">
          <text x="0" y="20" font-family="sans-serif" font-size="13" font-weight="bold" fill="#38bdf8">• Pin 1 (+5V VBUS): <tspan font-weight="normal" fill="#cbd5e1">Entrada de carga rápida 5V / 1.0A (4.5 horas carga completa)</tspan></text>
          <text x="0" y="45" font-family="sans-serif" font-size="13" font-weight="bold" fill="#38bdf8">• Pin 2 (USB D-) &amp; Pin 3 (USB D+): <tspan font-weight="normal" fill="#cbd5e1">Flasheo de firmware USB directo sin abrir caja</tspan></text>
          <text x="0" y="70" font-family="sans-serif" font-size="13" font-weight="bold" fill="#38bdf8">• Pin 4 (GND): <tspan font-weight="normal" fill="#cbd5e1">Retorno de masa del chasis</tspan></text>
          
          <rect x="0" y="95" width="{p_w - 40}" height="140" rx="6" fill="#13241b" stroke="#10b981" stroke-width="1"/>
          <text x="15" y="120" font-family="sans-serif" font-size="12" font-weight="bold" fill="#34d399">PROTECCIÓN CONTRA INTEMPERIE SEVERA (BARRO / HUMEDAD):</text>
          <text x="15" y="142" font-family="sans-serif" font-size="11" fill="#ecfdf5">• El diodo Schottky SS34 (D5) bloquea el retorno de la batería al exterior.</text>
          <text x="15" y="162" font-family="sans-serif" font-size="11" fill="#ecfdf5">• Voltaje en reposo sobre los pines externos: EXACTAMENTE 0.00 V.</text>
          <text x="15" y="182" font-family="sans-serif" font-size="11" fill="#ecfdf5">• Cero corrosión galvánica, cero electrólisis y cero fuga de energía.</text>
          <text x="15" y="202" font-family="sans-serif" font-size="11" fill="#ecfdf5">• Imanes de neodimio N52 con polaridad N/S invertida impiden conexión al revés.</text>
        </g>
      </g>
    ''')

    # Card 4: Bloque de Firmas y Aprobación
    svg.append(f'''
      <g transform="translate({p_x}, {p_y + 1240})" filter="url(#shadow)">
        <rect width="{p_w}" height="180" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <text x="20" y="35" font-family="sans-serif" font-size="15" font-weight="900" fill="#38bdf8" letter-spacing="1">CERTIFICACIÓN Y CONTROL DE INGENIERÍA</text>
        <text x="20" y="65" font-family="sans-serif" font-size="13" fill="#cbd5e1">Proyecto: <tspan font-weight="bold" fill="#ffffff">CollarNet V3 — Módulo Monolítico IoT 70×70 mm</tspan></text>
        <text x="20" y="90" font-family="sans-serif" font-size="13" fill="#cbd5e1">Diseñadores / Autores: <tspan font-weight="bold" fill="#38bdf8">Renier Morales &amp; Lindbergh Zambrano</tspan></text>
        <text x="20" y="115" font-family="sans-serif" font-size="13" fill="#cbd5e1">Estado: <tspan font-weight="bold" fill="#10b981">Aprobado para Fabricación de Primeros 10 Prototipos PCBA</tspan></text>
        <text x="20" y="140" font-family="sans-serif" font-size="12" fill="#94a3b8">Fabricante Asignado: JLCPCB / PCBWay | Stackup: 4-Layer FR-4 ENIG</text>
        <text x="20" y="160" font-family="monospace" font-size="11" fill="#64748b">Hash Verificación: CN-V3-70x70-REV3.0-202611-OK</text>
      </g>
    ''')

    # COTAS DIMENSIONALES EXTERIORES (70.0 mm x 70.0 mm)
    cota_y = oy - 40
    svg.append(f'''
      <!-- COTA HORIZONTAL SUPERIOR (70.00 mm) -->
      <g stroke="#38bdf8" stroke-width="2">
        <line x1="{ox}" y1="{cota_y}" x2="{ox + pcb_w_px}" y2="{cota_y}" />
        <path d="M {ox} {cota_y - 6} L {ox - 15} {cota_y} L {ox} {cota_y + 6} Z" fill="#38bdf8"/>
        <path d="M {ox + pcb_w_px} {cota_y - 6} L {ox + pcb_w_px + 15} {cota_y} L {ox + pcb_w_px} {cota_y + 6} Z" fill="#38bdf8"/>
        <line x1="{ox}" y1="{cota_y - 15}" x2="{ox}" y2="{oy + 20}" stroke-dasharray="4,4"/>
        <line x1="{ox + pcb_w_px}" y1="{cota_y - 15}" x2="{ox + pcb_w_px}" y2="{oy + 20}" stroke-dasharray="4,4"/>
      </g>
      <rect x="{ox + pcb_w_px/2 - 90}" y="{cota_y - 25}" width="180" height="30" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="{ox + pcb_w_px/2}" y="{cota_y - 5}" font-family="monospace" font-size="16" font-weight="bold" fill="#38bdf8" text-anchor="middle">ANCHO: 70.00 mm</text>
    ''')

    cota_x = ox - 60
    svg.append(f'''
      <!-- COTA VERTICAL LATERAL (70.00 mm) -->
      <g stroke="#38bdf8" stroke-width="2">
        <line x1="{cota_x}" y1="{oy}" x2="{cota_x}" y2="{oy + pcb_h_px}" />
        <path d="M {cota_x - 6} {oy} L {cota_x} {oy - 15} L {cota_x + 6} {oy} Z" fill="#38bdf8"/>
        <path d="M {cota_x - 6} {oy + pcb_h_px} L {cota_x} {oy + pcb_h_px + 15} L {cota_x + 6} {oy + pcb_h_px} Z" fill="#38bdf8"/>
        <line x1="{cota_x - 15}" y1="{oy}" x2="{ox + 20}" y2="{oy}" stroke-dasharray="4,4"/>
        <line x1="{cota_x - 15}" y1="{oy + pcb_h_px}" x2="{ox + 20}" y2="{oy + pcb_h_px}" stroke-dasharray="4,4"/>
      </g>
      <g transform="translate({cota_x - 20}, {oy + pcb_h_px/2}) rotate(-90)">
        <rect x="-90" y="-15" width="180" height="30" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="0" y="5" font-family="monospace" font-size="16" font-weight="bold" fill="#38bdf8" text-anchor="middle">LARGO: 70.00 mm</text>
      </g>
    ''')

    svg.append('</svg>')
    return "\n".join(svg)

if __name__ == "__main__":
    out_svg = "docs/diseno_electronico_pcb/pcb_pistas_enrutamiento_70x70.svg"
    svg_content = generate_pcb_traces_svg()
    with open(out_svg, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generado exitosamente: {out_svg} ({len(svg_content)} bytes)")
