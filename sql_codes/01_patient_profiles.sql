-- ============================================
-- 01. Patient Profiles Table
-- Stores child metadata and their SpO2 Personal Best.
-- ============================================

CREATE TABLE IF NOT EXISTS patient_id (
    id SERIAL PRIMARY KEY,
    patient_id TEXT UNIQUE, -- e.g., 'PATIENT-001'
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    spo2_baseline NUMERIC DEFAULT NULL, -- The "Personal Best" (Calculated later)
    added_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Seed with default patient
INSERT INTO patient_id (patient_id, name, age, gender)
VALUES ('PATIENT-001', 'Luis', 5, 'Male')
ON CONFLICT (patient_id) DO NOTHING;
