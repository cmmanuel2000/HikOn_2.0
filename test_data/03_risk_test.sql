-- 🧪 SCENARIO 3: Clinical Risk Levels
-- These INSERTs will trigger different "Risk Badge" colors and assessment messages.

-- 🟢 State: SAFE
-- Everything looks normal.
INSERT INTO s3_sensor_data (device_id, patient_id, spo2, heart_rate, br_rate, cough, wheeze, temperature, humidity, pm25)
VALUES ('XIAO-012', 'PATIENT-012', 98.2, 75, 18, 0, 0, 24.5, 45, 12);

-- 🟡 State: MEDIUM RISK (SpO2 Warning)
-- SpO2 falls below 96%.
INSERT INTO s3_sensor_data (device_id, patient_id, spo2, heart_rate, br_rate, cough, wheeze, temperature, humidity, pm25)
VALUES ('XIAO-012', 'PATIENT-012', 93.5, 82, 22, 2, 0, 24.5, 48, 15);

-- 🔴 State: HIGH RISK (Critical SpO2)
-- SpO2 falls below 92%.
INSERT INTO s3_sensor_data (device_id, patient_id, spo2, heart_rate, br_rate, cough, wheeze, temperature, humidity, pm25)
VALUES ('XIAO-012', 'PATIENT-012', 91.0, 95, 28, 5, 1, 25.0, 50, 18);

-- 🟠 State: SYMPTOM ALERT (High Coughing)
-- Heavy coughing detected.
INSERT INTO s3_sensor_data (device_id, patient_id, spo2, heart_rate, br_rate, cough, wheeze, temperature, humidity, pm25)
VALUES ('XIAO-012', 'PATIENT-012', 97.0, 78, 20, 15, 0, 24.0, 42, 10);

-- 🌐 State: ENVIRONMENTAL RISK
-- High PM2.5 (Unhealthy Air Quality) will trigger a surround warning.
INSERT INTO s3_sensor_data (device_id, patient_id, spo2, heart_rate, br_rate, cough, wheeze, temperature, humidity, pm25)
VALUES ('XIAO-012', 'PATIENT-012', 98.0, 75, 18, 0, 0, 24.0, 85, 55.4);
