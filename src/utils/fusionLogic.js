import { 
  SENSOR_WEIGHTS, 
  TOTAL_WEIGHT, 
  RISK_THRESHOLDS,
  SPO2_THRESHOLDS,
  BREATHING_THRESHOLDS_3_TO_7_YRS,
  BREATHING_THRESHOLDS_6_TO_12_YRS
} from './constants.js';

// Classification functions for physiological sensors
export const classifySpo2 = (spo2Value, spo2Baseline = null) => {
  // Personal Best Override: If at or above personal best, it is considered SAFE for this child
  if (spo2Baseline && spo2Value >= spo2Baseline) return 0;
  
  if (spo2Value <= SPO2_THRESHOLDS.high_max) return 2; // High risk (<= 95%)
  if (spo2Value < SPO2_THRESHOLDS.safe_min) return 1;  // Medium risk (< 98%)
  return 0; // Safe
};

export const classifyBreathingRate = (bpm, age = 5, breathingBaseline = null) => {
  const thresholds = age >= 6 ? BREATHING_THRESHOLDS_6_TO_12_YRS : BREATHING_THRESHOLDS_3_TO_7_YRS;
  
  // Dynamic Range Matching:
  // We strictly follow the image (Safe <= 22, High > 30) but allow the baseline to expand the "normal"
  const baseline = breathingBaseline ? parseFloat(breathingBaseline) : null;
  const safeMin = baseline ? Math.min(thresholds.safe_min, baseline) : thresholds.safe_min;
  const safeMax = baseline ? Math.max(thresholds.safe_max, baseline) : thresholds.safe_max;
  
  // High risk threshold follows the baseline if it exceeds the standard (30)
  const highTrigger = baseline ? Math.max(thresholds.medium_max, baseline) : thresholds.medium_max;
  
  // Risk 2 (High): > 30 (or > baseline if baseline is higher)
  if (bpm > highTrigger) return 2; 
  
  // Risk 1 (Medium): Outside Safe Zone
  if (bpm > safeMax || bpm < safeMin) return 1; 
  
  return 0; // Risk 0 (Safe)
};

export const classifySymptomSeverity = (burstCoughs, burstWheezes) => {
  // Burst-Based Detection (60-second rolling window)
  
  // High Risk: High frequency burst
  if (burstCoughs > 5 || burstWheezes >= 6) return 2; 
  
  // Medium Risk: Occasional symptoms detected
  if (burstCoughs >= 1 || burstWheezes >= 3) return 1; 
  
  return 0; // Safe
};

// Hybrid Fusion Logic (matching Python)
export const hybridFusion = (wheezeCount, coughCount, spo2Value, breathingRate, age = 5, spo2Baseline = null, breathingBaseline = null, motionStatus = 'STEADY') => {
  // 1. Classify raw sensor values
  const symptomRisk = classifySymptomSeverity(wheezeCount, coughCount);
  const spo2Risk = classifySpo2(spo2Value, spo2Baseline);
  
  // 2. Breathing Logic with Motion Suppression
  let breathingRisk = classifyBreathingRate(breathingRate, age, breathingBaseline);
  
  // If child is running, we ignore high breathing rate because it is physiological
  if (motionStatus === 'RUNNING' && breathingRisk >= 1) {
    breathingRisk = 0;
  }

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

  // 3. Safety Guardrail: Critical SpO2 (<= 95%)
  if (spo2Risk === 2) {
    return {
      finalRisk: 'HIGH',
      riskScore: 2.0,
      confidence: 0.95,
      reasoning: `CRITICAL OVERRIDE: SpO2 at or below ${SPO2_THRESHOLDS.high_max}% triggered safety protocol.`,
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
