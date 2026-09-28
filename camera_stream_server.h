#pragma once

#include <Arduino.h>
#include "esp_http_server.h"

class CameraStreamServer {
public:
    CameraStreamServer();
    bool begin(uint16_t port = 81);
    void stop();
    bool isRunning() const { return httpdHandle != nullptr; }

private:
    httpd_handle_t httpdHandle;
    uint16_t serverPort;
};

extern CameraStreamServer camStreamServer;
