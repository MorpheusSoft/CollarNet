# Diccionario de Datos - Plataforma CollarNet

Este documento detalla la estructura y el diseño de la base de datos relacional y geográfica de **CollarNet**, la cual utiliza **PostgreSQL** con la extensión espacial **PostGIS** para la gestión de geocercas virtuales autónomas. El sistema de referencia espacial utilizado es el **WGS 84 (SRID 4326)**, correspondiente al estándar internacional de coordenadas GPS (Latitud/Longitud).

---

## 🗺️ Resumen de Tablas y Relaciones

El esquema se divide en tres áreas funcionales:
1. **Infraestructura Geográfica**: Propiedades globales (`hatos`) y subdivisiones internas (`potreros`).
2. **Inventario e Identificación**: Ganado (`animales`), dispositivos IoT (`collares`) y sus dueños (`propietarios`).
3. **Métricas y Eventos Históricos**: Ubicaciones (`telemetria`), registro de peso (`registro_pesajes`), bitácora de traspaso de dueños (`historial_propietarios`) y registro de incidencias (`alertas`).

---

## 🗂️ Detalle de Tablas

### 1. Tabla: `propietarios`
Almacena la información de los dueños del ganado. Permite gestionar ganadería propia o en régimen de alquiler de tierras (talaje).

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único del propietario. |
| `nombre` | `VARCHAR(150)` | `NOT NULL` | Nombre completo o razón social del dueño. |
| `documento_identidad` | `VARCHAR(30)` | `NOT NULL`, `UNIQUE` | Cédula, RUT, DNI o número fiscal. |
| `telefono` | `VARCHAR(20)` | `NULL` | Teléfono de contacto. |
| `correo` | `VARCHAR(100)` | `NULL` | Correo electrónico de contacto. |
| `creado_en` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha y hora de registro en el sistema. |

---

### 2. Tabla: `hatos`
Representa el límite global de la propiedad o finca. Es la barrera de seguridad de máxima prioridad.

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único del hato. |
| `nombre` | `VARCHAR(100)` | `NOT NULL` | Nombre de la finca o propiedad (ej: "Hato El Viento"). |
| `perimetro` | `GEOMETRY(Polygon, 4326)` | `NOT NULL` | Polígono espacial PostGIS que representa el perímetro de seguridad. |
| `creado_en` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de creación del registro. |

---

### 3. Tabla: `potreros`
Subdivisiones internas del hato utilizadas para la rotación de alimentación y pastoreo del ganado.

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único del potrero. |
| `hato_id` | `INTEGER` | `FOREIGN KEY` references `hatos(id)` | Identificador del hato al que pertenece el potrero (Relación 1:N). |
| `nombre` | `VARCHAR(100)` | `NOT NULL` | Nombre del potrero (ej: "Potrero A - Alfalfa"). |
| `perimetro` | `GEOMETRY(Polygon, 4326)` | `NOT NULL` | Polígono espacial PostGIS interno donde debe permanecer el animal. |
| `capacidad_max_cabezas`| `INTEGER` | `DEFAULT 50` | Límite sugerido de animales para evitar sobrepastoreo. |
| `creado_en` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de creación del registro. |

---

