-- ==========================================
-- SCRIPT DE MIGRACIÓN 001 - COLLARNET
-- Agregar nuevos campos a potreros, collares y animales
-- ==========================================

-- 1. Tabla potreros: margen_advertencia_metros (en metros)
ALTER TABLE potreros 
ADD COLUMN IF NOT EXISTS margen_advertencia_metros NUMERIC(5, 2) DEFAULT 10.00;

-- 2. Tabla collares: version_firmware
ALTER TABLE collares 
ADD COLUMN IF NOT EXISTS version_firmware VARCHAR(30) DEFAULT '1.0.0';

-- 3. Tabla animales: sexo, foto_url, numero_hierro, madre_id, padre_id
ALTER TABLE animales 
ADD COLUMN IF NOT EXISTS sexo VARCHAR(10) CHECK (sexo IN ('Macho', 'Hembra')),
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS numero_hierro VARCHAR(50),
ADD COLUMN IF NOT EXISTS madre_id INTEGER REFERENCES animales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS padre_id INTEGER REFERENCES animales(id) ON DELETE SET NULL;
