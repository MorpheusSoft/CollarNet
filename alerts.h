#ifndef ALERTS_H
#define ALERTS_H

enum AlertLevel {
    ALERT_NONE = 0,         // Zona segura (silencio total)
    ALERT_WARNING = 1,      // Advertencia preventiva (<3m del lindero activo)
    ALERT_DANGER = 2,       // Fuera de potrero asignado (infracción rotación)
    ALERT_CRITICAL_HATO = 3 // Límite o fuera de HATO (escape mayor: ¡tono continuo más fuerte!)
};

void initAlerts();
void updateAlerts(AlertLevel level);

#endif // ALERTS_H
