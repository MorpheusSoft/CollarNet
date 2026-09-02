-- ==========================================
-- SCRIPT DE MIGRACIÓN 002 - COLLARNET
-- Módulo de Usuarios, Autenticación y Control de Roles
-- ==========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'SUPERADMIN' CHECK (rol IN ('SUPERADMIN', 'ADMIN_FINCA', 'OPERARIO_CAMPO', 'VETERINARIO')),
    finca_asignada VARCHAR(150) DEFAULT 'Hato Principal San Juan',
    activo BOOLEAN DEFAULT TRUE,
    ultimo_ingreso TIMESTAMP,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);
