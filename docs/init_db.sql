-- ==========================================
-- SCRIPT DE INICIALIZACIÓN - COLLARNET
-- Motor: PostgreSQL 16 + PostGIS
-- ==========================================

-- 1. Habilitar la extensión espacial PostGIS (requiere privilegios de superusuario)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabla de Propietarios
CREATE TABLE IF NOT EXISTS propietarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    documento_identidad VARCHAR(30) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Hatos
CREATE TABLE IF NOT EXISTS hatos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    perimetro GEOMETRY(Polygon, 4326) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Potreros
CREATE TABLE IF NOT EXISTS potreros (
    id SERIAL PRIMARY KEY,
    hato_id INTEGER REFERENCES hatos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    perimetro GEOMETRY(Polygon, 4326) NOT NULL,
    capacidad_max_cabezas INTEGER DEFAULT 50,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Collares
CREATE TABLE IF NOT EXISTS collares (
    id VARCHAR(50) PRIMARY KEY,
    numero_sim VARCHAR(20) UNIQUE NOT NULL,
    nivel_bateria INT CHECK (nivel_bateria BETWEEN 0 AND 100),
    senal_celular INT CHECK (senal_celular BETWEEN 0 AND 5),
    ultima_ubicacion GEOMETRY(Point, 4326),
    ultima_conexion TIMESTAMP,
    fecha_instalacion DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- ==========================================
-- CREACIÓN DE ÍNDICES SPACIALES Y RELACIONALES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_hatos_perimetro ON hatos USING GIST (perimetro);
CREATE INDEX IF NOT EXISTS idx_potreros_perimetro ON potreros USING GIST (perimetro);
CREATE INDEX IF NOT EXISTS idx_telemetria_ubicacion ON telemetria USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_collares_ultima_ubicacion ON collares USING GIST (ultima_ubicacion);

CREATE INDEX IF NOT EXISTS idx_animales_collar ON animales (collar_id);
CREATE INDEX IF NOT EXISTS idx_animales_propietario ON animales (propietario_id);
CREATE INDEX IF NOT EXISTS idx_telemetria_animal_fecha ON telemetria (animal_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_estado_tipo ON alertas (estado, tipo);
