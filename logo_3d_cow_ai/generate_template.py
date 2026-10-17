import os

# Total target: 1200 mm
# Cow width: 363.1 mm
# Available width for text: 1200 - 363.1 = 836.9 mm
# Gap between cow and 'C': 35.0 mm
# Total text block width: 836.9 - 35.0 = 801.9 mm

# Letter widths:
# C: 142.8
# O: 172.1
# W: 226.2
# A: 172.7
# I: 34.5
# Sum of letter widths: 142.8 + 172.1 + 226.2 + 172.7 + 34.5 = 748.3 mm
# Remaining spacing: 801.9 - 748.3 = 53.6 mm
# Spacings:
# C-O: 12.0 mm
# O-W: 12.0 mm
# W-A (word gap between COW and AI): 20.0 mm
# A-I: 9.6 mm
# Total spacing = 12 + 12 + 20 + 9.6 = 53.6 mm! EXACTLY 801.9 mm!

# Total width from left edge of cow (X=10) to right edge of I:
# 10 + 363.1 + 35.0 + 801.9 = 1210 mm (Canvas width 1220 mm with 10mm margins)

cow_x_start = 10.0
cow_center_x = cow_x_start + 363.1 / 2.0 # 191.55 mm
cow_center_y = 190.0 # Vertical center line

text_y = cow_center_y

# Letter X centers:
# 'C'
c_x_start = cow_x_start + 363.1 + 35.0 # 408.1 mm
c_center_x = c_x_start + 142.8 / 2.0 # 479.5 mm

# 'O'
o_x_start = c_x_start + 142.8 + 12.0 # 562.9 mm
o_center_x = o_x_start + 172.1 / 2.0 # 648.95 mm

# 'W'
w_x_start = o_x_start + 172.1 + 12.0 # 747.0 mm
w_center_x = w_x_start + 226.2 / 2.0 # 860.1 mm

# 'A'
a_x_start = w_x_start + 226.2 + 20.0 # 993.2 mm
a_center_x = a_x_start + 172.7 / 2.0 # 1079.55 mm

# 'I'
i_x_start = a_x_start + 172.7 + 9.6 # 1175.5 mm
i_center_x = i_x_start + 34.5 / 2.0 # 1192.75 mm
i_x_end = i_x_start + 34.5 # 1210.0 mm

print(f"Total Width from cow start ({cow_x_start}) to I end ({i_x_end}) = {i_x_end - cow_x_start:.1f} mm")

# Generate SVG
width = 1240
height = 380

