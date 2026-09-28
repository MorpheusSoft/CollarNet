#include "camera_manager.h"

CameraManager cameraMgr;

CameraManager::CameraManager() 
    : initialized(false), 
      currentResolution(FRAMESIZE_VGA), 
      currentQuality(12),
      activeViewers(0),
      sharedFrameBuf(nullptr),
      sharedFrameLen(0),
      sharedFrameCapacity(400 * 1024),
      sharedFrameId(0),
      lastCaptureMillis(0),
      broadcastMutex(nullptr) {
    sharedTimestamp = {0, 0};
}

bool CameraManager::begin() {
    Serial.println("[CAM] Inicializando interfaz de cámara DVP 24-pines...");

    if (broadcastMutex == nullptr) {
        broadcastMutex = xSemaphoreCreateMutex();
    }

    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = CAM_PIN_D2;
    config.pin_d1 = CAM_PIN_D3;
    config.pin_d2 = CAM_PIN_D4;
    config.pin_d3 = CAM_PIN_D5;
    config.pin_d4 = CAM_PIN_D6;
    config.pin_d5 = CAM_PIN_D7;
    config.pin_d6 = CAM_PIN_D8;
    config.pin_d7 = CAM_PIN_D9;
    config.pin_xclk = CAM_PIN_XCLK;
    config.pin_pclk = CAM_PIN_PCLK;
    config.pin_vsync = CAM_PIN_VSYNC;
    config.pin_href = CAM_PIN_HREF;
    config.pin_sccb_sda = CAM_PIN_SIOD;
    config.pin_sccb_scl = CAM_PIN_SIOC;
    config.pin_pwdn = CAM_PIN_PWDN;
    config.pin_reset = CAM_PIN_RESET;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    config.grab_mode = CAMERA_GRAB_LATEST;

    // Con PSRAM (Waveshare ESP32-S3 cuenta con 8MB Octal PSRAM)
    if (psramFound()) {
        Serial.println("[CAM] PSRAM detectada (8MB): reservando buffers para soportar hasta HD/UXGA.");
        config.frame_size = FRAMESIZE_UXGA; // Reservar buffer máximo para permitir cambios dinámicos a HD/UXGA
        config.jpeg_quality = 12;
        config.fb_count = 2;
        config.fb_location = CAMERA_FB_IN_PSRAM;

        sharedFrameCapacity = 400 * 1024; // 400 KB en PSRAM para multi-broadcast
        if (sharedFrameBuf == nullptr) {
            sharedFrameBuf = (uint8_t*)ps_malloc(sharedFrameCapacity);
        }
    } else {
        Serial.println("[CAM] PSRAM no detectada: usando modo estándar.");
        config.frame_size = FRAMESIZE_SVGA;
        config.jpeg_quality = 15;
        config.fb_count = 1;
        config.fb_location = CAMERA_FB_IN_DRAM;

        sharedFrameCapacity = 64 * 1024;
        if (sharedFrameBuf == nullptr) {
            sharedFrameBuf = (uint8_t*)malloc(sharedFrameCapacity);
        }
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[CAM] AVISO: Cámara no detectada o error al inicializar: 0x%x\n", err);
        Serial.println("[CAM] Recuerda que el microinterruptor DIP 'CAM' en la placa debe estar en 'ON'.");
        initialized = false;
        return false;
    }

    sensor_t* s = esp_camera_sensor_get();
    if (s != nullptr) {
        s->set_vflip(s, 0);
        s->set_hmirror(s, 0);
        s->set_brightness(s, 1);
        s->set_saturation(s, 0);
        // Establecer la resolución de inicio en VGA (640x480)
        s->set_framesize(s, FRAMESIZE_VGA);
    }

    initialized = true;
    currentResolution = FRAMESIZE_VGA;
    currentQuality = config.jpeg_quality;
    Serial.printf("[CAM] Cámara lista! Modelo detectado: %s | Hub multi-dispositivo activo (PSRAM)\n", 
                  getSensorModel().c_str());
    return true;
}

