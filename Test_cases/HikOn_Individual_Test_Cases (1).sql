-- =====================================================================
-- 🛡️ HIKON 2.1.1: SORTED INDIVIDUAL TEST CASES
-- Generated from clinical logic classification (High Risk -> Safe)
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
    accel_mag VARCHAR(50),
    expected_result VARCHAR(50),
    reasoning TEXT
);

TRUNCATE TABLE test_case_scenarios;


-- ============================================================
-- 🔴 HIGH RISK SCENARIOS
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('PB-08', 'Personal Best', 'SpO2 93% vs Baseline 94%', 94.0, 93.0, NULL, 20, 0, 0, NULL, 'HIGH RISK', 'SpO2 below baseline triggers safety protocol');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('EM-01', 'Standard Emergency', 'SpO2 exactly 95%', NULL, 95.0, NULL, 18, 0, 0, NULL, 'HIGH RISK', 'SpO2 <= 95% critical override');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('EM-02', 'Standard Emergency', 'SpO2 93% (Hypoxia)', NULL, 93.0, NULL, 20, 0, 0, NULL, 'HIGH RISK', 'SpO2 <= 95% critical override');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('EM-03', 'Standard Emergency', 'Severe Hypoxemia (88%)', NULL, 88.0, NULL, 22, 0, 0, NULL, 'HIGH RISK', 'SpO2 <= 95% critical override');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('EM-04', 'Standard Emergency', 'SpO2 95% + Wheeze', NULL, 95.0, NULL, 32, 0, 1, NULL, 'HIGH RISK', 'Oxygen override fires before wheeze risk');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('EM-05', 'Standard Emergency', 'All Signals High', NULL, 94.0, NULL, 35, 3, 3, NULL, 'HIGH RISK', 'Multiple severe triggers');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('SA-01', 'Symptom & Activity', 'High-Frequency Cough Burst', NULL, 98.0, NULL, 20, 6, 0, NULL, 'HIGH RISK', '6 coughs in 60s window');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('SA-04', 'Symptom & Activity', 'Severe Attack', NULL, 96.0, NULL, 34, 3, 3, NULL, 'HIGH RISK', 'Hypoxia + Severe symptoms');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('RM-C', 'Risk Matrix', 'High Risk (Multiple Triggers)', NULL, 95.0, 85, 36, 6, 0, NULL, 'HIGH RISK', 'High BR + Low SpO2 + Cough Burst');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('RM-D', 'Risk Matrix', 'High Risk (Critical SpO2)', NULL, 95.0, 90, 18, 0, 0, NULL, 'HIGH RISK', 'SpO2 <= 95%');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('RM-E', 'Risk Matrix', 'High Risk (Cough Burst)', NULL, 98.0, 75, 20, 6, 0, NULL, 'HIGH RISK', '6 coughs within 60s');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-H1', 'Final Comprehensive', 'Critical SpO2 Override', NULL, 94.0, NULL, NULL, 0, 0, NULL, 'HIGH RISK', 'SpO2 <= 95% Protocol Bypass');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-H2', 'Final Comprehensive', 'Severe Multi-Sensor Fusion', NULL, 96.0, NULL, 38, 6, 0, NULL, 'HIGH RISK', 'Score 7.5/5.0 (1.50) >= 1.33');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-T1', 'Final Comprehensive', 'Medication Escalation', NULL, 94.5, NULL, 40, 8, 0, NULL, 'HIGH RISK', 'Initial Severe State (>20 min wait test)');


-- ============================================================
-- 🟡 MEDIUM RISK SCENARIOS
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('SA-02', 'Symptom & Activity', 'Moderate Wheeze Frequency', NULL, 98.0, NULL, 20, 0, 3, NULL, 'MEDIUM RISK', '3 wheezes in 30s window');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('RM-B', 'Risk Matrix', 'Medium Risk Scenario', NULL, 97.0, 80, 24, 2, 0, NULL, 'MEDIUM RISK', 'Accumulated warning score');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-M1', 'Final Comprehensive', 'Mild Distress Fusion', NULL, 97.0, NULL, 24, 0, 0, NULL, 'MEDIUM RISK', 'Score 4.0/5.0 (0.80) > 0.67');


-- ============================================================
-- 🟢 SAFE SCENARIOS
-- ============================================================

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('PB-06', 'Personal Best', 'SpO2 95% vs Baseline 94%', 94.0, 95.0, NULL, 20, 0, 0, NULL, 'SAFE', 'SpO2 is at or above baseline');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('PB-07', 'Personal Best', 'SpO2 94% vs Baseline 94%', 94.0, 94.0, NULL, 20, 0, 0, NULL, 'SAFE', 'SpO2 is at or above baseline');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('SA-03', 'Symptom & Activity', 'Physical Activity (Running)', NULL, 99.0, NULL, 35, 0, 0, '1.4', 'SAFE', 'High vitals suppressed by running motion');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('RM-A', 'Risk Matrix', 'Low Risk Scenario', NULL, 99.0, 72, 19, 0, 0, NULL, 'SAFE', 'All vitals optimal');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-S1', 'Final Comprehensive', 'Perfect Health', NULL, 99.0, 72, 22, 0, 0, NULL, 'SAFE', 'Optimal Vitals');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-S2', 'Final Comprehensive', 'High BR suppressed by RUNNING', NULL, 98.5, NULL, 42, 0, 0, '0.5-1.5', 'SAFE', 'Activity suppression');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-S3', 'Final Comprehensive', 'Activity Detected (Fusion)', NULL, 97.2, NULL, 38, 0, 0, '~1.0', 'SAFE', 'High vitals + steady motion = activity logic');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-B1', 'Final Comprehensive', 'Protected by Personal Best', 95.0, 95.0, NULL, NULL, 0, 0, NULL, 'SAFE', 'Matches PB Baseline');

INSERT INTO test_case_scenarios (test_case_id, suite, description, spo2_baseline, spo2, hr, br, cough, wheeze, accel_mag, expected_result, reasoning)
VALUES ('FC-T2', 'Final Comprehensive', 'Recovery Verification', NULL, 98.8, NULL, 18, 0, 0, NULL, 'SAFE', 'Post-medication recovery state');

