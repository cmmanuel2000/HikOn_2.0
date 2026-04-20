-- =====================================================================
-- 🛡️ HIKON 2.1.1: RAW ACCELEROMETER TEST DATA (04_accel_test.sql)
-- Instructions: Run this for HIGH-RESOLUTION per-second data.
-- This simulates 30 seconds of live breathing at 1-second intervals.
-- =====================================================================

-- Clear old samples so we have a clean window
DELETE FROM public.accel_values;

-- Injects 30 samples (30 seconds of data at 1-second intervals)
-- Includes mandatory device_id AND gyro_x/y/z values
INSERT INTO public.accel_values (device_id, accel_x, accel_y, accel_z, accel_magnitude, gyro_x, gyro_y, gyro_z, created_at) VALUES 
('XIAO-01', 0.01, 0.02, 1.00, 1.00, 0, 0, 0, NOW() - interval '29s'),
('XIAO-01', 0.02, 0.01, 1.03, 1.03, 0, 0, 0, NOW() - interval '28s'),
('XIAO-01', 0.01, 0.02, 1.05, 1.05, 0, 0, 0, NOW() - interval '27s'),
('XIAO-01', 0.00, 0.01, 1.03, 1.03, 0, 0, 0, NOW() - interval '26s'),
('XIAO-01', 0.01, 0.02, 1.00, 1.00, 0, 0, 0, NOW() - interval '25s'),
('XIAO-01', 0.02, 0.01, 0.97, 0.97, 0, 0, 0, NOW() - interval '24s'),
('XIAO-01', 0.01, 0.02, 0.95, 0.95, 0, 0, 0, NOW() - interval '23s'),
('XIAO-01', 0.00, 0.01, 0.97, 0.97, 0, 0, 0, NOW() - interval '22s'),
('XIAO-01', 0.01, 0.02, 1.00, 1.00, 0, 0, 0, NOW() - interval '21s'),
('XIAO-01', 0.02, 0.01, 1.03, 1.03, 0, 0, 0, NOW() - interval '20s'),
('XIAO-01', 0.01, 0.02, 1.05, 1.05, 0, 0, 0, NOW() - interval '19s'),
('XIAO-01', 0.00, 0.01, 1.03, 1.03, 0, 0, 0, NOW() - interval '18s'),
('XIAO-01', 0.01, 0.02, 1.00, 1.00, 0, 0, 0, NOW() - interval '17s'),
('XIAO-01', 0.02, 0.01, 0.97, 0.97, 0, 0, 0, NOW() - interval '16s'),
('XIAO-01', 0.01, 0.02, 0.95, 0.95, 0, 0, 0, NOW() - interval '15s'),
('XIAO-01', 0.00, 0.01, 0.97, 0.97, 0, 0, 0, NOW() - interval '14s'),
('XIAO-01', 0.01, 0.02, 1.00, 1.00, 0, 0, 0, NOW() - interval '13s'),
('XIAO-01', 0.02, 0.01, 1.03, 1.03, 0, 0, 0, NOW() - interval '12s'),
('XIAO-01', 0.01, 0.02, 1.05, 1.05, 0, 0, 0, NOW() - interval '11s'),
('XIAO-01', 0.00, 0.01, 1.03, 1.03, 0, 0, 0, NOW() - interval '10s'),
('XIAO-01', 0.01, 0.02, 1.00, 1.00, 0, 0, 0, NOW() - interval '9s'),
('XIAO-01', 0.02, 0.01, 0.97, 0.97, 0, 0, 0, NOW() - interval '8s'),
('XIAO-01', 0.01, 0.02, 0.95, 0.95, 0, 0, 0, NOW() - interval '7s'),
('XIAO-01', 0.00, 0.01, 0.97, 0.97, 0, 0, 0, NOW() - interval '6s'),
('XIAO-01', 0.01, 0.02, 1.00, 1.00, 0, 0, 0, NOW() - interval '5s'),
('XIAO-01', 0.02, 0.01, 1.03, 1.03, 0, 0, 0, NOW() - interval '4s'),
('XIAO-01', 0.01, 0.02, 1.05, 1.05, 0, 0, 0, NOW() - interval '3s'),
('XIAO-01', 0.00, 0.01, 1.03, 1.03, 0, 0, 0, NOW() - interval '2s'),
('XIAO-01', 0.01, 0.02, 1.00, 1.00, 0, 0, 0, NOW() - interval '1s'),
('XIAO-01', 0.01, 0.01, 0.98, 0.98, 0, 0, 0, NOW());
