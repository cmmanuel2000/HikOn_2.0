/* =============== HikOn: Mic-Only Audio Classifier =============== */
/* Hardware: ESP32-S3 SuperMini
   Sensors: 
   - INMP441 (I2S) - Microphone Only
   
   Audio Inference: Cloud-based via Vercel API → Hugging Face
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <driver/i2s.h>
#include <esp_heap_caps.h>

/* =============== WiFi & Cloud Configuration =============== */
const char* WIFI_SSID = "SKYfiberE4F1";
const char* WIFI_PASSWORD = "260005234";
const char* SUPABASE_URL = "https://ogapdrgcwmzecbwwrmre.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYXBkcmdjd216ZWNid3dybXJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM0MjE3MCwiZXhwIjoyMDczOTE4MTcwfQ.7L9zpymxD0nGE6pqk_d6Zs_GqrcBJwNUekUFBdYHLlo";

/* =============== Cloud API Globals =============== */
const char* VERCEL_API_URL = "https://hik-on-2-0.vercel.app/api/analyze-audio";

/* =============== Pin Definitions (ESP32-S3 SuperMini) =============== */
// I2S Microphone (INMP441)
#define I2S_WS 13
#define I2S_SD 11
#define I2S_SCK 12
#define I2S_PORT I2S_NUM_0

/* =============== Constants & Timing =============== */
#define SAMPLE_RATE 16000
#define RECORD_TIME_SEC 3
#define SAMPLES (SAMPLE_RATE * RECORD_TIME_SEC)

// Monitoring interval (milliseconds)
const unsigned long MONITORING_INTERVAL_MS = 10000UL; // 10 seconds

/* =============== Global Instances =============== */
WiFiClientSecure wifiClient;
HTTPClient http;
static int16_t *audio_buffer = NULL;

/* =============== Audio Capture & Cloud Inference =============== */
String captureAndClassifyAudio() {
  if (!audio_buffer) return "normal";
  Serial.println("[Audio] Capturing 1-second sample...");
  
  size_t bytes_read = 0;
  int32_t sample_buffer[256];
  int16_t *ptr = audio_buffer;
  int samples_collected = 0;

  while (samples_collected < SAMPLES) {
    int to_read = (SAMPLES - samples_collected > 256) ? 256 : SAMPLES - samples_collected;
    i2s_read(I2S_PORT, sample_buffer, to_read * 4, &bytes_read, portMAX_DELAY);
    int read_count = bytes_read / 4;
    for (int j = 0; j < read_count; j++) {
      *ptr++ = (int16_t)(sample_buffer[j] >> 14);
    }
    samples_collected += read_count;
  }
  
  float rms = 0;
  for (int i = 0; i < SAMPLES; i++) rms += (float)audio_buffer[i] * audio_buffer[i];
  rms = sqrt(rms / SAMPLES);
  Serial.printf("[Audio] RMS Energy: %.2f\n", rms);
  
  if (rms < 100) { Serial.println("[Audio] Too quiet - skipping"); return "normal"; }
  if (WiFi.status() != WL_CONNECTED) { Serial.println("[Audio] No WiFi - skipping"); return "normal"; }
  
  // Build JSON payload
  size_t json_size = 120000;
  char* json_payload = (char*)heap_caps_malloc(json_size, MALLOC_CAP_SPIRAM);
  if (!json_payload) { Serial.println("[Audio] ✗ Payload alloc failed"); return "normal"; }
  
  strcpy(json_payload, "{\"device_id\":\"hikon_s3_mic_only\",\"data\":[");
  int offset = strlen(json_payload);
  float scale = 127.0f / 32768.0f;
  for (int i = 0; i < SAMPLES; i++) {
    int8_t val = (int8_t)(audio_buffer[i] * scale);
    offset += sprintf(json_payload + offset, "%d", val);
    if (i < SAMPLES - 1) json_payload[offset++] = ',';
  }
  strcpy(json_payload + offset, "]}");
  
  Serial.println("[Audio] Sending to cloud for inference...");
  http.begin(wifiClient, VERCEL_API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(25000);
  
  int code = http.POST(json_payload);
  heap_caps_free(json_payload);
  
  String pred = "normal";
  if (code == 200 || code == 201) {
    DynamicJsonDocument d(1024);
    deserializeJson(d, http.getString());
    int cough = d["inference"]["cough"] | 0;
    int wheeze = d["inference"]["wheeze"] | 0;
    bool gemini_verified = d["gemini_verified"] | false;
    const char* gemini_error = d["gemini_error"] | "";

    if (cough == 1) pred = "cough";
    else if (wheeze == 1) pred = "wheeze";

    Serial.printf("[Audio] Result: %s (Check: %s)\n", pred.c_str(), gemini_verified ? "GEMINI VERIFIED" : "HF-ONLY");
    if (strlen(gemini_error) > 0) Serial.printf("[Audio] ! Gemini Error: %s\n", gemini_error);
  } else {
    Serial.printf("[Audio] ✗ Cloud inference failed (HTTP %d)\n", code);
    if (code > 0) {
      String errBody = http.getString();
      Serial.println("[Audio] " + errBody);
    }
  }
  http.end();
  return pred;
}

/* =============== Supabase Upload =============== */
void uploadStatus(const String &label) {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String(SUPABASE_URL) + "/rest/v1/s3_sensor_data?on_conflict=device_id";
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http.addHeader("Prefer", "resolution=merge-duplicates");
  
  DynamicJsonDocument j(512);
  j["device_id"] = "hikon_s3_v1_status";
  j["heart_rate"] = (char*)NULL;
  j["spo2"] = (char*)NULL;
  j["prediction_label"] = label;
  j["risk_level"] = (label == "normal") ? "safe" : "medium";
  j["cough"] = (label == "cough") ? 1 : 0;
  j["wheeze"] = (label == "wheeze") ? 1 : 0;
  
  String payload; serializeJson(j, payload);
  http.POST(payload);
  http.end();
}

/* =============== Setup & Loop =============== */
void setup() {
  Serial.begin(115200); delay(1000);
  Serial.println("\n[HikOn] Initializing Mic-Only System...");
  
  audio_buffer = (int16_t *)heap_caps_malloc(SAMPLES * sizeof(int16_t), MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Connected");
  wifiClient.setInsecure();

  i2s_config_t i2s_cfg = { .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX), .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT, .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S, .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4, .dma_buf_len = 512, .use_apll = false, .tx_desc_auto_clear = false, .fixed_mclk = 0 };
  i2s_pin_config_t i2s_pins = { .bck_io_num = I2S_SCK, .ws_io_num = I2S_WS, .data_out_num = I2S_PIN_NO_CHANGE, .data_in_num = I2S_SD };
  i2s_driver_install(I2S_PORT, &i2s_cfg, 0, NULL);
  i2s_set_pin(I2S_PORT, &i2s_pins);
  
  Serial.println("[System] Ready\n");
}

void loop() {
  String label = captureAndClassifyAudio();
  uploadStatus(label);
  delay(MONITORING_INTERVAL_MS);
}
