-- =====================================================================
-- 🛡️ HIKON 2.1.1: COMPREHENSIVE CLINICAL TEST SUITE (EXTENDED)
-- Instructions: Run one block at a time to show off the system's "intelligence."
-- =====================================================================

-----------------------------------------------------------------------
-- SECTION 1: THE SAFE ZONE (GREEN)
-----------------------------------------------------------------------

-- SCENARIO 1A: Perfect Health (School-age)
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, cough, wheeze)
VALUES ('DEMO-01', 99.0, 19, 0, 0);

-- SCENARIO 1B: High-End of Normal (30 BPM is still safe)
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, cough, wheeze)
VALUES ('DEMO-01', 98.0, 30, 0, 0);

-- SCENARIO 1C: Healthy Activity (Supression Test)
-- High BR (33) but 99% Oxygen and high motion magnitude.
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, accel_mag)
VALUES ('DEMO-01', 99, 33, 1.4);

-- SCENARIO 1D: The 98% Clinical Floor
-- 98% is the standard minimum for "Safe". It should stay Green.
INSERT INTO s3_sensor_data (device_id, spo2, br_rate)
VALUES ('DEMO-01', 98.0, 18);


-----------------------------------------------------------------------
-- SECTION 2: EARLY WARNINGS (AMBER / MEDIUM RISK)
-----------------------------------------------------------------------

-- SCENARIO 2A: Mild Hypoxia (96% SpO2)
INSERT INTO s3_sensor_data (device_id, spo2, br_rate)
VALUES ('DEMO-01', 96, 20);

-- SCENARIO 2B: Persistent Wheeze (Persistence Test)
-- 4 distinct wheeze segments in 60s
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, wheeze, created_at) VALUES 
('DEMO-01', 98, 20, 1, NOW() - interval '40s'),
('DEMO-01', 98, 20, 1, NOW() - interval '30s'),
('DEMO-01', 98, 20, 1, NOW() - interval '20s'),
('DEMO-01', 98, 20, 1, NOW());

-- SCENARIO 2C: Bradypnea Warning (Breathing too slow)
-- BR < 18 is an early sign of fatigue in older children.
INSERT INTO s3_sensor_data (device_id, spo2, br_rate)
VALUES ('DEMO-01', 98, 14);


-----------------------------------------------------------------------
-- SECTION 3: ASTHMA EXACERBATION (RED / HIGH RISK)
-----------------------------------------------------------------------

-- SCENARIO 3A: Rapid Cough Burst (Frequency Test)
-- Clean stale data first to ensure clear results
DELETE FROM s3_sensor_data;

-- 8 coughs in 45 seconds with valid Heart Rate to prevent dashboard overrides
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, created_at) VALUES 
('DEMO-01', 97, 75, 22, 1, NOW() - interval '45s'),
('DEMO-01', 97, 75, 22, 1, NOW() - interval '40s'),
('DEMO-01', 97, 75, 22, 1, NOW() - interval '35s'),
('DEMO-01', 97, 75, 22, 1, NOW() - interval '30s'),
('DEMO-01', 97, 75, 22, 1, NOW() - interval '25s'),
('DEMO-01', 97, 75, 22, 1, NOW() - interval '15s'),
('DEMO-01', 97, 75, 22, 1, NOW() - interval '10s'),
('DEMO-01', 97, 75, 22, 1, NOW());

-- SCENARIO 3B: Severe Tachypnea (Resting BR > 35)
INSERT INTO s3_sensor_data (device_id, spo2, br_rate)
VALUES ('DEMO-01', 97, 38);

-- SCENARIO 3C: Critical Hypoxia (SOS Override)
-- SpO2 = 93% + 1 Wheeze = SOS
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, wheeze)
VALUES ('DEMO-01', 93, 25, 1);


-----------------------------------------------------------------------
-- SECTION 4: CALIBRATION OVERRIDE TESTS
-----------------------------------------------------------------------

-- SCENARIO 4A: Is 31 BPM Safe or Alert?
-- IF you have calibrated this child at 31, this will be GREEN.
-- IF they are not calibrated, this will be AMBER.
INSERT INTO s3_sensor_data (device_id, spo2, br_rate)
VALUES ('DEMO-01', 98, 31);


-----------------------------------------------------------------------
-- SECTION 5: ENVIRONMENTAL RISK
-----------------------------------------------------------------------

-- SCENARIO 5A: Critical PM2.5 Pollution
-- Healthy child but unhealthy air quality.
INSERT INTO s3_sensor_data (device_id, spo2, br_rate, pm25)
VALUES ('DEMO-01', 99, 20, 56.4);


-----------------------------------------------------------------------
-- SECTION 6: THE SOS TEST (CRITICAL OVERRIDE)
-----------------------------------------------------------------------

-- SCENARIO 6A: Absolute Emergency (SOS Test)
-- Forces 88% SpO2 and 45 BPM Respiratory Distress
DELETE FROM s3_sensor_data;
INSERT INTO s3_sensor_data (device_id, spo2, heart_rate, br_rate, cough, wheeze, created_at)
VALUES ('DEMO-SOS', 88, 120, 45, 10, 10, NOW());
