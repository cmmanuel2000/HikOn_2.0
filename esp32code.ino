/* =============== HikOn: Smart AI-Based Wearable for Asthma Detection =============== */
/* Hardware: ESP32-S3 SuperMini
   Sensors: 
   - PMS7003 (UART) - Air Quality
   - INMP441 (I2S) - Audio
   - MAX30102 (I2C) - Heart Rate & SpO2
   - MPU6050 (I2C) - Accelerometer
   - SHT45 (I2C) - Temperature & Humidity
   
   Audio Inference: Cloud-based via Vercel API → Hugging Face
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_SHT4x.h>
#include "MAX30105.h"
#include "heartRate.h"    
#include "MPU6050.h"
#include <driver/i2s.h>
#include <esp_heap_caps.h>
#include <Preferences.h>

// Cloud Inference (Vercel API) - replaces on-device TFLite

/* =============== WiFi & Cloud Configuration =============== */
const char* WIFI_SSID = "SKYfiberE4F1";
const char* WIFI_PASSWORD = "260005234";
const char* SUPABASE_URL = "https://ogapdrgcwmzecbwwrmre.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYXBkcmdjd216ZWNid3dybXJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM0MjE3MCwiZXhwIjoyMDczOTE4MTcwfQ.7L9zpymxD0nGE6pqk_d6Zs_GqrcBJwNUekUFBdYHLlo";

/* =============== Cloud API Globals =============== */
const char* VERCEL_API_URL = "https://hik-on-2-0.vercel.app/api/analyze-audio";

/* =============== Pin Definitions (ESP32-S3 SuperMini) =============== */
#define SDA_PIN 6
#define SCL_PIN 7

// MAX30102 Module (I2C + optional INT)
#define MAX30102_INT_PIN 5

// I2S Microphone (INMP441)
#define I2S_WS 13
#define I2S_SD 11
#define I2S_SCK 12
#define I2S_PORT I2S_NUM_0

// PMS7003 UART Pins 
#define PMS_RX_PIN 44
#define PMS_TX_PIN 43
#define PMS_SET_PIN 1
#define PMS_RESET_PIN 2

/* =============== Constants & Timing =============== */
#define SAMPLE_RATE 16000
#define RECORD_TIME_SEC 3
#define SAMPLES (SAMPLE_RATE * RECORD_TIME_SEC)
#define MAX_BUFFER_SIZE 50

// Adaptive monitoring intervals (milliseconds)
const unsigned long LOW_RISK_MONITOR_MS = 30000UL;     // 30 seconds
const unsigned long MEDIUM_RISK_MONITOR_MS = 15000UL;  // 15 seconds
const unsigned long HIGH_RISK_MONITOR_MS = 5000UL;     // 5 seconds

// Upload intervals
const unsigned long MEDIUM_RISK_UPLOAD_MS = 300000UL;
const unsigned long HEARTBEAT_INTERVAL_MS = 43200000UL;
const unsigned long UPLOAD_RETRY_DELAY_MS = 5000UL;
const unsigned long ACCEL_UPLOAD_INTERVAL_MS = 10000UL;
const char* ACCEL_DEVICE_ID = "hikon_s3_v1_accel_001";
const uint8_t MAX30102_I2C_ADDR = 0x57;
const uint16_t ACCEL_BASELINE_SAMPLES = 200;
const unsigned long ACCEL_MOTION_UPDATE_MS = 250UL;
const int MOTION_WINDOW_SIZE = 20;
const int MOTION_MIN_SAMPLES = 8;
const float MOTION_STDDEV_THRESHOLD = 0.08f;
const float MOTION_PEAK_THRESHOLD = 0.20f;
const unsigned long MOTION_WARNING_COOLDOWN_MS = 5000UL;
const unsigned long DASHBOARD_PROMPT_SYNC_COOLDOWN_MS = 10000UL;
const unsigned long VITALS_AVG_WINDOW_MS = 120000UL;
const int VITALS_WINDOW_MAX_SAMPLES = 24;

/* =============== Sensor Instances =============== */
Adafruit_SHT4x sht4 = Adafruit_SHT4x();
MAX30105 maxSensor;
MPU6050 mpu;
WiFiClientSecure wifiClient;
HTTPClient http;

/* =============== Sensor Connection Status =============== */
bool sht45_connected = false;
bool max30102_connected = false;
bool mpu6050_connected = false;

/* =============== Biometric Tracking =============== */
float current_hr = 0;
float current_spo2 = 0;
long lastBeat = 0;
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;

unsigned long lastSensorCheck = 0;
const unsigned long SENSOR_CHECK_INTERVAL = 3000UL;
int consecutiveLowReadings = 0;
const int LOW_READING_THRESHOLD = 3;
const long MAX30102_FINGER_DETECT_THRESHOLD = 20000;
const long MAX30102_SPO2_THRESHOLD = 25000;
const long MAX30102_LOW_SIGNAL_THRESHOLD = 5000;

uint32_t max30102_last_ir = 0;
uint32_t max30102_last_red = 0;

/* =============== Sensor Data Buffer Structure =============== */
struct SensorReading {
  float hr;
  float spo2;
  float accel;
  float temp;
  float humidity;
  int pm10;
  int pm25;
  int pm100;
  String prediction_label;
  String risk_level;
  int cough;
  int wheeze;
  unsigned long timestamp;
};

struct AccelData {
  float accel_x;
  float accel_y;
  float accel_z;
  float accel_magnitude;
  float gyro_x;
  float gyro_y;
  float gyro_z;
  unsigned long timestamp;
};

struct VitalSample {
  float hr;
  float spo2;
  unsigned long timestamp;
};

/* =============== Audio & Adaptive Monitoring =============== */
static int16_t *audio_buffer = NULL;
SensorReading readingBuffer[MAX_BUFFER_SIZE];
int bufferCount = 0;

String currentRiskLevel = "safe";
String lastRiskLevel = "safe";

