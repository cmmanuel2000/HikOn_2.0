-- =====================================================================
-- 🛡️ HIKON 2.1.1: PERSONAL BEST (PB) OVERRIDE TEST CASES
-- Use these to verify that the dashboard respects the child's baseline.
-- =====================================================================

-- PRE-REQUISITE: Set the baseline for your test patient
-- This tells the system that 94% is the child's "Good" baseline.
UPDATE patients 
SET spo2_baseline = 94 
WHERE patient_id = 'PATIENT-001';

-----------------------------------------------------------------------
-- TEST CASE 06: SpO2 95% vs Baseline 94%
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🟢 SAFE (Green)
-- REASONING: "SAFE: SpO2 (95%) is at or above the child's Personal Best baseline (94%)."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, created_at)
VALUES ('DEMO-01', 95, 20, NOW());


-----------------------------------------------------------------------
-- TEST CASE 07: SpO2 94% vs Baseline 94%
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🟢 SAFE (Green)
-- REASONING: "SAFE: SpO2 (94%) is at or above the child's Personal Best baseline (94%)."
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, created_at)
VALUES ('DEMO-01', 94, 20, NOW());


-----------------------------------------------------------------------
-- TEST CASE 08: SpO2 93% vs Baseline 94%
-----------------------------------------------------------------------
-- EXPECTED RESULT: 🔴 HIGH RISK (Red)
-- REASONING: "CRITICAL OVERRIDE: SpO2 at or below 95% triggered safety protocol."
-- NOTE: Since 93% is BELOW the 94% baseline, the safety protocol fires.
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, created_at)
VALUES ('DEMO-01', 93, 20, NOW());


-----------------------------------------------------------------------
-- RESET: Clear baseline for standard testing
-----------------------------------------------------------------------
-- UPDATE patients SET spo2_baseline = NULL WHERE patient_id = 'PATIENT-001';
