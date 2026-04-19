-- 🧪 PRE-REQUISITE: Create Test Patient
-- Run this if you don't already have a patient with ID 'PATIENT-012'.

INSERT INTO patient_id (patient_id, name, age, gender)
VALUES ('PATIENT-012', 'Test Child (012)', 7, 'Male')
ON CONFLICT (patient_id) DO NOTHING;
