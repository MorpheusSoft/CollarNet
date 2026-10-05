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
        ledcWrite(BUZZER_CHANNEL, 0);
        ledcWriteTone(BUZZER_CHANNEL, 0);
        pinMode(BUZZER_PIN, OUTPUT);
        digitalWrite(BUZZER_PIN, LOW);   // Silencio total forzado a 0V
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

static double lastDistToBorder = 0.0;
static double lastWarningMargin = 10.0;
static bool lastIsHatoAlert = false;

void updateAlerts(AlertLevel level, double distToBorder, double warningMargin, int isHatoAlert) {
    if (level != currentAlert) {
        currentAlert = level;
        alertStateStartTime = millis();
        lastToggleTime = 0;
        ledState = false;
    }
    
    // Solo actualizar variables de contexto si provienen de una evaluación explícita (valores >= 0)
    if (distToBorder >= 0.0) {
        lastDistToBorder = distToBorder;
    }
    if (warningMargin > 0.0) {
        lastWarningMargin = warningMargin;
    }
    if (isHatoAlert >= 0) {
        lastIsHatoAlert = (isHatoAlert == 1);
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
        lastDistToBorder = 0.0;
        lastIsHatoAlert = false;
        return;
    }

    unsigned long currentMillis = millis();
    bool buzzerTimedOut = (currentMillis - alertStateStartTime >= BUZZER_TIMEOUT_MS);

    double effDist = lastDistToBorder;
    double effMargin = (lastWarningMargin > 0.0) ? lastWarningMargin : 3.0;
    bool effIsHato = lastIsHatoAlert;

    // 1. MODO CRÍTICO HATO: ESCAPE MAYOR DE LA FINCA (Tono continuo 4000Hz a máxima potencia + Descarga ÚNICA de 1 segundo)
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

    // 2. ADVERTENCIA PREVENTIVA DE HATO (Cruzando margen de cercanía exterior):
    // Pitido fijo continuo con modulación de volumen según proximidad
    if (currentAlert == ALERT_WARNING && effIsHato) {
        if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, HIGH);
        
        double clampedDist = (effDist < 0.0) ? 0.0 : ((effDist > effMargin) ? effMargin : effDist);
        double ratio = clampedDist / effMargin; // 1.0 (en el borde exterior) a 0.0 (en la cerca)
        // Modulación de volumen: de ~25 (suave al borde) a 128 (máxima fuerza acústica en la cerca)
        uint8_t toneDutyCycle = 128 - (uint8_t)(ratio * 103.0);

        if (!buzzerTimedOut) {
            playBuzzerTone(4000, toneDutyCycle); // Pitido fijo continuo a volumen proporcional
            buzzerActive = true;
        } else {
            playBuzzerTone(0, 0);
            buzzerActive = false;
        }
        return;
    }

    // 3. ADVERTENCIA PREVENTIVA O ESCAPE DE POTRERO:
    // Cadencia intermitente nítida con pulso activo de 120ms y silencios bien audibles
    unsigned long onDuration = 120;  // 120ms de pitido nítido
    unsigned long offDuration = 400; // pausa de silencio
    unsigned int toneFrequency = 4000;
    uint8_t toneDutyCycle = 128;

    if (currentAlert == ALERT_WARNING) {
        // En zona de advertencia del potrero: pitido intermitente progresivo por cadencia
        double clampedDist = (effDist < 0.0) ? 0.0 : ((effDist > effMargin) ? effMargin : effDist);
        double ratio = clampedDist / effMargin; // 1.0 (en el margen exterior) a 0.0 (en la cerca)
        // Pausa entre pitidos: de 1100ms (lento al borde del margen) a 220ms (rápido en la cerca)
        offDuration = 220 + (unsigned long)(ratio * 880.0);
    } else if (currentAlert == ALERT_DANGER) {
        // Fuera del potrero: intermitencia rápida claramente distinguible (120ms BEEP / 200ms SILENCIO)
        offDuration = 200;
    } else {
        if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, LOW);
        playBuzzerTone(0, 0);
        buzzerActive = false;
        return;
    }

    // Máquina de estados asimétrica (pulso ON corto y pausa OFF audible)
    unsigned long stateDuration = ledState ? onDuration : offDuration;
    if (currentMillis - lastToggleTime >= stateDuration) {
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

void triggerRemoteBuzzerBeep(int durationMs, int freq) {
    if (freq <= 0) freq = 4000;
    Serial.printf("[Alerts] >> Disparando zumbador acustico remoto (%d Hz)...\n", freq);
    playBuzzerTone(freq, 128);
    delay(200);
    playBuzzerTone(0, 0);
    delay(100);
    playBuzzerTone(freq, 128);
    delay(200);
    playBuzzerTone(0, 0);
}
