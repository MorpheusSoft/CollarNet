-- ==========================================================
-- Migración 009: Módulos de Notificaciones Multicanal y Salud/Rumia IMU
-- Plataforma CowIA (2026)
-- ==========================================================

-- 1. Configuración de Canales de Notificación por Tenant
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

-- 2. Bitácora de Notificaciones Enviadas
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

-- 3. Métricas de Salud, Actividad y Rumia (IMU MPU-6050)
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

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_bitacora_notif_tenant ON bitacora_notificaciones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_notif_fecha ON bitacora_notificaciones (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_salud_rumia_animal_fecha ON metricas_actividad_rumia (animal_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_salud_rumia_collar ON metricas_actividad_rumia (collar_id);

-- Semilla de configuración por defecto para tenant 1 (si no existe)
INSERT INTO configuracion_notificaciones (tenant_id, canal_telegram_activo, canal_whatsapp_activo, canal_email_activo, alerta_escape_geocerca, alerta_bateria_critica, alerta_collar_offline, alerta_celo_detectado)
VALUES (1, FALSE, FALSE, FALSE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (tenant_id) DO NOTHING;

-- Semilla de datos sintéticos de actividad y rumia para los animales existentes (últimas 24 horas)
DO $$
DECLARE
    rec RECORD;
    h INT;
    p_pastoreo INT;
    p_rumia INT;
    p_descanso INT;
    p_caminata INT;
BEGIN
    FOR rec IN SELECT id, collar_id FROM animales WHERE collar_id IS NOT NULL LOOP
        FOR h IN 0..23 LOOP
            -- Generar patrones circadianos realistas
            IF h BETWEEN 6 AND 10 OR h BETWEEN 16 AND 18 THEN
                -- Horas pico de pastoreo
                p_pastoreo := 35 + floor(random() * 15);
                p_rumia := 10 + floor(random() * 8);
                p_caminata := 8 + floor(random() * 5);
                p_descanso := 60 - (p_pastoreo + p_rumia + p_caminata);
            ELSIF h BETWEEN 11 AND 15 THEN
                -- Horas de calor / siesta y rumia a la sombra
                p_pastoreo := 5 + floor(random() * 8);
                p_rumia := 30 + floor(random() * 15);
                p_descanso := 15 + floor(random() * 10);
                p_caminata := 60 - (p_pastoreo + p_rumia + p_descanso);
            ELSE
                -- Noche / Descanso y rumia nocturna
                p_pastoreo := 2 + floor(random() * 5);
                p_rumia := 25 + floor(random() * 15);
                p_descanso := 25 + floor(random() * 10);
                p_caminata := 60 - (p_pastoreo + p_rumia + p_descanso);
            END IF;

            INSERT INTO metricas_actividad_rumia (
                animal_id, collar_id, fecha, hora_bloque, 
                minutos_pastoreo, minutos_rumia, minutos_descanso, minutos_caminata, 
                indice_actividad_promedio, alerta_celo, alerta_letargo
            )
            VALUES (
                rec.id, rec.collar_id, CURRENT_DATE, h,
                p_pastoreo, p_rumia, p_descanso, p_caminata,
                ROUND((1.0 + (p_pastoreo + p_caminata * 2)::NUMERIC / 40.0)::NUMERIC, 2),
                FALSE, FALSE
            )
            ON CONFLICT (animal_id, fecha, hora_bloque) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
