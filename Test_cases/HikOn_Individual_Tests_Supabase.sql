-- =====================================================================
-- 🛡️ HIKON 2.1.1: SMART INDIVIDUAL TEST SUITE
-- Goal: Execute blocks to verify specific clinical logic branches.
-- Setup: All data uses device 'DEMO-DEVICE' and patient_id NULL (Auto-Claim).
-- =====================================================================

-- PRE-TEST CLEANUP (Optional: Uncomment to clear previous demo data)
-- DELETE FROM public.s3_sensor_data WHERE device_id = 'DEMO-DEVICE';
-- DELETE FROM public.accel_values WHERE device_id = 'DEMO-DEVICE';


-- =====================================================================
-- 🔴 SUITE 1: HIGH RISK (EMERGENCY & SEVERE FUSION)
-- =====================================================================

-- TC-EM-01: SpO2 Critical Override (Exactly 95%)
-- Logic: SpO2 <= 95 always triggers HIGH RISK regardless of other sensors.
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 95.0, 18, 0, 0, 'high', 'TC-EM-01: SpO2 95% (Critical)');

-- TC-EM-03: Severe Hypoxemia (88%)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 88.0, 22, 0, 0, 'high', 'TC-EM-03: Severe Hypoxemia (88%)');

-- TC-SA-01: High-Frequency Cough Burst (6 in 60s)
-- Logic: 6+ coughs is a severe symptom (Risk 2).
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 98.0, 20, 6, 0, 'high', 'TC-SA-01: 6 Coughs (Burst)');

-- TC-FC-H2: Severe Multi-Sensor Fusion (Score 1.50)
-- Math: SpO2 96(R1*2.5=2.5) + BR 38(R2*1.5=3.0) + Cough 6(R2*1.0=2.0) = 7.5/5.0
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 96.0, 38, 6, 0, 'high', 'TC-FC-H2: Cluster Score 1.50');


-- =====================================================================
-- 🟡 SUITE 2: MEDIUM RISK (MILD DISTRESS)
-- =====================================================================

-- TC-FC-M1: Mild Distress Fusion (Score 0.80)
-- Math: SpO2 97(R1*2.5=2.5) + BR 24(R1*1.5=1.5) = 4.0/5.0
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 97.0, 24, 0, 0, 'medium', 'TC-FC-M1: Mild Distress (Score 0.80)');

-- TC-SA-02: Moderate Wheeze Frequency
-- Logic: 3 wheezes is Risk 1 (Medium).
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 98.0, 20, 0, 3, 'medium', 'TC-SA-02: 3 Wheezes detected');


-- =====================================================================
-- 🟢 SUITE 3: SAFE (OPTIMAL & MOTION SUPPRESSION)
-- =====================================================================

-- TC-FC-S1: Perfect Health
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 99.0, 22, 0, 0, 'safe', 'TC-FC-S1: Optimal Vitals');

-- TC-SA-03: Physical Activity (RUNNING Suppression)
-- SMART STEP: Insert 30 rows of high-variance motion first
INSERT INTO public.accel_values (device_id, accel_x, accel_y, accel_z, accel_magnitude, created_at)
SELECT 'DEMO-DEVICE', random()*0.5, random()*0.5, random()*0.5, 0.5 + random(), NOW() - (n || ' seconds')::interval
FROM generate_series(1, 30) n;

-- Now insert high vitals that SHOULD be suppressed
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 99.0, 35, 0, 0, 'safe', 'TC-SA-03: Running Suppression');


-- =====================================================================
-- 💎 SUITE 4: PERSONAL BEST (BASELINE OVERRIDES)
-- =====================================================================

-- TC-PB-08: SpO2 Below Baseline (High Risk)
-- SMART STEP: Set baseline for the specific dashboard patient (Ensure ID matches)
-- UPDATE public.patient_id SET spo2_baseline = 94.0 WHERE name = 'Demo Patient'; 

INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 93.0, 20, 0, 0, 'high', 'TC-PB-08: Below Baseline (93/94)');

-- TC-FC-B1: Protected by Personal Best
-- Logic: 95% is usually HIGH, but if Baseline is 95, it is SAFE.
-- UPDATE public.patient_id SET spo2_baseline = 95.0 WHERE name = 'Demo Patient'; 

INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 95.0, 18, 0, 0, 'safe', 'TC-FC-B1: Baseline Shield (95/95)');


-- =====================================================================
-- ⏳ SUITE 5: TIME-SENSITIVE (MEDICATION WINDOWS)
-- =====================================================================

-- TC-FC-T1: Medication Escalation (Pre-state)
-- Set a severe state and simulate it was 21 minutes ago to test escalation
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 94.5, 40, 8, 0, 'high', 'TC-FC-T1: Pre-Escalation State', NOW() - interval '21 minutes');

-- TC-FC-T2: Recovery Verification
-- Vitals returned to normal
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 98.8, 18, 0, 0, 'safe', 'TC-FC-T2: Post-Medication Recovery');
