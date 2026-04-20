-- 🧪 SCENARIO 2: Motion Tiers & Alert Suppression
-- Run these segments one at a time to test real-time dashboard reactions.

-- =====================================================================
-- Segment A: STEADY (Resting Simulation)
-- This loop runs for 10 seconds, uploading 1 sample per second.
-- Variance is low (Steady), so Risk Badge stays Green.
-- =====================================================================
DO $$
BEGIN
    FOR i IN 1..10 LOOP
        INSERT INTO accel_values (device_id, accel_x, accel_y, accel_z, accel_magnitude, created_at) 
        VALUES ('sim_hikon_01', 0.01, 0.01, 0.98, 0.98, NOW());
        
        COMMIT; -- Attempt to commit each row individually
        PERFORM pg_sleep(1); 
    END LOOP;
END $$;


-- =====================================================================
-- Segment B: MOVING (Intense Activity Simulation)
-- This loop runs for 10 seconds, uploading wild accelerometer values.
-- Variance is high (Moving), so Risk Badge will switch to "MOTION".
-- =====================================================================
DO $$
DECLARE
    -- Arrays for simulated wild movement
    x float[] := ARRAY[0.5, 0.1, 1.2, -0.3, 0.8, 1.5, -0.8, 0.2, 1.1, 0.4];
    y float[] := ARRAY[0.8, -0.4, 1.1, 0.9, -0.2, 1.5, 0.4, -0.9, 0.1, 1.2];
    z float[] := ARRAY[1.2, 0.8, 0.5, 1.4, 0.3, 0.1, 1.1, 1.5, 0.4, 0.8];
    m float[] := ARRAY[1.5, 0.9, 1.7, 1.6, 0.9, 2.1, 1.4, 1.7, 1.2, 1.5];
BEGIN
    FOR i IN 1..10 LOOP
        INSERT INTO accel_values (device_id, accel_x, accel_y, accel_z, accel_magnitude, created_at) 
        VALUES ('sim_hikon_01', x[i], y[i], z[i], m[i], NOW());
        
        COMMIT;
        PERFORM pg_sleep(1);
    END LOOP;
END $$;

-- Note: After Segment B, the dashboard will wait for 5 minutes of STEADY data
-- before it starts alerting again (Stability Cooldown).
