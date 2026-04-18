-- ============================================
-- Patient ID Table Setup
-- Run this in the Supabase SQL Editor
-- ============================================

-- Create the patients table
CREATE TABLE IF NOT EXISTS patient_id (
    id SERIAL PRIMARY KEY,
    patient_id TEXT UNIQUE DEFAULT NULL,  -- auto-set by trigger, e.g. 'PATIENT-001'
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    added_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Auto-generate patient_id (PATIENT-001, PATIENT-002 …) from the row id
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.patient_id IS NULL THEN
        NEW.patient_id := 'PATIENT-' || LPAD(NEW.id::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_patient_id
BEFORE INSERT ON patient_id
FOR EACH ROW EXECUTE FUNCTION generate_patient_id();

-- Seed with the default patients already used in the app
INSERT INTO patient_id (patient_id, name, age, gender)
VALUES
    ('PATIENT-001', 'Patient 1', 5, 'Male'),
    ('PATIENT-002', 'Patient 2', 6, 'Female')
ON CONFLICT (patient_id) DO NOTHING;

-- Index for fast lookup by patient_id string
CREATE INDEX IF NOT EXISTS idx_patient_id_pid ON patient_id(patient_id);

-- Drop the unique constraint on device_id if it exists
-- s3_sensor_data is a time-series table; many rows per device is expected
ALTER TABLE s3_sensor_data DROP CONSTRAINT IF EXISTS s3_sensor_data_device_id_unique;

-- Add patient_id column to s3_sensor_data if it doesn't exist yet
-- Default is NULL so new ESP32 rows are untagged until the dashboard stamps them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 's3_sensor_data'
        AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE s3_sensor_data
        ADD COLUMN patient_id TEXT DEFAULT NULL;

        CREATE INDEX idx_s3_sensor_data_patient_id
        ON s3_sensor_data(patient_id);
    ELSE
        -- If column already exists, remove any hardcoded default so new rows arrive as NULL
        ALTER TABLE s3_sensor_data ALTER COLUMN patient_id DROP DEFAULT;
    END IF;
END $$;

-- Grant access to Supabase roles
GRANT ALL ON patient_id TO authenticated;
GRANT ALL ON patient_id TO anon;
GRANT USAGE, SELECT ON SEQUENCE patient_id_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE patient_id_id_seq TO anon;

-- Verify
SELECT * FROM patient_id ORDER BY id;

SELECT '✅ patient_id table setup complete!' AS status;
