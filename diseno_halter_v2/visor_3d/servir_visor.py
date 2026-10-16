#!/usr/bin/env python3
"""
Servidor Local de Alta Velocidad para el Visualizador 3D Interactivo COWAI V2.
Ejecuta un servidor HTTP local en un puerto disponible y abre automáticamente
el navegador web para una experiencia fluida sin instalaciones complejas.
"""

import os
import sys
import socket
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT_RANGE = [8080, 8081, 8082, 3000, 3001, 8888]
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CORSHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def find_available_port():
    for port in PORT_RANGE:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    # Fallback si todos los anteriores están ocupados
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def main():
    port = find_available_port()
    local_ip = get_local_ip()
    local_url = f"http://localhost:{port}"
    network_url = f"http://{local_ip}:{port}"

    print("=" * 72)
    print("  COWAI CollarNet V2 - Visualizador CAD 3D Interactivo")
    print("=" * 72)
    print(f" Directo en tu equipo:  {local_url}")
    print(f" Compartir en red WiFi: {network_url}")
    print("=" * 72)
    print(" Abriendo automáticamente en tu navegador web...")
    print(" Para detener el servidor, presiona Ctrl + C en esta terminal.\n")

    # Abrir navegador automáticamente
    try:
        webbrowser.open(local_url)
    except Exception as e:
        print(f"No se pudo abrir automáticamente el navegador: {e}")
        print(f"Por favor abre manualmente la URL en tu navegador: {local_url}")

    # Iniciar servidor
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSHTTPRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido. ¡Hasta pronto!")
        httpd.server_close()
        sys.exit(0)

if __name__ == '__main__':
    main()
