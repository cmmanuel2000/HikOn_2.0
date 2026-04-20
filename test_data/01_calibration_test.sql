-- 🧪 SCENARIO 1: Clinical Calibration (Simplified)
-- This simulates clinical data coming from the device without a patient name.
-- It includes SpO2 and the new Breathing Rate (br_rate) data.

INSERT INTO spo2_calibration (device_id, spo2, br_rate, heart_rate, created_at) VALUES
('hikon_test_01', 98, 16, 72, NOW() - interval '110 seconds'),
('hikon_test_01', 97, 17, 74, NOW() - interval '100 seconds'),
('hikon_test_01', 98, 16, 71, NOW() - interval '90 seconds'),
('hikon_test_01', 99, 16, 70, NOW() - interval '80 seconds'),
('hikon_test_01', 98, 15, 72, NOW() - interval '70 seconds'),
('hikon_test_01', 98, 16, 73, NOW() - interval '60 seconds'),
('hikon_test_01', 97, 17, 75, NOW() - interval '50 seconds'),
('hikon_test_01', 98, 18, 72, NOW() - interval '40 seconds'),
('hikon_test_01', 98, 16, 70, NOW() - interval '20 seconds'),
('hikon_test_01', 99, 17, 72, NOW() - interval '10 seconds'),
('hikon_test_01', 98, 16, 73, NOW());
