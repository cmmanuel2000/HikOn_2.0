-- ============================================
-- 02. Sensor Data Table Update
-- Ensuring all columns exist for clinical snapshots.
-- ============================================

-- Ensure patient_id column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 's3_sensor_data' 
        AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE s3_sensor_data ADD COLUMN patient_id TEXT;
    END IF;
END $$;

-- Check for clinical columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 's3_sensor_data' 
        AND column_name = 'cough'
    ) THEN
        ALTER TABLE s3_sensor_data ADD COLUMN cough INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 's3_sensor_data' 
        AND column_name = 'wheeze'
    ) THEN
        ALTER TABLE s3_sensor_data ADD COLUMN wheeze INTEGER DEFAULT 0;
    END IF;
END $$;
