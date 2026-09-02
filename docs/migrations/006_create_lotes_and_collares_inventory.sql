-- ====================================================================
-- Migración 006: Módulo de Inventario de Collares y Lotes - CowIA
-- ====================================================================

-- 1. Tabla de Lotes de Hardware
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

-- 2. Modificaciones a la Tabla de Collares
ALTER TABLE collares 
    ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'EN_ALMACEN',
    ADD COLUMN IF NOT EXISTS lote_id INTEGER REFERENCES lotes_collares(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS imei VARCHAR(30) UNIQUE,
    ADD COLUMN IF NOT EXISTS mac_address VARCHAR(30),
    ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ubicacion_almacen VARCHAR(100),
    ADD COLUMN IF NOT EXISTS motivo_estado TEXT,
    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;

-- Actualizar collares existentes vinculados a un animal para que tengan estado 'ACTIVO' y el tenant del animal
UPDATE collares c
SET 
    estado = 'ACTIVO',
    tenant_id = a.tenant_id
FROM animales a
WHERE a.collar_id = c.id;

-- 3. Tabla de Auditoría y Trazabilidad del Ciclo de Vida
CREATE TABLE IF NOT EXISTS historial_collares (
    id SERIAL PRIMARY KEY,
    collar_id VARCHAR(50) REFERENCES collares(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    tenant_id_anterior INTEGER,
    tenant_id_nuevo INTEGER,
    animal_id_anterior INTEGER,
    animal_id_nuevo INTEGER,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo TEXT,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de optimización para búsquedas de inventario
CREATE INDEX IF NOT EXISTS idx_collares_estado ON collares(estado);
CREATE INDEX IF NOT EXISTS idx_collares_tenant_id ON collares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_collares_lote_id ON collares(lote_id);
CREATE INDEX IF NOT EXISTS idx_historial_collares_collar_id ON historial_collares(collar_id);
