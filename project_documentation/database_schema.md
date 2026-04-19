# HikOn 2.1.1: Database Schema & Migrations

This document consolidates all database changes required for the Clinical Validation (v2.1.1). For convenience, the raw `.sql` files are also available in the `sql_schema/` subfolder.

## 1. Patient Profiles (`01_patient_profiles.sql`)
Sets up the registry for children and their SpO2 Personal Best (PB).

```sql
CREATE TABLE IF NOT EXISTS patient_id (
    id SERIAL PRIMARY KEY,
    patient_id TEXT UNIQUE,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    spo2_baseline NUMERIC DEFAULT NULL,
    added_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
```

## 2. Sensor Data Extensions (`02_sensor_data_update.sql`)
Links incoming hardware data to specific patients and adds symptom mapping.

```sql
ALTER TABLE s3_sensor_data ADD COLUMN patient_id TEXT;
ALTER TABLE s3_sensor_data ADD COLUMN cough INTEGER DEFAULT 0;
ALTER TABLE s3_sensor_data ADD COLUMN wheeze INTEGER DEFAULT 0;
```

## 3. SpO2 Calibration (`03_spo2_calibration.sql`)
New, high-performance table for the "Record Personal Best" workflow. Each sample is stored as an individual row for better real-time processing.

```sql
CREATE TABLE IF NOT EXISTS spo2_calibration (
    id SERIAL PRIMARY KEY,
    device_id TEXT,
    spo2 NUMERIC,
    heart_rate NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster fetching of the latest calibration values
CREATE INDEX IF NOT EXISTS idx_spo2_calib_created ON spo2_calibration(created_at DESC);
```

---
*Note: Run these scripts in the Supabase SQL Editor in the order listed above.*
