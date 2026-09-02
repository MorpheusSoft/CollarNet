-- ==========================================================
-- Migración 008: Módulos de Sanidad, Vacunación y Reproducción
-- Plataforma CowIA (2026)
-- ==========================================================

-- 1. Catálogo de Medicamentos y Vacunas
CREATE TABLE IF NOT EXISTS catalogo_medicamentos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('VACUNA', 'DESPARASITANTE', 'VITAMINA', 'ANTIBIOTICO', 'SUPLEMENTO', 'OTRO')),
    dosis_recomendada VARCHAR(50),
    periodo_revacunacion_dias INTEGER DEFAULT 180,
    costo_unitario_estimado NUMERIC(8, 2) DEFAULT 0.00,
    laboratorio VARCHAR(100),
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Registro de Eventos Sanitarios y Aplicaciones
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
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Registro de Servicios Reproductivos (Monta Natural e Inseminación Artificial)
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
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Registro de Diagnósticos de Gestación y Palpaciones
CREATE TABLE IF NOT EXISTS palpaciones_diagnosticos (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES servicios_reproductivos(id) ON DELETE CASCADE,
    vaca_id INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
    fecha_palpacion DATE NOT NULL DEFAULT CURRENT_DATE,
    resultado VARCHAR(30) NOT NULL CHECK (resultado IN ('PREÑADA', 'VACIA', 'DUDOSA')),
    dias_gestacion_estimados INTEGER DEFAULT 60,
    fecha_estimada_parto DATE,
    veterinario_palpador VARCHAR(100),
    metodo_diagnostico VARCHAR(30) DEFAULT 'PALPACION_RECTAL' CHECK (metodo_diagnostico IN ('PALPACION_RECTAL', 'ECOGRAFIA', 'OBSERVACION_CELO')),
    observaciones TEXT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Registro de Maternidad, Partos y Crías
CREATE TABLE IF NOT EXISTS partos_nacimientos (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES servicios_reproductivos(id) ON DELETE SET NULL,
    vaca_id INTEGER NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
    fecha_parto DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_parto VARCHAR(30) DEFAULT 'NORMAL' CHECK (tipo_parto IN ('NORMAL', 'DISTOCICO_ASISTIDO', 'CESAREA', 'ABORTO')),
    condicion_cria VARCHAR(30) DEFAULT 'VIVA' CHECK (condicion_cria IN ('VIVA', 'MUERTA', 'MELLIZOS_VIVOS')),
    cria_animal_id INTEGER REFERENCES animales(id) ON DELETE SET NULL,
    arete_cria VARCHAR(20),
    sexo_cria VARCHAR(10),
    peso_nacimiento NUMERIC(5, 2),
    veterinario_asistente VARCHAR(100),
    observaciones TEXT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_animal ON eventos_sanitarios (animal_id);
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_proxima_dosis ON eventos_sanitarios (fecha_proxima_dosis);
CREATE INDEX IF NOT EXISTS idx_eventos_sanitarios_tenant ON eventos_sanitarios (tenant_id);

CREATE INDEX IF NOT EXISTS idx_servicios_vaca ON servicios_reproductivos (vaca_id);
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios_reproductivos (estado);
CREATE INDEX IF NOT EXISTS idx_palpaciones_vaca ON palpaciones_diagnosticos (vaca_id);
CREATE INDEX IF NOT EXISTS idx_palpaciones_parto_estimado ON palpaciones_diagnosticos (fecha_estimada_parto);
CREATE INDEX IF NOT EXISTS idx_partos_vaca ON partos_nacimientos (vaca_id);

-- Datos Semilla de Catálogo de Medicamentos y Vacunas Oficiales
INSERT INTO catalogo_medicamentos (nombre, tipo, dosis_recomendada, periodo_revacunacion_dias, costo_unitario_estimado, laboratorio, tenant_id)
VALUES 
('Aftogan - Vacuna Fiebre Aftosa Bivalente', 'VACUNA', '2 ml Subcutánea', 180, 1.50, 'Laboratorios Limor', NULL),
('Rabisin - Vacuna Antirrábica Bovina', 'VACUNA', '2 ml Intramuscular', 365, 2.20, 'Boehringer Ingelheim', NULL),
('Covexin 10 - Vacuna Clostridial Múltiple', 'VACUNA', '5 ml Subcutánea', 365, 1.80, 'Zoetis', NULL),
('Ivermectina 3.15% L.A. - Desparasitante', 'DESPARASITANTE', '1 ml por cada 50 kg', 120, 0.85, 'Bayer Animal Health', NULL),
('Complejo B12 + Fósforo (Catosal)', 'VITAMINA', '10 ml Intramuscular profunda', 90, 3.50, 'Elanco', NULL),
('Oxitocina Sintética 20 UI', 'OTRO', '2 ml Intramuscular post-parto', 0, 1.20, 'Calox International', NULL)
ON CONFLICT DO NOTHING;
