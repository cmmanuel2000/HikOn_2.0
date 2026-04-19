-- 🧪 SCENARIO 1: Personal Best Calibration (Smart Filter Test)
-- This version includes one intentional outlier (82.0) to test the 1.5 SD filter.
-- The final average should ignore the 82.0 and stay around 97.4%.

INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.4, 78, NOW() - INTERVAL '120 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.2, 79, NOW() - INTERVAL '110 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 96.8, 77, NOW() - INTERVAL '100 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.5, 78, NOW() - INTERVAL '90 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.1, 78, NOW() - INTERVAL '80 seconds');

-- 🛑 INTENTIONAL OUTLIER: This should be rejected by the 1.5 SD filter
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 82.0, 75, NOW() - INTERVAL '70 seconds');

INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.3, 78, NOW() - INTERVAL '60 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 96.5, 77, NOW() - INTERVAL '50 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.0, 78, NOW() - INTERVAL '40 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 98.1, 79, NOW() - INTERVAL '30 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.4, 78, NOW() - INTERVAL '20 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.6, 78, NOW() - INTERVAL '10 seconds');
INSERT INTO spo2_calibration (device_id, spo2, heart_rate, created_at) VALUES ('PATIENT-012', 97.5, 78, NOW());

-- Run this, then click "Record Personal Best". 
-- You should see "(1 outliers rejected)" in the final alert.
