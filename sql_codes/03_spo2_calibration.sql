-- 🛒 New Calibration Table (v2.1.1)
-- One row per sample for better real-time processing

CREATE TABLE IF NOT EXISTS spo2_calibration (
    id SERIAL PRIMARY KEY,
    device_id TEXT,
    spo2 NUMERIC,
    heart_rate NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster fetching of the latest calibration session
CREATE INDEX IF NOT EXISTS idx_spo2_calib_created ON spo2_calibration(created_at DESC);