unsigned long lastMonitor = 0;
unsigned long lastUpload = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastPMRead = 0;
unsigned long lastAccelUpload = 0;
unsigned long currentMonitorInterval = LOW_RISK_MONITOR_MS;
const unsigned long PM_READ_INTERVAL_MS = 2000UL;
AccelData latestAccelData = {0, 0, 0, 0, 0, 0, 0, 0};
unsigned long lastAccelMotionUpdate = 0;
unsigned long lastMotionWarning = 0;
float accel_motion_window[MOTION_WINDOW_SIZE] = {0};
int accel_motion_index = 0;
int accel_motion_count = 0;
float accel_motion_stddev = 0;
float accel_motion_peak_to_peak = 0;
bool motion_artifact_detected = false;
bool last_dashboard_prompt_active = false;
String last_dashboard_prompt_message = "";
unsigned long lastDashboardPromptSync = 0;
VitalSample vital_history[VITALS_WINDOW_MAX_SAMPLES] = {};
int vital_history_write_index = 0;
int vital_history_count = 0;

SensorReading lastSafeReading = {0, 0, 0, 0, 0, 0, 0, 0, "normal", "safe", 0, 0, 0};

Preferences preferences;
String saved_ssid = "";
String saved_password = "";
unsigned long lastConfigCheck = 0;
const unsigned long CONFIG_CHECK_INTERVAL = 60000UL;
bool wifi_config_changed = false;
bool first_config_fetch_done = false;
bool accel_calibration_command_supported = true;
bool dashboard_prompt_supported = true;

bool accel_baseline_valid = false;
float accel_baseline_x = 0;
float accel_baseline_y = 0;
float accel_baseline_z = 0;
float gyro_baseline_x = 0;
float gyro_baseline_y = 0;
float gyro_baseline_z = 0;

/* =============== PMS7003 Data Structure =============== */
struct pms7003data {
  uint16_t framelen;
  uint16_t pm10_standard;
  uint16_t pm25_standard;
  uint16_t pm100_standard;
  uint16_t pm10_env;
  uint16_t pm25_env;
  uint16_t pm100_env;
  uint16_t particles_03um;
  uint16_t particles_05um;
  uint16_t particles_10um;
  uint16_t particles_25um;
  uint16_t particles_50um;
  uint16_t particles_100um;
  uint16_t unused;
  uint16_t checksum;
};
pms7003data pmsData;

/* =============== PMS7003 Serial Parser =============== */
bool readPMSdata(Stream *s) {
  if (!s->available()) return false;
  if (s->peek() != 0x42) { s->read(); return false; }
  if (s->available() < 32) return false;
  
  uint8_t buffer[32];
  uint16_t sum = 0;
  s->readBytes(buffer, 32);
  if (buffer[0] != 0x42 || buffer[1] != 0x4D) return false;
  for (uint8_t i = 0; i < 30; i++) sum += buffer[i];
  uint16_t checksum = ((uint16_t)buffer[30] << 8) | buffer[31];
  if (sum != checksum) { Serial.println("[PMS] Checksum Error"); return false; }
  
  pmsData.framelen = ((uint16_t)buffer[2] << 8) | buffer[3];
  pmsData.pm10_standard = ((uint16_t)buffer[4] << 8) | buffer[5];
  pmsData.pm25_standard = ((uint16_t)buffer[6] << 8) | buffer[7];
  pmsData.pm100_standard = ((uint16_t)buffer[8] << 8) | buffer[9];
  pmsData.pm10_env = ((uint16_t)buffer[10] << 8) | buffer[11];
  pmsData.pm25_env = ((uint16_t)buffer[12] << 8) | buffer[13];
  pmsData.pm100_env = ((uint16_t)buffer[14] << 8) | buffer[15];
  pmsData.particles_03um = ((uint16_t)buffer[16] << 8) | buffer[17];
  pmsData.particles_05um = ((uint16_t)buffer[18] << 8) | buffer[19];
  pmsData.particles_10um = ((uint16_t)buffer[20] << 8) | buffer[21];
  pmsData.particles_25um = ((uint16_t)buffer[22] << 8) | buffer[23];
  pmsData.particles_50um = ((uint16_t)buffer[24] << 8) | buffer[25];
  pmsData.particles_100um = ((uint16_t)buffer[26] << 8) | buffer[27];
  pmsData.checksum = checksum;
  return true;
}

/* =============== SpO2 Calculation =============== */
void updateSpO2() {
  uint32_t irBuffer[30]; 
  uint32_t redBuffer[30];
  for (byte i = 0; i < 30; i++) {
    unsigned long startWait = millis();
    while (!maxSensor.available()) {
      maxSensor.check();
      if (millis() - startWait > 100) break; 
    }
    irBuffer[i] = maxSensor.getIR();
    redBuffer[i] = maxSensor.getRed();
    maxSensor.nextSample();
  }
  uint32_t irMax = 0, irMin = 0xFFFFFFFF;
  uint32_t redMax = 0, redMin = 0xFFFFFFFF;
  for (byte i = 0; i < 30; i++) {
    if (irBuffer[i] > irMax) irMax = irBuffer[i];
    if (irBuffer[i] < irMin) irMin = irBuffer[i];
    if (redBuffer[i] > redMax) redMax = redBuffer[i];
    if (redBuffer[i] < redMin) redMin = redBuffer[i];
  }
  float f_irAC = (float)(irMax - irMin);
  float f_redAC = (float)(redMax - redMin);
  if (irMin > 0 && f_irAC > 0) {
    float ratio = (f_redAC / (float)redMin) / (f_irAC / (float)irMin);
    float spo2 = -45.060 * ratio * ratio + 30.354 * ratio + 94.845;
    if (spo2 > 100) spo2 = 100;
    if (spo2 < 70)  spo2 = 0; 
    current_spo2 = spo2;
  }
}

/* =============== MAX30102 Module Helpers =============== */
bool isI2CDevicePresent(uint8_t addr) {
  Wire.beginTransmission(addr);
  return Wire.endTransmission() == 0;
}

