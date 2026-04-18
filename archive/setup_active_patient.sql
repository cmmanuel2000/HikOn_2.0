-- ============================================
-- Active Patient System Setup
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- Create a table to store which patient is currently active
CREATE TABLE IF NOT EXISTS active_patient (
    id INTEGER PRIMARY KEY DEFAULT 1,
    patient_id TEXT NOT NULL,
    patient_name TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default active patient
INSERT INTO active_patient (id, patient_id, patient_name)
VALUES (1, 'PATIENT-001', 'Patient 1')
ON CONFLICT (id) DO NOTHING;

-- Create function to update active patient
CREATE OR REPLACE FUNCTION update_active_patient(
    new_patient_id TEXT,
    new_patient_name TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE active_patient
    SET patient_id = new_patient_id,
        patient_name = new_patient_name,
        updated_at = NOW()
    WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Add patient_id to s3_sensor_data if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 's3_sensor_data' 
        AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE s3_sensor_data 
        ADD COLUMN patient_id TEXT DEFAULT 'PATIENT-001';
        
        CREATE INDEX idx_sensor_data_patient_id 
        ON s3_sensor_data(patient_id);
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON active_patient TO authenticated;
GRANT ALL ON active_patient TO anon;
GRANT EXECUTE ON FUNCTION update_active_patient TO authenticated;
GRANT EXECUTE ON FUNCTION update_active_patient TO anon;

-- View current active patient
SELECT * FROM active_patient;

SELECT '✅ Active patient system setup complete!' as status;
