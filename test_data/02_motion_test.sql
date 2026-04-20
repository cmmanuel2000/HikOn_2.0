-- 🧪 SCENARIO 2: Motion Tiers & Alert Suppression
-- Run these segments one at a time to test real-time dashboard reactions.

-- =====================================================================
-- Segment A: STEADY (Resting)
-- Variance is very low. Dashboard will show "STEADY" (Green).
-- =====================================================================
DO $$
BEGIN
    FOR i IN 1..10 LOOP
        INSERT INTO accel_values (device_id, accel_x, accel_y, accel_z, accel_magnitude, gyro_x, gyro_y, gyro_z, created_at) 
        VALUES ('sim_hikon_01', 0.01, 0.01, 0.98, 0.98, 0.0, 0.0, 0.0, NOW());
        PERFORM pg_sleep(1); 
    END LOOP;
END $$;


-- =====================================================================
-- Segment B: WALKING (Light Activity)
-- Variance is medium (0.05 - 0.20). Dashboard will show "WALKING" (Amber).
-- =====================================================================
DO $$
DECLARE
    m float[] := ARRAY[1.0, 1.1, 1.2, 1.0, 0.9, 1.1, 1.2, 1.0, 1.1, 0.9];
BEGIN
    FOR i IN 1..10 LOOP
        INSERT INTO accel_values (device_id, accel_x, accel_y, accel_z, accel_magnitude, gyro_x, gyro_y, gyro_z, created_at) 
        VALUES ('sim_hikon_01', 0.1, 0.1, 1.0, m[i], 0.0, 0.0, 0.0, NOW());
        PERFORM pg_sleep(1); 
    END LOOP;
END $$;


-- =====================================================================
-- Segment C: RUNNING (Intense Activity)
-- Variance is high (> 0.20). Dashboard will show "MOTION" (Red).
-- Alerts will be suppressed and a 5-minute cooldown will start after this.
-- =====================================================================
DO $$
DECLARE
    m float[] := ARRAY[1.5, 0.5, 1.8, 0.2, 1.4, 2.1, 0.3, 1.7, 1.2, 0.9];
BEGIN
    FOR i IN 1..10 LOOP
        INSERT INTO accel_values (device_id, accel_x, accel_y, accel_z, accel_magnitude, gyro_x, gyro_y, gyro_z, created_at) 
        VALUES ('sim_hikon_01', 0.5, 0.8, 1.2, m[i], 0.0, 0.0, 0.0, NOW());
        PERFORM pg_sleep(1); 
    END LOOP;
END $$;

-- Note: After Segment B, the dashboard will wait for 5 minutes of STEADY data
-- before it starts alerting again (Stability Cooldown).
