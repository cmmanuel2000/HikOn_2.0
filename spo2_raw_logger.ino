/* ================================================================
   HikOn — Raw SpO2 Value Logger (Chest, Offset Calibration)
   Board  : XIAO ESP32-S3
   Sensor : MAX30102 (SDA → D4 / GPIO5, SCL → D5 / GPIO6)

   Prints one raw SpO2 estimate per 100-sample window.
   Compare printed value vs. reference finger oximeter to
   derive your calibration offset.

   Serial output (115200 baud):
     SpO2: 94.32 %
   ================================================================ */

#include <Wire.h>
#include "MAX30105.h"

#define SDA_PIN 5
#define SCL_PIN 6

MAX30105 particleSensor;

const int SAMPLE_WINDOW = 100;
uint32_t redBuffer[SAMPLE_WINDOW];
uint32_t irBuffer[SAMPLE_WINDOW];
int bufferIndex = 0;

void calculateACDC(uint32_t* buf, int size, float* ac, float* dc) {
    uint32_t minV = 0xFFFFFFFF, maxV = 0;
    float sum = 0;
    for (int i = 0; i < size; i++) {
        if (buf[i] < minV) minV = buf[i];
        if (buf[i] > maxV) maxV = buf[i];
        sum += buf[i];
    }
    *ac = (float)(maxV - minV);
    *dc = sum / size;
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    Wire.begin(SDA_PIN, SCL_PIN);
    delay(50);
    Wire.setClock(400000);
    delay(20);

    bool found = false;
    for (int i = 1; i <= 5; i++) {
        Wire.beginTransmission(0x57);
        if (Wire.endTransmission() == 0) { found = true; break; }
        delay(200);
    }
    if (!found) { Serial.println("MAX30102 not found."); while (1); }

    bool ready = false;
    for (int i = 1; i <= 3; i++) {
        if (particleSensor.begin(Wire, I2C_SPEED_FAST)) { ready = true; break; }
        delay(150);
    }
    if (!ready) { Serial.println("MAX30102 init failed."); while (1); }

    particleSensor.setup(0x1F, 4, 2, 400, 411, 4096);
    particleSensor.setPulseAmplitudeRed(0x14);
    particleSensor.setPulseAmplitudeIR(0x14);

    for (int i = 0; i < 12; i++) {
        particleSensor.check();
        if (particleSensor.available()) particleSensor.nextSample();
        delay(20);
    }

    Serial.println("Ready. Place sensor on sternum.");
}

void loop() {
    particleSensor.check();
    if (!particleSensor.available()) return;

    uint32_t ir  = particleSensor.getIR();
    uint32_t red = particleSensor.getRed();
    particleSensor.nextSample();

    if (ir < 50000) return;   // no contact, skip silently

    redBuffer[bufferIndex] = red;
    irBuffer[bufferIndex]  = ir;
    bufferIndex++;

    if (bufferIndex >= SAMPLE_WINDOW) {
        bufferIndex = 0;

        float redAC, redDC, irAC, irDC;
        calculateACDC(redBuffer, SAMPLE_WINDOW, &redAC, &redDC);
        calculateACDC(irBuffer,  SAMPLE_WINDOW, &irAC,  &irDC);

        if (irAC < 1.0f || irDC < 1.0f) return;

        float R    = (redAC / redDC) / (irAC / irDC);
        float spo2 = 110.0f - 25.0f * R;   // standard empirical formula

        // Clamp to physiological range
        if (spo2 > 100.0f) spo2 = 100.0f;
        if (spo2 <  80.0f) spo2 =  80.0f;

        Serial.print("SpO2: ");
        Serial.print(spo2, 2);
        Serial.println(" %");
    }
}
