/**
 * Breathing Rate Calculator
 * 
 * Calculates breathing rate from accelerometer data stored in the accel_values table.
 * Uses a dual-axis calibrated zero-crossing algorithm for both RESTING and ACTIVE states.
 * 
 * Calibrated against manual breath counts:
 *   Dwayne:    Rest 21, Active 27
 *   Kim:       Rest 22, Active 29
 *   Miguelito: Rest 32, Active 29
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Calibration constants for RESTING state (Using Z-Axis)
const REST_ZC_SLOPE = 2.732;
const REST_ZC_INTERCEPT = 18.918;

// Calibration constants for ACTIVE state (Using Z-Axis)
const ACTIVE_ZC_SLOPE = 5.895;
const ACTIVE_ZC_INTERCEPT = 21.897;

// Rest detection threshold: accel_magnitude std dev must be below this
const REST_THRESHOLD = 0.05;

// Window size for analysis (number of accel rows)
const ANALYSIS_WINDOW = 10;

/**
 * Calculate standard deviation of an array
 */
function stdDev(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Count upward zero-crossings in a de-meaned signal
 */
function countZeroCrossings(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const signal = values.map(v => v - mean);
  
  let crossings = 0;
  for (let i = 1; i < signal.length; i++) {
    // Count when signal crosses from negative to positive or vice versa
    if ((signal[i - 1] < 0 && signal[i] >= 0) || (signal[i - 1] >= 0 && signal[i] < 0)) {
      crossings++;
    }
  }
  return crossings;
}

/**
 * Determine if a window of accel data represents a "rest" state
 */
function isAtRest(magnitudes) {
  return stdDev(magnitudes) < REST_THRESHOLD;
}

/**
 * Fetch recent accelerometer data and calculate breathing rate
 * Returns: { breathingRate: number|null, isAtRest: boolean, confidence: string }
 */
export async function calculateBreathingRate() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { breathingRate: null, isAtRest: false, confidence: 'no_data' };
  }

  try {
    // Fetch last 30 accel readings (about 5 minutes at ~10s intervals)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/accel_values?order=created_at.desc&limit=30&select=accel_x,accel_y,accel_z,accel_magnitude,created_at`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      console.error('[BreathingRate] Failed to fetch accel data:', response.statusText);
      return { breathingRate: null, isAtRest: false, confidence: 'error' };
    }

    const rows = await response.json();
    if (rows.length < ANALYSIS_WINDOW) {
      console.log('[BreathingRate] Not enough data points:', rows.length);
      return { breathingRate: null, isAtRest: false, confidence: 'insufficient_data' };
    }

    // Reverse so oldest is first (natural time order)
    rows.reverse();

    // We now support both Rest and Active patterns, so we just take the most recent complete window.
    let bestBPM = null;
    let patientAtRest = false;

    // Most recent window is at the end because of rows.reverse()
    const window = rows.slice(rows.length - ANALYSIS_WINDOW, rows.length);
    const magnitudes = window.map(r => r.accel_magnitude);

    patientAtRest = isAtRest(magnitudes);
    let bpm = 0;

    if (patientAtRest) {
      // Resting: Use Z-axis for zero-crossing analysis
      const zValues = window.map(r => r.accel_z);
      const zeroCrossings = countZeroCrossings(zValues);
      bpm = REST_ZC_SLOPE * zeroCrossings + REST_ZC_INTERCEPT;
      console.log(`[BreathingRate] Rest detected. ZC_Z=${zeroCrossings}, Calculated BPM=${bpm}`);
    } else {
      // Active: Use Z-axis for zero-crossing analysis
      const zValues = window.map(r => r.accel_z);
      const zeroCrossings = countZeroCrossings(zValues);
      bpm = ACTIVE_ZC_SLOPE * zeroCrossings + ACTIVE_ZC_INTERCEPT;
      console.log(`[BreathingRate] Active motion detected. ZC_Z=${zeroCrossings}, Calculated BPM=${bpm}`);
    }

    // Clamp to physiological range (children: 12-60 BPM)
    bestBPM = Math.max(12, Math.min(60, Math.round(bpm)));

    return {
      breathingRate: bestBPM,
      isAtRest: patientAtRest,
      confidence: patientAtRest ? 'measured' : 'estimated'
    };
  } catch (error) {
    console.error('[BreathingRate] Error:', error);
    return { breathingRate: null, isAtRest: false, confidence: 'error' };
  }
}
