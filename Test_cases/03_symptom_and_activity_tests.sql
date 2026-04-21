-- =====================================================================
-- 🛡️ HIKON 2.1.1: SYMPTOM BURST & ACTIVITY TESTS
-- Tests the 60-second rolling window and motion-aware suppression.
-- =====================================================================

-----------------------------------------------------------------------
-- TEST CASE: High-Frequency Cough Burst (High Risk)
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🔴 HIGH RISK (Red)
-- REASONING: "Weighted score... results in HIGH risk."
-- TRIGGER: "Severe Respiratory Symptoms"
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, cough, created_at)
VALUES 
('DEMO-01', 98, 20, 1, NOW() - interval '50s'),
('DEMO-01', 98, 20, 1, NOW() - interval '40s'),
('DEMO-01', 98, 20, 1, NOW() - interval '30s'),
('DEMO-01', 98, 20, 1, NOW() - interval '20s'),
('DEMO-01', 98, 20, 1, NOW() - interval '10s'),
('DEMO-01', 98, 20, 1, NOW());


-----------------------------------------------------------------------
-- TEST CASE: Moderate Wheeze Frequency (Medium Risk)
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🟡 MEDIUM RISK (Amber)
-- REASONING: "Weighted score... results in MEDIUM risk."
-- TRIGGER: "Mild Respiratory Symptoms"
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, wheeze, created_at)
VALUES 
('DEMO-01', 98, 20, 1, NOW() - interval '30s'),
('DEMO-01', 98, 20, 1, NOW() - interval '15s'),
('DEMO-01', 98, 20, 1, NOW());


-----------------------------------------------------------------------
-- TEST CASE: Physical Activity (Running - Safe Suppression)
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🟢 SAFE (Green + Activity Badge)
-- REASONING: "SAFE: High vitals detected, but optimal SpO2 and motion indicate physical activity."
-- NOTE: Child has high BR (35) but perfect SpO2 (99%) and is RUNNING.
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, accel_mag, created_at)
VALUES ('DEMO-01', 99, 35, 1.4, NOW());


-----------------------------------------------------------------------
-- TEST CASE: Severe Attack (Hypoxia + Symptoms)
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🔴 HIGH RISK (Red)
-- REASONING: "Weighted score... results in HIGH risk."
-- TRIGGERS: "Low SpO2", "Severe Respiratory Symptoms", "Rapid Breathing Rate"
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, wheeze, cough, created_at)
VALUES 
('DEMO-01', 96, 34, 1, 1, NOW() - interval '20s'),
('DEMO-01', 96, 34, 1, 1, NOW() - interval '10s'),
('DEMO-01', 96, 34, 1, 1, NOW());
