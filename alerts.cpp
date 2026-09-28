#include "alerts.h"
#include "config.h"

AlertLevel currentAlert = ALERT_NONE;
unsigned long lastToggleTime = 0;
bool ledState = false;
static bool buzzerActive = false;
static unsigned long alertStateStartTime = 0;
const unsigned long BUZZER_TIMEOUT_MS = 60000; // 1 minuto de protección acústica

// Control de pulso único de descarga electrostática (1 segundo)
static bool dischargeTriggered = false;
static unsigned long dischargeStartTime = 0;
const unsigned long DISCHARGE_DURATION_MS = 1000; // 1 segundo exacto de estímulo disuasorio

const int BUZZER_CHANNEL = 0;

void playBuzzerTone(unsigned int freq, uint8_t dutyCycle = 128) {
    if (freq > 0) {
        ledcWriteTone(BUZZER_CHANNEL, freq);
        ledcWrite(BUZZER_CHANNEL, dutyCycle); // Modulación de volumen / intensidad acústica PWM
    } else {
        ledcWriteTone(BUZZER_CHANNEL, 0);
        ledcWrite(BUZZER_CHANNEL, 0);   // Silencio total
    }
}

void initAlerts() {
    if (STATUS_LED_PIN >= 0) {
        pinMode(STATUS_LED_PIN, OUTPUT);
        digitalWrite(STATUS_LED_PIN, LOW);
    }
    
    // Configurar pin del Buzzer en IO5 con máxima fuerza de corriente (40 mA)
    pinMode(BUZZER_PIN, OUTPUT);
    gpio_set_drive_capability((gpio_num_t)BUZZER_PIN, GPIO_DRIVE_CAP_3);

    // Inicializar canal de control LEDC PWM nativo de ESP32 a 4000 Hz
    ledcSetup(BUZZER_CHANNEL, 4000, 8);
    ledcAttachPin(BUZZER_PIN, BUZZER_CHANNEL);
    ledcWrite(BUZZER_CHANNEL, 0);

    if (IMPULSE_PIN >= 0) {
        pinMode(IMPULSE_PIN, OUTPUT);
        digitalWrite(IMPULSE_PIN, LOW);
    }

    Serial.println("[Alerts] Sistema de alertas inicializado (Buzzer IO5 a 4000 Hz | Impulso IO23).");
    Serial.println("[Alerts] Ejecutando pitido de confirmación en IO5 a 4000 Hz...");

    // Doble pitido de confirmación al arrancar
    playBuzzerTone(4000, 128);
    delay(200);
    playBuzzerTone(0, 0);
    delay(100);
    playBuzzerTone(4000, 128);
    delay(200);
    playBuzzerTone(0, 0);

    Serial.println("[Alerts] ¡Buzzer en IO5 e Impulso en IO23 listos!");
}

