-- =====================================================================
-- 🛡️ HIKON 2.1.1: FINAL COMPREHENSIVE CLINICAL TEST SUITE
-- Logic: Based on fusionLogic.js and constants.js
-- =====================================================================

-- CLEAR PREVIOUS DATA FOR CLEAN TEST
DELETE FROM public.s3_sensor_data WHERE device_id = 'DEMO-DEVICE';
DELETE FROM public.accel_values WHERE device_id = 'DEMO-DEVICE';

-- ============================================================
-- 1. THE "SAFE" SUITE (Optimal & Suppression)
-- ============================================================

-- TC-S1: Perfect Health
-- Logic: SpO2 99(R0), BR 22(R0), Cough 0(R0) -> Result: SAFE
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, heart_rate, br_rate, cough, wheeze, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 99.0, 72, 22, 0, 0, 'safe', 'TC-S1: Perfect Health', NOW());

-- TC-S2: High BR suppressed by RUNNING motion
-- Logic: BR 42(R2) but Motion=RUNNING -> Result: SAFE
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 98.5, 42, 'safe', 'TC-S2: High BR Suppressed by Running', NOW());
INSERT INTO public.accel_values (device_id, accel_magnitude, created_at) VALUES 
('DEMO-DEVICE', 1.5, NOW()), ('DEMO-DEVICE', 0.5, NOW() - interval '1s'), 
('DEMO-DEVICE', 1.4, NOW() - interval '2s'), ('DEMO-DEVICE', 0.6, NOW() - interval '3s');

-- TC-S3: Activity Detected (Fusion Branch)
-- Logic: SpO2 97(R1), BR 38(R2), Cough 0(R0), Motion=STEADY -> Result: SAFE (Activity Detection logic)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 97.2, 38, 0, 'safe', 'TC-S3: Activity Detected (High vitals, high SpO2)', NOW());
INSERT INTO public.accel_values (device_id, accel_magnitude, created_at) 
SELECT 'DEMO-DEVICE', 0.98 + (random() * 0.04), NOW() - (i || ' seconds')::interval FROM generate_series(1, 10) AS i;


-- ============================================================
-- 2. THE "MEDIUM" SUITE (Clusters)
-- ============================================================

-- TC-M1: Mild Distress Fusion
-- Logic: SpO2 97(R1*2.5=2.5) + BR 24(R1*1.5=1.5) = Score 4.0/5.0 (0.80) -> Result: MEDIUM (Threshold > 0.67)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 97.0, 24, 'medium', 'TC-M1: Mild Cluster (Score 0.80)', NOW());


-- ============================================================
-- 3. THE "HIGH" SUITE (Criticals & Severe Fusion)
-- ============================================================

-- TC-H1: Critical SpO2 Override
-- Logic: SpO2 94(R2) -> Result: HIGH (Protocol Bypass)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 94.0, 'high', 'TC-H1: Critical SpO2 Override', NOW());

-- TC-H2: Severe Multi-Sensor Fusion
-- Logic: SpO2 96(R1*2.5=2.5) + BR 38(R2*1.5=3.0) + Cough 6(R2*1.0=2.0) = Score 7.5/5.0 (1.50) -> Result: HIGH (Threshold >= 1.33)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 96.0, 38, 6, 'high', 'TC-H2: Severe Cluster (Score 1.50)', NOW());


-- ============================================================
-- 4. THE "BASELINE" SUITE (Personal Best)
-- ============================================================

-- TC-B1: Protected by Personal Best
-- Logic: SpO2 95 but PB is 95 -> Result: SAFE
UPDATE public.patient_id SET spo2_baseline = 95 WHERE name = 'Final Test Child';
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 95.0, 'safe', 'TC-B1: Protected by Personal Best (95)', NOW());


-- ============================================================
-- 5. THE "TIME" SUITE (Observation Windows)
-- ============================================================

-- TC-T1: Medication Escalation (20+ Minutes of High Risk)
-- Instructions: 1. Run this. 2. Acknowledge Medication in Dashboard. 3. Wait/Run again after 20 mins.
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 94.5, 40, 8, 'high', 'TC-T1: Initial Severe State', NOW() - interval '21 minutes');

-- TC-T2: Recovery Verification
-- Logic: After medication, vitals return to safe within 20 mins.
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 98.8, 18, 'safe', 'TC-T2: Recovery State', NOW());


-- ============================================================
-- SETUP REFERENCES (Run these once)
-- ============================================================
INSERT INTO public.patient_id (patient_id, name, age, gender)
VALUES ('TEST-P-99', 'Final Test Child', 7, 'Non-binary')
ON CONFLICT (patient_id) DO NOTHING;