bool configureMAX30102Sensor() {
  Wire.setClock(100000);
  delay(20);
  if (!isI2CDevicePresent(MAX30102_I2C_ADDR)) {
    Serial.printf("[MAX30102] I2C address 0x%02X not found\n", MAX30102_I2C_ADDR);
    return false;
  }
  bool initialized = false;
  for (int attempt = 1; attempt <= 3; attempt++) {
    if (maxSensor.begin(Wire, I2C_SPEED_STANDARD)) { initialized = true; break; }
    Serial.printf("[MAX30102] begin() failed (attempt %d/3)\n", attempt);
    delay(150);
  }
  if (!initialized) return false;
  maxSensor.setup(0x1F, 4, 2, 400, 411, 4096);
  maxSensor.setPulseAmplitudeRed(0x1F);
  maxSensor.setPulseAmplitudeIR(0x1F);
  for (int i = 0; i < 12; i++) {
    maxSensor.check();
    if (maxSensor.available()) {
      max30102_last_ir = maxSensor.getIR();
      max30102_last_red = maxSensor.getRed();
      maxSensor.nextSample();
    }
    delay(20);
  }
  consecutiveLowReadings = 0;
  return true;
}

bool readLatestMAX30102Sample(long &irOut) {
  if (!max30102_connected) return false;
  maxSensor.check();
  if (MAX30102_INT_PIN >= 0 && digitalRead(MAX30102_INT_PIN) == HIGH && !maxSensor.available()) return false;
  if (!maxSensor.available()) return false;
  max30102_last_ir = maxSensor.getIR();
  max30102_last_red = maxSensor.getRed();
  maxSensor.nextSample();
  irOut = (long)max30102_last_ir;
  return true;
}

bool reinitializeMAX30102() {
  Serial.println("[MAX30102] Low signal - reinitializing...");
  delay(500);
  if (configureMAX30102Sensor()) {
    Serial.println("[MAX30102] Stabilizing...");
    delay(1000);
    Serial.println("[MAX30102] ✓ Reinitialized");
    return true;
  }
  Serial.println("[MAX30102] ✗ Reinitialization failed");
  return false;
}

/* =============== MPU6050 Upload & Sampling =============== */
void uploadAccelToSupabase(const AccelData &data) {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String(SUPABASE_URL) + "/rest/v1/accel_values";
  HTTPClient http_local;
  http_local.begin(wifiClient, url);
  http_local.addHeader("Content-Type", "application/json");
  http_local.addHeader("apikey", SUPABASE_KEY);
  http_local.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http_local.addHeader("Prefer", "return=minimal");
  DynamicJsonDocument json(512);
  json["device_id"] = ACCEL_DEVICE_ID;
  json["accel_x"] = data.accel_x; json["accel_y"] = data.accel_y; json["accel_z"] = data.accel_z;
  json["accel_magnitude"] = data.accel_magnitude;
  json["gyro_x"] = data.gyro_x; json["gyro_y"] = data.gyro_y; json["gyro_z"] = data.gyro_z;
  String payload; serializeJson(json, payload);
  int httpCode = http_local.POST(payload);
  if (httpCode == 201 || httpCode == 200) {
    Serial.printf("[Cloud] Accel upload OK (HTTP %d)\n", httpCode);
  } else {
    Serial.printf("[Cloud] Accel upload failed (HTTP %d)\n", httpCode);
  }
  http_local.end();
}

bool calibrateAccelerometerBaseline(uint16_t sampleCount = ACCEL_BASELINE_SAMPLES) {
  if (!mpu6050_connected) return false;
  Serial.println("[Accel] Calibrating...");
  float sum_ax = 0, sum_ay = 0, sum_az = 0, sum_gx = 0, sum_gy = 0, sum_gz = 0;
  for (uint16_t i = 0; i < sampleCount; i++) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getAcceleration(&ax, &ay, &az); mpu.getRotation(&gx, &gy, &gz);
    sum_ax += (float)ax / 16384.0f; sum_ay += (float)ay / 16384.0f; sum_az += (float)az / 16384.0f;
    sum_gx += (float)gx / 131.0f; sum_gy += (float)gy / 131.0f; sum_gz += (float)gz / 131.0f;
    if (i % 25 == 0) yield();
    delay(8);
  }
  accel_baseline_x = sum_ax / sampleCount; accel_baseline_y = sum_ay / sampleCount; accel_baseline_z = sum_az / sampleCount;
  gyro_baseline_x = sum_gx / sampleCount; gyro_baseline_y = sum_gy / sampleCount; gyro_baseline_z = sum_gz / sampleCount;
  accel_baseline_valid = true;
  Serial.println("[Accel] Calibration complete");
  return true;
}

bool clearAccelCalibrationRequestInSupabase() {
  if (WiFi.status() != WL_CONNECTED) return false;
  String url = String(SUPABASE_URL) + "/rest/v1/device_config?device_id=eq.hikon_s3_v1";
  HTTPClient http_local; http_local.begin(wifiClient, url);
  http_local.addHeader("Content-Type", "application/json");
  http_local.addHeader("apikey", SUPABASE_KEY);
  http_local.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  DynamicJsonDocument payloadDoc(128); payloadDoc["accel_calibrate_request"] = false;
  String payload; serializeJson(payloadDoc, payload);
  int code = http_local.PATCH(payload); http_local.end();
  return (code == 200 || code == 204);
}

void checkAndRunAccelCalibrationFromDashboard() {
  if (!accel_calibration_command_supported || WiFi.status() != WL_CONNECTED) return;
  String url = String(SUPABASE_URL) + "/rest/v1/device_config?device_id=eq.hikon_s3_v1&select=accel_calibrate_request";
  HTTPClient http_local; http_local.begin(wifiClient, url);
  http_local.addHeader("apikey", SUPABASE_KEY);
  http_local.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  int httpCode = http_local.GET();
  if (httpCode != 200) {
    if (httpCode == 400) accel_calibration_command_supported = false;
    http_local.end(); return;
  }
  String response = http_local.getString(); http_local.end();
  DynamicJsonDocument doc(256); deserializeJson(doc, response);
  if (doc.size() > 0 && (doc[0]["accel_calibrate_request"] | false)) {
    calibrateAccelerometerBaseline();
    clearAccelCalibrationRequestInSupabase();
  }
}

