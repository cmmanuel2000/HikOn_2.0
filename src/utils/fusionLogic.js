import { 
  SENSOR_WEIGHTS, 
  TOTAL_WEIGHT, 
  RISK_THRESHOLDS,
  SPO2_THRESHOLDS,
  BREATHING_THRESHOLDS_3_TO_7_YRS
} from './constants';

// Classification functions for physiological sensors
export const classifySpo2 = (spo2Value) => {
  if (spo2Value <= SPO2_THRESHOLDS.high_max) return 2; // High risk
  if (spo2Value < SPO2_THRESHOLDS.safe_min) return 1;  // Medium risk
  return 0; // Safe
};

export const classifyBreathingRate = (bpm) => {
  if (bpm > BREATHING_THRESHOLDS_3_TO_7_YRS.medium_max) return 2; // High risk
  if (bpm > BREATHING_THRESHOLDS_3_TO_7_YRS.safe_max) return 1;   // Medium risk
  return 0; // Safe
};

export const classifySymptomSeverity = (wheezeCount, coughs) => {
  if (wheezeCount > 0 && coughs > 5) return 2; // High risk
  if (wheezeCount > 0 || coughs > 0) return 1; // Medium risk
  return 0; // Safe
};

// Hybrid Fusion Logic (matching Python)
export const hybridFusion = (wheezeCount, coughCount, spo2Value, breathingRate) => {
  // 1. Classify raw sensor values
  const symptomRisk = classifySymptomSeverity(wheezeCount, coughCount);
  const spo2Risk = classifySpo2(spo2Value);
  const breathingRisk = classifyBreathingRate(breathingRate);

  const individualRisks = { symptom: symptomRisk, spo2: spo2Risk, breathing: breathingRisk };
  const symptomLog = { wheeze: wheezeCount, coughs: coughCount };

  // 2. Activity Filter (Prevent false positives from running)
  if (breathingRisk >= 1 && spo2Value >= 97 && symptomRisk === 0) {
    return {
      finalRisk: 'SAFE',
      riskScore: 0.2,
      confidence: 0.90,
      reasoning: 'Activity Detected: High breathing rate with optimal SpO2 and no symptoms.',
      individualRisks,
      symptomLog,
      spo2WasCritical: false,
      isPhysicalActivity: true,
      triggers: []
    };
  }

  // 3. Safety Guardrail: Critical SpO2 (<= 92%)
  if (spo2Risk === 2) {
    return {
      finalRisk: 'HIGH',
      riskScore: 2.0,
      confidence: 0.95,
      reasoning: 'CRITICAL OVERRIDE: SpO2 at or below 92% triggered safety protocol.',
      individualRisks,
      symptomLog,
      spo2WasCritical: true,
      isPhysicalActivity: false,
      triggers: ['Critical SpO2 Level', 'Immediate Medical Attention Needed']
    };
  }

  // 4. Weighted Fusion Calculation
  const weightedSum = (
    (SENSOR_WEIGHTS.symptom * symptomRisk) +
    (SENSOR_WEIGHTS.spo2 * spo2Risk) +
    (SENSOR_WEIGHTS.breathing * breathingRisk)
  );
  const riskScore = weightedSum / TOTAL_WEIGHT;

  // 5. Determine final risk category
  let finalRisk = 'SAFE';
  if (riskScore >= RISK_THRESHOLDS.high_min) {
    finalRisk = 'HIGH';
  } else if (riskScore > RISK_THRESHOLDS.safe_max) {
    finalRisk = 'MEDIUM';
  }

  // 6. Generate triggers based on individual risks
  const triggers = [];
  if (symptomRisk === 2) triggers.push('Severe Respiratory Symptoms');
  else if (symptomRisk === 1) triggers.push('Mild Respiratory Symptoms');
  if (spo2Risk === 1) triggers.push('Low SpO2');
  if (breathingRisk === 2) triggers.push('Rapid Breathing Rate');
  else if (breathingRisk === 1) triggers.push('Elevated Breathing Rate');

  // Confidence based on sensor agreement
  const riskValues = [symptomRisk, spo2Risk, breathingRisk];
  const mean = riskValues.reduce((a, b) => a + b, 0) / riskValues.length;
  const variance = riskValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / riskValues.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(0.5, 1.0 - (stdDev * 0.4));

  return {
    finalRisk,
    riskScore: Math.round(riskScore * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Weighted score of ${riskScore.toFixed(2)} results in ${finalRisk} risk.`,
    individualRisks,
    symptomLog,
    spo2WasCritical: false,
    isPhysicalActivity: false,
    triggers
  };
};
