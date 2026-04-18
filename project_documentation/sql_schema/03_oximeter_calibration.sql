-- ============================================
-- 03. Oximeter Calibration Table
-- Stores high-frequency SpO2 data during "Personal Best" recording sessions.
-- ============================================

CREATE TABLE IF NOT EXISTS oximeter_calibration (
    id SERIAL PRIMARY KEY,
    patient_id TEXT, -- Link to the child being calibrated
    spo2 NUMERIC,
    heart_rate NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session retrieval
CREATE INDEX IF NOT EXISTS idx_oxi_cal_patient ON oximeter_calibration(patient_id);
