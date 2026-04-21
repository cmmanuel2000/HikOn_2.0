-- =====================================================================
-- 🛡️ HIKON 2.1.1: RISK ASSESSMENT MATRIX (LOW / MEDIUM / HIGH)
-- Use these to demonstrate the mathematical "Transition" of risk.
-- =====================================================================

-----------------------------------------------------------------------
-- SCENARIO A: 🟢 LOW RISK (SAFE ZONE)
-----------------------------------------------------------------------
-- SP02: 99.0% (Safe)
-- BR: 19 BPM (Safe)
-- Symptoms: 0
-- EXPECTED RESULT: 🟢 SAFE
-- REASONING: "Weighted score... results in SAFE risk."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, wheeze, created_at)
VALUES ('DEMO-DEVICE', 99, 72, 19, 0, 0, NOW());


-----------------------------------------------------------------------
-- SCENARIO B: 🟡 MEDIUM RISK (ACCUMULATED WARNING)
-----------------------------------------------------------------------
-- SP02: 97.0% (Borderline)
-- Symptoms: 2 Coughs (Moderate frequency)
-- EXPECTED RESULT: 🟡 MEDIUM RISK
-- REASONING: "Weighted score... results in MEDIUM risk."
-- TRIGGER: "Mild Respiratory Symptoms", "Low SpO2"
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, created_at)
VALUES 
('DEMO-DEVICE', 97, 80, 24, 1, NOW() - interval '30s'),
('DEMO-DEVICE', 97, 80, 24, 1, NOW());


-----------------------------------------------------------------------
-- SCENARIO C: 🔴 HIGH RISK (MULTIPLE TRIGGERS)
-----------------------------------------------------------------------
-- SP02: 96.0% (Low)
-- BR: 32 BPM (Rapid)
-- Symptoms: 4 Coughs
-- EXPECTED RESULT: 🔴 HIGH RISK
-- NOTE: Even though SpO2 > 95, the COMBINATION of Low SpO2 + High BR + Coughing creates a 3.0 High Risk.
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, created_at)
VALUES 
('DEMO-DEVICE', 96, 95, 32, 1, NOW() - interval '45s'),
('DEMO-DEVICE', 96, 95, 32, 1, NOW() - interval '30s'),
('DEMO-DEVICE', 96, 95, 32, 1, NOW() - interval '15s'),
('DEMO-DEVICE', 96, 95, 32, 1, NOW());


-----------------------------------------------------------------------
-- SCENARIO D: 🔴 HIGH RISK (CRITICAL OVERRIDE)
-----------------------------------------------------------------------
-- SP02: 95.0%
-- EXPECTED RESULT: 🔴 HIGH RISK
-- REASONING: "CRITICAL OVERRIDE: SpO2 at or below 95% triggered safety protocol."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, created_at)
VALUES ('DEMO-DEVICE', 95, 75, 18, NOW());
