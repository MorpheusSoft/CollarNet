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
        ledcWrite(BUZZER_CHANNEL, 128); // 50% ciclo de trabajo activo (onda cuadrada)
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

    // Inicializar canal de control LEDC PWM nativo de ESP32 a 4000 Hz (Resonancia de IO5)
    ledcSetup(BUZZER_CHANNEL, 4000, 8);
    ledcAttachPin(BUZZER_PIN, BUZZER_CHANNEL);
    ledcWrite(BUZZER_CHANNEL, 0);

    if (IMPULSE_LED_PIN >= 0) {
        pinMode(IMPULSE_LED_PIN, OUTPUT);
        digitalWrite(IMPULSE_LED_PIN, LOW);
    }

    Serial.println("[Alerts] Sistema de alertas físicas inicializado (Buzzer IO5 a 4000 Hz).");
    Serial.println("[Alerts] Ejecutando pitido de confirmación en IO5 a 4000 Hz...");

    // Doble pitido de confirmación al arrancar
    playBuzzerTone(4000);
    delay(200);
    playBuzzerTone(0);
    delay(100);
    playBuzzerTone(4000);
    delay(200);
    playBuzzerTone(0);

    Serial.println("[Alerts] ¡Buzzer en IO5 listo y probado con éxito!");
}

void updateAlerts(AlertLevel level, double distToBorder, double warningMargin) {
    if (level != currentAlert) {
        currentAlert = level;
        alertStateStartTime = millis();
        lastToggleTime = 0;
        ledState = false;
    }
    
    // Silenciado instantáneo y reseteo completo al retornar a Zona Segura (ALERT_NONE)
    if (currentAlert == ALERT_NONE) {
        if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, LOW);
        if (IMPULSE_LED_PIN >= 0) digitalWrite(IMPULSE_LED_PIN, LOW);
        playBuzzerTone(0);
        buzzerActive = false;
        alertStateStartTime = 0;
        lastToggleTime = 0;
        ledState = false;
        return;
    }

    unsigned long currentMillis = millis();
    bool buzzerTimedOut = (currentMillis - alertStateStartTime >= BUZZER_TIMEOUT_MS);

    // MODO CRÍTICO HATO: ESCAPE MAYOR DE LA FINCA (Sonido continuo a máxima potencia con timeout de 60s)
    if (currentAlert == ALERT_CRITICAL_HATO) {
        if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, HIGH);
        if (IMPULSE_LED_PIN >= 0) digitalWrite(IMPULSE_LED_PIN, LOW);
        if (!buzzerTimedOut) {
            playBuzzerTone(4000); // 4000 Hz continuo
            buzzerActive = true;
        } else {
            playBuzzerTone(0);
            buzzerActive = false;
        }
        return;
    }

    // MODOS INTERMITENTES: WARNING (Progresivo por cercanía) o DANGER (Escape de Potrero a alta frecuencia)
    unsigned long toggleInterval = 400;
    unsigned int toneFrequency = 4000;

    switch (currentAlert) {
        case ALERT_WARNING: {
            // Pitido PROGRESIVO: más rápido a menor distancia del límite
            double margin = (warningMargin > 0.0) ? warningMargin : 10.0;
            double clampedDist = (distToBorder < 0.0) ? 0.0 : ((distToBorder > margin) ? margin : distToBorder);
            double ratio = clampedDist / margin; // 1.0 (en el borde de advertencia) a 0.0 (justo en la cerca)
            
            // Intervalo de alternancia: de 800ms (lento a 10m) a 100ms (rápido en la cerca)
            toggleInterval = 100 + (unsigned long)(ratio * 700.0);
            toneFrequency = 4000;
            break;
        }
        case ALERT_DANGER:
            // ESCAPE DE POTRERO: Alta frecuencia máxima (80ms ON / 80ms OFF)
            toggleInterval = 80;
            toneFrequency = 4000;
            break;
        default:
            if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, LOW);
            if (IMPULSE_LED_PIN >= 0) digitalWrite(IMPULSE_LED_PIN, LOW);
            playBuzzerTone(0);
            buzzerActive = false;
            return;
    }

    // Asegurar que el pin de impulso eléctrico permanezca apagado (modo 100% acústico)
    if (IMPULSE_LED_PIN >= 0) {
        digitalWrite(IMPULSE_LED_PIN, LOW);
    }

    if (currentMillis - lastToggleTime >= toggleInterval) {
        lastToggleTime = currentMillis;
        ledState = !ledState;
        if (STATUS_LED_PIN >= 0) digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
        
        if (ledState && !buzzerTimedOut) {
            playBuzzerTone(toneFrequency);
            buzzerActive = true;
        } else {
            if (buzzerActive) {
                playBuzzerTone(0);
                buzzerActive = false;
            }
        }
    }
}
