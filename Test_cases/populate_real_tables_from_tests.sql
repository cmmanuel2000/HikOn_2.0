-- =====================================================================
-- 🛡️ HIKON 2.1.1: MASTER PRODUCTION TEST SUITE
-- This script contains every individual test case mapped to real tables.
-- Format: Standalone blocks for direct copy-paste into Supabase.
-- =====================================================================

-- -----------------------------------------------------------
-- 🔴 SUITE: HIGH RISK EMERGENCY
-- -----------------------------------------------------------

-- TC-EM-01: SpO2 Exactly 95%
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 95.0, 18, 0, 0, 'high', 'TC-EM-01: SpO2 exactly 95%');

-- TC-EM-02: SpO2 93% (Hypoxia)
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 93.0, 20, 0, 0, 'high', 'TC-EM-02: SpO2 93% (Hypoxia)');

-- TC-EM-03: Severe Hypoxemia (88%)
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 88.0, 22, 0, 0, 'high', 'TC-EM-03: Severe Hypoxemia (88%)');

-- TC-EM-04: SpO2 95% + Wheeze
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 95.0, 32, 0, 1, 'high', 'TC-EM-04: SpO2 95% + Wheeze');

-- TC-EM-05: All Signals High
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 94.0, 35, 3, 3, 'high', 'TC-EM-05: All Signals High');


-- -----------------------------------------------------------
-- 🔴 SUITE: SYMPTOMS & FUSION
-- -----------------------------------------------------------

-- TC-SA-01: High-Frequency Cough Burst (6 in 60s)
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 98.0, 20, 6, 0, 'high', 'TC-SA-01: 6 Coughs (Burst)');

-- TC-SA-04: Severe Attack (Fusion)
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 96.0, 34, 3, 3, 'high', 'TC-SA-04: Severe Attack Fusion');

-- TC-RM-C: High Risk Fusion Matrix
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 95.0, 36, 6, 0, 'high', 'TC-RM-C: Multiple Triggers');

-- TC-FC-H2: Severe Multi-Sensor Fusion
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 96.0, 38, 6, 0, 'high', 'TC-FC-H2: Cluster Score 1.50');


-- -----------------------------------------------------------
-- 🟡 SUITE: MEDIUM RISK
-- -----------------------------------------------------------

-- TC-SA-02: Moderate Wheeze Frequency (3)
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 98.0, 20, 0, 3, 'medium', 'TC-SA-02: 3 Wheezes');

-- TC-RM-B: Medium Risk Scenario (Score 0.80)
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 97.0, 24, 2, 0, 'medium', 'TC-RM-B: Accumulated Warnings');


-- -----------------------------------------------------------
-- 🟢 SUITE: SAFE & SUPPRESSION
-- -----------------------------------------------------------

-- TC-FC-S1: Perfect Health
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 99.0, 22, 0, 0, 'safe', 'TC-FC-S1: Optimal Vitals');

-- TC-SA-03: Physical Activity (RUNNING Suppression)
-- Generating high-variance accelerometer data (Running state)
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', random(), 0.5 + (random()*1.5), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 99.0, 35, 0, 0, 'safe', 'TC-SA-03: Running Suppression');

-- TC-FC-S2: High BR suppressed by RUNNING
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', random(), 1.0 + (random()*1.0), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 98.5, 42, 0, 0, 'safe', 'TC-FC-S2: Activity logic (v42)');


-- -----------------------------------------------------------
-- 💎 SUITE: PERSONAL BEST OVERRIDES
-- -----------------------------------------------------------

-- TC-PB-08: SpO2 Below Baseline (93/94)
UPDATE public.patient_id SET spo2_baseline = 94.0 WHERE name IS NOT NULL; -- Sets for current active patient
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 93.0, 20, 0, 0, 'high', 'TC-PB-08: Below Baseline (93/94)');

-- TC-FC-B1: Baseline Shield (95/95)
UPDATE public.patient_id SET spo2_baseline = 95.0 WHERE name IS NOT NULL;
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 95.0, 18, 0, 0, 'safe', 'TC-FC-B1: Protected by PB');


-- -----------------------------------------------------------
-- ⏳ SUITE: TIME-SENSITIVE (MEDICATION)
-- -----------------------------------------------------------

-- TC-FC-T1: Medication Escalation (Historical)
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks, created_at)
VALUES ('DEMO-DEVICE', NULL, 94.5, 40, 8, 0, 'high', 'TC-FC-T1: Initial Severe State', NOW() - interval '21 minutes');

-- TC-FC-T2: Recovery Verification
INSERT INTO public.accel_values (device_id, accel_z, accel_magnitude, created_at) SELECT 'DEMO-DEVICE', 1.0, 1.0 + (random()*0.02), NOW() - (n || 's')::interval FROM generate_series(1,30) n;
INSERT INTO public.s3_sensor_data (device_id, patient_id, spo2, br_rate, cough, wheeze, risk_level, remarks)
VALUES ('DEMO-DEVICE', NULL, 98.8, 18, 0, 0, 'safe', 'TC-FC-T2: Clinical Recovery');
