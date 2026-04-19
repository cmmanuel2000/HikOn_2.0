# HikOn 2.1.1: System Functionality & Design Documentation

This document provides a comprehensive overview of the HikOn 2.1.1 system, including its hardware architecture, data flow, clinical logic, and user interface features as of the April 22nd clinical validation release.

## 1. System Architecture
HikOn uses a distributed sensing approach to monitor both the patient and their environment.

### Hardware Layer
- **Board A (Master - Physiological)**:
  - **Sensors**: Pulse Oximeter (SpO2, Heart Rate) and Accelerometer (Motion, Breathing).
  - **Communication**: MASTER node. Connects to WiFi and handles the primary Supabase connection. It receives environmental data via ESP-NOW from Board B.
- **Board B (Slave - Environmental)**:
  - **Sensors**: PMS7003 (PM2.5/AQI) and SHT45 (Temperature/Humidity).
  - **Communication**: SLAVE node. Syncs with Board A every 1 second to relay atmospheric data.

### Cloud Layer (Supabase)
- **`s3_sensor_data`**: The primary log for 30-second clinical snapshots.
- **`accel_values`**: High-frequency 1-second storage for accelerometer magnitude (used for BR calculation and motion detection).
- **`spo2_calibration`**: Dedicated table for high-frequency (10s) raw oximeter samples during Personal Best sessions (One row per sample).
- **`patient_id`**: Central registry for children, storing metadata and their unique SpO2 Personal Best baseline.

---

## 2. Clinical Logic & Smart Alerts
The "intelligence" of HikOn 2.1.1 is defined by several layers of research-backed clinical logic.

### 🧬 SpO2 Personal Best (Clinical Baseline)
The system establishes a **Personal Best (PB)** for every child when they are healthy and at rest.
- **Calibration Session**: A 2-minute (120s) recording that fetches the latest samples from `spo2_calibration`.
- **Dynamic Thresholding**: If `Current SpO2 >= Personal Best`, the system classifies the state as **SAFE**, preventing false alarms for children with naturally lower baselines.
- **Data Structure**: The system now uses a flat "one row per sample" model for calibration data to ensure maximum reliability and lower processing overhead.

### 🏃 Motion-Aware Alert Gating
To minimize false positives from "motion artifacts" (sensor noise caused by movement), HikOn uses a 3-tier motion detection system:
- **🟢 Steady (SD < 0.05)**: Standard monitoring.
- **🟡 Walking (0.05 < SD < 0.20)**: Active but measurements are reliable. Alerts remain on.
- **🔴 Moving/Running (SD > 0.20)**: Intense movement detected. Alerts are **SUPPRESSED** until the signal stabilizes.

### 🕒 5-Minute Stability Cooldown
After intense motion stops, the system moves into a **Stabilizing** state. It waits for **300 seconds (5 minutes)** of stability before re-enabling alerts. This ensures the child’s physiological responses have returned to baseline and sensor alignment is verified.

---

## 3. Dashboard Features
- **Smart Patient Switcher**: Automatically maps incoming sensor data to the currently selected child ID.
- **Manual Record Button**: Allows on-demand "stamping" of untagged sensor rows for data auditing.
- **Admin Testing Suite**: Allows developers to simulate Wheeze, Cough, and Critical SpO2 states to verify the Fusion Logic.
- **Analytical Logs**: Longitudinal tracking of correlation between PM2.5/AQI and asthma events.

---

## 4. Key Performance Thresholds
| Parameter | Safe | Medium Risk | High Risk |
| :--- | :--- | :--- | :--- |
| **SpO2** | ≥ 98% (or ≥ PB) | 96% - 97% | ≤ 95% |
| **Breathing Rate** | 16 - 25 BPM | 26 - 40 BPM | > 40 BPM |
| **PM2.5** | < 12 µg/m³ | 12 - 35 µg/m³ | > 35 µg/m³ |

---

*Documentation Version: 2.1.1-Clinical*
*Last Updated: April 18, 2026*
