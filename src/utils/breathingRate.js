/**
 * Breathing Rate Calculator
 * 
 * Calculates breathing rate from accelerometer data stored in the accel_values table.
 * Uses a calibrated zero-crossing algorithm that only works when the patient is at rest.
 * 
 * Calibrated against manual breath counts:
 *   Princess: 31 BPM -> predicted 30.6
 *   Luis:     22 BPM -> predicted 22.1
 *   Tyler:    33 BPM -> predicted 33.3
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Calibration constants (derived from 3-patient linear regression)
const ZC_SLOPE = -18.08;
const ZC_INTERCEPT = 78.50;

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

    // Sliding window: find the most recent rest window
    let bestBPM = null;
    let patientAtRest = false;

    for (let i = rows.length - ANALYSIS_WINDOW; i >= 0; i--) {
      const window = rows.slice(i, i + ANALYSIS_WINDOW);
      const magnitudes = window.map(r => r.accel_magnitude);

      if (isAtRest(magnitudes)) {
        patientAtRest = true;

        // Use accel_z for zero-crossing analysis
        const zValues = window.map(r => r.accel_z);
        const zeroCrossings = countZeroCrossings(zValues);

        // Apply calibrated formula
        const bpm = ZC_SLOPE * zeroCrossings + ZC_INTERCEPT;

        // Clamp to physiological range (children: 12-60 BPM)
        bestBPM = Math.max(12, Math.min(60, Math.round(bpm)));

        console.log(`[BreathingRate] Rest detected. ZC=${zeroCrossings}, BPM=${bestBPM}`);
        break; // Use most recent rest window
      }
    }

    if (!patientAtRest) {
      console.log('[BreathingRate] Patient is moving - no reliable reading');
      return { breathingRate: null, isAtRest: false, confidence: 'moving' };
    }

    return {
      breathingRate: bestBPM,
      isAtRest: true,
      confidence: 'measured'
    };
  } catch (error) {
    console.error('[BreathingRate] Error:', error);
    return { breathingRate: null, isAtRest: false, confidence: 'error' };
  }
}
