#!/usr/bin/env python3
"""
Generador de Diagrama de Interconexión Pin a Pin de Todos los Componentes (BOM Oficial)
CollarNet V3 (70.0 x 70.0 mm)
Diseñadores: Renier Morales & Lindbergh Zambrano
Terminología neutral (sin referencias a ganado/cerca virtual).
"""

import os
import subprocess

def generate_pin_interconnection_svg():
    width = 3600
    height = 2400
    
    # Palette
    c_bg = "#070b14"
    c_card = "#0f172a"
    c_card_border = "#1e293b"
    c_text_main = "#f8fafc"
    c_text_sub = "#94a3b8"
    c_text_accent = "#38bdf8"
    
    # Net colors
    c_vbat = "#ef4444"     # Red (VBAT 3.7V-4.2V)
    c_3v3 = "#38bdf8"      # Light Blue (+3.3V)
    c_vbus = "#f59e0b"     # Amber (VBUS 5V)
    c_gnd = "#64748b"      # Gray/Slate (GND)
    c_hv = "#dc2626"       # Deep Red / Crimson (HV 1000V)
    c_hvgnd = "#7c3aed"    # Purple (HV Isolated GND)
    c_uart = "#a855f7"     # Purple (UART TX/RX)
    c_usb = "#06b6d4"      # Cyan (USB D+/D-)
    c_i2c = "#10b981"      # Green (I2C SDA/SCL)
    c_trig = "#f97316"     # Orange (IMPULSE_TRIG & Gates)
    c_rf = "#eab308"       # Gold (RF 50 Ohm)
    c_sim = "#ec4899"      # Pink (SIM Interface)

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">')
    svg.append('<defs>')
    # Filters
    svg.append('''
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="2" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#111c30" stroke-width="1"/>
      </pattern>
    ''')
    svg.append('</defs>')

    # Background
    svg.append(f'<rect width="{width}" height="{height}" fill="{c_bg}"/>')
    svg.append(f'<rect width="{width}" height="{height}" fill="url(#grid)"/>')

    # HEADER & TITLE BLOCK
    svg.append(f'''
      <rect x="40" y="40" width="{width - 80}" height="120" rx="10" fill="url(#headerGrad)" stroke="#38bdf8" stroke-width="2" filter="url(#shadow)"/>
      <text x="80" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="900" fill="#38bdf8" letter-spacing="1">COLLARNET V3 — DIAGRAMA DE INTERCONEXIÓN PIN A PIN DE TODOS LOS COMPONENTES</text>
      <text x="80" y="125" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" fill="#94a3b8">BOM Oficial JLCPCB (28 Partes) | Mapeo Punto a Punto con Pines Físicos | Diseñadores: <tspan fill="#f8fafc" font-weight="bold">Renier Morales &amp; Lindbergh Zambrano</tspan></text>
      
      <rect x="{width - 480}" y="60" width="400" height="80" rx="8" fill="#0b1329" stroke="#334155" stroke-width="1.5"/>
      <text x="{width - 460}" y="90" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#38bdf8">FORMATO: PLACA CUADRADA 70.0 × 70.0 mm</text>
      <text x="{width - 460}" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#cbd5e1">Plano GNSS 60×60 mm | Ranura L 5kV | Puerto Magnético IP68</text>
      <text x="{width - 460}" y="128" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" fill="#10b981">Revisión Oficial 3.0 para Fabricación de 10 Prototipos</text>
    ''')

    # Helper function to draw an IC / Component block
    def draw_component_card(x, y, w, h, title, subtitle, lcsc="", category_color="#38bdf8", desig=""):
        res = []
        res.append(f'<g transform="translate({x}, {y})" filter="url(#shadow)">')
        res.append(f'<rect width="{w}" height="{h}" rx="8" fill="{c_card}" stroke="{category_color}" stroke-width="2"/>')
        res.append(f'<rect width="{w}" height="42" rx="8" fill="{c_card_border}" />')
        res.append(f'<rect y="34" width="{w}" height="8" fill="{c_card_border}" />')
        # Title badge
        res.append(f'<text x="14" y="26" font-family="monospace" font-size="18" font-weight="900" fill="{category_color}">{desig}</text>')
        res.append(f'<text x="65" y="26" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">{title}</text>')
        if lcsc:
            res.append(f'<rect x="{w - 115}" y="8" width="105" height="24" rx="4" fill="#0284c7" />')
            res.append(f'<text x="{w - 62}" y="24" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">{lcsc}</text>')
        res.append(f'<text x="14" y="60" font-family="sans-serif" font-size="12" fill="{c_text_sub}">{subtitle}</text>')
        res.append('</g>')
        return "\n".join(res)

    def draw_pin_item(x, y, pin_num, pin_name, net_name, pin_type="bidir", align="left", w=180, net_color="#38bdf8"):
        res = []
        if align == "left":
            # Pin on left edge
            res.append(f'<g transform="translate({x}, {y})">')
            res.append(f'<circle cx="0" cy="0" r="5" fill="{net_color}" stroke="#ffffff" stroke-width="1.5"/>')
            res.append(f'<rect x="8" y="-12" width="28" height="22" rx="3" fill="#1e293b" />')
            res.append(f'<text x="22" y="3" font-family="monospace" font-size="11" font-weight="bold" fill="#e2e8f0" text-anchor="middle">{pin_num}</text>')
            res.append(f'<text x="42" y="3" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">{pin_name}</text>')
            res.append(f'<text x="42" y="16" font-family="monospace" font-size="10" fill="{net_color}">&gt;&gt; {net_name}</text>')
            res.append('</g>')
        else:
            # Pin on right edge
            res.append(f'<g transform="translate({x}, {y})">')
            res.append(f'<circle cx="0" cy="0" r="5" fill="{net_color}" stroke="#ffffff" stroke-width="1.5"/>')
            res.append(f'<rect x="-36" y="-12" width="28" height="22" rx="3" fill="#1e293b" />')
            res.append(f'<text x="-22" y="3" font-family="monospace" font-size="11" font-weight="bold" fill="#e2e8f0" text-anchor="middle">{pin_num}</text>')
            res.append(f'<text x="-42" y="3" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="end">{pin_name}</text>')
            res.append(f'<text x="-42" y="16" font-family="monospace" font-size="10" fill="{net_color}" text-anchor="end">{net_name} &lt;&lt;</text>')
            res.append('</g>')
        return "\n".join(res)

    # -------------------------------------------------------------
    # LAYOUT DE BLOQUES:
    # FILA 1: U1 ESP32-S3 (Izquierda Centro), U2 SIM7670SA (Derecha Centro)
    # Entre U1 y U2: Conexiones UART y Controles
    # -------------------------------------------------------------

    # BLOQUE 1: ESP32-S3 (U1)
    u1_x = 550
    u1_y = 220
    u1_w = 460
    u1_h = 760
    svg.append(draw_component_card(u1_x, u1_y, u1_w, u1_h, "ESP32-S3-WROOM-1-N16R8", "Microcontrolador Xtensa Dual-Core 240MHz + Wi-Fi/BLE", "LCSC: C2913202", "#38bdf8", "U1"))
    
    # Pines izquierdos de U1 (Alimentación, Sensores, USB, Reset)
    u1_pins_left = [
        ("1", "GND", "GND_SYS", c_gnd),
        ("2", "3V3", "+3.3V_SYS", c_3v3),
        ("3", "EN", "RESET_RC", c_text_sub),
        ("11", "IO1", "VBAT_SENSE (ADC1_CH0)", c_vbat),
        ("12", "IO2", "SOLAR_SENSE (ADC1_CH1)", c_vbus),
        ("19", "IO19", "USB_D_N (USB Nativo D-)", c_usb),
        ("20", "IO20", "USB_D_P (USB Nativo D+)", c_usb),
        ("8", "IO8", "I2C_SDA (Bus Sensores)", c_i2c),
        ("9", "IO9", "I2C_SCL (Bus Sensores)", c_i2c),
        ("10", "IO10", "ACCEL_INT1 (Interrupción IMU)", c_i2c),
        ("41", "EPAD", "GND_RF_PLANE", c_gnd)
    ]
    for idx, p in enumerate(u1_pins_left):
        py = u1_y + 95 + idx * 60
        svg.append(draw_pin_item(u1_x, py, p[0], p[1], p[2], align="left", net_color=p[3]))

    # Pines derechos de U1 (Comunicaciones módem, Actuadores de salida)
    u1_pins_right = [
        ("17", "IO17", "MODEM_TXD -> SIM7670 RXD", c_uart),
        ("18", "IO18", "MODEM_RXD <- SIM7670 TXD", c_uart),
        ("6", "IO6", "MODEM_PWRKEY (Ctrl Encendido)", c_uart),
        ("7", "IO7", "MODEM_STATUS (Detección Red)", c_uart),
        ("5", "IO5", "BUZZER_PWM (Audio 4000Hz)", c_trig),
        ("4", "IO4", "IMPULSE_TRIG (Disparo Pulso HV)", c_trig),
        ("15", "IO15", "LED_STATUS (Indicador RGB)", c_text_accent),
        ("16", "IO16", "SOLAR_STAT (Muestreo MPPT)", c_vbus),
        ("0", "IO0", "BOOT_BUTTON (Flashing Ext)", c_text_sub)
    ]
    for idx, p in enumerate(u1_pins_right):
        py = u1_y + 115 + idx * 65
        svg.append(draw_pin_item(u1_x + u1_w, py, p[0], p[1], p[2], align="right", net_color=p[3]))

    # -------------------------------------------------------------
    # BLOQUE 2: SIM7670SA-MNGV (U2)
    # -------------------------------------------------------------
    u2_x = 1580
    u2_y = 220
    u2_w = 480
    u2_h = 760
    svg.append(draw_component_card(u2_x, u2_y, u2_w, u2_h, "SIM7670SA-MNGV", "Módem Celular 4G LTE Cat-1 + GNSS (GPS/GLONASS)", "LCSC: C2892994", "#0284c7", "U2"))
    
    # Pines izquierdos de U2 (Conexión con MCU y Alimentación)
    u2_pins_left = [
        ("38", "VBAT_1", "VBAT_4V (Picos 2A)", c_vbat),
        ("39", "VBAT_2", "VBAT_4V (Picos 2A)", c_vbat),
        ("21", "UART_RXD", "MODEM_TXD (Desde ESP32 IO17)", c_uart),
        ("22", "UART_TXD", "MODEM_RXD (Hacia ESP32 IO18)", c_uart),
        ("1", "PWRKEY", "MODEM_PWRKEY (Drive vía Q2)", c_uart),
        ("3", "STATUS", "MODEM_STATUS (Hacia ESP32 IO7)", c_uart),
        ("4", "NETLIGHT", "LED_NET_STATUS", c_text_sub),
        ("2", "GND_1", "GND_SYS", c_gnd),
        ("19", "GND_2", "GND_SYS", c_gnd),
        ("40", "GND_3", "GND_SYS", c_gnd)
    ]
    for idx, p in enumerate(u2_pins_left):
        py = u2_y + 95 + idx * 62
        svg.append(draw_pin_item(u2_x, py, p[0], p[1], p[2], align="left", net_color=p[3]))

    # Pines derechos de U2 (SIM Interface & RF)
    u2_pins_right = [
        ("32", "MAIN_ANT", "LTE_RF_50R -> J3 (u.FL)", c_rf),
        ("46", "GNSS_ANT", "GNSS_RF_50R -> J4 / Patch", c_rf),
        ("52", "SIM_VDD", "SIM_VDD (1.8V / 3.0V)", c_sim),
        ("53", "SIM_RST", "SIM_RESET", c_sim),
        ("54", "SIM_CLK", "SIM_CLOCK (3.25MHz)", c_sim),
        ("55", "SIM_DATA", "SIM_DATA_IO", c_sim),
        ("33", "GND_RF1", "PLANO GND CONTINUO 60x60", c_rf),
        ("47", "GND_RF2", "PLANO GND CONTINUO 60x60", c_rf)
    ]
    for idx, p in enumerate(u2_pins_right):
        py = u2_y + 115 + idx * 75
        svg.append(draw_pin_item(u2_x + u2_w, py, p[0], p[1], p[2], align="right", net_color=p[3]))

    # -------------------------------------------------------------
    # CONECTORES RF (J3, J4) Y SLOT SIM (J2) A LA DERECHA DE U2
    # -------------------------------------------------------------
    # J3 u.FL LTE
    j3_x = 2280
    j3_y = 240
    svg.append(draw_component_card(j3_x, j3_y, 340, 130, "U.FL-R-SMT (LTE)", "Conector Coaxial RF 50Ω Antena Celular", "LCSC: C88373", "#eab308", "J3"))
    svg.append(draw_pin_item(j3_x, j3_y + 70, "1", "SIGNAL", "LTE_RF_50R", align="left", net_color=c_rf))
    svg.append(draw_pin_item(j3_x, j3_y + 105, "2/3", "SHIELD", "GND_RF_PLANE", align="left", net_color=c_gnd))

    # J4 u.FL GNSS
    j4_x = 2280
    j4_y = 400
    svg.append(draw_component_card(j4_x, j4_y, 340, 130, "U.FL-R-SMT (GNSS)", "Conector Coaxial RF 50Ω Antena Parche", "LCSC: C88373", "#eab308", "J4"))
    svg.append(draw_pin_item(j4_x, j4_y + 70, "1", "SIGNAL", "GNSS_RF_50R", align="left", net_color=c_rf))
    svg.append(draw_pin_item(j4_x, j4_y + 105, "2/3", "SHIELD", "GND_RF_PLANE", align="left", net_color=c_gnd))

    # J2 Slot Push-Pull Nano-SIM 6P
    j2_x = 2280
    j2_y = 560
    svg.append(draw_component_card(j2_x, j2_y, 340, 240, "NANO-SIM-6P PUSH-PULL", "Portatarjeta Nano-SIM Lateral con Filtro ESD", "LCSC: C2838382", "#ec4899", "J2"))
    j2_pins = [
        ("C1", "VCC", "SIM_VDD", c_sim),
        ("C2", "RST", "SIM_RESET", c_sim),
        ("C3", "CLK", "SIM_CLOCK", c_sim),
        ("C5", "GND", "GND_SYS", c_gnd),
        ("C7", "I/O", "SIM_DATA_IO", c_sim)
    ]
    for idx, p in enumerate(j2_pins):
        svg.append(draw_pin_item(j2_x, j2_y + 70 + idx * 36, p[0], p[1], p[2], align="left", net_color=p[3]))

    # C1, C2 Condensadores Tantalio 220uF 6.3V
    c12_x = 2280
    c12_y = 830
    svg.append(draw_component_card(c12_x, c12_y, 340, 150, "C1, C2 (2x 220µF 6.3V)", "Tantalio Case-D 7343 Low-ESR (Absorbe 2A)", "LCSC: C7187", "#ef4444", "C1 C2"))
    svg.append(draw_pin_item(c12_x, c12_y + 80, "+", "ANODE", "VBAT_4V", align="left", net_color=c_vbat))
    svg.append(draw_pin_item(c12_x, c12_y + 120, "-", "CATHODE", "GND_SYS", align="left", net_color=c_gnd))

    # -------------------------------------------------------------
    # BLOQUE DE ENERGÍA Y CARGA (Izquierda Inferior):
    # J1 (Pogo Magnético), U4 (CN3791 MPPT), U5 (SY8089 3.3V), Q3, D1, D2, D3, D5, L2, L1
    # -------------------------------------------------------------

    # J1: Conector Magnético 4P Pogo IP68
    j1_x = 80
    j1_y = 220
    svg.append(draw_component_card(j1_x, j1_y, 380, 260, "CONECTOR MAGNÉTICO 4P IP68", "Pogo-Pins Retráctiles Herméticos + Imanes N52", "MAG4P-IP68", "#f59e0b", "J1"))
    j1_pins = [
        ("1", "VBUS_5V", "Entrada Carga 5V/1A (vía D5 SS34)", c_vbus),
        ("2", "USB_D-", "Línea USB D- nativa -> ESP32 IO19", c_usb),
        ("3", "USB_D+", "Línea USB D+ nativa -> ESP32 IO20", c_usb),
        ("4", "GND", "Masa Chasis / Retorno Carga", c_gnd)
    ]
    for idx, p in enumerate(j1_pins):
        svg.append(draw_pin_item(j1_x + 380, j1_y + 85 + idx * 45, p[0], p[1], p[2], align="right", net_color=p[3]))

    # D5 Diodo Schottky Anti-Retorno (0.00V en reposo)
    d5_x = 80
    d5_y = 510
    svg.append(draw_component_card(d5_x, d5_y, 380, 130, "D5 (SS34 SMA 40V/3A)", "Diodo Anti-Retorno (0.00V Reposo en Pines)", "LCSC: C8678", "#10b981", "D5"))
    svg.append(draw_pin_item(d5_x, d5_y + 75, "A", "ANODE", "Desde J1 Pin 1 (VBUS)", align="left", net_color=c_vbus))
    svg.append(draw_pin_item(d5_x + 380, d5_y + 75, "K", "CATHODE", "Hacia CN3791 VIN", align="right", net_color=c_vbus))

    # U3 Acelerómetro SC7A20 (Debajo de J1 / D5)
    u3_x = 80
    u3_y = 670
    svg.append(draw_component_card(u3_x, u3_y, 380, 310, "SC7A20TR (LGA-12)", "Acelerómetro 3 Ejes Ultra-Bajo Consumo (6µA)", "LCSC: C392477", "#10b981", "U3"))
    u3_pins = [
        ("1", "SCL", "I2C_SCL (Desde ESP32 IO9)", c_i2c),
        ("4", "SDA", "I2C_SDA (Desde ESP32 IO8)", c_i2c),
        ("7", "VDD", "+3.3V_SYS", c_3v3),
        ("8", "VDDIO", "+3.3V_SYS", c_3v3),
        ("6", "GND", "GND_SYS", c_gnd),
        ("11", "INT1", "ACCEL_INT1 (Hacia ESP32 IO10)", c_i2c)
    ]
    for idx, p in enumerate(u3_pins):
        svg.append(draw_pin_item(u3_x + 380, u3_y + 80 + idx * 40, p[0], p[1], p[2], align="right", net_color=p[3]))

    # -------------------------------------------------------------
    # SECCIÓN INFERIOR 1: REGULACIÓN Y GESTIÓN ENERGÉTICA
    # U4 (CN3791 MPPT), U5 (SY8089 3.3V), DW01A / FS8205A (BMS)
    # -------------------------------------------------------------
    
    # U4: CN3791 Cargador Solar MPPT
    u4_x = 80
    u4_y = 1060
    u4_w = 460
    u4_h = 420
    svg.append(draw_component_card(u4_x, u4_y, u4_w, u4_h, "CN3791 (SSOP-10)", "Controlador de Carga Solar MPPT (Vmp=6.0V, Ichg=1.2A)", "LCSC: C154992", "#10b981", "U4"))
    u4_pins_left = [
        ("1", "VIN", "Alimentación Solar / VBUS Carga", c_vbus),
        ("2", "MPPT", "Divisor Muestreo MPPT 6V", c_vbus),
        ("4", "GND", "GND_SYS", c_gnd),
        ("3", "CHRG", "LED Indicador Carga", c_text_sub),
        ("5", "DONE", "LED Indicador Batería Llena", c_text_sub)
    ]
    for idx, p in enumerate(u4_pins_left):
        svg.append(draw_pin_item(u4_x, u4_y + 85 + idx * 55, p[0], p[1], p[2], align="left", net_color=p[3]))

    u4_pins_right = [
        ("10", "DRV", "Drive Compuerta P-MOSFET Q3", c_trig),
        ("9", "VCC", "Polarización Interna", c_vbat),
        ("7", "BAT", "Sensado Voltaje Celda 4.2V", c_vbat),
        ("8", "COM", "Compensación RC de Lazo", c_text_sub),
        ("6", "CSP", "Sensado Corriente (Rcs 0.1Ω)", c_vbat)
    ]
    for idx, p in enumerate(u4_pins_right):
        svg.append(draw_pin_item(u4_x + u4_w, u4_y + 85 + idx * 55, p[0], p[1], p[2], align="right", net_color=p[3]))

    # Componentes asociados a U4: Q3, L2, D3
    q3_x = 580
    q3_y = 1060
    svg.append(draw_component_card(q3_x, q3_y, 340, 200, "Q3 (AO3401A SOT-23)", "P-MOSFET Conmutador MPPT (30V / 4.2A)", "LCSC: C15127", "#10b981", "Q3"))
    svg.append(draw_pin_item(q3_x, q3_y + 80, "1", "GATE", "Desde U4 Pin 10 (DRV)", align="left", net_color=c_trig))
    svg.append(draw_pin_item(q3_x, q3_y + 120, "2", "SOURCE", "VIN_SOLAR_5V", align="left", net_color=c_vbus))
    svg.append(draw_pin_item(q3_x + 340, q3_y + 100, "3", "DRAIN", "Hacia Inductor L2 & D3", align="right", net_color=c_vbat))

    l2_x = 580
    l2_y = 1290
    svg.append(draw_component_card(l2_x, l2_y, 340, 190, "L2 (10µH SMD 0430)", "Inductor de Potencia Blindado 2.5A Carga", "LCSC: C38117", "#10b981", "L2"))
    svg.append(draw_pin_item(l2_x, l2_y + 80, "1", "SW_IN", "Conmutación desde Q3 Drain", align="left", net_color=c_vbat))
    svg.append(draw_pin_item(l2_x + 340, l2_y + 80, "2", "OUT", "Línea Principal VBAT", align="right", net_color=c_vbat))
    svg.append(draw_pin_item(l2_x, l2_y + 140, "D3", "SS34", "Diodo Catch Flyback a GND", align="left", net_color=c_gnd))

    # U5: SY8089 Regulador Buck 3.3V / 2A
    u5_x = 80
    u5_y = 1520
    u5_w = 460
    u5_h = 360
    svg.append(draw_component_card(u5_x, u5_y, u5_w, u5_h, "SY8089AAAC (SOT-23-5)", "Regulador Buck DC-DC Síncrono 1.5MHz (3.3V / 2A)", "LCSC: C78988", "#38bdf8", "U5"))
    u5_pins_left = [
        ("4", "VIN", "Alimentación desde VBAT (3.4V - 4.2V)", c_vbat),
        ("1", "EN", "Habilitado permanente a VBAT", c_vbat),
        ("2", "GND", "Plano GND", c_gnd)
    ]
    for idx, p in enumerate(u5_pins_left):
        svg.append(draw_pin_item(u5_x, u5_y + 85 + idx * 60, p[0], p[1], p[2], align="left", net_color=p[3]))

    u5_pins_right = [
        ("3", "LX", "Conmutación a Inductor L1 (2.2µH)", c_3v3),
        ("5", "FB", "Divisor FB (453k / 100k -> 3.31V)", c_3v3),
        ("OUT", "3V3", "Salida Estable +3.3V_SYS", c_3v3)
    ]
    for idx, p in enumerate(u5_pins_right):
        svg.append(draw_pin_item(u5_x + u5_w, u5_y + 85 + idx * 60, p[0], p[1], p[2], align="right", net_color=p[3]))

    # Inductor L1 (2.2uH) para U5
    l1_x = 580
    l1_y = 1520
    svg.append(draw_component_card(l1_x, l1_y, 340, 160, "L1 (2.2µH SMD 0420)", "Inductor de Potencia 3.0A Salida Buck", "LCSC: C167733", "#38bdf8", "L1"))
    svg.append(draw_pin_item(l1_x, l1_y + 80, "1", "LX_IN", "Desde U5 Pin 3 (LX)", align="left", net_color=c_3v3))
    svg.append(draw_pin_item(l1_x + 340, l1_y + 80, "2", "3V3_OUT", "+3.3V_SYS Filtrado (2x 22µF)", align="right", net_color=c_3v3))

    # BZ1 Buzzer + Q1 AO3400A + D4 1N4148W
    bz_x = 580
    bz_y = 1710
    svg.append(draw_component_card(bz_x, bz_y, 340, 200, "BZ1 + Q1 + D4 (Buzzer 95dB)", "Bocina Acústica 4000Hz con Driver MOSFET", "C253457 / C20917", "#f97316", "BZ1 / Q1"))
    svg.append(draw_pin_item(bz_x, bz_y + 75, "G", "Q1 GATE", "BUZZER_PWM (ESP32 IO5)", align="left", net_color=c_trig))
    svg.append(draw_pin_item(bz_x, bz_y + 115, "D", "Q1 DRAIN", "Conectado a BZ1 (-) & D4", align="left", net_color=c_text_sub))
    svg.append(draw_pin_item(bz_x, bz_y + 155, "S", "Q1 SOURCE", "GND_SYS", align="left", net_color=c_gnd))
    svg.append(draw_pin_item(bz_x + 340, bz_y + 90, "+", "BZ1 (+)", "Alimentado desde VBAT", align="right", net_color=c_vbat))

    # -------------------------------------------------------------
    # SECCIÓN DE BATERÍA Y PROTECCIÓN BMS (Centro Inferior):
    # BT1 (Keystone 1042/1048), U6 (DW01A), U7 (FS8205A)
    # -------------------------------------------------------------
    bms_x = 1000
    bms_y = 1060
    bms_w = 480
    bms_h = 420
    svg.append(draw_component_card(bms_x, bms_y, bms_w, bms_h, "U6 (DW01A) & U7 (FS8205A)", "Protección BMS 1S Batería (Sobrecarga / Descarga / Corto)", "C351410 / C32254", "#10b981", "U6 U7"))
    
    bms_pins_left = [
        ("5", "VCC (U6)", "Monitoreo Polo Positivo (BT_POS)", c_vbat),
        ("6", "GND (U6)", "Referencia Batería Negativo (BT_NEG)", c_gnd),
        ("1", "OD (U6)", "Corte Sobredescarga (<2.4V) -> G1", c_trig),
        ("3", "OC (U6)", "Corte Sobrecarga (>4.28V) -> G2", c_trig),
        ("2", "CS (U6)", "Detección Sobrecorriente (>3.0A)", c_gnd)
    ]
    for idx, p in enumerate(bms_pins_left):
        svg.append(draw_pin_item(bms_x, bms_y + 85 + idx * 55, p[0], p[1], p[2], align="left", net_color=p[3]))

    bms_pins_right = [
        ("4,5", "G1, G2 (U7)", "Compuertas de Control MOSFET Dual", c_trig),
        ("6,7", "S2 (U7)", "Conectado a Borne BT_NEG Batería", c_gnd),
        ("2,3", "S1 (U7)", "Conectado a GND General del Sistema", c_gnd),
        ("1,8", "D1, D2 (U7)", "Drenador Interno Conexión en Serie", c_text_sub),
        ("OUT", "VBAT", "Línea Protegida VBAT_PWR (3.7V)", c_vbat)
    ]
    for idx, p in enumerate(bms_pins_right):
        svg.append(draw_pin_item(bms_x + bms_w, bms_y + 85 + idx * 55, p[0], p[1], p[2], align="right", net_color=p[3]))

    # BT1 Keystone 1042 / 1048
    bt1_x = 1000
    bt1_y = 1520
    svg.append(draw_component_card(bt1_x, bt1_y, 480, 200, "BT1 (KEYSTONE 1042 / 1048)", "Portapilas Cara Inferior (Bottom) Inclinado a 42°", "Keystone-1042", "#84cc16", "BT1"))
    svg.append(draw_pin_item(bt1_x, bt1_y + 80, "+", "BT_POS", "Polo Positivo Celda Panasonic NCR18650B", align="left", net_color=c_vbat))
    svg.append(draw_pin_item(bt1_x, bt1_y + 125, "-", "BT_NEG", "Polo Negativo Celda 18650 -> U6/U7", align="left", net_color=c_gnd))
    svg.append(draw_pin_item(bt1_x + 480, bt1_y + 100, "3400mAh", "NCR18650B", "Autonomía de 10 a 17 días sin sol", align="right", net_color="#84cc16"))

    # Q2 AO3400A (Transistor PWRKEY Módem)
    q2_x = 1000
    q2_y = 1750
    svg.append(draw_component_card(q2_x, q2_y, 480, 160, "Q2 (AO3400A SOT-23)", "Driver N-MOSFET de Encendido Módem (PWRKEY)", "LCSC: C20917", "#a855f7", "Q2"))
    svg.append(draw_pin_item(q2_x, q2_y + 80, "1", "GATE", "MODEM_PWRKEY (Desde ESP32 IO6)", align="left", net_color=c_trig))
    svg.append(draw_pin_item(q2_x, q2_y + 120, "2", "SOURCE", "GND_SYS", align="left", net_color=c_gnd))
    svg.append(draw_pin_item(q2_x + 480, q2_y + 100, "3", "DRAIN", "Hacia U2 Pin 1 (PWRKEY activo LOW)", align="right", net_color=c_uart))

    # -------------------------------------------------------------
    # SECCIÓN DERECHA INFERIOR: ETAPA DE ALTA TENSIÓN 1000V (CDI)
    # Aislada físicamente por la ranura fresada en L (5kV)
    # U8 (EL817), U9 (74LVC1G123 Watchdog), MOD_HV (Flyback 1000V),
    # C7 (0.1uF 1000V), TH1 (TYN1225RG SCR), D6 (DB3), EL1 & EL2
    # -------------------------------------------------------------
    
    # Marco de la Zona de Alta Tensión
    hv_box_x = 1560
    hv_box_y = 1060
    hv_box_w = 1960
    hv_box_h = 880
    svg.append(f'''
      <rect x="{hv_box_x}" y="{hv_box_y}" width="{hv_box_w}" height="{hv_box_h}" rx="12" fill="#200508" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="10,6" filter="url(#shadow)"/>
      <rect x="{hv_box_x + 20}" y="{hv_box_y + 20}" width="420" height="35" rx="6" fill="#7f1d1d" />
      <text x="{hv_box_x + 35}" y="{hv_box_y + 44}" font-family="sans-serif" font-size="14" font-weight="900" fill="#fecaca" letter-spacing="1">⚠️ CUADRANTE SURESTE: ZONA 1000V DC (CDI AISLADA)</text>
      <text x="{hv_box_x + 470}" y="{hv_box_y + 44}" font-family="sans-serif" font-size="12" fill="#fca5a5">Separación Galvánica con Ranura Fresada de 2.0 mm (Edge.Cuts) | Creepage &gt; 14 mm</text>
    ''')

    # U8: Optoacoplador EL817C (Cruza la ranura)
    u8_x = 1600
    u8_y = 1140
    u8_w = 440
    u8_h = 240
    svg.append(draw_component_card(u8_x, u8_y, u8_w, u8_h, "U8 (EL817S1C SOP-4)", "Optoacoplador de Barrera Galvánica (5,000V RMS)", "LCSC: C4999", "#f43f5e", "U8"))
    svg.append(f'<text x="{u8_x + 15}" y="{u8_y + 80}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#38bdf8">LADO LÓGICO DIGITAL (ESP32)</text>')
    svg.append(draw_pin_item(u8_x, u8_y + 115, "1", "ANODE", "IMPULSE_TRIG (ESP32 IO4)", align="left", net_color=c_trig))
    svg.append(draw_pin_item(u8_x, u8_y + 165, "2", "CATHODE", "Retorno GND_SYS", align="left", net_color=c_gnd))

    svg.append(f'<text x="{u8_x + u8_w - 15}" y="{u8_y + 80}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#f87171" text-anchor="end">LADO ALTA TENSIÓN (1000V)</text>')
    svg.append(draw_pin_item(u8_x + u8_w, u8_y + 115, "4", "COLLECTOR", "Disparo hacia U9 Watchdog", align="right", net_color=c_hv))
    svg.append(draw_pin_item(u8_x + u8_w, u8_y + 165, "3", "EMITTER", "Retorno Tierra HV_GND", align="right", net_color=c_hvgnd))

    # U9: 74LVC1G123DCK (Watchdog Hardware 1000ms)
    u9_x = 1600
    u9_y = 1420
    u9_w = 440
    u9_h = 280
    svg.append(draw_component_card(u9_x, u9_y, u9_w, u9_h, "U9 (74LVC1G123 VSSOP-8)", "Watchdog Temporizador Hardware (Máximo 1000ms Irrevocable)", "LCSC: C128362", "#ef4444", "U9"))
    u9_pins = [
        ("1", "A (TRIG)", "Desde Colector U8 Optoacoplador", c_trig),
        ("2", "B", "Pull-Up a VCC_HV (Habilitado)", c_text_sub),
        ("3", "CLR", "Reinicio / Activo Alto", c_text_sub),
        ("4", "GND", "Masa Aislada HV_GND", c_hvgnd),
        ("5", "Q (OUT)", "Pulso de Activación Seguro (&lt;1s)", c_hv),
        ("6,7", "REXT/CEXT", "Red RC (1MΩ + 1µF -> τ=1000ms)", c_text_sub)
    ]
    for idx, p in enumerate(u9_pins):
        if idx < 4:
            svg.append(draw_pin_item(u9_x, u9_y + 90 + idx * 42, p[0], p[1], p[2], align="left", net_color=p[3]))
        else:
            svg.append(draw_pin_item(u9_x + u9_w, u9_y + 90 + (idx - 4) * 50, p[0], p[1], p[2], align="right", net_color=p[3]))

    # MOD_HV: Módulo Flyback Elevador 3.7V -> 1000V DC
    mod_x = 2110
    mod_y = 1140
    mod_w = 460
    mod_h = 280
    svg.append(draw_component_card(mod_x, mod_y, mod_w, mod_h, "MOD_HV (FLYBACK DC-HV)", "Micro-Módulo Elevador Resonante (3.7V -> 1000V DC)", "MOD-HV-1KV", "#ef4444", "MOD_HV"))
    svg.append(draw_pin_item(mod_x, mod_y + 90, "1", "IN (+)", "Alimentación desde VBAT", align="left", net_color=c_vbat))
    svg.append(draw_pin_item(mod_x, mod_y + 140, "2", "IN (-)", "Retorno Conmutado por Watchdog U9", align="left", net_color=c_gnd))
    svg.append(draw_pin_item(mod_x + mod_w, mod_y + 90, "3", "HV_OUT (+)", "Alta Tensión +1000V DC -> C7 & TH1", align="right", net_color=c_hv))
    svg.append(draw_pin_item(mod_x + mod_w, mod_y + 140, "4", "HV_GND (-)", "Retorno Masa Aislada HV_GND", align="right", net_color=c_hvgnd))

    # C7: Condensador CDI 0.1uF 1000V CBB21
    c7_x = 2110
    c7_y = 1460
    svg.append(draw_component_card(c7_x, c7_y, 460, 200, "C7 (0.1µF 1000V CBB21)", "Condensador Polipropileno Metalizado (Energía: 50 mJ)", "LCSC: C2839151", "#b91c1c", "C7"))
    svg.append(draw_pin_item(c7_x, c7_y + 80, "1", "HV_POS", "+1000V DC (Almacén de Energía CDI)", align="left", net_color=c_hv))
    svg.append(draw_pin_item(c7_x + 460, c7_y + 80, "2", "HV_NEG", "Retorno Masa Aislada HV_GND", align="right", net_color=c_hvgnd))
    svg.append(draw_pin_item(c7_x, c7_y + 130, "R_BLEED", "10MΩ / 1kV", "Resistencia de Sangrado de Seguridad", align="left", net_color=c_text_sub))

    # TH1 (Tiristor TYN1225RG) + D6 (DB3 Diac)
    th1_x = 2640
    th1_y = 1140
    th1_w = 440
    th1_h = 300
    svg.append(draw_component_card(th1_x, th1_y, th1_w, th1_h, "TH1 (TYN1225RG TO-252) + D6", "Tiristor SCR de Descarga Rápida (1200V / 25A) + Diac DB3", "C14486 / C139750", "#ef4444", "TH1 / D6"))
    svg.append(draw_pin_item(th1_x, th1_y + 90, "D6", "DIAC_IN", "Pulso de Disparo desde U9", align="left", net_color=c_trig))
    svg.append(draw_pin_item(th1_x, th1_y + 140, "1", "GATE", "Compuerta SCR polarizada vía DB3", align="left", net_color=c_trig))
    svg.append(draw_pin_item(th1_x, th1_y + 190, "2", "ANODE", "Desde Polo Positivo C7 (+1000V)", align="left", net_color=c_hv))
    svg.append(draw_pin_item(th1_x + th1_w, th1_y + 120, "3", "CATHODE", "Hacia R_LIMIT (220Ω / 2W) -> EL1", align="right", net_color=c_hv))
    svg.append(draw_pin_item(th1_x + th1_w, th1_y + 180, "TAB", "HEATSINK", "Pad Térmico Conectado a Ánodo", align="right", net_color=c_hv))

    # EL1 y EL2: Bornes M4 Acero Inox 316
    el_x = 3140
    el_y = 1140
    el_w = 340
    el_h = 300
    svg.append(draw_component_card(el_x, el_y, el_w, el_h, "EL1 & EL2 (BORNES M4 INOX)", "Contactos Bipolares Dérmicos (Inox 316 Calidad Marina)", "PAD-M4-8MM", "#ef4444", "EL1 EL2"))
    svg.append(draw_pin_item(el_x, el_y + 95, "EL1", "PULSE (+)", "Salida Pulso Choque CDI (+1000V)", align="left", net_color=c_hv))
    svg.append(draw_pin_item(el_x, el_y + 165, "EL2", "RETURN (-)", "Retorno Galvánico hacia HV_GND", align="left", net_color=c_hvgnd))
    svg.append(draw_pin_item(el_x, el_y + 225, "R_LIM", "220Ω / 2W", "Limitador de Corriente Anti-Quemaduras", align="left", net_color=c_text_accent))

    # Resumen de Seguridad de la Etapa HV
    svg.append(f'''
      <g transform="translate({2110}, {1700})">
        <rect width="1370" height="200" rx="8" fill="#13080b" stroke="#ef4444" stroke-width="1.5" />
        <text x="25" y="35" font-family="sans-serif" font-size="14" font-weight="bold" fill="#fca5a5">PARAMETRIZACIÓN TÉCNICA DEL PULSO ELECTROSTÁTICO DISUASORIO (NORMA IEC 60335-2-76)</text>
        <text x="25" y="65" font-family="monospace" font-size="12" fill="#fecaca">• Tensión Pico de Choque: 1,000 V DC | Energía Almacenada: E = ½ · C · V² = ½ · 0.1µF · (1000V)² = 0.050 Joules (50 mJ)</text>
        <text x="25" y="90" font-family="monospace" font-size="12" fill="#fecaca">• Duración Máxima Hardware: 1.000 ms irrevocable (gobernada por Watchdog Monoestable U9 74LVC1G123, inmune a cuelgues del microcontrolador)</text>
        <text x="25" y="115" font-family="monospace" font-size="12" fill="#fecaca">• Resistencia Limitadora de Potencia: 220 Ω / 2W (limita corriente pico a &lt;4.5 A instantáneos, previniendo lesiones térmicas o quemaduras)</text>
        <text x="25" y="140" font-family="monospace" font-size="12" fill="#fecaca">• Aislamiento Galvánico: Optoacoplador EL817 (5,000V RMS) + Ranura fresada en 'L' de 2.0 mm (Creepage dieléctrico &gt;14 mm)</text>
        <text x="25" y="165" font-family="monospace" font-size="12" fill="#38bdf8">• Tierra Aislada HV_GND: Separada al 100% de la masa general del sistema (GND_SYS). Cero retorno de corriente hacia microcontrolador o módem</text>
      </g>
    ''')

    # -------------------------------------------------------------
    # BUSES Y LÍNEAS DE RUTA ENTRE LOS BLOQUES
    # -------------------------------------------------------------
    svg.append('<!-- BUS DE INTERCONEXIÓN ENTRE U1 Y U2 -->')
    # UART TXD (U1 IO17 -> U2 UART_RXD)
    svg.append(f'''
      <path d="M {u1_x + u1_w} {u1_y + 115} L {u2_x} {u2_y + 219}" fill="none" stroke="{c_uart}" stroke-width="2.5" stroke-dasharray="8,4"/>
      <path d="M {u1_x + u1_w} {u1_y + 180} L {u2_x} {u2_y + 281}" fill="none" stroke="{c_uart}" stroke-width="2.5" stroke-dasharray="8,4"/>
      <path d="M {u1_x + u1_w} {u1_y + 245} C {u1_x + u1_w + 120} {u1_y + 245}, {q2_x - 100} {q2_y + 80}, {q2_x} {q2_y + 80}" fill="none" stroke="{c_uart}" stroke-width="2.5"/>
      <path d="M {q2_x + 480} {q2_y + 100} C {u2_x - 100} {q2_y + 100}, {u2_x - 100} {u2_y + 343}, {u2_x} {u2_y + 343}" fill="none" stroke="{c_uart}" stroke-width="2.5"/>
    ''')

    # USB D+ / D- (J1 -> U1)
    svg.append(f'''
      <path d="M {j1_x + 380} {j1_y + 130} C {u1_x - 60} {j1_y + 130}, {u1_x - 60} {u1_y + 395}, {u1_x} {u1_y + 395}" fill="none" stroke="{c_usb}" stroke-width="2.5"/>
      <path d="M {j1_x + 380} {j1_y + 175} C {u1_x - 80} {j1_y + 175}, {u1_x - 80} {u1_y + 455}, {u1_x} {u1_y + 455}" fill="none" stroke="{c_usb}" stroke-width="2.5"/>
    ''')

    # I2C Bus (U1 -> U3)
    svg.append(f'''
      <path d="M {u1_x} {u1_y + 515} C {u1_x - 80} {u1_y + 515}, {u3_x + 420} {u3_y + 120}, {u3_x + 380} {u3_y + 120}" fill="none" stroke="{c_i2c}" stroke-width="2.5"/>
      <path d="M {u1_x} {u1_y + 575} C {u1_x - 100} {u1_y + 575}, {u3_x + 440} {u3_y + 80}, {u3_x + 380} {u3_y + 80}" fill="none" stroke="{c_i2c}" stroke-width="2.5"/>
    ''')

    # IMPULSE_TRIG (U1 IO4 -> U8 EL817 Pin 1)
    svg.append(f'''
      <path d="M {u1_x + u1_w} {u1_y + 440} C {u1_x + u1_w + 300} {u1_y + 440}, {u8_x - 100} {u8_y + 115}, {u8_x} {u8_y + 115}" fill="none" stroke="{c_trig}" stroke-width="3"/>
    ''')

    # BUZZER_PWM (U1 IO5 -> Q1 Gate)
    svg.append(f'''
      <path d="M {u1_x + u1_w} {u1_y + 375} C {u1_x + u1_w + 200} {u1_y + 375}, {bz_x - 80} {bz_y + 75}, {bz_x} {bz_y + 75}" fill="none" stroke="{c_trig}" stroke-width="2.5"/>
    ''')

    # U8 Collector -> U9 Pin 1
    svg.append(f'''
      <path d="M {u8_x + u8_w} {u8_y + 115} C {u8_x + u8_w + 50} {u8_y + 115}, {u9_x - 50} {u9_y + 90}, {u9_x} {u9_y + 90}" fill="none" stroke="{c_hv}" stroke-width="2.5"/>
    ''')

    # U9 Pin 5 (Q OUT) -> MOD_HV Pin 2 & TH1 Gate
    svg.append(f'''
      <path d="M {u9_x + u9_w} {u9_y + 90} C {mod_x - 60} {u9_y + 90}, {mod_x - 60} {mod_y + 140}, {mod_x} {mod_y + 140}" fill="none" stroke="{c_hv}" stroke-width="2.5"/>
      <path d="M {u9_x + u9_w} {u9_y + 90} C {th1_x - 80} {u9_y + 90}, {th1_x - 80} {th1_y + 90}, {th1_x} {th1_y + 90}" fill="none" stroke="{c_trig}" stroke-width="2.5"/>
    ''')

    # MOD_HV 1000V OUT -> C7 -> TH1 Anode -> EL1 (+)
    svg.append(f'''
      <path d="M {mod_x + mod_w} {mod_y + 90} C {c7_x - 40} {mod_y + 90}, {c7_x - 40} {c7_y + 80}, {c7_x} {c7_y + 80}" fill="none" stroke="{c_hv}" stroke-width="4"/>
      <path d="M {mod_x + mod_w} {mod_y + 90} C {th1_x - 40} {mod_y + 90}, {th1_x - 40} {th1_y + 190}, {th1_x} {th1_y + 190}" fill="none" stroke="{c_hv}" stroke-width="4"/>
      <path d="M {th1_x + th1_w} {th1_y + 120} C {el_x - 40} {th1_y + 120}, {el_x - 40} {el_y + 95}, {el_x} {el_y + 95}" fill="none" stroke="{c_hv}" stroke-width="4"/>
      <path d="M {c7_x + 460} {c7_y + 80} C {el_x - 40} {c7_y + 80}, {el_x - 40} {el_y + 165}, {el_x} {el_y + 165}" fill="none" stroke="{c_hvgnd}" stroke-width="3" stroke-dasharray="6,4"/>
    ''')

    # LEYENDA TÉCNICA DE REDES AL PIE
    svg.append(f'''
      <g transform="translate(80, {height - 210})" filter="url(#shadow)">
        <rect width="{width - 160}" height="150" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
        <text x="30" y="35" font-family="sans-serif" font-size="16" font-weight="bold" fill="#38bdf8">CÓDIGO DE COLORES DE REDES Y LÍNEAS DE ENRUTAMIENTO (NETLIST):</text>
        
        <!-- Fila 1 -->
        <circle cx="45" cy="70" r="8" fill="{c_vbat}" />
        <text x="65" y="75" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">VBAT (3.7V - 4.2V): <tspan font-weight="normal" fill="#cbd5e1">Batería Li-Ion, SIM7670SA, CN3791 BAT, Buck SY8089 VIN</tspan></text>
        
        <circle cx="720" cy="70" r="8" fill="{c_3v3}" />
        <text x="740" y="75" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">+3.3V_SYS: <tspan font-weight="normal" fill="#cbd5e1">Alimentación ESP32-S3, Acelerómetro SC7A20, Pull-Ups I2C/Reset</tspan></text>

        <circle cx="1450" cy="70" r="8" fill="{c_vbus}" />
        <text x="1470" y="75" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">VBUS / SOLAR (5V - 6V): <tspan font-weight="normal" fill="#cbd5e1">Entrada Carga Pogo Pin J1 &amp; Paneles Solares vía Diodos SS34</tspan></text>

        <circle cx="2250" cy="70" r="8" fill="{c_usb}" />
        <text x="2270" y="75" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">LÍNEAS USB (D- / D+): <tspan font-weight="normal" fill="#cbd5e1">Par Diferencial 90Ω J1 Pogo a ESP32 GPIO19/20 (Flasheo Firmware)</tspan></text>

        <!-- Fila 2 -->
        <circle cx="45" cy="115" r="8" fill="{c_uart}" />
        <text x="65" y="120" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">UART 4G / PWRKEY: <tspan font-weight="normal" fill="#cbd5e1">ESP32 IO17/18 a SIM7670SA RXD/TXD (115200 baud) + Q2 Driver</tspan></text>

        <circle cx="720" cy="115" r="8" fill="{c_i2c}" />
        <text x="740" y="120" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">I2C BUS (SDA / SCL): <tspan font-weight="normal" fill="#cbd5e1">ESP32 IO8/9 a SC7A20 Acelerómetro (Dirección 0x18, Pull-Ups 4.7k)</tspan></text>

        <circle cx="1450" cy="115" r="8" fill="{c_rf}" />
        <text x="1470" y="120" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">LÍNEAS RF 50Ω: <tspan font-weight="normal" fill="#cbd5e1">Coplanar Waveguides hacia J3 (LTE) y J4 (GNSS) sobre plano 60×60 mm</tspan></text>

        <circle cx="2250" cy="115" r="8" fill="{c_hv}" />
        <text x="2270" y="120" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">ALTA TENSIÓN 1000V (CDI): <tspan font-weight="normal" fill="#cbd5e1">Circuito Aislado por Ranura 'L' (5kV), U8 Opto, Watchdog U9, TH1 SCR</tspan></text>
      </g>
    ''')

    svg.append('</svg>')
    return "\n".join(svg)

if __name__ == "__main__":
    out_svg = "docs/diseno_electronico_pcb/diagrama_interconexion_pines_bom.svg"
    svg_content = generate_pin_interconnection_svg()
    with open(out_svg, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generado exitosamente: {out_svg} ({len(svg_content)} bytes)")
