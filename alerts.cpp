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

static double lastDistToBorder = 0.0;
static double lastWarningMargin = 10.0;
static bool lastIsHatoAlert = false;

void updateAlerts(AlertLevel level, double distToBorder, double warningMargin, bool isHatoAlert) {
    if (level != currentAlert) {
        currentAlert = level;
        alertStateStartTime = millis();
        lastToggleTime = 0;
        ledState = false;
    }
    
    // Actualizar parámetros si se proporcionan valores válidos (o recordar los últimos calculados por GNSS)
    if (distToBorder > 0.0 || warningMargin != 10.0 || isHatoAlert) {
        lastDistToBorder = distToBorder;
        lastWarningMargin = (warningMargin > 0.0) ? warningMargin : 10.0;
        lastIsHatoAlert = isHatoAlert;
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

    double effDist = (distToBorder > 0.0) ? distToBorder : lastDistToBorder;
    double effMargin = (warningMargin > 0.0) ? warningMargin : lastWarningMargin;
    bool effIsHato = isHatoAlert || lastIsHatoAlert;

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
    // El usuario pidió: "cuando llegue y cruce el margen del hato, debe es hacer un pitido fijo(como el que ya trae),
    // y entre mas se acerque al limite mas fuerte debe sonar el pitido" (Pitido fijo continuo, modulando volumen)
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
    // El usuario pidió: "cuando se acerque llegue y pase el margen que empiece a pitar pero intermitentemente,
    // entre mas se acerque al limite del potrero, debe sonar con mas frecuencias... y en ambos casos la alarma
    // debe estar sonando durante un minuto se salga o no del limite al menos que se salga del margen regresando al potrero"
    unsigned long toggleInterval = 400;
    unsigned int toneFrequency = 4000;
    uint8_t toneDutyCycle = 128;

    if (currentAlert == ALERT_WARNING) {
        // En zona de advertencia del potrero: pitido intermitente progresivo por cadencia
        double clampedDist = (effDist < 0.0) ? 0.0 : ((effDist > effMargin) ? effMargin : effDist);
        double ratio = clampedDist / effMargin; // 1.0 (al borde del margen) a 0.0 (en la cerca)
        // Intervalo de alternancia: de 800ms (lento a 10m) a 100ms (rápido en la cerca)
        toggleInterval = 100 + (unsigned long)(ratio * 700.0);
    } else if (currentAlert == ALERT_DANGER) {
        // Fuera del potrero: intermitencia rápida de máxima frecuencia (80ms ON / 80ms OFF)
        toggleInterval = 80;
    } else {
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