void updateAlerts(AlertLevel level, double distToBorder, double warningMargin, bool isHatoAlert) {
    if (level != currentAlert) {
        currentAlert = level;
        alertStateStartTime = millis();
        lastToggleTime = 0;
        ledState = false;
    }
    
    // Silenciado instantáneo, corte de descarga y rearme de descarga al retornar a Zona Segura (ALERT_NONE)
    if (currentAlert == ALERT_NONE) {
        if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, LOW);
        if (IMPULSE_PIN >= 0) digitalWrite(IMPULSE_PIN, LOW);
        playBuzzerTone(0, 0);
        buzzerActive = false;
        alertStateStartTime = 0;
        lastToggleTime = 0;
        ledState = false;
        dischargeTriggered = false; // Rearmar la descarga para el próximo escape
        dischargeStartTime = 0;
        return;
    }

    unsigned long currentMillis = millis();
    bool buzzerTimedOut = (currentMillis - alertStateStartTime >= BUZZER_TIMEOUT_MS);

    // MODO CRÍTICO HATO: ESCAPE MAYOR DE LA FINCA (Tono continuo 4000Hz + Descarga ÚNICA de 1 segundo)
    if (currentAlert == ALERT_CRITICAL_HATO) {
        if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, HIGH);
        
        // Disparar la descarga única de 1 segundo por primera y única vez al cruzar el Hato
        if (!dischargeTriggered) {
            dischargeTriggered = true;
            dischargeStartTime = currentMillis;
            if (IMPULSE_PIN >= 0) {
                digitalWrite(IMPULSE_PIN, HIGH);
            }
            Serial.println("[Alerts] ⚡ ¡DISPARO DE DESCARGA ÚNICA (1s) POR ESCAPE DE HATO!");
        } else {
            // Si ya transcurrió 1 segundo (1000ms), apagar el pin de descarga inmediatamente
            if (currentMillis - dischargeStartTime >= DISCHARGE_DURATION_MS) {
                if (IMPULSE_PIN >= 0) {
                    digitalWrite(IMPULSE_PIN, LOW);
                }
            } else {
                // Aún dentro del segundo de descarga
                if (IMPULSE_PIN >= 0) {
                    digitalWrite(IMPULSE_PIN, HIGH);
                }
            }
        }

        // Tono continuo simultáneo a máxima potencia con timeout de seguridad de 60s
        if (!buzzerTimedOut) {
            playBuzzerTone(4000, 128); // 4000 Hz continuo a volumen máximo (128 duty cycle)
            buzzerActive = true;
        } else {
            playBuzzerTone(0, 0);
            buzzerActive = false;
        }
        return;
    }

    // Si no está en ALERT_CRITICAL_HATO, asegurar que el pin de descarga esté apagado
    if (IMPULSE_PIN >= 0) {
        digitalWrite(IMPULSE_PIN, LOW);
    }
    // Rearmar la descarga si regresa al interior del Hato (a Warning o Danger)
    if (currentAlert != ALERT_CRITICAL_HATO) {
        dischargeTriggered = false;
    }

    // MODOS INTERMITENTES: WARNING (Hato o Potrero) o DANGER (Escape de Potrero)
    unsigned long toggleInterval = 400;
    unsigned int toneFrequency = 4000;
    uint8_t toneDutyCycle = 128;

    switch (currentAlert) {
        case ALERT_WARNING: {
            double margin = (warningMargin > 0.0) ? warningMargin : 10.0;
            double clampedDist = (distToBorder < 0.0) ? 0.0 : ((distToBorder > margin) ? margin : distToBorder);
            double ratio = clampedDist / margin; // 1.0 (en el borde de advertencia) a 0.0 (justo en la cerca)

            if (isHatoAlert) {
                // HATO: Pitido con CADENCIA FIJA (300ms) aumentando el VOLUMEN PWM a menor distancia
                toggleInterval = 300; // Cadencia constante fija (300ms ON / 300ms OFF)
                toneFrequency = 4000;
                // Modulación de volumen: de ~25 (suave al borde) a 128 (máxima potencia en la cerca)
                toneDutyCycle = 128 - (uint8_t)(ratio * 103.0);
            } else {
                // POTRERO: Pitido PROGRESIVO por cadencia de alternancia (800ms a 100ms) a volumen estándar
                toggleInterval = 100 + (unsigned long)(ratio * 700.0);
                toneFrequency = 4000;
                toneDutyCycle = 128;
            }
            break;
        }
        case ALERT_DANGER:
            // ESCAPE DE POTRERO: Alta frecuencia máxima (80ms ON / 80ms OFF), 100% acústico sin descarga
            toggleInterval = 80;
            toneFrequency = 4000;
            toneDutyCycle = 128;
            break;
        default:
            if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, LOW);
            playBuzzerTone(0, 0);
            buzzerActive = false;
            return;
    }

    if (currentMillis - lastToggleTime >= toggleInterval) {
        lastToggleTime = currentMillis;
        ledState = !ledState;
        if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
        
        if (ledState && !buzzerTimedOut) {
            playBuzzerTone(toneFrequency, toneDutyCycle);
            buzzerActive = true;
        } else {
            if (buzzerActive) {
                playBuzzerTone(0, 0);
                buzzerActive = false;
            }
        }
    }
}
