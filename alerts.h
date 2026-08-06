#ifndef ALERTS_H
#define ALERTS_H

enum AlertLevel {
    ALERT_NONE = 0,
    ALERT_WARNING, // Cerca virtual cercana (advertencia)
    ALERT_DANGER   // Cerca virtual cruzada (peligro)
};

void initAlerts();
void updateAlerts(AlertLevel level);

#endif // ALERTS_H
