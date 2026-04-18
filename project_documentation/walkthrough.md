# Walkthrough: Pediatric SpO2 Baseline & Smart Alerts

We have successfully integrated clinical-grade "Personal Best" calibration and motion-aware alert logic into the HikOn 2.1.1 dashboard.

## Key Features Implemented

### 1. 3-Tier Motion Detection
The system now classifies child activity into three categories based on accelerometer variance (calibrated using Luis's steady testing data):
- 🟢 **Steady**: Resting state, accurate heart rate and breathing rate measurements.
- 🟡 **Walking**: Light activity, alerts remain active.
- 🔴 **Moving/Running**: Intense movement, alerts are suppressed to prevent motion artifacts from triggering false alarms.

### 2. Smart Alert Suppression
To ensure clinical accuracy, the system now gates alerts based on activity:
- **Automatic Suppression**: Alerts are disabled whenever "Moving/Running" is detected.
- **5-Minute Stability Window**: After the child stops moving, a **5-minute countdown** begins. Alerts only resume once the child has been stable for the full duration.
- **Visual Feedback**: The dashboard shows a "STABILIZING" status and a countdown timer during the cooldown period.

### 3. Personal Best (PB) Calibration
Establishing a patient-specific baseline is now a built-in workflow:
- **2-Minute Session**: A "Record Personal Best" button triggers a 120-second clinical snapshot.
- **High-Frequency Data**: The system fetches raw data from the `oximeter_calibration` table during the session.
- **Dynamic Risk Thresholds**: The calculated Personal Best is saved to the patient profile and used in the fusion logic. If `Current SpO2 >= Personal Best`, the child is considered **SAFE**, regardless of standard thresholds.

## Changes Made

### Frontend
- **App.jsx**: Added motion state management, alert cooldown logic, and calibration recording.
- **usePatientManagement.js**: Updated to store and persistence the `spo2_baseline` field.
- **UIComponents.jsx**: Enhanced `RiskBadge` to show motion/stability status.
- **breathingRate.js**: Implemented the 3-tier motion logic.
- **fusionLogic.js**: Updated `hybridFusion` to utilize the Personal Best baseline.

### Database (SQL folder)
- **01_patient_profiles.sql**: Adds `spo2_baseline` column.
- **02_sensor_data_update.sql**: Extends sensor table for better clinical mapping.
- **03_oximeter_calibration.sql**: Creates the high-frequency oximeter table compatible with XIAO payloads.

## Verification
- Verified thresholds against `2ND-LUIS-TESTING` data.
- Tested the 5-minute cooldown timer logic.
- Validated the 2-minute averaging for Personal Best metadata.

> [!TIP]
> **Next Steps**: Please run the SQL scripts in the `sql_codes/` folder in your Supabase SQL editor to ensure your database is ready for the new features.
