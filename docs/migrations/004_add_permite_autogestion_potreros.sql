-- ==============================================================================
-- Migración 004: Adición de bandera de autogestión de potreros en tabla tenants
-- Fecha: 31-Agosto-2026
-- Descripción:
--   Agrega la columna 'permite_crear_potreros' en la tabla 'tenants'.
--   - Hatos: Exclusivo de SuperAdmin (CollarNet) para control de licencias y perímetros de contingencia.
--   - Potreros: Permitido para Admin de Finca si 'permite_crear_potreros' es TRUE.
-- ==============================================================================

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS permite_crear_potreros BOOLEAN DEFAULT TRUE;

-- Asegurar que todos los tenants existentes tengan activa la autogestión de potreros por defecto
UPDATE tenants SET permite_crear_potreros = TRUE WHERE permite_crear_potreros IS NULL;
