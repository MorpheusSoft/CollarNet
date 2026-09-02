-- ==============================================================================
-- Migración 005: Adición de relación Propietario en Usuarios y Rol PROPIETARIO
-- Fecha: 31-Agosto-2026
-- Descripción:
--   Agrega la columna 'propietario_id' en la tabla 'usuarios'.
--   Actualiza la restricción CHECK de roles para admitir 'PROPIETARIO'.
--   Permite a los dueños/inversionistas acceder a su portal de reses multi-finca.
-- ==============================================================================

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS propietario_id INT REFERENCES propietarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_propietario ON usuarios(propietario_id);

-- Actualizar restricción CHECK de roles
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('SUPERADMIN', 'ADMIN_FINCA', 'OPERARIO_CAMPO', 'VETERINARIO', 'PROPIETARIO'));

-- Crear o actualizar usuario demo para Propietario (password: prop123)
INSERT INTO usuarios (nombre, email, password_hash, rol, finca_asignada, tenant_id, propietario_id)
VALUES (
  'Don Fernando Álvarez (Inversionista)', 
  'propietario@collarnet.com', 
  'aef0dc48dbc9221abfdc5fbcf68c40b866937a308da3cab65b0ab5ede9c75a1d',
  'PROPIETARIO', 
  'Multi-Finca', 
  1, 
  1
)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  rol = 'PROPIETARIO',
  propietario_id = 1;
