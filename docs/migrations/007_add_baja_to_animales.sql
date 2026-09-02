-- ==========================================================
-- Migración 007: Soporte para Estado Activo y Bajas de Animales
-- ==========================================================

ALTER TABLE animales ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE animales ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(50);
ALTER TABLE animales ADD COLUMN IF NOT EXISTS fecha_baja TIMESTAMP;
ALTER TABLE animales ADD COLUMN IF NOT EXISTS notas_baja TEXT;

CREATE INDEX IF NOT EXISTS idx_animales_activo ON animales (activo);
