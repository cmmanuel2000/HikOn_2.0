// Physiological Sensor Weights (matching Python)
export const SENSOR_WEIGHTS = {
  symptom: 1.0,
  spo2: 2.5,
  breathing: 1.5,
};

export const TOTAL_WEIGHT = 5.0; // symptom + spo2 + breathing

// Physiological Risk Thresholds
export const RISK_THRESHOLDS = {
  safe_max: 0.67,
  medium_max: 1.33,
  high_min: 1.33,
};

export const SPO2_THRESHOLDS = {
  high_max: 95,
  safe_min: 98,
};

export const BREATHING_THRESHOLDS_3_TO_7_YRS = {
  safe_min: 20,
  safe_max: 34,
  medium_max: 40,
};

export const BREATHING_THRESHOLDS_6_TO_12_YRS = {
  safe_min: 18,
  safe_max: 30, // Updated: 18-30 is Safe
  medium_max: 35, // High risk starts above 35
};

// Environmental Sensor Weights
export const ENV_SENSOR_WEIGHTS = {
  temperature: 1.0,
  humidity: 1.5,
  pm25: 2.0,
};

export const ENV_TOTAL_WEIGHT = 4.5; // temperature + humidity + pm25

// Temperature Risk Thresholds (°C)
export const TEMPERATURE_THRESHOLDS = {
  cold_max: 15.0,
  safe_min: 18.0,
  safe_max: 24.0,
  hot_min: 28.0,
};

// Humidity Risk Thresholds (%)
export const HUMIDITY_THRESHOLDS = {
  dry_max: 30.0,
  safe_min: 40.0,
  safe_max: 60.0,
  humid_min: 70.0,
};

// PM2.5 Risk Thresholds (µg/m³)
export const PM25_THRESHOLDS = {
  good_max: 12.0,
  moderate_max: 35.4,
  unhealthy_min: 35.5,
};
