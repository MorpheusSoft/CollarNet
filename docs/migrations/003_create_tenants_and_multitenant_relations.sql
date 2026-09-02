-- ==========================================================================
-- SCRIPT DE MIGRACIÓN 003 - COLLARNET
-- Módulo Multi-Tenant (Adquirentes / Empresas Ganaderas / Clientes SaaS)
-- ==========================================================================

-- 1. Crear tabla de Adquirentes (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    identificacion_fiscal VARCHAR(50) UNIQUE NOT NULL, -- RIF / RUT / NIT / CIF
    contacto_nombre VARCHAR(120),
    telefono VARCHAR(30),
    email VARCHAR(120) UNIQUE NOT NULL,
    direccion TEXT,
    plan_suscripcion VARCHAR(50) DEFAULT 'PRO' CHECK (plan_suscripcion IN ('STARTER', 'PRO', 'ENTERPRISE')),
    limite_collares INTEGER DEFAULT 100,
    limite_hatos INTEGER DEFAULT 10,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_rif ON tenants (identificacion_fiscal);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants (email);

-- 2. Insertar Adquirentes semilla iniciales si no existen
INSERT INTO tenants (id, nombre, identificacion_fiscal, contacto_nombre, telefono, email, direccion, plan_suscripcion, limite_collares, limite_hatos)
VALUES 
(1, 'Agropecuaria El Palmar C.A.', 'J-12345678-0', 'Carlos Mendoza', '+58 412 1112233', 'contacto@elpalmar.com', 'Calabozo, Edo. Guárico', 'ENTERPRISE', 250, 15),
(2, 'Ganadera del Sur S.A.', 'J-87654321-9', 'Roberto Da Silva', '+58 414 9988776', 'info@ganaderadelsur.com', 'Maturín, Edo. Monagas', 'PRO', 100, 5)
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    identificacion_fiscal = EXCLUDED.identificacion_fiscal;

-- Ajustar la secuencia de ID de tenants
SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants));

-- 3. Vincular Hatos al Adquirente (Tenant)
ALTER TABLE hatos ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE hatos SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 4. Vincular Collares al Adquirente (Tenant)
ALTER TABLE collares ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;
UPDATE collares SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 5. Vincular Usuarios al Adquirente (Tenant)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;
-- SuperAdmin queda con tenant_id NULL (acceso global) o asignado, y Gerente/Operario con tenant 1
UPDATE usuarios SET tenant_id = 1 WHERE rol != 'SUPERADMIN' AND tenant_id IS NULL;

-- 6. Vincular Animales al Adquirente (Tenant)
ALTER TABLE animales ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE animales SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 7. Crear índices para optimizar consultas multi-tenant
CREATE INDEX IF NOT EXISTS idx_hatos_tenant ON hatos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_collares_tenant ON collares (tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios (tenant_id);
CREATE INDEX IF NOT EXISTS idx_animales_tenant ON animales (tenant_id);
CREATE INDEX IF NOT EXISTS idx_animales_propietario ON animales (propietario_id);
