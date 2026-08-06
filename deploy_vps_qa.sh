#!/bin/bash
# =========================================================
# SCRIPT AUTOMÁTICO DE INSTALACIÓN Y DESPLIEGUE QA - COLLARNET
# Para VPS Ubuntu (12GB RAM / 6 CPU)
# =========================================================

set -e

echo "========================================================="
echo "   DESPLIEGUE DEL ENTORNO DE QA - PLATAFORMA COLLARNET   "
echo "========================================================="

# 1. Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "[1/4] Instalando Docker y dependencias en Ubuntu..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    echo "[OK] Docker instalado con éxito."
else
    echo "[1/4] Docker ya está instalado."
fi

# 2. Asegurar permisos de usuario para Docker
sudo usermod -aG docker $USER || true

# 3. Detener contenedores previos si existen
echo "[2/4] Deteniendo contenedores QA previos..."
docker compose down || true

# 4. Construir e Iniciar el Stack completo de QA
echo "[3/4] Construyendo e iniciando contenedores QA (PostgreSQL+PostGIS, Mosquitto MQTT y Node.js)..."
docker compose up -d --build

# 5. Estado de los contenedores
echo "========================================================="
echo "[4/4] ESTADO DE LOS SERVICIOS DE QA:"
docker compose ps
echo "========================================================="
echo "🚀 Servidor de QA Desplegado Exitosamente!"
echo "📍 Aplicación Web & API: http://$(curl -s ifconfig.me 2>/dev/null || echo 'IP_DE_TU_VPS'):3500"
echo "📡 Mosquitto Broker MQTT: mqtt://$(curl -s ifconfig.me 2>/dev/null || echo 'IP_DE_TU_VPS'):1883"
echo "========================================================="
