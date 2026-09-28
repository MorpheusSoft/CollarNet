#pragma once

#include <Arduino.h>
#include "esp_camera.h"

// ============================================================================
// CONFIGURACIÓN DE PINES DE CÁMARA PARA WAVESHARE ESP32-S3 SIM7670G V2
// ============================================================================
#define CAM_PIN_PWDN    -1
#define CAM_PIN_RESET   -1
#define CAM_PIN_XCLK    39
#define CAM_PIN_SIOD    15  // SCCB Data (I2C SDA)
#define CAM_PIN_SIOC    16  // SCCB Clock (I2C SCL)

#define CAM_PIN_D9      14
#define CAM_PIN_D8      13
#define CAM_PIN_D7      12
#define CAM_PIN_D6      11
#define CAM_PIN_D5      10
#define CAM_PIN_D4      9
#define CAM_PIN_D3      8
#define CAM_PIN_D2      7

#define CAM_PIN_VSYNC   42
#define CAM_PIN_HREF    41
#define CAM_PIN_PCLK    46

class CameraManager {
public:
    CameraManager();
    bool begin();
    bool isReady() const { return initialized; }
    
    // Motor multicliente: permite a múltiples dispositivos (Laptop + Teléfonos) recibir el video a la vez
    bool getBroadcastFrame(const uint8_t* &outBuf, size_t &outLen, uint32_t &outFrameId, struct timeval &outTimestamp);

    camera_fb_t* getFrame();
    void returnFrame(camera_fb_t* fb);

    bool setResolution(framesize_t frameSize);
    bool setQuality(int quality); // 10 a 63 (menor = mayor calidad)
    bool setBrightness(int level); // -2 a 2
    bool setContrast(int level); // -2 a 2

    String getSensorModel() const;
    framesize_t getCurrentResolution() const { return currentResolution; }
    int getCurrentQuality() const { return currentQuality; }
    String getResolutionName(framesize_t frameSize) const;
    void getResolutionDimensions(framesize_t frameSize, int &width, int &height) const;
    framesize_t parseResolution(const String& str) const;

    int getActiveViewers() const { return activeViewers; }
    void registerViewer() { activeViewers++; }
    void unregisterViewer() { if (activeViewers > 0) activeViewers--; }

private:
    bool initialized;
    framesize_t currentResolution;
    int currentQuality;
    volatile int activeViewers;

    // Buffer compartido en PSRAM para multi-transmisión simultánea
    uint8_t* sharedFrameBuf;
    size_t sharedFrameLen;
    size_t sharedFrameCapacity;
    uint32_t sharedFrameId;
    struct timeval sharedTimestamp;
    unsigned long lastCaptureMillis;
    SemaphoreHandle_t broadcastMutex;
};

extern CameraManager cameraMgr;
