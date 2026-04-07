import {
  ENV_SENSOR_WEIGHTS,
  ENV_TOTAL_WEIGHT,
  TEMPERATURE_THRESHOLDS,
  HUMIDITY_THRESHOLDS,
  PM25_THRESHOLDS
} from './constants';

// Classification functions for environmental sensors
export const classifyTemperature = (tempCelsius) => {
  if (tempCelsius < TEMPERATURE_THRESHOLDS.cold_max || tempCelsius > TEMPERATURE_THRESHOLDS.hot_min) return 2;
  if (tempCelsius < TEMPERATURE_THRESHOLDS.safe_min || tempCelsius > TEMPERATURE_THRESHOLDS.safe_max) return 1;
  return 0;
};

export const classifyHumidity = (humidityPercent) => {
  if (humidityPercent < HUMIDITY_THRESHOLDS.dry_max || humidityPercent > HUMIDITY_THRESHOLDS.humid_min) return 2;
  if (humidityPercent < HUMIDITY_THRESHOLDS.safe_min || humidityPercent > HUMIDITY_THRESHOLDS.safe_max) return 1;
  return 0;
};

export const classifyPM25 = (pm25Value) => {
  if (pm25Value > PM25_THRESHOLDS.unhealthy_min) return 2;
  if (pm25Value > PM25_THRESHOLDS.moderate_max) return 1;
  return 0;
};

// Environmental Fusion Logic (matching Python)
export const environmentalFusion = (temperature, humidity, pm25) => {
  // 1. Classify environmental factors
  const tempRisk = classifyTemperature(temperature);
  const humidityRisk = classifyHumidity(humidity);
  const pm25Risk = classifyPM25(pm25);

  const individualRisks = { temperature: tempRisk, humidity: humidityRisk, pm25: pm25Risk };

  // 2. Identify specific triggers
  const triggers = [];
  if (tempRisk > 0) {
    if (temperature < TEMPERATURE_THRESHOLDS.safe_min) {
      triggers.push(`Cold temperature (${temperature.toFixed(1)}°C)`);
    } else {
      triggers.push(`High temperature (${temperature.toFixed(1)}°C)`);
    }
  }

  if (humidityRisk > 0) {
    if (humidity < HUMIDITY_THRESHOLDS.safe_min) {
      triggers.push(`Low humidity (${humidity.toFixed(1)}%)`);
    } else {
      triggers.push(`High humidity (${humidity.toFixed(1)}%)`);
    }
  }

  if (pm25Risk > 0) {
    triggers.push(`Poor air quality (PM2.5: ${pm25.toFixed(1)} µg/m³)`);
  }

  // 3. Weighted Fusion Calculation
  const weightedSum = (
    (ENV_SENSOR_WEIGHTS.temperature * tempRisk) +
    (ENV_SENSOR_WEIGHTS.humidity * humidityRisk) +
    (ENV_SENSOR_WEIGHTS.pm25 * pm25Risk)
  );
  const riskScore = weightedSum / ENV_TOTAL_WEIGHT;

  // 4. Determine final environmental risk category
  let environmentalRisk = 'SAFE';
  if (riskScore >= 1.5) {
    environmentalRisk = 'HIGH';
  } else if (riskScore >= 0.75) {
    environmentalRisk = 'MEDIUM';
  }

  // 5. Calculate confidence based on agreement between factors
  const riskValues = [tempRisk, humidityRisk, pm25Risk];
  const mean = riskValues.reduce((a, b) => a + b, 0) / riskValues.length;
  const variance = riskValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / riskValues.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(0.5, 1.0 - (stdDev * 0.4));

  // 6. Generate reasoning
  const reasoning = triggers.length > 0
    ? `Environmental triggers detected: ${triggers.join(', ')}. Risk score: ${riskScore.toFixed(2)}`
    : `Environmental conditions are favorable. Risk score: ${riskScore.toFixed(2)}`;

  return {
    environmentalRisk: environmentalRisk.toLowerCase(),
    riskScore: Math.round(riskScore * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    individualRisks,
    triggers
  };
};