bool CameraManager::getBroadcastFrame(const uint8_t* &outBuf, size_t &outLen, uint32_t &outFrameId, struct timeval &outTimestamp) {
    if (!initialized || sharedFrameBuf == nullptr || broadcastMutex == nullptr) return false;

    if (xSemaphoreTake(broadcastMutex, pdMS_TO_TICKS(40)) != pdTRUE) {
        if (sharedFrameLen > 0) {
            outBuf = sharedFrameBuf;
            outLen = sharedFrameLen;
            outFrameId = sharedFrameId;
            outTimestamp = sharedTimestamp;
            return true;
        }
        return false;
    }

    unsigned long now = millis();
    // Capturar nuevo frame si pasaron al menos 15ms (~35 FPS) o si no hay ninguno
    if (now - lastCaptureMillis >= 15 || sharedFrameLen == 0) {
        camera_fb_t* fb = esp_camera_fb_get();
        if (fb != nullptr) {
            if (fb->len <= sharedFrameCapacity) {
                memcpy(sharedFrameBuf, fb->buf, fb->len);
                sharedFrameLen = fb->len;
                sharedFrameId++;
                sharedTimestamp = fb->timestamp;
                lastCaptureMillis = now;
            }
            esp_camera_fb_return(fb);
        }
    }

    if (sharedFrameLen > 0) {
        outBuf = sharedFrameBuf;
        outLen = sharedFrameLen;
        outFrameId = sharedFrameId;
        outTimestamp = sharedTimestamp;
        xSemaphoreGive(broadcastMutex);
        return true;
    }

    xSemaphoreGive(broadcastMutex);
    return false;
}


camera_fb_t* CameraManager::getFrame() {
    if (!initialized) return nullptr;
    return esp_camera_fb_get();
}

void CameraManager::returnFrame(camera_fb_t* fb) {
    if (fb != nullptr) {
        esp_camera_fb_return(fb);
    }
}

String CameraManager::getSensorModel() const {
    if (!initialized) return "No detectada";
    sensor_t* s = esp_camera_sensor_get();
    if (s == nullptr) return "Desconocido";
    switch (s->id.PID) {
        case OV2640_PID: return "OmniVision OV2640";
        case OV3660_PID: return "OmniVision OV3660";
        case OV5640_PID: return "OmniVision OV5640";
        case OV7670_PID: return "OmniVision OV7670";
        case OV7725_PID: return "OmniVision OV7725";
        default: return "Sensor OV compatible";
    }
}

bool CameraManager::setResolution(framesize_t frameSize) {
    if (!initialized) return false;
    sensor_t* s = esp_camera_sensor_get();
    if (s == nullptr) return false;
    
    // Proteger contra colisiones de DMA y streaming activo en FreeRTOS
    if (broadcastMutex != nullptr) {
        xSemaphoreTake(broadcastMutex, pdMS_TO_TICKS(500));
    }

    sharedFrameLen = 0; // Descartar cualquier frame previo del tamaño anterior
    int ret = s->set_framesize(s, frameSize);
    
    // Dar un breve tiempo al sensor para estabilizar el reloj interno y la matriz de píxeles
    vTaskDelay(pdMS_TO_TICKS(60));

    if (broadcastMutex != nullptr) {
        xSemaphoreGive(broadcastMutex);
    }

    if (ret == 0) {
        currentResolution = frameSize;
        Serial.printf("[CAM] Resolución cambiada exitosamente a: %s (Enum %d)\n", 
                      getResolutionName(frameSize).c_str(), (int)frameSize);
        return true;
    } else {
        Serial.printf("[CAM] Error al aplicar resolución enum %d en sensor (código: %d)\n", (int)frameSize, ret);
        return false;
    }
}