void syncDashboardPrompt(bool active, const String &message, unsigned long now) {
  if (!dashboard_prompt_supported || WiFi.status() != WL_CONNECTED) return;
  bool unchanged = (active == last_dashboard_prompt_active) && (message == last_dashboard_prompt_message);
  if (unchanged && (now - lastDashboardPromptSync < DASHBOARD_PROMPT_SYNC_COOLDOWN_MS)) return;
  String url = String(SUPABASE_URL) + "/rest/v1/device_config?device_id=eq.hikon_s3_v1";
  HTTPClient http_local; http_local.begin(wifiClient, url);
  http_local.addHeader("Content-Type", "application/json");
  http_local.addHeader("apikey", SUPABASE_KEY);
  http_local.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  DynamicJsonDocument payloadDoc(384);
  payloadDoc["dashboard_prompt_active"] = active;
  payloadDoc["dashboard_prompt_message"] = active ? message : "";
  String payload; serializeJson(payloadDoc, payload);
  int code = http_local.PATCH(payload); http_local.end();
  if (code == 200 || code == 204) {
    last_dashboard_prompt_active = active;
    last_dashboard_prompt_message = active ? message : "";
    lastDashboardPromptSync = now;
  } else if (code == 400) {
    dashboard_prompt_supported = false;
  }
}

void updateAccelMotionMetrics(float accelMagnitude) {
  accel_motion_window[accel_motion_index] = accelMagnitude;
  accel_motion_index = (accel_motion_index + 1) % MOTION_WINDOW_SIZE;
  if (accel_motion_count < MOTION_WINDOW_SIZE) accel_motion_count++;
  if (accel_motion_count == 0) { accel_motion_stddev = 0; accel_motion_peak_to_peak = 0; return; }
  float sum = 0, minVal = accel_motion_window[0], maxVal = accel_motion_window[0];
  for (int i = 0; i < accel_motion_count; i++) {
    float v = accel_motion_window[i]; sum += v;
    if (v < minVal) minVal = v; if (v > maxVal) maxVal = v;
  }
  float mean = sum / accel_motion_count, variance = 0;
  for (int i = 0; i < accel_motion_count; i++) { float d = accel_motion_window[i] - mean; variance += d * d; }
  accel_motion_stddev = sqrt(variance / accel_motion_count);
  accel_motion_peak_to_peak = maxVal - minVal;
}

AccelData readAccelData(bool verbose);

void updateAccelMotionArtifactState(unsigned long now) {
  if (!mpu6050_connected) { motion_artifact_detected = false; return; }
  if (now - lastAccelMotionUpdate < ACCEL_MOTION_UPDATE_MS) return;
  lastAccelMotionUpdate = now;
  AccelData motionSample = readAccelData(false);
  latestAccelData = motionSample;
  updateAccelMotionMetrics(motionSample.accel_magnitude);
  if (accel_motion_count < MOTION_MIN_SAMPLES) { motion_artifact_detected = false; return; }
  motion_artifact_detected = (accel_motion_stddev >= MOTION_STDDEV_THRESHOLD) ||
                             (accel_motion_peak_to_peak >= MOTION_PEAK_THRESHOLD);
  if (motion_artifact_detected && (now - lastMotionWarning >= MOTION_WARNING_COOLDOWN_MS)) {
    Serial.printf("[Motion] High movement (std=%.3f, p2p=%.3f). HR/SpO2 invalidated.\n", accel_motion_stddev, accel_motion_peak_to_peak);
    lastMotionWarning = now;
  }
}

AccelData readAccelData(bool verbose) {
  AccelData data = {0, 0, 0, 0, 0, 0, 0, millis()};
  if (mpu6050_connected) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getAcceleration(&ax, &ay, &az); mpu.getRotation(&gx, &gy, &gz);
    float raw_ax = (float)ax / 16384.0f, raw_ay = (float)ay / 16384.0f, raw_az = (float)az / 16384.0f;
    float raw_gx = (float)gx / 131.0f, raw_gy = (float)gy / 131.0f, raw_gz = (float)gz / 131.0f;
    if (accel_baseline_valid) {
      data.accel_x = raw_ax - accel_baseline_x; data.accel_y = raw_ay - accel_baseline_y; data.accel_z = raw_az - accel_baseline_z;
      data.gyro_x = raw_gx - gyro_baseline_x; data.gyro_y = raw_gy - gyro_baseline_y; data.gyro_z = raw_gz - gyro_baseline_z;
    } else {
      data.accel_x = raw_ax; data.accel_y = raw_ay; data.accel_z = raw_az;
      data.gyro_x = raw_gx; data.gyro_y = raw_gy; data.gyro_z = raw_gz;
    }
    data.accel_magnitude = sqrt(data.accel_x * data.accel_x + data.accel_y * data.accel_y + data.accel_z * data.accel_z);
    if (verbose) {
      Serial.printf("[Accel] X:%.3f Y:%.3f Z:%.3f Mag:%.3f g\n", data.accel_x, data.accel_y, data.accel_z, data.accel_magnitude);
    }
  }
  return data;
}

