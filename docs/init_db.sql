-- ==========================================
-- SCRIPT DE INICIALIZACIÓN - COWIA
-- Plataforma de Ganadería Inteligente y Cercas Virtuales
-- Motor: PostgreSQL 16 + PostGIS
-- ==========================================

-- 1. Habilitar la extensión espacial PostGIS (requiere privilegios de superusuario)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabla de Tenants / Ganaderías (Multi-Tenant)
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    rif_identificacion VARCHAR(30) UNIQUE NOT NULL,
    telefono VARCHAR(30),
    correo VARCHAR(100),
    direccion TEXT,
    moneda_preferida VARCHAR(10) DEFAULT 'USD',
    permite_crear_potreros BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Propietarios
CREATE TABLE IF NOT EXISTS propietarios (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    documento_identidad VARCHAR(30) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Hatos
CREATE TABLE IF NOT EXISTS hatos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    perimetro GEOMETRY(Polygon, 4326) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Potreros
CREATE TABLE IF NOT EXISTS potreros (
    id SERIAL PRIMARY KEY,
    hato_id INTEGER REFERENCES hatos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    perimetro GEOMETRY(Polygon, 4326) NOT NULL,
    capacidad_max_cabezas INTEGER DEFAULT 50,
    margen_advertencia_metros NUMERIC(5, 2) DEFAULT 10.00,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Lotes de Hardware de Collares
CREATE TABLE IF NOT EXISTS lotes_collares (
    id SERIAL PRIMARY KEY,
    codigo_lote VARCHAR(50) UNIQUE NOT NULL,
    proveedor VARCHAR(100) NOT NULL,
    fecha_recepcion DATE NOT NULL DEFAULT CURRENT_DATE,
    cantidad_total INT NOT NULL,
    version_hardware VARCHAR(30) DEFAULT 'HW-v2.0',
    version_firmware_inicial VARCHAR(30) DEFAULT '1.0.0',
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    notas TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Collares IoT
CREATE TABLE IF NOT EXISTS collares (
    id VARCHAR(50) PRIMARY KEY,
    numero_sim VARCHAR(20) UNIQUE NOT NULL,
    imei VARCHAR(30) UNIQUE,
    mac_address VARCHAR(30),
    numero_serie VARCHAR(50),
    estado VARCHAR(30) DEFAULT 'EN_ALMACEN' CHECK (estado IN ('EN_ALMACEN', 'ACTIVO', 'EN_REVISION', 'DESACTIVADO', 'EN_TRANSITO', 'DE_BAJA')),
    lote_id INTEGER REFERENCES lotes_collares(id) ON DELETE SET NULL,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    ubicacion_almacen VARCHAR(100),
    motivo_estado TEXT,
    nivel_bateria INT CHECK (nivel_bateria BETWEEN 0 AND 100),
    senal_celular INT CHECK (senal_celular BETWEEN 0 AND 5),
    ultima_ubicacion GEOMETRY(Point, 4326),
    ultima_conexion TIMESTAMP,
    fecha_instalacion DATE NOT NULL DEFAULT CURRENT_DATE,
    version_firmware VARCHAR(30) DEFAULT '1.0.0',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Auditoría y Trazabilidad de Collares
CREATE TABLE IF NOT EXISTS historial_collares (
    id SERIAL PRIMARY KEY,
    collar_id VARCHAR(50) REFERENCES collares(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    tenant_id_anterior INTEGER,
    tenant_id_nuevo INTEGER,
    animal_id_anterior INTEGER,
    animal_id_nuevo INTEGER,
    usuario_id INTEGER,
    motivo TEXT,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Animales
CREATE TABLE IF NOT EXISTS animales (
    id SERIAL PRIMARY KEY,
    collar_id VARCHAR(50) UNIQUE REFERENCES collares(id) ON DELETE SET NULL,
    propietario_id INTEGER REFERENCES propietarios(id) ON DELETE RESTRICT,
    potrero_id INTEGER REFERENCES potreros(id) ON DELETE SET NULL,
    arete_visual VARCHAR(20) UNIQUE NOT NULL,
    raza VARCHAR(50),
    categoria VARCHAR(30) CHECK (categoria IN ('Toro', 'Vaca', 'Novillo', 'Ternero', 'Vaquillona')),
    sexo VARCHAR(10) CHECK (sexo IN ('Macho', 'Hembra')),
    foto_url TEXT,
    numero_hierro VARCHAR(50),
    madre_id INTEGER REFERENCES animales(id) ON DELETE SET NULL,
    padre_id INTEGER REFERENCES animales(id) ON DELETE SET NULL,
    fecha_nacimiento DATE NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Registro de Pesajes
CREATE TABLE IF NOT EXISTS registro_pesajes (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES animales(id) ON DELETE CASCADE,
    peso NUMERIC(6, 2) NOT NULL,
    fecha_pesaje DATE DEFAULT CURRENT_DATE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Historial de Propietarios
CREATE TABLE IF NOT EXISTS historial_propietarios (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES animales(id) ON DELETE CASCADE,
    propietario_anterior_id INTEGER REFERENCES propietarios(id) ON DELETE RESTRICT,
    propietario_nuevo_id INTEGER REFERENCES propietarios(id) ON DELETE RESTRICT,
    fecha_transferencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_traspaso VARCHAR(30) CHECK (tipo_traspaso IN ('VENTA', 'HERENCIA', 'TRASPASO_INTERNO')),
    precio_venta NUMERIC(10, 2) DEFAULT 0.00
);

-- 9. Tabla de Telemetría (Historial GPS)
CREATE TABLE IF NOT EXISTS telemetria (
    id BIGSERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES animales(id) ON DELETE CASCADE,
    ubicacion GEOMETRY(Point, 4326) NOT NULL,
    bateria INT NOT NULL,
    senal INT NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabla de Alertas e Infracciones
CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES animales(id) ON DELETE CASCADE,
    tipo VARCHAR(30) CHECK (tipo IN ('ESCAPE_HATO', 'INFRACCION_ROTACION', 'BATERIA_BAJA')),
    estado VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'RESUELTO')),
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP,
    coordenada_evento GEOMETRY(Point, 4326)
);

-- 11. Tabla de Parámetros de Rendimiento
CREATE TABLE IF NOT EXISTS parametros_rendimiento (
    id SERIAL PRIMARY KEY,
    raza VARCHAR(50) NOT NULL,
    categoria VARCHAR(30) NOT NULL,
    gdp_promedio NUMERIC(4, 3) NOT NULL,
    peso_adulto_esperado NUMERIC(6, 2) NOT NULL,
    costo_diario_manutencion NUMERIC(6, 2) NOT NULL,
    precio_mercado_por_kg NUMERIC(6, 2) NOT NULL,
    UNIQUE (raza, categoria)
);

-- 12. Catálogo de Medicamentos
CREATE TABLE IF NOT EXISTS catalogo_medicamentos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('VACUNA', 'DESPARASITANTE', 'VITAMINA', 'ANTIBIOTICO', 'SUPLEMENTO', 'OTRO')),
    dosis_recomendada VARCHAR(50),
    periodo_revacunacion_dias INT DEFAULT 180,
    costo_unitario_estimado NUMERIC(8, 2) DEFAULT 0.00,
    laboratorio VARCHAR(100),
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Eventos Sanitarios y Aplicaciones Médicas
CREATE TABLE IF NOT EXISTS eventos_sanitarios (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
    medicamento_id INTEGER NOT NULL REFERENCES catalogo_medicamentos(id) ON DELETE RESTRICT,
    fecha_aplicacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_proxima_dosis DATE,
    dosis_aplicada VARCHAR(50),
    lote_medicamento VARCHAR(50),
    veterinario_responsable VARCHAR(100),
    costo_aplicado NUMERIC(8, 2) DEFAULT 0.00,
    observaciones TEXT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id INTEGER,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Servicios Reproductivos
CREATE TABLE IF NOT EXISTS servicios_reproductivos (
    id SERIAL PRIMARY KEY,
    vaca_id INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
    toro_id INTEGER REFERENCES animales(id) ON DELETE SET NULL,
    tipo_servicio VARCHAR(35) NOT NULL CHECK (tipo_servicio IN ('MONTA_NATURAL', 'INSEMINACION_ARTIFICIAL', 'TRANSFERENCIA_EMBRION')),
    codigo_pajuela VARCHAR(50),
    raza_toro_donante VARCHAR(50),
    nombre_toro_donante VARCHAR(100),
    fecha_servicio DATE NOT NULL DEFAULT CURRENT_DATE,
    inseminador_responsable VARCHAR(100),
    estado VARCHAR(30) DEFAULT 'PENDIENTE_PALPACION' CHECK (estado IN ('PENDIENTE_PALPACION', 'PREÑADA_CONFIRMADA', 'VACIA', 'PARTO_REGISTRADO', 'ABORTADA')),
    observaciones TEXT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id INTEGER,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Diagnósticos de Palpación y Ecografía
CREATE TABLE IF NOT EXISTS palpaciones_diagnosticos (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER NOT NULL REFERENCES servicios_reproductivos(id) ON DELETE CASCADE,
    vaca_id INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
    fecha_palpacion DATE NOT NULL DEFAULT CURRENT_DATE,
    resultado VARCHAR(30) NOT NULL CHECK (resultado IN ('PREÑADA', 'VACIA', 'DUDOSA')),
    dias_gestacion_estimados INT,
    fecha_estimada_parto DATE,
    veterinario_palpador VARCHAR(100),
    metodo_diagnostico VARCHAR(30) DEFAULT 'PALPACION_RECTAL' CHECK (metodo_diagnostico IN ('PALPACION_RECTAL', 'ECOGRAFIA', 'OBSERVACION_CELO')),
    observaciones TEXT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Partos y Nacimientos
CREATE TABLE IF NOT EXISTS partos_nacimientos (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES servicios_reproductivos(id) ON DELETE SET NULL,
    vaca_id INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
    fecha_parto DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_parto VARCHAR(30) DEFAULT 'NORMAL' CHECK (tipo_parto IN ('NORMAL', 'DISTOCICO_ASISTIDO', 'CESAREA', 'ABORTO')),
    condicion_cria VARCHAR(30) DEFAULT 'VIVA' CHECK (condicion_cria IN ('VIVA', 'MUERTA', 'MELLIZOS_VIVOS')),
    cria_animal_id INTEGER REFERENCES animales(id) ON DELETE SET NULL,
    arete_cria VARCHAR(20),
    sexo_cria VARCHAR(10) CHECK (sexo_cria IN ('Macho', 'Hembra')),
    peso_nacimiento NUMERIC(5, 2),
    veterinario_asistente VARCHAR(100),
    observaciones TEXT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Configuración de Notificaciones Multicanal
CREATE TABLE IF NOT EXISTS configuracion_notificaciones (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    canal_telegram_activo BOOLEAN DEFAULT FALSE,
    telegram_bot_token VARCHAR(100),
    telegram_chat_id VARCHAR(50),
    canal_whatsapp_activo BOOLEAN DEFAULT FALSE,
    whatsapp_phone VARCHAR(50),
    whatsapp_api_key VARCHAR(100),
    canal_email_activo BOOLEAN DEFAULT FALSE,
    email_destinatarios TEXT,
    alerta_escape_geocerca BOOLEAN DEFAULT TRUE,
    alerta_bateria_critica BOOLEAN DEFAULT TRUE,
    alerta_collar_offline BOOLEAN DEFAULT TRUE,
    alerta_celo_detectado BOOLEAN DEFAULT TRUE,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Bitácora de Notificaciones
CREATE TABLE IF NOT EXISTS bitacora_notificaciones (
    id SERIAL PRIMARY KEY,
    alerta_id INTEGER REFERENCES alertas(id) ON DELETE SET NULL,
    canal VARCHAR(30) NOT NULL CHECK (canal IN ('TELEGRAM', 'WHATSAPP', 'EMAIL', 'WEB_PUSH')),
    destinatario VARCHAR(100) NOT NULL,
    titulo VARCHAR(150),
    mensaje TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'ENVIADO' CHECK (estado IN ('ENVIADO', 'FALLIDO', 'PENDIENTE')),
    detalles_respuesta TEXT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. Métricas de Actividad y Rumia (IMU)
CREATE TABLE IF NOT EXISTS metricas_actividad_rumia (
    id BIGSERIAL PRIMARY KEY,
    animal_id INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
    collar_id VARCHAR(50) NOT NULL REFERENCES collares(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_bloque INTEGER NOT NULL CHECK (hora_bloque >= 0 AND hora_bloque <= 23),
    minutos_pastoreo INTEGER DEFAULT 0,
    minutos_rumia INTEGER DEFAULT 0,
    minutos_descanso INTEGER DEFAULT 0,
    minutos_caminata INTEGER DEFAULT 0,
    indice_actividad_promedio NUMERIC(4, 2) DEFAULT 1.00,
    alerta_celo BOOLEAN DEFAULT FALSE,
    alerta_letargo BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_animal_fecha_hora UNIQUE (animal_id, fecha, hora_bloque)
);

-- ==========================================
-- CREACIÓN DE ÍNDICES ESPACIALES Y RELACIONALES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_hatos_perimetro ON hatos USING GIST (perimetro);
CREATE INDEX IF NOT EXISTS idx_potreros_perimetro ON potreros USING GIST (perimetro);
CREATE INDEX IF NOT EXISTS idx_telemetria_ubicacion ON telemetria USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_collares_ultima_ubicacion ON collares USING GIST (ultima_ubicacion);

CREATE INDEX IF NOT EXISTS idx_animales_collar ON animales (collar_id);
CREATE INDEX IF NOT EXISTS idx_animales_tenant ON animales (tenant_id);
CREATE INDEX IF NOT EXISTS idx_animales_propietario ON animales (propietario_id);
CREATE INDEX IF NOT EXISTS idx_animales_madre ON animales (madre_id);
CREATE INDEX IF NOT EXISTS idx_animales_padre ON animales (padre_id);
CREATE INDEX IF NOT EXISTS idx_telemetria_animal_fecha ON telemetria (animal_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_estado_tipo ON alertas (estado, tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_animal ON eventos_sanitarios (animal_id);
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_proxima_dosis ON eventos_sanitarios (fecha_proxima_dosis);
CREATE INDEX IF NOT EXISTS idx_servicios_vaca ON servicios_reproductivos (vaca_id);
CREATE INDEX IF NOT EXISTS idx_palpaciones_parto_estimado ON palpaciones_diagnosticos (fecha_estimada_parto);
CREATE INDEX IF NOT EXISTS idx_bitacora_notif_tenant ON bitacora_notificaciones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_salud_rumia_animal_fecha ON metricas_actividad_rumia (animal_id, fecha DESC);