String CameraManager::getResolutionName(framesize_t frameSize) const {
    switch (frameSize) {
        case FRAMESIZE_QVGA: return "QVGA (320x240)";
        case FRAMESIZE_CIF:  return "CIF (400x296)";
        case FRAMESIZE_HVGA: return "HVGA (480x320)";
        case FRAMESIZE_VGA:  return "VGA (640x480)";
        case FRAMESIZE_SVGA: return "SVGA (800x600)";
        case FRAMESIZE_XGA:  return "XGA (1024x768)";
        case FRAMESIZE_HD:   return "HD 720p (1280x720)";
        case FRAMESIZE_SXGA: return "SXGA (1280x1024)";
        case FRAMESIZE_UXGA: return "UXGA (1600x1200)";
        default:             return "Personalizada (" + String((int)frameSize) + ")";
    }
}

void CameraManager::getResolutionDimensions(framesize_t frameSize, int &width, int &height) const {
    switch (frameSize) {
        case FRAMESIZE_QVGA: width = 320; height = 240; break;
        case FRAMESIZE_CIF:  width = 400; height = 296; break;
        case FRAMESIZE_HVGA: width = 480; height = 320; break;
        case FRAMESIZE_VGA:  width = 640; height = 480; break;
        case FRAMESIZE_SVGA: width = 800; height = 600; break;
        case FRAMESIZE_XGA:  width = 1024; height = 768; break;
        case FRAMESIZE_HD:   width = 1280; height = 720; break;
        case FRAMESIZE_SXGA: width = 1280; height = 1024; break;
        case FRAMESIZE_UXGA: width = 1600; height = 1200; break;
        default:             width = 640; height = 480; break;
    }
}

framesize_t CameraManager::parseResolution(const String& str) const {
    String s = str;
    s.trim();
    s.toLowerCase();
    
    if (s == "qvga" || s == "320x240" || s == "320") return FRAMESIZE_QVGA; // 5
    if (s == "cif" || s == "400x296") return FRAMESIZE_CIF;                 // 6
    if (s == "hvga" || s == "480x320") return FRAMESIZE_HVGA;               // 7
    if (s == "vga" || s == "640x480" || s == "640") return FRAMESIZE_VGA;   // 8
    if (s == "svga" || s == "800x600" || s == "800") return FRAMESIZE_SVGA; // 9
    if (s == "xga" || s == "1024x768" || s == "1024") return FRAMESIZE_XGA; // 10
    if (s == "hd" || s == "720p" || s == "1280x720" || s == "1280") return FRAMESIZE_HD; // 11
    if (s == "sxga" || s == "1280x1024") return FRAMESIZE_SXGA;             // 12
    if (s == "uxga" || s == "1600x1200" || s == "1600") return FRAMESIZE_UXGA; // 13
    
    int val = s.toInt();
    if (val == 5) return FRAMESIZE_QVGA;
    if (val == 6) return FRAMESIZE_CIF;
    if (val == 7) return FRAMESIZE_HVGA;
    if (val == 8) return FRAMESIZE_VGA;
    if (val == 9) return FRAMESIZE_SVGA;
    if (val == 10) return FRAMESIZE_XGA;
    if (val == 11) return FRAMESIZE_HD;
    if (val == 12) return FRAMESIZE_SXGA;
    if (val == 13) return FRAMESIZE_UXGA;
    
    return (framesize_t)val;
}

bool CameraManager::setQuality(int quality) {
    if (!initialized) return false;
    sensor_t* s = esp_camera_sensor_get();
    if (s == nullptr) return false;
    
    if (broadcastMutex != nullptr) {
        xSemaphoreTake(broadcastMutex, pdMS_TO_TICKS(300));
    }
    int ret = s->set_quality(s, quality);
    if (broadcastMutex != nullptr) {
        xSemaphoreGive(broadcastMutex);
    }

    if (ret == 0) {
        currentQuality = quality;
        return true;
    }
    return false;
}

bool CameraManager::setBrightness(int level) {
    if (!initialized) return false;
    sensor_t* s = esp_camera_sensor_get();
    if (s == nullptr) return false;
    return s->set_brightness(s, level) == 0;
}

bool CameraManager::setContrast(int level) {
    if (!initialized) return false;
    sensor_t* s = esp_camera_sensor_get();
    if (s == nullptr) return false;
    return s->set_contrast(s, level) == 0;
}

