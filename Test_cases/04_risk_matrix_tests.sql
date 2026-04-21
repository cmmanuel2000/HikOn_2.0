-- =====================================================================
-- 🛡️ HIKON 2.1.1: RISK ASSESSMENT MATRIX (LOW / MEDIUM / HIGH)
-- Use these to demonstrate the mathematical "Transition" of risk.
-- =====================================================================

-----------------------------------------------------------------------
-- SCENARIO A: 🟢 LOW RISK (SAFE ZONE)
-----------------------------------------------------------------------
-- SP02: 99.0% (Safe)
-- BR: 19 BPM (Safe)
-- EXPECTED RESULT: 🟢 SAFE
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, wheeze, created_at)
VALUES ('DEMO-01', 99.0, 72, 19, 0, 0, NOW());


-----------------------------------------------------------------------
-- SCENARIO B: 🟡 MEDIUM RISK (ACCUMULATED WARNING)
-----------------------------------------------------------------------
-- SP02: 97.0% (Borderline)
-- Symptoms: 2 Coughs (Moderate frequency)
-- EXPECTED RESULT: 🟡 MEDIUM RISK
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, wheeze, created_at)
VALUES 
('DEMO-01', 97.0, 80, 24, 1, 0, NOW() - interval '30s'),
('DEMO-01', 97.0, 80, 24, 1, 0, NOW());


-----------------------------------------------------------------------
-- SCENARIO C: 🔴 HIGH RISK (MULTIPLE TRIGGERS)
-----------------------------------------------------------------------
-- SP02: 95.0% (Trigger for HIGH risk)
-- BR: 36 BPM (Trigger for HIGH risk)
-- Symptoms: 6 Coughs (5s intervals to ensure burst detection)
-- EXPECTED RESULT: 🔴 HIGH RISK
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, wheeze, created_at)
VALUES 
('DEMO-01', 95.0, 85, 36, 1, 0, NOW() - interval '25s'),
('DEMO-01', 95.0, 85, 36, 1, 0, NOW() - interval '20s'),
('DEMO-01', 95.0, 85, 36, 1, 0, NOW() - interval '15s'),
('DEMO-01', 95.0, 85, 36, 1, 0, NOW() - interval '10s'),
('DEMO-01', 95.0, 85, 36, 1, 0, NOW() - interval '5s'),
('DEMO-01', 95.0, 85, 36, 1, 0, NOW());


-----------------------------------------------------------------------
-- SCENARIO D: 🔴 HIGH RISK (CRITICAL OVERRIDE)
-----------------------------------------------------------------------
-- SP02: 95.0%
-- EXPECTED RESULT: 🔴 HIGH RISK
-- REASONING: "CRITICAL OVERRIDE: SpO2 at or below 95% triggered safety protocol."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, wheeze, created_at)
VALUES ('DEMO-01', 95.0, 90, 18, 0, NOW());


-----------------------------------------------------------------------
-- SCENARIO E: 🔴 HIGH RISK (COUGH BURST)
-----------------------------------------------------------------------
-- COUGHS: 6 coughs within 60 seconds
-- EXPECTED RESULT: 🔴 HIGH RISK
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, wheeze, created_at)
VALUES 
('DEMO-01', 98.0, 75, 20, 1, 0, NOW() - interval '50s'),
('DEMO-01', 98.0, 75, 20, 1, 0, NOW() - interval '40s'),
('DEMO-01', 98.0, 75, 20, 1, 0, NOW() - interval '30s'),
('DEMO-01', 98.0, 75, 20, 1, 0, NOW() - interval '20s'),
('DEMO-01', 98.0, 75, 20, 1, 0, NOW() - interval '10s'),
('DEMO-01', 98.0, 75, 20, 1, 0, NOW());
