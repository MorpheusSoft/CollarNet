#ifndef ALERTS_H
#define ALERTS_H

enum AlertLevel {
    ALERT_NONE = 0,         // Zona segura (silencio total)
    ALERT_WARNING = 1,      // Advertencia preventiva (Margen de Hato o Potrero)
    ALERT_DANGER = 2,       // Fuera de potrero asignado (infracción rotación - 100% acústico)
    ALERT_CRITICAL_HATO = 3 // Fuera de HATO (Escape mayor finca: tono continuo + descarga de 1s)
};

void initAlerts();
void startAlertTask();
void updateAlerts(AlertLevel level, double distToBorder = -1.0, double warningMargin = -1.0, int isHatoAlert = -1);
void triggerRemoteBuzzerBeep(int durationMs = 800, int freq = 4000);

#endif // ALERTS_H