void setupMPU6050() {
  mpu.initialize();
  if (mpu.testConnection()) {
    mpu6050_connected = true;
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);
    Serial.println("[MPU6050] ✓ Connected");
  } else {
    mpu6050_connected = false;
    Serial.println("[MPU6050] ✗ Connection failed");
  }
}

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
    i2s_read(I2S_PORT, sample_buffer, to_read * 4, &bytes_read, portMAX_DELAY); // 4 bytes per 32-bit sample
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
  
  // Build JSON payload with audio data array
  size_t json_size = 120000;
  char* json_payload = (char*)heap_caps_malloc(json_size, MALLOC_CAP_SPIRAM);
  if (!json_payload) { Serial.println("[Audio] ✗ Payload alloc failed"); return "normal"; }
  
  strcpy(json_payload, "{\"device_id\":\"hikon_s3_v1_audio\",\"data\":[");
  int offset = strlen(json_payload);
  for (int i = 0; i < SAMPLES; i++) {
    offset += sprintf(json_payload + offset, "%d", audio_buffer[i]);
    if (i < SAMPLES - 1) json_payload[offset++] = ',';
  }
  strcpy(json_payload + offset, "]}");
  
  // Send to Vercel API with 25s timeout for Hugging Face wake-up
  Serial.println("[Audio] Sending to cloud for inference...");
  HTTPClient h;
  h.begin(wifiClient, VERCEL_API_URL);
  h.addHeader("Content-Type", "application/json");
  h.setTimeout(25000);  // 25 second timeout for HF space wake-up
  
  int code = h.POST(json_payload);
  heap_caps_free(json_payload);
  
  String pred = "normal";
  int cough_result = 0;
  int wheeze_result = 0;
  
  if (code == 200 || code == 201) {
    DynamicJsonDocument d(512);
    deserializeJson(d, h.getString());
    cough_result = d["inference"]["cough"] | 0;
    wheeze_result = d["inference"]["wheeze"] | 0;
    bool gemini_verified = d["gemini_verified"] | false;
    const char* gemini_error = d["gemini_error"] | "";

    if (cough_result == 1) pred = "cough";
    else if (wheeze_result == 1) pred = "wheeze";

    Serial.printf("[Audio] Result: %s (Check: %s)\n", pred.c_str(), gemini_verified ? "GEMINI VERIFIED" : "HF-ONLY");
    if (strlen(gemini_error) > 0) Serial.printf("[Audio] ! Gemini Error: %s\n", gemini_error);
  } else {
    Serial.printf("[Audio] ✗ Cloud inference failed (HTTP %d)\n", code);
    if (code > 0) {
      String errBody = h.getString();
      Serial.println("[Audio] " + errBody);
    }
  }
  h.end();
  return pred;
}

String normalizeRiskForCloud(const String &risk) {
  if (risk == "critical") return "high";
  if (risk == "medium") return "medium";
  return "safe";
}

/* =============== Supabase Upload (UPSERT - Status Row) =============== */
void upload_device_status_upsert(float hr, float spo2, float accel, float temp, float hum, 
                                  int pm10, int pm25, int pm100, const String &label, const String &risk,
                                  int cough, int wheeze) {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String(SUPABASE_URL) + "/rest/v1/s3_sensor_data?on_conflict=device_id";
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http.addHeader("Prefer", "resolution=merge-duplicates");
  
  DynamicJsonDocument j(1536);
  j["device_id"] = "hikon_s3_v1_status";
  if (hr > 0 && hr < 200) j["heart_rate"] = hr; else j["heart_rate"] = (char*)NULL;
  if (spo2 > 70 && spo2 <= 100) j["spo2"] = spo2; else j["spo2"] = (char*)NULL;
  j["accel_mag"] = accel; j["temperature"] = temp; j["humidity"] = hum;
  j["pm10"] = pm10; j["pm25"] = pm25; j["pm100"] = pm100;
  j["prediction_label"] = label; j["risk_level"] = normalizeRiskForCloud(risk);
  j["cough"] = cough; j["wheeze"] = wheeze;
  
  String payload; serializeJson(j, payload);
  Serial.println("[Supabase] status upsert...");
  int code = http.POST(payload);
  if (code == 201 || code == 200) Serial.printf("[Supabase] status upsert OK HTTP %d\n", code);
  else { Serial.printf("[Supabase] status upsert failed HTTP %d\n", code); Serial.println("[Supabase] status error: " + http.getString()); }
  http.end();
}

/* =============== Supabase Upload (New History Row) =============== */
void upload_sensor_row(float hr, float spo2, float accel, float temp, float hum, 
                       int pm10, int pm25, int pm100, const String &label, const String &risk,
                       int cough, int wheeze) {
  if (WiFi.status() != WL_CONNECTED) return;
  String url = String(SUPABASE_URL) + "/rest/v1/s3_sensor_data";
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http.addHeader("Prefer", "return=minimal");
  
  DynamicJsonDocument j(1536);
  j["device_id"] = "hikon_s3_v1_history_" + String(millis());
  if (hr > 0 && hr < 200) j["heart_rate"] = hr; else j["heart_rate"] = (char*)NULL;
  if (spo2 > 70 && spo2 <= 100) j["spo2"] = spo2; else j["spo2"] = (char*)NULL;
  j["accel_mag"] = accel; j["temperature"] = temp; j["humidity"] = hum;
  j["pm10"] = pm10; j["pm25"] = pm25; j["pm100"] = pm100;
  j["prediction_label"] = label; j["risk_level"] = normalizeRiskForCloud(risk);
  j["cough"] = cough; j["wheeze"] = wheeze;
  
  String p; serializeJson(j, p);
  Serial.println("[Supabase] history insert...");
  int code = http.POST(p);
  if (code == 201 || code == 200) Serial.printf("[Supabase] history insert OK HTTP %d\n", code);
  else { Serial.printf("[Supabase] history insert failed HTTP %d\n", code); Serial.println("[Supabase] history error: " + http.getString()); }
  http.end();
}

/* =============== Vitals Averaging =============== */
void addVitalSample(float hr, float spo2, unsigned long timestamp) {
  vital_history[vital_history_write_index] = {hr, spo2, timestamp};
  vital_history_write_index = (vital_history_write_index + 1) % VITALS_WINDOW_MAX_SAMPLES;
  if (vital_history_count < VITALS_WINDOW_MAX_SAMPLES) vital_history_count++;
}

void computeTwoMinuteAverages(unsigned long now, float &avgHr, float &avgSpo2, int &hrSamples, int &spo2Samples) {
  float sumHr = 0, sumSpo2 = 0; hrSamples = 0; spo2Samples = 0;
  for (int i = 0; i < vital_history_count; i++) {
    const VitalSample &s = vital_history[i];
    if (s.timestamp == 0 || now - s.timestamp > VITALS_AVG_WINDOW_MS) continue;
    if (s.hr > 0) { sumHr += s.hr; hrSamples++; }
    if (s.spo2 > 0) { sumSpo2 += s.spo2; spo2Samples++; }
  }
  avgHr = (hrSamples > 0) ? (sumHr / hrSamples) : 0;
  avgSpo2 = (spo2Samples > 0) ? (sumSpo2 / spo2Samples) : 0;
}

