-- =====================================================================
-- 🛡️ HIKON 2.1.1: STANDARD EMERGENCY TEST CASES (NO BASELINE)
-- Tests the strict clinical thresholds (95% SpO2, >30 BPM BR).
-- =====================================================================

-- PRE-REQUISITE: Ensure baseline is NULL for these tests
UPDATE patients 
SET spo2_baseline = NULL 
WHERE patient_id = 'PATIENT-001';

-----------------------------------------------------------------------
-- TEST CASE 01: SpO2 exactly 95%
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🔴 HIGH RISK (Red)
-- REASONING: "CRITICAL OVERRIDE: SpO2 at or below 95% triggered safety protocol."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, created_at)
VALUES ('DEMO-01', 95, 18, NOW());


-----------------------------------------------------------------------
-- TEST CASE 02: SpO2 93% (Hypoxia)
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🔴 HIGH RISK (Red)
-- REASONING: "CRITICAL OVERRIDE: SpO2 at or below 95% triggered safety protocol."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, created_at)
VALUES ('DEMO-01', 93, 20, NOW());


-----------------------------------------------------------------------
-- TEST CASE 03: Severe Hypoxemia (88%)
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🔴 HIGH RISK (Red)
-- REASONING: "CRITICAL OVERRIDE: SpO2 at or below 95% triggered safety protocol."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, created_at)
VALUES ('DEMO-01', 88, 22, NOW());


-----------------------------------------------------------------------
-- TEST CASE 04: SpO2 95% + Wheeze (Multiple Triggers)
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🔴 HIGH RISK (Red)
-- REASONING: "CRITICAL OVERRIDE: SpO2 at or below 95% triggered safety protocol."
-- NOTE: The oxygen override fires before it even calculates the wheeze risk.
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, wheeze, created_at)
VALUES ('DEMO-01', 95, 32, 1, NOW());


-----------------------------------------------------------------------
-- TEST CASE 05: All Signals High (Worst Case)
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🔴 HIGH RISK (Red)
-- REASONING: "CRITICAL OVERRIDE: SpO2 at or below 95% triggered safety protocol."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, cough, wheeze, created_at)
VALUES 
('DEMO-01', 94, 35, 1, 1, NOW() - interval '10s'),
('DEMO-01', 94, 35, 1, 1, NOW() - interval '5s'),
('DEMO-01', 94, 35, 1, 1, NOW());
