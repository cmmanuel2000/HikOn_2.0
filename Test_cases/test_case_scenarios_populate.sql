-- =====================================================================
-- 🛡️ HIKON 2.1.1: CLINICAL TEST CASE REPOSITORY (Database Edition)
-- This script populates the 'test_case_scenarios' table with all 
-- clinical validation cases, including fusion logic and motion segments.
-- =====================================================================

CREATE TABLE IF NOT EXISTS test_case_scenarios (
    test_case_id VARCHAR(20) PRIMARY KEY,
    suite VARCHAR(100),
    description TEXT,
    spo2_baseline NUMERIC(5,2),
    spo2 NUMERIC(5,2),
    hr NUMERIC(5,2),
    br NUMERIC(5,2),
    cough INT,
    wheeze INT,
    accel_mag VARCHAR(100),
    expected_result VARCHAR(50),
    reasoning TEXT
);

TRUNCATE TABLE test_case_scenarios;

-- ============================================================
-- 🔴 SUITE: HIGH RISK EMERGENCY
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning) VALUES
('EM-01', 'Emergency', 'SpO2 exactly 95%', NULL, 95.0, NULL, 18, 0, 0, 'STEADY', 'HIGH RISK', 'SpO2 <= 95% is a critical override branch.'),
('EM-02', 'Emergency', 'SpO2 93% (Hypoxia)', NULL, 93.0, NULL, 20, 0, 0, 'STEADY', 'HIGH RISK', 'SpO2 below safety protocol threshold.'),
('EM-03', 'Emergency', 'Severe Hypoxemia (88%)', NULL, 88.0, NULL, 22, 0, 0, 'STEADY', 'HIGH RISK', 'Life-threatening oxygen saturation level.'),
('EM-04', 'Emergency', 'SpO2 95% + Wheeze', NULL, 95.0, NULL, 32, 0, 1, 'STEADY', 'HIGH RISK', 'Oxygen override triggers before symptom assessment.'),
('EM-05', 'Emergency', 'All Signals High', NULL, 94.0, NULL, 35, 3, 3, 'STEADY', 'HIGH RISK', 'Multiple severe triggers firing simultaneously.');

-- ============================================================
-- 🔴 SUITE: CLINICAL FUSION & SYMPTOMS
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning) VALUES
('SA-01', 'Symptom & Activity', 'High-Frequency Cough Burst', NULL, 98.0, NULL, 20, 6, 0, 'STEADY', 'HIGH RISK', '6+ coughs in 60s window triggers high risk.'),
('SA-04', 'Symptom & Activity', 'Severe Attack (Fusion)', 98.0, 96.0, NULL, 34, 3, 3, 'STEADY', 'HIGH RISK', 'Moderate hypoxia combined with severe cough/wheeze frequency.'),
('RM-C', 'Risk Matrix', 'High Risk Fusion Matrix', NULL, 95.0, 85, 36, 6, 0, 'STEADY', 'HIGH RISK', 'Weighted Fusion: High BR + Low SpO2 + Cough Burst.'),
('FC-H2', 'Final Comprehensive', 'Severe Multi-Sensor Cluster', NULL, 96.0, NULL, 38, 6, 0, 'STEADY', 'HIGH RISK', 'Math: 1.50 Score (Weight: SpO2 2.5, BR 1.5, Sym 1.0).');

-- ============================================================
-- 🟡 SUITE: MEDIUM RISK 
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning) VALUES
('SA-02', 'Symptom & Activity', 'Moderate Wheeze Frequency', NULL, 98.0, NULL, 20, 0, 3, 'STEADY', 'MEDIUM RISK', '3 wheezes in 60s window results in medium risk.'),
('RM-B', 'Risk Matrix', 'Borderline Warning Score', NULL, 97.0, 80, 24, 2, 0, 'STEADY', 'MEDIUM RISK', 'Individual sensor warnings accumulate to 0.80 score.'),
('FC-M1', 'Final Comprehensive', 'Mild Distress Fusion', NULL, 97.0, NULL, 24, 0, 0, 'STEADY', 'MEDIUM RISK', 'Score 0.80 (Threshold > 0.67).');

-- ============================================================
-- 🟢 SUITE: SAFE & SUPPRESSION
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning) VALUES
('SA-03', 'Symptom & Activity', 'Physical Activity (Running)', NULL, 99.0, NULL, 35, 0, 0, 'RUNNING (>0.20)', 'SAFE', 'High vitals are naturally suppressed by intense motion.'),
('FC-S1', 'Final Comprehensive', 'Resting (Optimal)', NULL, 99.0, 72, 22, 0, 0, 'STEADY', 'SAFE', 'All physiological signals within healthy pediatric range.'),
('FC-S2', 'Final Comprehensive', 'High BR during Exercise', NULL, 98.5, NULL, 42, 0, 0, 'RUNNING (>0.20)', 'SAFE', 'BR >35 suppressed due to active motion detection.');

-- ============================================================
-- 💎 SUITE: PERSONAL BEST BASELINES
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning) VALUES
('PB-06', 'Personal Best', 'At Baseline (94% vs 94%)', 94.0, 94.0, NULL, 20, 0, 0, 'STEADY', 'SAFE', 'Patient matches their personal best baseline.'),
('PB-08', 'Personal Best', 'Below Baseline (93% vs 94%)', 94.0, 93.0, NULL, 20, 0, 0, 'STEADY', 'HIGH RISK', 'Oxygen dropped below personal best baseline.'),
('FC-B1', 'Final Comprehensive', 'Baseline Shield (95%)', 95.0, 95.0, NULL, NULL, 0, 0, 'STEADY', 'SAFE', 'SpO2 95% is normally High, but baseline 95 marks it Safe.');

-- ============================================================
-- ⏳ SUITE: TIME-SENSITIVE / MEDICATION
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning) VALUES
('FC-T1', 'Medication', 'Initial Severe State', NULL, 94.5, NULL, 40, 8, 0, 'STEADY', 'HIGH RISK', 'Start of 20-minute observation window.'),
('FC-T2', 'Medication', 'Post-Medication Recovery', NULL, 98.8, NULL, 18, 0, 0, 'STEADY', 'SAFE', 'Clinical recovery confirmed via sensors post-treatment.');