### 4. Tabla: `collares`
Registro del hardware físico (dispositivos IoT basados en ESP32).

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(50)` | `PRIMARY KEY` | Identificador de hardware físico (ej: Dirección MAC del ESP32). |
| `numero_sim` | `VARCHAR(20)` | `NOT NULL`, `UNIQUE` | Número telefónico de la tarjeta SIM del collar para conectividad GPRS. |
| `nivel_bateria` | `INTEGER` | `CHECK (0-100)` | Porcentaje actual de batería reportado por telemetría. |
| `senal_celular` | `INTEGER` | `CHECK (0-5)` | Intensidad de señal móvil (0 = Sin señal, 5 = Excelente). |
| `ultima_ubicacion` | `GEOMETRY(Point, 4326)` | `NULL` | Última coordenada GPS (lat/lon) conocida. Almacenada aquí para visualización instantánea en el mapa en tiempo real sin consultar el historial completo de telemetría. |
| `ultima_conexion` | `TIMESTAMP` | `NULL` | Fecha y hora exacta de la última transmisión de datos. |
| `fecha_instalacion` | `DATE` | `NOT NULL` | Fecha en la que el collar se colocó por primera vez. |
| `creado_en` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de alta del dispositivo en la plataforma. |

---

### 5. Tabla: `animales`
Ficha técnica de la res. Vincula el ganado con los collares y sus respectivos propietarios.

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador interno único de la res. |
| `collar_id` | `VARCHAR(50)` | `UNIQUE`, `FOREIGN KEY` references `collares(id)` | ID del collar asignado. Puede ser nulo si el animal no tiene collar activo. |
| `propietario_id` | `INTEGER` | `FOREIGN KEY` references `propietarios(id)` | Dueño actual del animal (Relación 1:N). |
| `potrero_id` | `INTEGER` | `FOREIGN KEY` references `potreros(id)` | Potrero asignado para pastoreo activo (se usa para control de alertas de rotación). |
| `arete_visual` | `VARCHAR(20)` | `NOT NULL`, `UNIQUE` | Código visible de la chapa plástica/metálica en la oreja del animal. |
| `raza` | `VARCHAR(50)` | `NULL` | Raza del animal (ej: Nelore, Brahman, Angus, Brangus). |
| `categoria` | `VARCHAR(30)` | `CHECK` (Toro, Vaca, Novillo, Ternero, Vaquillona) | Categoría productiva del animal. |
| `fecha_nacimiento` | `DATE` | `NOT NULL` | Fecha de nacimiento (se usa para calcular la edad exacta dinámicamente). |
| `creado_en` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de alta en el sistema. |

---

### 6. Tabla: `registro_pesajes`
Historial de pesajes de cada animal. Permite analizar el ritmo de crecimiento e incremento de valor.

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único de la medición de peso. |
| `animal_id` | `INTEGER` | `FOREIGN KEY` references `animales(id)` | Identificador del animal pesado (Relación 1:N). |
| `peso` | `NUMERIC(6, 2)` | `NOT NULL` | Peso en kilogramos registrado en báscula. |
| `fecha_pesaje` | `DATE` | `DEFAULT CURRENT_DATE` | Fecha física en que se realizó la pesada. |
| `creado_en` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha de registro en el software. |

---

### 7. Tabla: `historial_propietarios`
Bitácora de auditoría financiera y operativa de cambios de dueño (ventas, traspasos o herencias).

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único de la transferencia. |
| `animal_id` | `INTEGER` | `FOREIGN KEY` references `animales(id)` | Identificador del animal transferido. |
| `propietario_anterior_id`| `INTEGER` | `FOREIGN KEY` references `propietarios(id)`| Dueño que cede o vende la propiedad. |
| `propietario_nuevo_id` | `INTEGER` | `FOREIGN KEY` references `propietarios(id)`| Dueño que recibe o compra la propiedad. |
| `fecha_transferencia` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha y hora en que se oficializó el cambio. |
| `tipo_traspaso` | `VARCHAR(30)` | `CHECK` (VENTA, HERENCIA, TRASPASO_INTERNO) | Razón de la transferencia. |
| `precio_venta` | `NUMERIC(10, 2)` | `DEFAULT 0.00` | Monto de la transacción (útil para análisis de costo/beneficio). |

---

### 8. Tabla: `telemetria`
Historial de geolocalización y telemetría de red enviado por los collares. **Nota**: En producción, esta tabla debe particionarse mensualmente por `fecha_hora` debido a su alto volumen de datos.

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Identificador de 64 bits único para la trama de telemetría. |
| `animal_id` | `INTEGER` | `FOREIGN KEY` references `animales(id)` | Identificador del animal emisor. |
| `ubicacion` | `GEOMETRY(Point, 4326)` | `NOT NULL` | Coordenada GPS registrada por el módulo NEO-6M. |
| `bateria` | `INTEGER` | `NOT NULL` | Porcentaje de batería en el instante del reporte. |
| `senal` | `INTEGER` | `NOT NULL` | Intensidad de la señal celular (0 a 5) reportada. |
| `fecha_hora` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Marca temporal del evento. |

---

### 9. Tabla: `alertas`
Historial e incidentes activos generados por violaciones de geocerca o fallas del hardware.

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único de la alerta. |
| `animal_id` | `INTEGER` | `FOREIGN KEY` references `animales(id)` | Identificador del animal infractor. |
| `tipo` | `VARCHAR(30)` | `CHECK` (ESCAPE_HATO, INFRACCION_ROTACION, BATERIA_BAJA) | Clasificación de la alerta por severidad. |
| `estado` | `VARCHAR(20)` | `DEFAULT 'ACTIVO'`, `CHECK` (ACTIVO, RESUELTO) | Estado del evento. |
| `fecha_inicio` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Fecha y hora en que se detectó la infracción. |
| `fecha_fin` | `TIMESTAMP` | `NULL` | Fecha y hora en que el animal regresó al perímetro o el usuario resolvió la alerta. |
| `coordenada_evento` | `GEOMETRY(Point, 4326)` | `NULL` | Coordenada exacta donde se disparó la alerta. |

---

### 10. Tabla: `parametros_rendimiento`
Valores de referencia zootécnica y de mercado para estimar y proyectar la rentabilidad del ganado por raza y categoría.

| Campo | Tipo de Dato | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Identificador único de la configuración. |
| `raza` | `VARCHAR(50)` | `NOT NULL` | Nombre de la raza de referencia. |
| `categoria` | `VARCHAR(30)` | `NOT NULL` | Categoría (ej: Vaca, Toro, Novillo). |
| `gdp_promedio` | `NUMERIC(4, 3)` | `NOT NULL` | Ganancia Diaria de Peso de referencia (en kg/día). |
| `peso_adulto_esperado` | `NUMERIC(6, 2)` | `NOT NULL` | Peso estimado al llegar a la madurez biológica. |
| `costo_diario_manutencion`| `NUMERIC(6, 2)` | `NOT NULL` | Costo diario de alimentar y vigilar este tipo de animal en $. |
| `precio_mercado_por_kg` | `NUMERIC(6, 2)` | `NOT NULL` | Valor de mercado actual de la carne en pie por kilogramo en $. |

**Nota de Integridad**: La combinación de `(raza, categoria)` es única en esta tabla.

---

## ⚡ Índices Espaciales y de Rendimiento

Para asegurar que las consultas espaciales (como determinar escapes) y las búsquedas históricas se realicen de manera casi instantánea en un entorno web en vivo, se definen los siguientes índices:

```sql
-- 1. Índices Geográficos (GIST)
CREATE INDEX idx_hatos_perimetro ON hatos USING GIST (perimetro);
CREATE INDEX idx_potreros_perimetro ON potreros USING GIST (perimetro);
CREATE INDEX idx_telemetria_ubicacion ON telemetria USING GIST (ubicacion);
CREATE INDEX idx_collares_ultima_ubicacion ON collares USING GIST (ultima_ubicacion);

-- 2. Índices de Rendimiento Relacional (B-Tree)
CREATE INDEX idx_animales_collar ON animales (collar_id);
CREATE INDEX idx_animales_propietario ON animales (propietario_id);
CREATE INDEX idx_telemetria_animal_fecha ON telemetria (animal_id, fecha_hora DESC);
CREATE INDEX idx_alertas_estado_tipo ON alertas (estado, tipo);
```