/* =============== Fusion Logic Risk Assessment =============== */
String calculateFusionRisk(float avgHr, float avgSpo2, int cough, int wheeze) {
  // 1. SAFETY OVERRIDE: Critical SpO2 levels bypass all other logic
  if (avgSpo2 > 0 && avgSpo2 <= 92) return "critical";
  
  // 2. Base weighted score calculation
  // SpO2 (2.5 weight), Audio (1.0 weight)
  float score = 0;
  
  // SpO2 component (Safe/Normal: 96-100, Warning: 93-95, Critical: <=92)
  if (avgSpo2 > 0) {
    if (avgSpo2 <= 92) score += 2.5;      // Should have hit override above, but for calculation safety
    else if (avgSpo2 <= 95) score += 1.5; // Warning zone
  }
  
  // Audio component (Cough or Wheeze adds 1.0)
  if (cough == 1 || wheeze == 1) score += 1.0;
  
  // Heart Rate component (Supplemental safety check)
  if (avgHr > 125 || (avgHr > 0 && avgHr < 45)) score += 2.0;
  else if (avgHr > 110 || (avgHr > 0 && avgHr < 60)) score += 0.5;

  // 3. Final Risk Translation
  if (score >= 2.5) return "critical";
  if (score >= 1.0) return "medium";
  return "safe";
}

/* =============== Buffer Management =============== */
void uploadBufferedData();

void addToBuffer(const SensorReading &reading) {
  if (bufferCount >= MAX_BUFFER_SIZE) { Serial.println("[Buffer] FULL - forcing upload"); uploadBufferedData(); }
  readingBuffer[bufferCount++] = reading;
  Serial.printf("[Buffer] Added (%d/%d) - Risk: %s\n", bufferCount, MAX_BUFFER_SIZE, reading.risk_level.c_str());
}

void uploadBufferedData() {
  if (bufferCount == 0) return;
  Serial.printf("[Upload] Uploading %d buffered readings...\n", bufferCount);
  for (int i = 0; i < bufferCount; i++) {
    SensorReading &r = readingBuffer[i];
    int retries = (r.risk_level == "critical") ? 3 : 1;
    for (int attempt = 1; attempt <= retries; attempt++) {
      if (attempt > 1) delay(UPLOAD_RETRY_DELAY_MS);
      upload_sensor_row(r.hr, r.spo2, r.accel, r.temp, r.humidity,
                       r.pm10, r.pm25, r.pm100, r.prediction_label, r.risk_level,
                       r.cough, r.wheeze);
      if (WiFi.status() == WL_CONNECTED) break;
    }
  }
  bufferCount = 0; lastUpload = millis();
  Serial.println("[Upload] Buffer cleared");
}

void updateMonitoringInterval(const String &riskLevel) {
  unsigned long newInterval;
  if (riskLevel == "critical") newInterval = HIGH_RISK_MONITOR_MS;
  else if (riskLevel == "medium") newInterval = MEDIUM_RISK_MONITOR_MS;
  else newInterval = LOW_RISK_MONITOR_MS;
  if (newInterval != currentMonitorInterval) {
    currentMonitorInterval = newInterval;
    Serial.printf("[Adaptive] Interval: %lu ms (%s)\n", newInterval, riskLevel.c_str());
  }
}

/* =============== WiFi Configuration Management =============== */
void loadWiFiConfig() {
  preferences.begin("wifi-config", true); yield();
  saved_ssid = preferences.getString("ssid", WIFI_SSID); yield();
  saved_password = preferences.getString("password", WIFI_PASSWORD); yield();
  preferences.end();
  Serial.printf("[Config] Loaded WiFi: %s\n", saved_ssid.c_str());
}

void saveWiFiConfig(const String &ssid, const String &password) {
  preferences.begin("wifi-config", false);
  preferences.putString("ssid", ssid); preferences.putString("password", password);
  preferences.end();
  saved_ssid = ssid; saved_password = password;
}

bool connectToWiFi(const String &ssid, const String &password, int timeout_sec = 15) {
  Serial.printf("[WiFi] Connecting to: %s", ssid.c_str());
  WiFi.disconnect(); delay(100);
  WiFi.begin(ssid.c_str(), password.c_str());
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > timeout_sec * 1000) { Serial.println(" TIMEOUT"); return false; }
    delay(500); yield(); Serial.print(".");
  }
  Serial.printf("\n[WiFi] IP: %s\n[WiFi] Connected\n", WiFi.localIP().toString().c_str());
  return true;
}

bool fetchWiFiConfigFromSupabase() {
  if (WiFi.status() != WL_CONNECTED) return false;
  String url = String(SUPABASE_URL) + "/rest/v1/device_config?device_id=eq.hikon_s3_v1&select=wifi_ssid,wifi_password,config_version";
  HTTPClient http_local; http_local.begin(wifiClient, url);
  http_local.addHeader("apikey", SUPABASE_KEY);
  http_local.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  int httpCode = http_local.GET();
  if (httpCode == 200) {
    String response = http_local.getString();
    DynamicJsonDocument doc(1024); deserializeJson(doc, response);
    if (doc.size() > 0) {
      String new_ssid = doc[0]["wifi_ssid"].as<String>();
      String new_pass = doc[0]["wifi_password"].as<String>();
      if (new_ssid != saved_ssid || new_pass != saved_password) {
        saveWiFiConfig(new_ssid, new_pass);
        if (connectToWiFi(new_ssid, new_pass, 20)) { wifi_config_changed = true; http_local.end(); return true; }
      }
    }
  }
  http_local.end(); return false;
}

void ensureWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    yield();
    if (!connectToWiFi(saved_ssid, saved_password, 10))
      connectToWiFi(WIFI_SSID, WIFI_PASSWORD, 10);
  }
}

