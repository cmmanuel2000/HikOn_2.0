# HikOn 2.0: Complete System Overview

Welcome to the HikOn 2.0 project! This document explains how the entire ecosystem works together—from the wearable hardware to the AI models, databases, and the user dashboard. This is the perfect guide to share with group mates to get everyone on the same page.

## 🌟 The Big Picture

Our system is a real-time asthma risk assessment and health monitoring platform. It uses an ESP32 wearable device to collect patient data, processes that data using advanced AI models in the cloud, and displays everything on a sleek, patient-specific dashboard.

There are four main pillars to the system:
1. **IoT Wearable (ESP32-S3)**: Collects physiological, environmental, and audio data.
2. **Cloud AI & API (Vercel & Hugging Face)**: Analyzes the data to detect coughs/wheezes and calculate asthma risk.
3. **Database (Supabase)**: Stores all patient profiles, sensor history, and active session states.
4. **Web Dashboard**: The user interface for monitoring real-time health and historical trends.

---

## 🧩 How the Pieces Fit Together

### 1. The Wearable Device (ESP32-S3)
We use a single ESP32-S3 device that can be dynamically shared among multiple patients without needing to rewrite or re-upload code.
- **Sensors**: It monitors **Heart Rate**, **SpO2 (Blood Oxygen)**, **Breathing Patterns** (via accelerometer), and environmental factors like **Temperature**, **Humidity**, and **PM2.5 (Air Quality)**.
- **Audio Capture**: It captures audio samples to evaluate the presence of coughing or wheezing.
- **Dynamic Patient Tagging**: Before uploading up data, the ESP32 checks our database to see "who is the active patient?". It then automatically tags all the collected data with that specific patient's ID (e.g., `PATIENT-001`).

### 2. The Cloud AI & API Layer
When the ESP32 collects data, it sends it to our cloud APIs hosted on Vercel.
- **Audio Inference (Hugging Face)**: Audio data is processed by a Hugging Face model (originally trained via Edge Impulse) to accurately detect coughs and wheezes.
- **Risk Assessment Fusion**: The API runs a weighted "fusion logic" algorithm combining SpO2 (highest weight of 2.5), breathing rate (1.5), and audio risk (1.0) to calculate a final **Asthma Risk Score** (Safe, Warning, Critical). 
- *Safety Override*: If SpO2 drops below a critical threshold (≤92%), the system immediately bypasses the normal weighting and flags a **HIGH** risk.

### 3. The Database (Supabase)
Supabase (built on PostgreSQL) acts as the central hub connecting the hardware to the software.
- `active_patient` Table: A special table that dictates which patient the ESP32 should assign data to at any given moment.
- `s3_sensor_data` Table: Stores all the historical sensor readings, risk levels, and AI inference results, nicely separated by the `patient_id`.

### 4. The Web Dashboard
The frontend web application allows users (like doctors or caretakers) to interact with the system easily.
- **Patient Management**: You can add new patients and select who the active patient currently wearing the device is.
- **Seamless Switching**: Selecting a new patient on the dashboard instantly updates the `active_patient` table in Supabase, which the ESP32 respects on its very next upload. No wires needed!
- **Safety Dashboard**: Displays real-time data and asthma risk levels for the currently selected patient.
- **Health Trends**: Shows historical data charts, allowing for deeper review of a patient's health over time.

---

## 🚀 Step-by-Step Data Flow

Here is exactly what happens in a typical usage scenario:

1. **Select Patient**: On the dashboard, you select "Patient 1" from the dropdown. 
2. **State Update**: The dashboard updates Supabase to set the active patient to `PATIENT-001`.
3. **Hardware Polls**: The ESP32 device checks Supabase, realizes `PATIENT-001` is the active user, and begins logging their vitals and environmental surroundings.
4. **AI Processing**: The ESP32 packages the data (sensors + audio) and hits the Vercel API. The backend consults the Hugging Face AI for cough/wheeze analysis and calculates the total asthma risk score.
5. **Data Storage**: The finalized, enriched data packet is saved permanently to Supabase under the `PATIENT-001` tag.
6. **Real-Time Display**: The web Dashboard fetches this new data and updates the charts, gauges, and risk alerts on the screen in real-time.

---

*This architecture ensures we have a scalable, intelligent, and seamless health monitoring solution that leverages modern cloud AI, robust data management, and dynamic IoT technologies!*
