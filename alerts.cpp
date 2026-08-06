#include "alerts.h"
#include "config.h"

AlertLevel currentAlert = ALERT_NONE;
unsigned long lastToggleTime = 0;
bool ledState = false;
static bool buzzerActive = false;
static unsigned long alertStateStartTime = 0;
const unsigned long BUZZER_TIMEOUT_MS = 60000; // 1 minuto de protección

const int BUZZER_CHANNEL = 0;

void playBuzzerTone(unsigned int freq) {
    if (freq > 0) {
        ledcWriteTone(BUZZER_CHANNEL, freq);
        ledcWrite(BUZZER_CHANNEL, 128); // 50% ciclo de trabajo activo
        digitalWrite(BUZZER_PIN, HIGH);
    } else {
        ledcWriteTone(BUZZER_CHANNEL, 0);
        ledcWrite(BUZZER_CHANNEL, 0);   // 0% ciclo de trabajo (APAGADO ABSOLUTO)
        digitalWrite(BUZZER_PIN, LOW);
    }
}

void initAlerts() {
    pinMode(STATUS_LED_PIN, OUTPUT);
    digitalWrite(STATUS_LED_PIN, LOW);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(IMPULSE_LED_PIN, OUTPUT);
    digitalWrite(IMPULSE_LED_PIN, LOW);

    // Inicializar canal de control LEDC PWM nativo de ESP32
    ledcSetup(BUZZER_CHANNEL, 2000, 8);
    ledcAttachPin(BUZZER_PIN, BUZZER_CHANNEL);

    Serial.println("[Alerts] Sistema de alertas físicas inicializado (LED D2 / Buzzer D4 / Impulso LED D23).");
    Serial.println("[Alerts] Ejecutando PRUEBA DE HARDWARE en Buzzer (D4) e Impulso (D23)...");

    // Tono 1: 2000Hz (Advertencia)
    digitalWrite(STATUS_LED_PIN, HIGH);
    playBuzzerTone(2000);
    delay(400);
    playBuzzerTone(0);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(150);

    // Tono 2 + Impulso LED D23: 2700Hz (Peligro/Estímulo)
    digitalWrite(STATUS_LED_PIN, HIGH);
    digitalWrite(IMPULSE_LED_PIN, HIGH);
    playBuzzerTone(2700);
    delay(400);
    playBuzzerTone(0);
    digitalWrite(IMPULSE_LED_PIN, LOW);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(150);

    // Tono 3: 3500Hz (Confirmación de prueba)
    digitalWrite(STATUS_LED_PIN, HIGH);
    playBuzzerTone(3500);
    delay(500);
    playBuzzerTone(0);
    digitalWrite(STATUS_LED_PIN, LOW);

    Serial.println("[Alerts] ¡PRUEBA DE HARDWARE FINALIZADA CON ÉXITO!");
}

void updateAlerts(AlertLevel level) {
    if (level != currentAlert) {
        currentAlert = level;
        alertStateStartTime = millis();
        lastToggleTime = 0;
        ledState = false;
    }
    
    // Silenciado instantáneo y reseteo completo al retornar a Zona Segura (ALERT_NONE)
    if (currentAlert == ALERT_NONE) {
        digitalWrite(STATUS_LED_PIN, LOW);
        digitalWrite(IMPULSE_LED_PIN, LOW);
        playBuzzerTone(0);
        buzzerActive = false;
        alertStateStartTime = 0;
        lastToggleTime = 0;
        ledState = false;
        return;
    }

    unsigned long currentMillis = millis();
    unsigned long toggleInterval = 0;
    unsigned int toneFrequency = 0;

    switch (currentAlert) {
        case ALERT_WARNING:
            toggleInterval = 500; // Parpadeo 1Hz
            toneFrequency = 2000; // 2000Hz
            break;
        case ALERT_DANGER:
            toggleInterval = 100; // Parpadeo 5Hz
            toneFrequency = 2700; // 2700Hz
            break;
        default:
            digitalWrite(STATUS_LED_PIN, LOW);
            digitalWrite(IMPULSE_LED_PIN, LOW);
            playBuzzerTone(0);
            buzzerActive = false;
            return;
    }

    bool buzzerTimedOut = (currentMillis - alertStateStartTime >= BUZZER_TIMEOUT_MS);

    if (currentMillis - lastToggleTime >= toggleInterval) {
        lastToggleTime = currentMillis;
        ledState = !ledState;
        digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
        
        // Activar ráfagas de impulso eléctrico (LED D23) ÚNICAMENTE en ALERT_DANGER (Infracción de cerco)
        if (currentAlert == ALERT_DANGER && !buzzerTimedOut) {
            digitalWrite(IMPULSE_LED_PIN, ledState ? HIGH : LOW);
        } else {
            digitalWrite(IMPULSE_LED_PIN, LOW);
        }
        
        if (ledState && !buzzerTimedOut) {
            playBuzzerTone(toneFrequency);
            buzzerActive = true;
        } else {
            if (buzzerActive) {
                playBuzzerTone(0);
                buzzerActive = false;
            }
        }
        
        if (ledState) {
            if (buzzerTimedOut) {
                static unsigned long lastTimeoutPrint = 0;
                if (currentMillis - lastTimeoutPrint >= 5000) {
                    lastTimeoutPrint = currentMillis;
                    Serial.printf("[Alerts] Alerta Nivel %d - Buzzer SILENCIADO por protección de 1 minuto.\n", currentAlert);
                }
            } else if (currentAlert == ALERT_DANGER) {
                Serial.println("[BEEP!] Alerta Peligro: Estímulo activo");
            } else if (currentAlert == ALERT_WARNING) {
                Serial.println("[beep...] Advertencia: Cerca virtual aproximándose");
            }
        }
    }
}
