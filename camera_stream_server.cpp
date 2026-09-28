#include "camera_stream_server.h"
#include "camera_manager.h"
#include <sys/time.h>

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\nX-Timestamp: %ld.%06ld\r\n\r\n";

CameraStreamServer camStreamServer;

CameraStreamServer::CameraStreamServer() : httpdHandle(nullptr), serverPort(81) {}

static esp_err_t stream_handler(httpd_req_t *req) {
    cameraMgr.registerViewer();
    struct timeval _timestamp;
    esp_err_t res = ESP_OK;
    const uint8_t *_jpg_buf = NULL;
    size_t _jpg_buf_len = 0;
    uint32_t frameId = 0, lastSentFrameId = 0;
    char part_buf[192];

    res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
    if (res != ESP_OK) {
        cameraMgr.unregisterViewer();
        return res;
    }

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "X-Framerate", "30");

    while (true) {
        if (!cameraMgr.getBroadcastFrame(_jpg_buf, _jpg_buf_len, frameId, _timestamp)) {
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }

        // Si ya enviamos este fotograma específico a este cliente, esperamos el siguiente
        if (frameId == lastSentFrameId) {
            vTaskDelay(pdMS_TO_TICKS(8));
            continue;
        }

        lastSentFrameId = frameId;

        size_t hlen = snprintf(part_buf, sizeof(part_buf), 
                              "\r\n--" PART_BOUNDARY "\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\nX-Timestamp: %ld.%06ld\r\n\r\n", 
                              _jpg_buf_len, (long)_timestamp.tv_sec, (long)_timestamp.tv_usec);

        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, part_buf, hlen);
        }
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        }

        if (res != ESP_OK) {
            break;
        }

        vTaskDelay(pdMS_TO_TICKS(10));
    }

    cameraMgr.unregisterViewer();
    return res;
}


bool CameraStreamServer::begin(uint16_t port) {
    serverPort = port;
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = serverPort;
    config.ctrl_port = serverPort + 1;
    config.max_open_sockets = 7; // Soporte para múltiples dispositivos a la vez
    config.lru_purge_enable = true; // Liberar automáticamente sockets antiguos/inactivos para evitar bloqueos
    config.recv_wait_timeout = 10;  // 10 segundos de tolerancia para micro-pausas Wi-Fi
    config.send_wait_timeout = 10;
    config.task_priority = 5;
    config.stack_size = 4096;

    httpd_uri_t stream_uri = {
        .uri       = "/stream",
        .method    = HTTP_GET,
        .handler   = stream_handler,
        .user_ctx  = NULL
    };

    if (httpd_start(&httpdHandle, &config) == ESP_OK) {
        httpd_register_uri_handler(httpdHandle, &stream_uri);
        Serial.printf("[CAM-SERVER] Servidor multicliente listo en puerto :%d/stream\n", serverPort);
        return true;
    }

    Serial.println("[CAM-SERVER] Error al iniciar servidor httpd.");
    httpdHandle = nullptr;
    return false;
}

void CameraStreamServer::stop() {
    if (httpdHandle != nullptr) {
        httpd_stop(httpdHandle);
        httpdHandle = nullptr;
    }
}