svg = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}mm" height="{height}mm" viewBox="0 0 {width} {height}">
  <defs>
    <style>
      .guide {{ stroke: #e02424; stroke-width: 0.5; stroke-dasharray: 4,4; fill: none; }}
      .baseline {{ stroke: #2563eb; stroke-width: 0.8; stroke-dasharray: 6,3; fill: none; }}
      .box {{ stroke: #94a3b8; stroke-width: 0.8; fill: none; }}
      .crosshair {{ stroke: #ef4444; stroke-width: 1.2; }}
      .text-label {{ font-family: 'Ubuntu', sans-serif; font-weight: bold; fill: #1e293b; text-anchor: middle; }}
      .dim-label {{ font-family: sans-serif; font-size: 10px; fill: #64748b; text-anchor: middle; }}
    </style>
  </defs>

  <!-- Background -->
  <rect width="{width}" height="{height}" fill="#f8fafc"/>

  <!-- Dimension Bar Top (1.20 Metros) -->
  <line x1="{cow_x_start}" y1="30" x2="{i_x_end}" y2="30" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="{cow_x_start}" y1="20" x2="{cow_x_start}" y2="40" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="{i_x_end}" y1="20" x2="{i_x_end}" y2="40" stroke="#0f172a" stroke-width="1.5"/>
  <text x="{(cow_x_start + i_x_end)/2}" y="24" class="text-label" font-size="14">ANCHO TOTAL: 1.20 METROS (1200 mm)</text>

  <!-- Horizontal Center Line / Baseline -->
  <line x1="0" y1="{text_y}" x2="{width}" y2="{text_y}" class="baseline"/>
  <text x="50" y="{text_y - 6}" font-family="sans-serif" font-size="9" fill="#2563eb">EJE CENTRAL HORIZONTAL</text>

  <!-- Bottom Baseline -->
  <line x1="0" y1="{text_y + 91.4}" x2="{width}" y2="{text_y + 91.4}" class="guide"/>
  <text x="50" y="{text_y + 91.4 + 14}" font-family="sans-serif" font-size="9" fill="#e02424">LÍNEA BASE DE APOYO INFERIOR</text>

  <!-- 1. CABEZA DE VACA (Isotipo) -->
  <rect x="{cow_x_start}" y="{cow_center_y - 166.9}" width="363.1" height="333.8" class="box" stroke-dasharray="2,2"/>
  <text x="{cow_center_x}" y="{cow_center_y - 172}" class="dim-label">ISOTIPO VACA (363 × 334 mm - 4 Cuadrantes)</text>
  
  <!-- Division de cuadrantes Vaca -->
  <line x1="{cow_center_x}" y1="{cow_center_y - 166.9}" x2="{cow_center_x}" y2="{cow_center_y + 166.9}" stroke="#10b981" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="{cow_x_start}" y1="{cow_center_y}" x2="{cow_x_start + 363.1}" y2="{cow_center_y}" stroke="#10b981" stroke-width="1" stroke-dasharray="3,3"/>
  
  <!-- Orificios Keyhole Vaca (Cruz roja para taladrar/marcar en pared) -->
  <!-- TL: -60, 95 -->
  <g transform="translate({cow_center_x - 60}, {cow_center_y - 95})">
    <line x1="-8" y1="0" x2="8" y2="0" class="crosshair"/>
    <line x1="0" y1="-8" x2="0" y2="8" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
    <text x="12" y="4" font-family="sans-serif" font-size="8" fill="#ef4444">Tornillo TL</text>
  </g>
  <!-- TR: +60, 95 -->
  <g transform="translate({cow_center_x + 60}, {cow_center_y - 95})">
    <line x1="-8" y1="0" x2="8" y2="0" class="crosshair"/>
    <line x1="0" y1="-8" x2="0" y2="8" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
    <text x="12" y="4" font-family="sans-serif" font-size="8" fill="#ef4444">Tornillo TR</text>
  </g>
  <!-- BL: -60, -60 -->
  <g transform="translate({cow_center_x - 60}, {cow_center_y + 60})">
    <line x1="-8" y1="0" x2="8" y2="0" class="crosshair"/>
    <line x1="0" y1="-8" x2="0" y2="8" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
    <text x="12" y="4" font-family="sans-serif" font-size="8" fill="#ef4444">Tornillo BL</text>
  </g>
  <!-- BR: +60, -60 -->
  <g transform="translate({cow_center_x + 60}, {cow_center_y + 60})">
    <line x1="-8" y1="0" x2="8" y2="0" class="crosshair"/>
    <line x1="0" y1="-8" x2="0" y2="8" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
    <text x="12" y="4" font-family="sans-serif" font-size="8" fill="#ef4444">Tornillo BR</text>
  </g>

  <!-- 2. LETRA C -->
  <rect x="{c_x_start}" y="{text_y - 91.4}" width="142.8" height="182.8" class="box"/>
  <text x="{c_center_x}" y="{text_y + 45}" class="text-label" font-size="120" opacity="0.15">C</text>
  <text x="{c_center_x}" y="{text_y - 100}" class="dim-label">LETRA C (Blanco)</text>
  <g transform="translate({c_center_x}, {text_y - 40})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>
  <g transform="translate({c_center_x}, {text_y + 40})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>

  <!-- 3. LETRA O -->
  <rect x="{o_x_start}" y="{text_y - 91.4}" width="172.1" height="182.8" class="box"/>
  <text x="{o_center_x}" y="{text_y + 45}" class="text-label" font-size="120" opacity="0.15">O</text>
  <text x="{o_center_x}" y="{text_y - 100}" class="dim-label">LETRA O (Blanco)</text>
  <g transform="translate({o_center_x}, {text_y - 45})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>
  <g transform="translate({o_center_x}, {text_y + 45})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>

  <!-- 4. LETRA W -->
  <rect x="{w_x_start}" y="{text_y - 87.6}" width="226.2" height="175.2" class="box"/>
  <text x="{w_center_x}" y="{text_y + 45}" class="text-label" font-size="120" opacity="0.15">W</text>
  <text x="{w_center_x}" y="{text_y - 100}" class="dim-label">LETRA W (Blanco)</text>
  <g transform="translate({w_center_x - 45}, {text_y - 30})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>
  <g transform="translate({w_center_x + 45}, {text_y - 30})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>

  <!-- 5. LETRA A -->
  <rect x="{a_x_start}" y="{text_y - 87.6}" width="172.7" height="175.2" class="box"/>
  <text x="{a_center_x}" y="{text_y + 45}" class="text-label" font-size="120" opacity="0.15" fill="#10b981">A</text>
  <text x="{a_center_x}" y="{text_y - 100}" class="dim-label">LETRA A (Menta)</text>
  <g transform="translate({a_center_x}, {text_y - 40})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>
  <g transform="translate({a_center_x - 35}, {text_y + 45})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>
  <g transform="translate({a_center_x + 35}, {text_y + 45})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>

  <!-- 6. LETRA I -->
  <rect x="{i_x_start}" y="{text_y - 87.6}" width="34.5" height="175.2" class="box"/>
  <text x="{i_center_x}" y="{text_y + 45}" class="text-label" font-size="120" opacity="0.15" fill="#10b981">I</text>
  <text x="{i_center_x}" y="{text_y - 100}" class="dim-label">LETRA I</text>
  <g transform="translate({i_center_x}, {text_y - 40})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>
  <g transform="translate({i_center_x}, {text_y + 40})">
    <line x1="-6" y1="0" x2="6" y2="0" class="crosshair"/><line x1="0" y1="-6" x2="0" y2="6" class="crosshair"/>
    <circle r="4.5" fill="none" stroke="#ef4444" stroke-width="1"/>
  </g>

  <!-- Legend & Instructions Bottom -->
  <g transform="translate(10, {height - 30})">
    <rect width="1220" height="25" fill="#e2e8f0" rx="3"/>
    <text x="610" y="16" font-family="sans-serif" font-size="10" fill="#334155" text-anchor="middle">
      GUÍA DE INSTALACIÓN 1:1 • Las cruces rojas (+) marcan los centros para taladrar tornillos • La línea azul es el eje central de nivelación • Compatible con cinta de doble cara 3M VHB
    </text>
  </g>
</svg>'''

svg_file = '/home/lzambrano/Desarrollo/CollarNet/logo_3d_cow_ai/plantilla_montaje_120cm.svg'
with open(svg_file, 'w') as f:
    f.write(svg)
print("Saved 1:1 mounting template:", svg_file)
