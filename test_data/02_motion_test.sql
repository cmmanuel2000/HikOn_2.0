-- 🧪 SCENARIO 2: Motion Tiers & Alert Suppression
-- Run these segments to test if the dashboard correctly identifies STEADY vs MOVING states.

-- Segment A: STEADY (Resting)
-- Values are very close together (low variance).
-- Risk Badge should show normal alerts.
INSERT INTO accel_values (accel_x, accel_y, accel_z, accel_magnitude) VALUES 
(0.01, 0.01, 0.98, 0.98),
(0.02, 0.01, 0.97, 0.97),
(0.01, 0.02, 0.98, 0.98),
(0.01, 0.01, 0.99, 0.99),
(0.02, 0.01, 0.98, 0.98),
(0.01, 0.01, 0.97, 0.97),
(0.01, 0.02, 0.98, 0.98),
(0.02, 0.01, 0.99, 0.99),
(0.01, 0.01, 0.98, 0.98),
(0.01, 0.01, 0.98, 0.98);

-- Segment B: MOVING (Intense Activity)
-- Values vary wildly (high variance > 0.20 std dev).
-- Risk Badge should switch to "MOTION" and suppress all SpO2 alerts.
INSERT INTO accel_values (accel_x, accel_y, accel_z, accel_magnitude) VALUES 
(0.5, 0.8, 1.2, 1.5),
(0.1, -0.4, 0.8, 0.9),
(1.2, 1.1, 0.5, 1.7),
(-0.3, 0.9, 1.4, 1.6),
(0.8, -0.2, 0.3, 0.9),
(1.5, 1.5, 0.1, 2.1),
(-0.8, 0.4, 1.1, 1.4),
(0.2, -0.9, 1.5, 1.7),
(1.1, 0.1, 0.4, 1.2),
(0.4, 1.2, 0.8, 1.5);

-- Note: After Segment B, the dashboard will wait for 5 minutes of STEADY data
-- before it starts alerting again (Stability Cooldown).
