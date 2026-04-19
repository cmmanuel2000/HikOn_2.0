-- 🧪 HIKON 2.1.1: COMPREHENSIVE SIMULATION RESET
-- Target: PATIENT-012 (Test Child)
-- This script cleans the slate and prepares the system for a perfect presentation.

-- 1. Ensure Patient exists
INSERT INTO patient_id (patient_id, name, age, gender)
VALUES ('PATIENT-012', 'Test Child (Clinical)', 10, 'Male')
ON CONFLICT (patient_id) DO NOTHING;

-- 2. Clear old test calibration data
TRUNCATE TABLE spo2_calibration;

-- 3. Insert 13 high-quality samples (97-98% SpO2)
-- These span exactly 120 seconds.
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.4, 78, NOW() - INTERVAL '120 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.2, 79, NOW() - INTERVAL '110 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 96.8, 77, NOW() - INTERVAL '100 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.5, 78, NOW() - INTERVAL '90 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.1, 78, NOW() - INTERVAL '80 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.3, 78, NOW() - INTERVAL '70 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 96.5, 77, NOW() - INTERVAL '60 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.0, 78, NOW() - INTERVAL '50 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 98.1, 79, NOW() - INTERVAL '40 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.4, 78, NOW() - INTERVAL '30 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.6, 78, NOW() - INTERVAL '20 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.5, 78, NOW() - INTERVAL '10 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.5, 78, NOW());

-- 4. Insert real-time sensor data so the dashboard shows 98% (not N/A or 0%)
INSERT INTO s3_sensor_data (device_id, patient_id, spo2, heart_rate, status, risk_level)
VALUES ('sim_hikon_01', 'PATIENT-012', 98.2, 76, 'STEADY', 'safe');

-- 🛑 HOW TO TEST: 
-- 1. Run this script in Supabase.
-- 2. Hard Refresh Dashboard (Ctrl+F5).
-- 3. Select 'Test Child (Clinical)' from the sidebar.
-- 4. Click 'Record Personal Best'.
