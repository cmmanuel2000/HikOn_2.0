-- 🧪 SCENARIO 1: Personal Best Calibration
-- This simulates a successful 2-minute "Record Personal Best" session.
-- After running this, look at your "Physical Status" panel and it should show the 97% average.

INSERT INTO oximeter_calibration (device_id, sample_count, samples)
VALUES (
    'PATIENT-012',
    12,
    '{
        "samples": [
            {"spo2": 97, "hr": 78},
            {"spo2": 98, "hr": 79},
            {"spo2": 96, "hr": 77},
            {"spo2": 97, "hr": 78},
            {"spo2": 97, "hr": 78},
            {"spo2": 98, "hr": 79},
            {"spo2": 97, "hr": 78},
            {"spo2": 96, "hr": 77},
            {"spo2": 97, "hr": 78},
            {"spo2": 98, "hr": 79},
            {"spo2": 97, "hr": 78},
            {"spo2": 97, "hr": 78}
        ]
    }'::jsonb
);

-- Note: In the dashboard, you still need to click "Record Personal Best" 
-- for the system to fetch this latest row and calculate the average.
