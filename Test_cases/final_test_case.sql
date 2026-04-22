-- =====================================================================
-- 🛡️ HIKON 2.1.1: FINAL COMPREHENSIVE TEST SUITE (final_test_case.sql)
-- Instructions: Run individual blocks to verify synchronized fusion logic.
-- =====================================================================

-- ============================================================
-- 1. THE "SAFE" SUITE
-- ============================================================

-- TC-S1: Perfect Health
-- Logic: SpO2 99, BR 22, 0 Symptoms, Steady
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, heart_rate, br_rate, cough, wheeze, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', 'FINAL-TC-PATIENT', 99.0, 72, 22, 0, 0, 'safe', 'TC-S1: All optimal', NOW());
INSERT INTO public.accel_values (device_id, accel_magnitude, created_at) 
SELECT 'DEMO-DEVICE', 0.98 + (random() * 0.02), NOW() - (i || ' seconds')::interval FROM generate_series(1, 10) AS i;

-- TC-S2: Physical Activity (BR Suppression)
-- Logic: BR 42 (Critical), but RUNNING motion = SAFE Result
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', 'FINAL-TC-PATIENT', 98.5, 42, 0, 0, 'safe', 'TC-S2: High BR suppressed by RUNNING', NOW());
INSERT INTO public.accel_values (device_id, accel_magnitude, created_at) VALUES 
('DEMO-DEVICE', 1.4, NOW()), ('DEMO-DEVICE', 0.6, NOW() - interval '1s'), 
('DEMO-DEVICE', 1.5, NOW() - interval '2s'), ('DEMO-DEVICE', 0.5, NOW() - interval '3s');

-- TC-S3: Personal Best Baseline (Override)
-- Logic: SpO2 95/96 (Medium/High), but Patient PB=95 = SAFE
UPDATE public.patient_id SET spo2_baseline = 95 WHERE patient_id = 'FINAL-TC-PATIENT';
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', 'FINAL-TC-PATIENT', 95.5, 'safe', 'TC-S3: SpO2 95.5 shielded by PB Baseline', NOW());


-- ============================================================
-- 2. THE "MEDIUM" SUITE
-- ============================================================

-- TC-M1: Mild Distress
-- Logic: SpO2 96 (R1) + Cough 2 (R1) = 0.70 Score (MEDIUM)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, cough, br_rate, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', 'FINAL-TC-PATIENT', 96.0, 2, 24, 'medium', 'TC-M1: Mild Fusion (Score 0.70)', NOW());
INSERT INTO public.accel_values (device_id, accel_magnitude, created_at) 
SELECT 'DEMO-DEVICE', 0.98 + (random() * 0.02), NOW() - (i || ' seconds')::interval FROM generate_series(1, 10) AS i;

-- TC-M2: High Respiratory Strain
-- Logic: SpO2 99 (R0), BR 38 (R2), Cough 3 (R1) = MEDIUM
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', 'FINAL-TC-PATIENT', 99.0, 38, 3, 'medium', 'TC-M2: High BR + Mild Cough', NOW());


-- ============================================================
-- 3. THE "HIGH" SUITE
-- ============================================================

-- TC-H1: Critical SpO2 Override (Bypass)
-- Logic: SpO2 94 (R2) -> Forces HIGH regardless of other sensor inputs
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', 'FINAL-TC-PATIENT', 94.0, 18, 0, 'high', 'TC-H1: CRITICAL SpO2 OVERRIDE', NOW());

-- TC-H2: Severe Multi-Sensor Fusion
-- Logic: SpO2 96 (R1), BR 38 (R2), Cough 6 (R2) = 1.45 Score (HIGH)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', 'FINAL-TC-PATIENT', 96.0, 38, 6, 'high', 'TC-H2: Cluster of Symptoms (Score 1.45)', NOW());


-- ============================================================
-- 4. THE "WALKING" TRANSITION
-- ============================================================

-- TC-W1: Walking during Flare-up
-- Logic: SpO2 97 (R1), BR 30 (R1), Status WALKING (Standard Dev 0.05-0.20)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', 'FINAL-TC-PATIENT', 97.0, 30, 'medium', 'TC-W1: Walking child with low SpO2', NOW());

-- Inject WALKING motion data
INSERT INTO public.accel_values (device_id, accel_magnitude, created_at) 
VALUES 
    ('DEMO-DEVICE', 1.05, NOW()), ('DEMO-DEVICE', 0.95, NOW() - interval '1s'), 
    ('DEMO-DEVICE', 1.05, NOW() - interval '2s'), ('DEMO-DEVICE', 0.95, NOW() - interval '3s'),
    ('DEMO-DEVICE', 1.05, NOW() - interval '4s'), ('DEMO-DEVICE', 0.95, NOW() - interval '5s');

-- ============================================================
-- 5. THE "CALIBRATION" FLOW (Audit Trail)
-- ============================================================

INSERT INTO public.patient_id (patient_id, name, age, gender)
VALUES ('FINAL-TC-PATIENT', 'Final Test Child', 7, 'Non-binary')
ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO public.spo2_calibration (device_id, spo2, heart_rate, br_rate, patient_id, created_at)
SELECT 'DEMO-CALIBRATOR', 98 + (random() * 2), 72 + (random() * 5), 18, 'FINAL-TC-PATIENT', NOW() - (i || ' seconds')::interval
FROM generate_series(1, 30) AS i;