/* =============== SETUP =============== */
void setup() {
  Serial.begin(115200); delay(1000);
  Serial.println("\n[HikOn] Initializing Smart Wearable System...");
  
  Serial1.begin(9600, SERIAL_8N1, PMS_RX_PIN, PMS_TX_PIN);
  pinMode(PMS_SET_PIN, OUTPUT); pinMode(PMS_RESET_PIN, OUTPUT);
  digitalWrite(PMS_SET_PIN, HIGH); digitalWrite(PMS_RESET_PIN, HIGH);
  Serial.println("[PMS7003] UART Initialized");
  
  audio_buffer = (int16_t *)heap_caps_malloc(SAMPLES * sizeof(int16_t), MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
  if (audio_buffer) Serial.printf("[Audio] Buffer allocated (%d bytes)\n", SAMPLES * sizeof(int16_t));
  else Serial.println("[Audio] ✗ Buffer allocation FAILED");
  
  loadWiFiConfig(); yield();
  WiFi.mode(WIFI_STA); yield();
  if (!connectToWiFi(saved_ssid, saved_password, 10)) {
    connectToWiFi(WIFI_SSID, WIFI_PASSWORD, 10);
    saveWiFiConfig(WIFI_SSID, WIFI_PASSWORD);
  }
  wifiClient.setInsecure();
  
  Wire.begin(SDA_PIN, SCL_PIN); Wire.setClock(100000); yield();
  if (MAX30102_INT_PIN >= 0) pinMode(MAX30102_INT_PIN, INPUT_PULLUP);
  
  if (sht4.begin(&Wire)) { sht4.setPrecision(SHT4X_HIGH_PRECISION); sht4.setHeater(SHT4X_NO_HEATER); sht45_connected = true; Serial.println("[SHT45] ✓ Ready"); }
  else Serial.println("[SHT45] ✗ Not Found");
  
  if (configureMAX30102Sensor()) { max30102_connected = true; Serial.println("[MAX30102] ✓ Ready"); }
  else Serial.println("[MAX30102] ✗ Not Found");
  
  setupMPU6050();
  
  i2s_config_t i2s_cfg = { .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX), .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT, .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S, .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4, .dma_buf_len = 512, .use_apll = false, .tx_desc_auto_clear = false, .fixed_mclk = 0 };
  i2s_pin_config_t i2s_pins = { .bck_io_num = I2S_SCK, .ws_io_num = I2S_WS, .data_out_num = I2S_PIN_NO_CHANGE, .data_in_num = I2S_SD };
  if (i2s_driver_install(I2S_PORT, &i2s_cfg, 0, NULL) == ESP_OK) {
    i2s_set_pin(I2S_PORT, &i2s_pins); Serial.println("[INMP441] ✓ I2S Ready");
  } else Serial.println("[INMP441] ✗ I2S Init Failed");
  
  Serial.println("[API] Cloud inference routing enabled!");
  Serial.println("\n[HikOn] System Ready - Starting Monitoring...\n");
  lastAccelUpload = millis();
}

/* =============== MAIN LOOP =============== */
void loop() {
  unsigned long now = millis();
  long irValue = 0;
  bool hasFreshMaxSample = false;

  updateAccelMotionArtifactState(now);
  
  if (max30102_connected) {
    hasFreshMaxSample = readLatestMAX30102Sample(irValue);
    if (!hasFreshMaxSample) irValue = (long)max30102_last_ir;
  }

  // Periodic WiFi config check
  if (!first_config_fetch_done && now > 5000) {
    fetchWiFiConfigFromSupabase();
    checkAndRunAccelCalibrationFromDashboard();
    first_config_fetch_done = true; lastConfigCheck = now;
  } else if (first_config_fetch_done && (now - lastConfigCheck >= CONFIG_CHECK_INTERVAL)) {
    lastConfigCheck = now;
    fetchWiFiConfigFromSupabase();
    checkAndRunAccelCalibrationFromDashboard();
  }
  
  ensureWiFiConnection();

  // Periodic accelerometer upload
  if (now - lastAccelUpload >= ACCEL_UPLOAD_INTERVAL_MS) {
    latestAccelData = readAccelData(true);
    if (mpu6050_connected) uploadAccelToSupabase(latestAccelData);
    lastAccelUpload = now;
  }

  // PM sensor reading
  if (now - lastPMRead >= PM_READ_INTERVAL_MS) {
    lastPMRead = now;
    if (readPMSdata(&Serial1)) {
      Serial.printf("[PM] PM1.0: %d | PM2.5: %d | PM10: %d μg/m³\n", pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env);
    }
  }
  
  // Real-time heart rate
  if (max30102_connected && hasFreshMaxSample) {
    if (motion_artifact_detected) { current_hr = 0; current_spo2 = 0; }
    else if (irValue > MAX30102_FINGER_DETECT_THRESHOLD) {
      if (checkForBeat(irValue)) {
        long delta = millis() - lastBeat; lastBeat = millis();
        float bpm = 60 / (delta / 1000.0);
        if (bpm > 40 && bpm < 185) {
          rates[rateSpot++] = (byte)bpm; rateSpot %= RATE_SIZE;
          float avg = 0; for (byte x = 0; x < RATE_SIZE; x++) avg += rates[x];
          current_hr = avg / RATE_SIZE;
          Serial.printf("[HR] %.1f BPM (IR: %ld)\n", current_hr, irValue);
        }
      }
    } else { current_hr = 0; current_spo2 = 0; }
  }
  if (motion_artifact_detected) { current_hr = 0; current_spo2 = 0; }

  // Dashboard prompt sync
  bool dashboardPromptActive = false;
  String dashboardPromptMessage = "";
  if (motion_artifact_detected) { dashboardPromptActive = true; dashboardPromptMessage = "Please stay still for reliable pulse oximeter readings."; }
  else {
    bool spo2Bad = (current_spo2 > 0 && current_spo2 < 96);
    bool hrBad = (current_hr > 0 && (current_hr < 70 || current_hr > 120));
    if (spo2Bad && hrBad) { dashboardPromptActive = true; dashboardPromptMessage = "SpO2 and heart rate are out of normal range. Stay still and retake."; }
    else if (spo2Bad) { dashboardPromptActive = true; dashboardPromptMessage = "SpO2 is below 96%. Stay still and retake."; }
    else if (hrBad) { dashboardPromptActive = true; dashboardPromptMessage = "Heart rate is outside 70-120 bpm. Stay still and retake."; }
  }
  syncDashboardPrompt(dashboardPromptActive, dashboardPromptMessage, now);

  // MAX30102 auto-recovery
  if (max30102_connected && (now - lastSensorCheck >= SENSOR_CHECK_INTERVAL)) {
    lastSensorCheck = now;
    if (irValue < MAX30102_LOW_SIGNAL_THRESHOLD) {
      consecutiveLowReadings++;
      if (consecutiveLowReadings >= LOW_READING_THRESHOLD) {
        if (reinitializeMAX30102()) Serial.println("[Recovery] ✓ Sensor restored");
        else { Serial.println("[Recovery] ✗ Failed"); max30102_connected = false; }
      }
    } else { consecutiveLowReadings = 0; }
  }

  // ===== ADAPTIVE SENSOR MONITORING =====
  if (now - lastMonitor >= currentMonitorInterval) {
    lastMonitor = now;
    Serial.printf("\n[Monitor] Reading sensors (Interval: %lu ms)...\n", currentMonitorInterval);
    
    float temperature = 0, humid = 0;
    if (sht45_connected) { sensors_event_t humidity, temp; sht4.getEvent(&humidity, &temp); temperature = temp.temperature; humid = humidity.relative_humidity; }
    
    AccelData accelData = latestAccelData;
    if (accelData.timestamp == 0 || now - accelData.timestamp >= ACCEL_UPLOAD_INTERVAL_MS) { accelData = readAccelData(true); latestAccelData = accelData; }
    float accel_magnitude = accelData.accel_magnitude;
    
    if (!motion_artifact_detected && max30102_connected && irValue > MAX30102_SPO2_THRESHOLD) updateSpO2();
    else if (motion_artifact_detected) current_spo2 = 0;

    float validated_hr = motion_artifact_detected ? 0 : current_hr;
    float validated_spo2 = motion_artifact_detected ? 0 : current_spo2;
    
    // Cloud audio inference
    String audioLabel = captureAndClassifyAudio();
    int cough = (audioLabel == "cough") ? 1 : 0;
    int wheeze = (audioLabel == "wheeze") ? 1 : 0;
    
    // 2-minute vitals averaging
    addVitalSample(validated_hr, validated_spo2, now);
    float avg_hr_2min = 0, avg_spo2_2min = 0; int hr_samples_2min = 0, spo2_samples_2min = 0;
    computeTwoMinuteAverages(now, avg_hr_2min, avg_spo2_2min, hr_samples_2min, spo2_samples_2min);
    float risk_hr = (hr_samples_2min > 0) ? avg_hr_2min : validated_hr;
    float risk_spo2 = (spo2_samples_2min > 0) ? avg_spo2_2min : validated_spo2;
    
    String risk = calculateFusionRisk(risk_hr, risk_spo2, cough, wheeze);
    
    Serial.printf("├─ HR: %.1f BPM | SpO2: %.1f%%\n", validated_hr, validated_spo2);
    Serial.printf("├─ 2-min Avg HR: %.1f | SpO2: %.1f%%\n", risk_hr, risk_spo2);
    Serial.printf("├─ Temp: %.1f°C | Humidity: %.1f%%\n", temperature, humid);
    Serial.printf("├─ Accel: %.2fg | Motion: %s\n", accel_magnitude, motion_artifact_detected ? "HIGH" : "stable");
    Serial.printf("├─ PM1.0: %d | PM2.5: %d | PM10: %d μg/m³\n", pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env);
    Serial.printf("└─ Audio: %s | Risk: %s\n", audioLabel.c_str(), risk.c_str());
    
    currentRiskLevel = risk;
    updateMonitoringInterval(currentRiskLevel);
    
    // Escalation detection
    if (lastRiskLevel == "safe" && (risk == "medium" || risk == "critical")) {
      Serial.println("[Event] ⚠️ Risk escalating - logging baseline");
      upload_sensor_row(lastSafeReading.hr, lastSafeReading.spo2, lastSafeReading.accel,
        lastSafeReading.temp, lastSafeReading.humidity, lastSafeReading.pm10, lastSafeReading.pm25, lastSafeReading.pm100,
        lastSafeReading.prediction_label, lastSafeReading.risk_level, lastSafeReading.cough, lastSafeReading.wheeze);
    }
    
    bool isRecovery = (lastRiskLevel == "medium" || lastRiskLevel == "critical") && risk == "safe";
    
    if (risk == "safe") {
      lastSafeReading = { validated_hr, validated_spo2, accel_magnitude, temperature, humid,
        pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env, audioLabel, risk, cough, wheeze, now };
      upload_device_status_upsert(validated_hr, validated_spo2, accel_magnitude, temperature, humid,
        pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env, audioLabel, risk, cough, wheeze);
      if (isRecovery) {
        Serial.println("[Event] ✅ Recovery - logging");
        upload_sensor_row(validated_hr, validated_spo2, accel_magnitude, temperature, humid,
          pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env, audioLabel, risk, cough, wheeze);
      }
    } else if (risk == "medium") {
      upload_device_status_upsert(validated_hr, validated_spo2, accel_magnitude, temperature, humid,
        pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env, audioLabel, risk, cough, wheeze);
      SensorReading reading = { validated_hr, validated_spo2, accel_magnitude, temperature, humid,
        pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env, audioLabel, risk, cough, wheeze, now };
      addToBuffer(reading);
      if (now - lastUpload >= MEDIUM_RISK_UPLOAD_MS) uploadBufferedData();
    } else if (risk == "critical") {
      Serial.println("[Action] ⚠️ CRITICAL - Immediate upload!");
      upload_device_status_upsert(validated_hr, validated_spo2, accel_magnitude, temperature, humid,
        pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env, audioLabel, risk, cough, wheeze);
      SensorReading reading = { validated_hr, validated_spo2, accel_magnitude, temperature, humid,
        pmsData.pm10_env, pmsData.pm25_env, pmsData.pm100_env, audioLabel, risk, cough, wheeze, now };
      addToBuffer(reading);
      uploadBufferedData();
    }
    
    if (currentRiskLevel != lastRiskLevel) {
      Serial.printf("[Alert] Risk changed: %s → %s\n", lastRiskLevel.c_str(), currentRiskLevel.c_str());
      lastRiskLevel = currentRiskLevel;
    }
  }
  
  delay(1);
}
