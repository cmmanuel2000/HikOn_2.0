import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  ComposedChart,
  ReferenceLine,
  Legend
} from 'recharts';
import { 
  Activity, 
  Wind, 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  History, 
  LayoutDashboard, 
  Settings, 
  Bell, 
  User,
  Plus,
  Phone,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Cloud,
  Zap,
  CheckCircle2,
  Heart,
  Moon,
  Sun,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  X
} from 'lucide-react';

// --- SUPABASE CONFIG ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// --- FUSION LOGIC UTILITIES ---
import { hybridFusion } from './utils/fusionLogic';
import { environmentalFusion } from './utils/environmentalFusion';
import { calculateBreathingRate } from './utils/breathingRate';
import { calibrateSpO2, calibrateHeartRate, resetHRBuffer } from './utils/sensorCalibration';

// --- HOOKS ---
import { usePatientManagement } from './hooks/usePatientManagement';

// --- COMPONENTS ---
import { HikOnLogo, RiskBadge, Reading, ActionCard, StatCard } from './components/UIComponents';




// Fetch historical data from Supabase
const fetchHistoricalData = async (days, patientId = null, role = 'admin', age = 5) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const patientFilter = (role === 'admin' && patientId) ? `&patient_id=eq.${patientId}` : '';

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/s3_sensor_data?created_at=gte.${startDate.toISOString()}${patientFilter}&order=created_at.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch historical data');
      return [];
    }

    const rawData = await response.json();
    
    // Group data by day and aggregate
    const groupedByDay = {};
    
    rawData.forEach(record => {
      const date = new Date(record.created_at);
      const dayKey = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      
      if (!groupedByDay[dayKey]) {
        groupedByDay[dayKey] = {
          date: dayKey,
          fullDate: date.toISOString(),
          spo2Values: [],
          heartRateValues: [],
          breathingRateValues: [],
          tempValues: [],
          humidityValues: [],
          pm25Values: [],
          wheezeCount: 0,
          coughCount: 0,
        };
      }
      
      // Collect values for averaging
      if (record.spo2) groupedByDay[dayKey].spo2Values.push(record.spo2);
      if (record.heart_rate) groupedByDay[dayKey].heartRateValues.push(record.heart_rate);
      if (record.br_rate !== null && record.br_rate !== undefined) groupedByDay[dayKey].breathingRateValues.push(record.br_rate);
      if (record.temperature) groupedByDay[dayKey].tempValues.push(record.temperature);
      if (record.humidity) groupedByDay[dayKey].humidityValues.push(record.humidity);
      if (record.pm25) groupedByDay[dayKey].pm25Values.push(record.pm25);
      
      // Count symptoms from binary columns OR prediction labels
      const isCough = record.cough === 1 || (record.prediction_label && record.prediction_label.toLowerCase().includes('cough'));
      const isWheeze = record.wheeze === 1 || (record.prediction_label && record.prediction_label.toLowerCase().includes('wheeze'));
      
      if (isCough) groupedByDay[dayKey].coughCount++;
      if (isWheeze) groupedByDay[dayKey].wheezeCount++;

    });
    
    // Calculate averages and create final data structure
    const historicalData = Object.values(groupedByDay).map(day => {
      const avgSpo2Raw = day.spo2Values.length > 0 
        ? day.spo2Values.reduce((a, b) => a + b, 0) / day.spo2Values.length 
        : 98;
      // Apply chest sensor calibration to historical SpO2
      const avgSpo2 = calibrateSpO2(avgSpo2Raw) || avgSpo2Raw;
      
      // Apply median filter to historical HR (removes outlier over/under-counts)
      const validHR = day.heartRateValues.filter(v => v > 20 && v < 250);
      const avgHeartRate = validHR.length > 0 
        ? validHR.sort((a, b) => a - b)[Math.floor(validHR.length / 2)]
        : (day.heartRateValues.length > 0 
          ? day.heartRateValues.reduce((a, b) => a + b, 0) / day.heartRateValues.length 
          : 72);
          
      // Extract breathing rate from Supabase br_rate, fallback to HR derived if missing
      const validBR = day.breathingRateValues.filter(v => v > 8 && v < 60);
      const avgBreathingRate = validBR.length > 0 
        ? Math.round(validBR.sort((a, b) => a - b)[Math.floor(validBR.length / 2)])
        : (avgHeartRate > 0 ? Math.round(avgHeartRate / 4.5) : 16);
      const avgTemp = day.tempValues.length > 0 
        ? day.tempValues.reduce((a, b) => a + b, 0) / day.tempValues.length 
        : 24;
      const avgHumidity = day.humidityValues.length > 0 
        ? day.humidityValues.reduce((a, b) => a + b, 0) / day.humidityValues.length 
        : 50;
      const avgPm25 = day.pm25Values.length > 0 
        ? day.pm25Values.reduce((a, b) => a + b, 0) / day.pm25Values.length 
        : 12;
      
      // Calculate risk score using fusion logic
      const fusionResult = hybridFusion(
        day.wheezeCount,
        day.coughCount,
        avgSpo2,
        avgBreathingRate,
        age
      );
      
      const hasAsthmaEvent = fusionResult.finalRisk !== 'SAFE' ? 1 : 0;
      
      return {
        date: day.date,
        fullDate: day.fullDate,
        spo2: avgSpo2,
        heartRate: Math.round(avgHeartRate),
        breathingRate: avgBreathingRate,
        coughCount: day.coughCount,
        wheezeCount: day.wheezeCount,
        riskScore: fusionResult.riskScore,
        riskLevel: fusionResult.finalRisk === 'HIGH' ? 2 : fusionResult.finalRisk === 'MEDIUM' ? 1 : 0,
        temperature: avgTemp,
        humidity: avgHumidity,
        pm25: avgPm25,
        hasAsthmaEvent
      };
    });
    
    return historicalData;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState(null);
  const [theme, setTheme] = useState('light');
  const [lastSync, setLastSync] = useState('Syncing...');
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [dateRange, setDateRange] = useState('7d'); // '7d', '30d', '90d'
  const [trendData, setTrendData] = useState([]);
  const [timeRange, setTimeRange] = useState('7d'); // '7d', '30d', '90d'
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTestingMode, setIsTestingMode] = useState(false);

  // --- MOTION & SMART ALERTS ---
  const [motionStatus, setMotionStatus] = useState('STEADY');
  const [intenseMotionEndedAt, setIntenseMotionEndedAt] = useState(null); // Timestamp when 'MOVING' stopped
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // --- CALIBRATION (PERSONAL BEST) ---
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationTimer, setCalibrationTimer] = useState(120); // 2 minutes (120s)
  const [calibrationSamples, setCalibrationSamples] = useState([]);

  // 24-hour SpO2 trend data for continuity chart (real Supabase data)
  const [vitalsTrend, setVitalsTrend] = useState([]);

  // Raw (uncalibrated) sensor data for Risk Assessment tab
  const defaultRawSensors = { spo2: 'N/A', heartRate: 'N/A', breathingRate: 'N/A', temperature: 'N/A', humidity: 'N/A', pm25: 'N/A', aqi: 'N/A', wheezeCount: 0, coughCount: 0, physioRisk: 'safe', riskScore: 0, confidence: 0, reasoning: 'Waiting for data...', individualRisks: { symptom: 0, spo2: 0, breathing: 0 }, physioTriggers: [], envRisk: 'safe', envTriggers: [], isPhysicalActivity: false, spo2WasCritical: false };
  const [rawSensors, setRawSensors] = useState(defaultRawSensors);
  
  // --- PATIENT MANAGEMENT (USING HOOK) ---
  const patientManagement = usePatientManagement();
  const { 
    patients, 
    selectedPatientId, 
    setSelectedPatientId,
    selectedPatient, 
    patientsLoaded,
    patientSensorData,
    sensors, 
    setSensors,
    isPatientModalOpen,
    editingPatient,
    newPatientName,
    newPatientAge,
    newPatientGender,
    setNewPatientName,
    setNewPatientAge,
    setNewPatientGender,
    openAddPatientModal,
    openEditPatientModal,
    closePatientModal,
    savePatient,
    deletePatient,
    updateActivePatientInSupabase,
    updateSpo2Baseline
  } = patientManagement;

  // Bronchodilator Reversibility State
  const [medicationGivenAt, setMedicationGivenAt] = useState(null);
  const [medicationTimer, setMedicationTimer] = useState(0);
  const [treatmentStatus, setTreatmentStatus] = useState(null); // 'monitoring', 'resolved', 'escalated'
  
  // Medication Observation Window Logic
  useEffect(() => {
    if (!medicationGivenAt || treatmentStatus === 'resolved' || treatmentStatus === 'escalated') return;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - medicationGivenAt;
      const elapsedMins = elapsedMs / 60000;
      setMedicationTimer(Math.floor(elapsedMs / 1000)); 

      const currentRisk = sensors?.physioRisk || 'safe';
      if (elapsedMins >= 20 && (currentRisk === 'high' || currentRisk === 'medium')) {
        setTreatmentStatus('escalated');
        setAlertMsg("CRITICAL WARNING: Child is not responding to medication (20min elapsed). Seek immediate medical assistance.");
        setIsAlertVisible(true);
      } else if (elapsedMins > 0.5 && currentRisk === 'safe') { // require at least 30 seconds to confirm 'safe' transition
        setTreatmentStatus('resolved');
        setAlertMsg("Symptoms resolved. Treatment successful.");
        setIsAlertVisible(true);
        setTimeout(() => setIsAlertVisible(false), 5000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [medicationGivenAt, sensors?.physioRisk, treatmentStatus]);

  // Smart Alert Cooldown Logic (5 minutes / 300 seconds)
  useEffect(() => {
    let interval;
    if (intenseMotionEndedAt) {
      interval = setInterval(() => {
        const elapsedSecs = Math.floor((Date.now() - intenseMotionEndedAt) / 1000);
        const remaining = Math.max(0, 300 - elapsedSecs);
        setCooldownRemaining(remaining);
        
        if (remaining <= 0) {
          setAlertsEnabled(true);
          setIntenseMotionEndedAt(null);
          clearInterval(interval);
        }
      }, 1000);
    } else if (motionStatus === 'MOVING') {
      setAlertsEnabled(false);
      setCooldownRemaining(0);
    } else {
      setAlertsEnabled(true);
      setCooldownRemaining(0);
    }

    return () => clearInterval(interval);
  }, [intenseMotionEndedAt, motionStatus]);

  const handleLogMedication = () => {
    setMedicationGivenAt(Date.now());
    setTreatmentStatus('monitoring');
  };

  const handleResetMedication = () => {
    setMedicationGivenAt(null);
    setMedicationTimer(0);
    setTreatmentStatus(null);
    setIsAlertVisible(false);
  };

  // --- PERSONAL BEST CALIBRATION LOGIC ---
  const startPbCalibration = () => {
    setCalibrationSamples([]);
    setCalibrationTimer(120); // 2 minutes
    setIsCalibrating(true);
    setAlertMsg("Calibration Started: Keep the child steady for 2 minutes.");
    setIsAlertVisible(true);
  };

  useEffect(() => {
    let timerInterval;
    let fetchInterval;

    if (isCalibrating) {
      // 1. Stable Timer Interval
      timerInterval = setInterval(() => {
        setCalibrationTimer(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setIsCalibrating(false);
            return 0;
          }
          // Update message directly during tick
          setAlertMsg(`Calibration in progress... Keep the child steady. Time remaining: ${next}s`);
          return next;
        });
      }, 1000);

      // 2. Data Fetch Interval
      fetchInterval = setInterval(async () => {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/oximeter_calibration?order=created_at.desc&limit=1`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.length > 0) {
              const samples = data[0].samples?.samples || [];
              if (samples.length > 0) {
                const latestSpo2 = samples[samples.length - 1].spo2;
                if (latestSpo2 > 80) {
                  setCalibrationSamples(prev => [...prev, latestSpo2]);
                }
              }
            }
          }
        } catch (e) {
          console.error('Calibration fetch error:', e);
        }
      }, 10000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (fetchInterval) clearInterval(fetchInterval);
    };
  }, [isCalibrating]); // Only re-run when starting/stopping

  // Handle completion of calibration
  useEffect(() => {
    if (!isCalibrating && calibrationTimer === 0) {
      if (calibrationSamples.length > 0) {
        const average = Math.round(calibrationSamples.reduce((a, b) => a + b, 0) / calibrationSamples.length);
        const patient = patients.find(p => p.id === selectedPatientId);
        
        if (patient) {
          updateSpo2Baseline(patient.id, average).then(success => {
            if (success) {
              setAlertMsg(`Calibration Complete! Personal Best SpO2 set to ${average}%`);
            } else {
              setAlertMsg("Calibration complete, but failed to save to database. Please try again.");
            }
            setIsAlertVisible(true);
            setTimeout(() => setIsAlertVisible(false), 5000);
          });
        }
      } else {
        // No samples collected - likely a connection or sensor issue
        setAlertMsg("Calibration Failed: No sensor data detected. Please check the device connection.");
        setIsAlertVisible(true);
        setTimeout(() => setIsAlertVisible(false), 5000);
      }
      setCalibrationSamples([]);
    }
  }, [isCalibrating, calibrationSamples, calibrationTimer, selectedPatientId, patients]);

  // Stamp all NULL rows to the selected patient immediately
  const recordForPatient = useCallback(async () => {
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;
    setIsRecording(true);
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/s3_sensor_data?patient_id=is.null`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ patient_id: patient.patientId })
      });
      if (res.ok) {
        // Data is successfully tagged in background. 
        // No need to refresh immediately as the current fetch already includes untagged data.
      } else {
        console.error('Record failed:', await res.text());
      }
    } catch (e) {
      console.error('Record error:', e);
    }
    setIsRecording(false);
  }, [patients, selectedPatientId, activeTab]); // Note: dependencies will be updated in next step

  // Fetch RAW (uncalibrated) sensor data for Risk Assessment tab
  const fetchRawSensorData = useCallback(async () => {
    if (isTestingMode) return;
    try {
      const patient = patients.find(p => p.id === selectedPatientId) || patients[0];
      if (!patient) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

      const [latestRes, eventsRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/s3_sensor_data?or=(patient_id.eq.${patient.patientId},patient_id.is.null)&order=created_at.desc&limit=1`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/s3_sensor_data?created_at=gte.${todayStart.toISOString()}&or=(patient_id.eq.${patient.patientId},patient_id.is.null)&select=cough,wheeze,prediction_label`, { headers })
      ]);


      if (!latestRes.ok) return;
      const data = await latestRes.json();
      if (data.length === 0) return;
      const latest = data[0];

      // Auto-tag if untagged data is found
      if (latest.patient_id === null) {
        recordForPatient();
      }

      let wheezeCount = 0, coughCount = 0;
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        wheezeCount = events.reduce((s, e) => {
          const isWheeze = e.wheeze === 1 || (e.prediction_label && e.prediction_label.toLowerCase().includes('wheeze'));
          return s + (isWheeze ? 1 : 0);
        }, 0);
        coughCount = events.reduce((s, e) => {
          const isCough = e.cough === 1 || (e.prediction_label && e.prediction_label.toLowerCase().includes('cough'));
          return s + (isCough ? 1 : 0);
        }, 0);
      }


      // Use raw values — NO calibration applied
      const rawSpo2      = latest.spo2        || 0;
      const rawHeartRate = latest.heart_rate  || 0;
      let   rawBR        = latest.br_rate;
      if (rawBR === null || rawBR === undefined) {
        rawBR = rawHeartRate > 0 ? Math.max(12, Math.min(45, Math.round(rawHeartRate / 4.5))) : 16;
      }

      const fusionResult = hybridFusion(wheezeCount, coughCount, rawSpo2 > 0 ? rawSpo2 : 98, rawBR, patient.age);

      const temperature = latest.temperature || null;
      const humidity    = latest.humidity    || null;
      const pm25        = latest.pm25        || null;
      const envResult   = temperature && humidity && pm25
        ? environmentalFusion(temperature, humidity, pm25)
        : { environmentalRisk: 'safe', triggers: [] };

      const calcAQI = (v) => {
        if (!v) return 'N/A';
        if (v <= 12)    return 'Good';
        if (v <= 35.4)  return 'Moderate';
        if (v <= 55.4)  return 'Unhealthy (Sensitive)';
        if (v <= 150.4) return 'Unhealthy';
        if (v <= 250.4) return 'Very Unhealthy';
        return 'Hazardous';
      };

      setRawSensors({
        spo2:        rawSpo2      > 0 ? rawSpo2.toFixed(1)      : 'N/A',
        heartRate:   rawHeartRate > 0 ? Math.round(rawHeartRate) : 'N/A',
        breathingRate: rawBR,
        temperature: temperature ? temperature.toFixed(1)  : 'N/A',
        humidity:    humidity    ? Math.round(humidity)    : 'N/A',
        pm25:        pm25        ? pm25.toFixed(1)          : 'N/A',
        aqi:         calcAQI(pm25),
        wheezeCount, coughCount,
        physioRisk:      fusionResult.finalRisk.toLowerCase(),
        riskScore:       fusionResult.riskScore,
        confidence:      fusionResult.confidence,
        reasoning:       fusionResult.reasoning,
        individualRisks: fusionResult.individualRisks,
        physioTriggers:  fusionResult.triggers,
        spo2WasCritical: fusionResult.spo2WasCritical,
        isPhysicalActivity: fusionResult.isPhysicalActivity,
        envRisk:     envResult.environmentalRisk,
        envTriggers: envResult.triggers
      });
    } catch (err) {
      console.error('❌ Error fetching raw sensor data:', err);
    }
  }, [selectedPatientId, patients, isTestingMode, recordForPatient]);

  // Fetch latest sensor data from Supabase
  const fetchLatestSensorData = useCallback(async () => {
    if (isTestingMode) return;
    try {
      const patient = patients.find(p => p.id === selectedPatientId) || patients[0];
      if (!patient) return;

      const patientFilter = `or=(patient_id.eq.${patient.patientId},patient_id.is.null)&`;
      const patientFilterWithAmp = `&or=(patient_id.eq.${patient.patientId},patient_id.is.null)`;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

      // Fire the two display fetches in parallel
      const [latestRes, eventsRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/s3_sensor_data?${patientFilter}order=created_at.desc&limit=1`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/s3_sensor_data?created_at=gte.${todayStart.toISOString()}${patientFilterWithAmp}&select=cough,wheeze,prediction_label`, { headers })
      ]);

      if (!latestRes.ok) {
        console.error('Failed to fetch sensor data:', latestRes.statusText);
        return;
      }
      const data = await latestRes.json();
      if (data.length === 0) {
        console.log(`📊 No data yet for ${patient.patientId}`);
        return;
      }
      const latest = data[0];
      
      // Auto-tag untagged records to the current patient
      if (latest.patient_id === null) {
        console.log("🔄 Auto-recording untagged data for patient:", patient.patientId);
        recordForPatient();
      }
      
      console.log('📊 Latest data:', latest);

      let wheezeCount = 0;
      let coughCount = 0;
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        wheezeCount = events.reduce((sum, e) => {
          const isWheeze = e.wheeze === 1 || (e.prediction_label && e.prediction_label.toLowerCase().includes('wheeze'));
          return sum + (isWheeze ? 1 : 0);
        }, 0);
        coughCount = events.reduce((sum, e) => {
          const isCough = e.cough === 1 || (e.prediction_label && e.prediction_label.toLowerCase().includes('cough'));
          return sum + (isCough ? 1 : 0);
        }, 0);
      }


      // Apply chest sensor calibration
      const spo2 = calibrateSpO2(latest.spo2 || 0) || 0;
      const heartRate = calibrateHeartRate(latest.heart_rate || 0) || 0;
      
      // Calculate breathing rate and motion status from accelerometer data
      const brResult = await calculateBreathingRate();
      const motion = brResult.motionStatus || 'STEADY';
      const patientAtRest = brResult.isAtRest;
      
      setMotionStatus(motion);

      // Handle Motion Cooldown for Smart Alerts
      if (motion === 'MOVING') {
        setIntenseMotionEndedAt(null);
        setAlertsEnabled(false);
      } else if (!intenseMotionEndedAt && motionStatus === 'MOVING') {
        // Just transitioned from MOVING to something stable
        setIntenseMotionEndedAt(Date.now());
      }

      // Use device-provided breathing rate or the one we just calculated
      let breathingRate = latest.br_rate || brResult.breathingRate || 16;
      
      // Run physiological fusion logic with real data and Personal Best support
      const fusionResult = hybridFusion(
        wheezeCount,
        coughCount,
        spo2 > 0 ? spo2 : 98,
        breathingRate,
        patient?.age || 5,
        patient?.spo2Baseline
      );

      // Run environmental fusion logic
      const temperature = latest.temperature || null;
      const humidity = latest.humidity || null;
      const pm25 = latest.pm25 || null;
      const envResult = temperature && humidity && pm25 
        ? environmentalFusion(temperature, humidity, pm25)
        : { environmentalRisk: 'safe', triggers: [] };

      // Calculate AQI from PM2.5 (US EPA standard)
      const calculateAQI = (pm25Value) => {
        if (!pm25Value) return 'N/A';
        if (pm25Value <= 12) return 'Good';
        if (pm25Value <= 35.4) return 'Moderate';
        if (pm25Value <= 55.4) return 'Unhealthy (Sensitive)';
        if (pm25Value <= 150.4) return 'Unhealthy';
        if (pm25Value <= 250.4) return 'Very Unhealthy';
        return 'Hazardous';
      };

      // Update sensor data for this patient
      setSensors({
        spo2: spo2 > 0 ? spo2.toFixed(1) : 'N/A',
        heartRate: heartRate > 0 ? Math.round(heartRate) : 'N/A',
        breathingRate: breathingRate,
        respiratorySounds: latest.wheeze === 1 ? 'Wheeze Detected' : 
                          latest.cough === 1 ? 'Cough Detected' : 'Normal',
        temperature: temperature ? temperature.toFixed(1) : 'N/A',
        humidity: humidity ? Math.round(humidity) : 'N/A',
        pm25: pm25 ? pm25.toFixed(1) : 'N/A',
        aqi: calculateAQI(pm25),
        wheezeCount: wheezeCount,
        coughCount: coughCount,
        
        // Physiological fusion results
        physioRisk: fusionResult.finalRisk.toLowerCase(),
        riskScore: fusionResult.riskScore,
        confidence: fusionResult.confidence,
        reasoning: fusionResult.reasoning,
        individualRisks: fusionResult.individualRisks,
        symptomLog: fusionResult.symptomLog,
        spo2WasCritical: fusionResult.spo2WasCritical,
        isPhysicalActivity: fusionResult.isPhysicalActivity,
        physioTriggers: fusionResult.triggers,
        
        // Environmental fusion results
        envRisk: envResult.environmentalRisk,
        envTriggers: envResult.triggers
      });

      console.log(`📊 Data loaded from device ${latest.device_id}: SpO2=${spo2}%, HR=${heartRate} BPM, Risk=${latest.risk_level}`);
      
      // Update last sync time after successful fetch
      setLastSync(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
      
    } catch (error) {
      console.error('❌ Error fetching sensor data:', error);
    }
  }, [selectedPatientId, patients, isTestingMode, userRole, recordForPatient]);


  // Fetch 24-hour vitals trend from Supabase
  const fetch24HourVitals = useCallback(async () => {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const patient = patients.find(p => p.id === selectedPatientId) || patients[0];
      if (!patient) return;
      const patientFilter = `&or=(patient_id.eq.${patient.patientId},patient_id.is.null)`;

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/s3_sensor_data?created_at=gte.${twentyFourHoursAgo.toISOString()}${patientFilter}&order=created_at.asc&select=created_at,spo2`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch 24h vitals');
        return;
      }

      const rawData = await response.json();
      
      if (rawData.length === 0) {
        console.log('No 24h data available yet');
        return;
      }
      
      // Group by hour and average
      const hourlyData = {};
      rawData.forEach(record => {
        if (!record.spo2) return;
        const date = new Date(record.created_at);
        const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
        
        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = { time: hourKey, spo2Values: [] };
        }
        hourlyData[hourKey].spo2Values.push(record.spo2);
      });
      
      // Calculate averages and format
      const formattedData = Object.values(hourlyData)
        .map(hour => ({
          time: hour.time,
          spo2: hour.spo2Values.reduce((a, b) => a + b, 0) / hour.spo2Values.length
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
      
      setVitalsTrend(formattedData);
      console.log(`📊 Loaded ${formattedData.length} hours of 24h vitals data`);
      
    } catch (error) {
      console.error('Error fetching 24h vitals:', error);
    }
  }, [selectedPatientId, patients, userRole]);

  // Fetch sensor data every 10 seconds (ESP32 uploads every ~10-15 seconds)
  useEffect(() => {
    fetchLatestSensorData();
    fetch24HourVitals();
    fetchRawSensorData();
    
    const timer = setInterval(() => {
      fetchLatestSensorData();
      fetchRawSensorData();
    }, 5000);
    
    const vitalsTimer = setInterval(() => {
      fetch24HourVitals();
    }, 300000);
    
    return () => {
      clearInterval(timer);
      clearInterval(vitalsTimer);
    };
  }, [fetchLatestSensorData, fetch24HourVitals, fetchRawSensorData]);

  // Load historical data only when the history tab is open and a patient is selected
  useEffect(() => {
    setTrendData([]); // Clear stale data immediately when patient changes
    if (activeTab !== 'history') return;
    if (userRole === 'admin' && !selectedPatient?.patientId) return;
    
    const loadHistoricalData = async () => {
      setIsLoadingHistory(true);
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data = await fetchHistoricalData(days, selectedPatient?.patientId, userRole, selectedPatient?.age || 5);
      setTrendData(data);
      setIsLoadingHistory(false);
    };
    loadHistoricalData();
  }, [selectedPatientId, activeTab, userRole, selectedPatient, dateRange]); // Reload when patient or tab changes


  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };


  const handleDateRangeChange = async (range) => {
    setDateRange(range);
    setIsLoadingHistory(true);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = await fetchHistoricalData(days, selectedPatient?.patientId, userRole);
    setTrendData(data);
    setIsLoadingHistory(false);
  };

  const themeClasses = {
    bg: theme === 'light' ? 'bg-[#f1f5f9]' : 'bg-[#0f172a]',
    sidebar: theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#151c2e] border-slate-800',
    card: theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#1e293b] border-slate-700',
    header: theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-[#151c2e]/80 border-slate-800',
    text: theme === 'light' ? 'text-slate-900' : 'text-white',
    subtext: theme === 'light' ? 'text-slate-500' : 'text-slate-400',
    border: theme === 'light' ? 'border-slate-200' : 'border-slate-800',
    footer: theme === 'light' ? 'bg-white/80 border-slate-100' : 'bg-[#151c2e]/80 border-slate-800'
  };

  if (!userRole) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center font-sans selection:bg-lime-200 antialiased relative"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.85)), url('/bg-hikon.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="z-10 flex flex-col items-center max-w-2xl w-full px-8 py-12 m-4 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-md border border-slate-700/50 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
          <div className="mb-8 p-6 bg-slate-900/50 rounded-full backdrop-blur-lg border border-slate-700/50 shadow-inner">
            <HikOnLogo theme="dark" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black mb-4 text-center tracking-tight text-white drop-shadow-md">
            Welcome to the HikOn System
          </h1>
          
          <p className="text-sm md:text-base text-center mb-10 text-slate-200 max-w-xl leading-relaxed font-medium px-4 drop-shadow-sm">
            HikOn is a continuous respiratory monitoring dashboard specifically designed for children suffering from asthma. By tracking vital signs and environmental triggers, it helps parents and clinicians proactively detect and manage asthma symptoms.
          </p>

          <p className="text-xs font-bold uppercase tracking-widest text-center mb-6 text-slate-400">
            Select Your Access Level
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-4">
            <button 
              onClick={() => setUserRole('user')}
              className="p-8 rounded-[2rem] border border-slate-700/60 flex flex-col items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] group bg-slate-800/60 hover:bg-slate-700/60 hover:border-blue-400/50 shadow-lg"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-900/40 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                <User size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-white group-hover:text-blue-100 transition-colors">User Mode</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-slate-400 group-hover:text-slate-300 transition-colors">View Core Vitals</p>
              </div>
            </button>

            <button 
              onClick={() => setUserRole('admin')}
              className="p-8 rounded-[2rem] border border-slate-700/60 flex flex-col items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] group bg-slate-800/60 hover:bg-slate-700/60 hover:border-emerald-400/50 shadow-lg"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-900/40 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors">
                <LayoutDashboard size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-white group-hover:text-emerald-100 transition-colors">Admin Mode</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-slate-400 group-hover:text-slate-300 transition-colors">Developer Portal</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeClasses.bg} ${themeClasses.text} font-sans selection:bg-lime-200 antialiased overflow-x-hidden relative`}>      
      {/* Visual background decorative glows */}
      <div className={`fixed -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none transition-opacity duration-700 ${theme === 'light' ? 'bg-blue-600/5 opacity-100' : 'bg-blue-400/10 opacity-60'}`} />
      
      {/* Alert Banner */}
      {isAlertVisible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border-2 border-rose-400">
            <div className="flex items-center gap-4">
              <AlertTriangle className="flex-shrink-0 animate-pulse" />
              <p className="font-bold text-sm leading-tight">{alertMsg}</p>
            </div>
            <button 
              onClick={() => setIsAlertVisible(false)}
              className="p-1.5 hover:bg-rose-600 rounded-lg transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed left-0 top-0 h-full w-20 lg:w-72 border-r flex flex-col z-50 transition-all duration-300 shadow-sm ${themeClasses.sidebar}`}>
        <div className={`p-8 border-b flex items-center justify-center lg:justify-start ${themeClasses.border}`}>
          <HikOnLogo theme={theme} />
        </div>

        <nav className="flex-1 px-6 py-10 space-y-3">
          <NavItem 
            icon={<LayoutDashboard size={22}/>} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            theme={theme}
            onClick={() => { setActiveTab('dashboard');  }} 
          />
          <NavItem 
            icon={<History size={22}/>} 
            label="Health Trends" 
            active={activeTab === 'history'} 
            theme={theme}
            onClick={() => { setActiveTab('history');  }} 
          />
          {userRole === 'admin' && (
            <>
              <NavItem 
                icon={<User size={22}/>} 
                label="Patients" 
                active={activeTab === 'patients'} 
                theme={theme}
                onClick={() => { setActiveTab('patients'); }} 
              />
              <NavItem 
                icon={<ShieldCheck size={22}/>} 
                label="Risk Assessment" 
                active={activeTab === 'risk'} 
                theme={theme}
                onClick={() => setActiveTab('risk')} 
              />
            </>
          )}
          <NavItem 
            icon={<Bell size={22}/>} 
            label="Notifications" 
            active={activeTab === 'alerts'} 
            theme={theme}
            onClick={() => setActiveTab('alerts')} 
          />
          <div className={`pt-6 mt-6 border-t ${themeClasses.border}`}>
             <NavItem 
              icon={<Settings size={22}/>} 
              label="Settings" 
              active={activeTab === 'settings'} 
              theme={theme}
              onClick={() => setActiveTab('settings')} 
            />
          </div>
        </nav>

      </aside>

      {/* Main Content Area */}
      <main className="pl-20 lg:pl-72 min-h-screen transition-all duration-300">
        <header className={`h-24 backdrop-blur-md border-b sticky top-0 z-40 px-10 flex items-center justify-between ${themeClasses.header}`}>
          <div className="animate-in fade-in slide-in-from-left-4 duration-700 flex items-center gap-6">
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
                {activeTab === 'dashboard' ? 'Safety Dashboard' : activeTab === 'history' ? 'Analytical Logs' : activeTab === 'patients' ? 'Patient Management' : 'System Settings'}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${theme === 'light' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-emerald-900/20 text-emerald-400 border-emerald-900/40'}`}>
                  <CheckCircle2 size={10} /> Live Monitoring
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${themeClasses.subtext}`}>Last Successful Sync: {lastSync}</span>
              </div>
            </div>
            
            {/* PATIENT SELECTOR */}
            {userRole === 'admin' && (
            <div className="flex items-center gap-2">
              <User size={16} className={themeClasses.subtext} />
              <select 
                value={selectedPatientId}
                onChange={(e) => {
                  const newPatientId = parseInt(e.target.value);
                  const newPatient = patients.find(p => p.id === newPatientId);
                  setSelectedPatientId(newPatientId);
                  if (newPatient) {
                    updateActivePatientInSupabase(newPatient);
                  }
                  
                }}
                className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all cursor-pointer ${theme === 'light' ? 'bg-white border-blue-100 text-[#1e3a8a] hover:border-blue-300' : 'bg-slate-800 border-slate-700 text-white hover:border-slate-600'}`}
              >
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.age}y, {patient.gender})
                  </option>
                ))}
              </select>
              <button
                onClick={recordForPatient}
                disabled={isRecording}
                className={`px-3 py-2 rounded-xl font-bold text-xs border-2 transition-all hover:scale-105 active:scale-95 ${isRecording ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'light' ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/50'}`}
                title="Stamp all untagged sensor rows to selected patient"
              >
                {isRecording ? '...' : '⬤ RECORD'}
              </button>
              <button
                onClick={openAddPatientModal}
                className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${theme === 'light' ? 'bg-blue-50 text-[#1e3a8a] hover:bg-blue-100' : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'}`}
                title="Add New Patient"
              >
                <Plus size={18} />
              </button>
            </div>
            )}
          </div>

          <div className="flex items-center gap-5">{/* THEME TOGGLE SWITCH */}
            <button 
              onClick={toggleTheme}
              className={`relative flex items-center h-10 w-20 rounded-full p-1 transition-colors duration-300 shadow-inner ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'}`}
              title="Toggle Theme"
            >
              <div className={`flex items-center justify-center h-8 w-8 rounded-full bg-white shadow-md transform transition-transform duration-300 ${theme === 'light' ? 'translate-x-0' : 'translate-x-10'}`}>
                {theme === 'light' ? <Sun size={16} className="text-orange-500" /> : <Moon size={16} className="text-blue-500" />}
              </div>
              <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                <Sun size={12} className={`transition-opacity ${theme === 'dark' ? 'opacity-40' : 'opacity-0'}`} />
                <Moon size={12} className={`transition-opacity ${theme === 'light' ? 'opacity-40' : 'opacity-0'}`} />
              </div>
            </button>

          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' ? (
          <div className="p-10 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Physiological Panel */}
<div className={`border rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group ${themeClasses.card}`}>
              {/* Visual background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-cyan-500/5 blur-3xl opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                  <h3 className={`text-xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>Physical Status</h3>
                  <p className={`text-xs font-bold uppercase tracking-widest ${themeClasses.subtext}`}>Physiological risk assessment</p>
                </div>
                <div className="flex flex-col items-end">
                  <RiskBadge 
                    level={alertsEnabled ? sensors.physioRisk : 'safe'} 
                    theme={theme} 
                    label={!alertsEnabled ? (motionStatus === 'MOVING' ? 'MOTION' : 'STABILIZING') : null}
                  />
                  <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${
                    motionStatus === 'STEADY' ? 'text-emerald-500' : 
                    motionStatus === 'WALKING' ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    Status: {motionStatus}
                  </div>
                  {!alertsEnabled && cooldownRemaining > 0 && (
                    <div className="mt-1 text-[9px] font-black text-rose-400 animate-pulse">
                      Alerts paused: {Math.floor(cooldownRemaining / 60)}:{(cooldownRemaining % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                  {!alertsEnabled && motionStatus === 'MOVING' && (
                    <div className="mt-1 text-[9px] font-black text-rose-400">
                      Alerts disabled (Motion)
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Best (Calibration) Header */}
              <div className="mb-6 flex items-center justify-between relative z-10">
                <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 ${theme === 'light' ? 'bg-blue-50/50 border-blue-100' : 'bg-blue-900/10 border-blue-800/30'}`}>
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Personal Best SpO2</p>
                    <p className={`text-lg font-black ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-blue-400'}`}>
                      {selectedPatient?.spo2Baseline ? `${selectedPatient.spo2Baseline}%` : 'Not Set'}
                    </p>
                  </div>
                  <button
                    disabled={isCalibrating}
                    onClick={startPbCalibration}
                    className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                      isCalibrating 
                        ? 'bg-rose-500 text-white animate-pulse' 
                        : (theme === 'light' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20')
                    }`}
                  >
                    {isCalibrating ? `Recording (${calibrationTimer}s)` : 'Record Personal Best'}
                  </button>
                </div>
              </div>

              {/* Sensor Readings */}
              <div className="grid grid-cols-3 gap-4 mb-6 relative z-10">
                <Reading label="SpO2" value={sensors.spo2} unit="%" icon={<Activity className="text-blue-500"/>} theme={theme} />
                <Reading label="Heart Rate" value={sensors.heartRate} unit="bpm" icon={<Heart className="text-rose-500"/>} theme={theme} />
                <Reading label="Breathing Rate" value={sensors.breathingRate} unit="br/m" icon={<Wind className="text-cyan-500"/>} theme={theme} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>Risk Score</p>
                        <p className={`text-2xl font-black ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-blue-400'}`}>
                          {sensors.riskScore.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>Confidence</p>
                        <p className={`text-2xl font-black ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>
                          {(sensors.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${themeClasses.subtext}`}>Assessment</p>
                      <p className={`text-xs font-semibold leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                        {sensors.reasoning}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
                        <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>Symptom</p>
                        <p className={`text-lg font-black ${sensors.individualRisks.symptom === 0 ? 'text-emerald-500' : sensors.individualRisks.symptom === 1 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {sensors.individualRisks.symptom === 0 ? 'Safe' : sensors.individualRisks.symptom === 1 ? 'Medium' : 'High'}
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
                        <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>SpO2</p>
                        <p className={`text-lg font-black ${sensors.individualRisks.spo2 === 0 ? 'text-emerald-500' : sensors.individualRisks.spo2 === 1 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {sensors.individualRisks.spo2 === 0 ? 'Safe' : sensors.individualRisks.spo2 === 1 ? 'Medium' : 'High'}
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
                        <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>Breathing</p>
                        <p className={`text-lg font-black ${sensors.individualRisks.breathing === 0 ? 'text-emerald-500' : sensors.individualRisks.breathing === 1 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {sensors.individualRisks.breathing === 0 ? 'Safe' : sensors.individualRisks.breathing === 1 ? 'Medium' : 'High'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Symptom Log */}
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Wheeze:</span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-black ${sensors.wheezeCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                          {sensors.wheezeCount > 0 ? `${sensors.wheezeCount}` : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Coughs:</span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-black ${sensors.coughCount > 5 ? 'bg-rose-100 text-rose-700' : sensors.coughCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {sensors.coughCount}
                        </span>
                      </div>
                      {sensors.isPhysicalActivity && (
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/50 text-blue-300'}`}>
                          <Zap size={10} className="inline mr-1" /> Activity Detected
                        </div>
                      )}
                      {sensors.spo2WasCritical && (
                        <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-rose-100 text-rose-700 animate-pulse">
                          <AlertTriangle size={10} className="inline mr-1" /> Critical Alert
                        </div>
                      )}
                    </div>

                 <div className={`pt-8 border-t relative z-10 ${themeClasses.border}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${themeClasses.subtext}`}>Potential Warnings</p>
                    <div className="flex flex-wrap gap-2">
                        {sensors.physioTriggers.length > 0 ? sensors.physioTriggers.map((t, idx) => (
                            <span key={idx} className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100">{t}</span>
                        )) : <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={14}/> All vitals are optimal</span>}
                    </div>
                 </div>

                 {/* Bronchodilator Reversibility UI */}
                 {(sensors.physioRisk === 'medium' || sensors.physioRisk === 'high') && !medicationGivenAt && (
                   <div className={`mt-6 p-5 rounded-2xl border relative z-10 ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/10 border-amber-900/40'}`}>
                     <div className="flex items-start gap-4">
                       <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={24} />
                       <div>
                         <h4 className={`text-sm font-black mb-1 ${theme === 'light' ? 'text-amber-800' : 'text-amber-500'}`}>Moderate/High risk detected.</h4>
                         <p className={`text-xs mb-4 font-bold ${theme === 'light' ? 'text-amber-700' : 'text-amber-400'}`}>Have you administered the child's prescribed rescue inhaler?</p>
                         <button 
                           onClick={handleLogMedication}
                           className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20"
                         >
                           Yes, Log Medication Given
                         </button>
                       </div>
                     </div>
                   </div>
                 )}

                 {medicationGivenAt && treatmentStatus === 'monitoring' && (
                   <div className={`mt-6 p-5 rounded-2xl border relative z-10 ${theme === 'light' ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/10 border-blue-900/40'}`}>
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <div className="animate-spin-slow">
                           <Clock className="text-blue-500" size={24} />
                         </div>
                         <div>
                           <h4 className={`text-sm font-black mb-0.5 ${theme === 'light' ? 'text-blue-900' : 'text-blue-500'}`}>Observation Window Active</h4>
                           <p className={`text-xs font-bold ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>Monitoring patient response to medication...</p>
                         </div>
                       </div>
                       <div className={`text-2xl font-black ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'} tabular-nums tracking-tighter`}>
                         {Math.floor(medicationTimer / 60).toString().padStart(2, '0')}:{(medicationTimer % 60).toString().padStart(2, '0')}
                       </div>
                     </div>
                   </div>
                 )}

                 {medicationGivenAt && treatmentStatus === 'resolved' && (
                   <div className={`mt-6 p-5 rounded-2xl border relative z-10 ${theme === 'light' ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-900/10 border-emerald-900/40'}`}>
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <div className="bg-emerald-500 rounded-full p-1 text-white">
                           <CheckCircle2 size={20} />
                         </div>
                         <h4 className={`text-sm font-black ${theme === 'light' ? 'text-emerald-900' : 'text-emerald-500'}`}>Symptoms resolved. Treatment successful.</h4>
                       </div>
                       <button 
                         onClick={handleResetMedication}
                         className={`px-4 py-2 hover:scale-105 active:scale-95 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${theme === 'light' ? 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300' : 'bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/50'}`}
                       >
                         Clear Log
                       </button>
                     </div>
                   </div>
                 )}

                 {medicationGivenAt && treatmentStatus === 'escalated' && (
                   <div className={`mt-6 p-5 rounded-2xl border border-rose-400 relative z-10 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse ${theme === 'light' ? 'bg-rose-50' : 'bg-rose-900/20'}`}>
                     <div className="flex items-start justify-between mb-4">
                       <div className="flex items-start gap-4">
                         <AlertTriangle className="text-rose-600 flex-shrink-0" size={24} />
                         <div>
                           <h4 className={`text-sm font-black uppercase tracking-wider mb-1.5 ${theme === 'light' ? 'text-rose-900' : 'text-rose-500'}`}>CRITICAL: No Response to Medication</h4>
                           <p className={`text-xs font-bold leading-relaxed ${theme === 'light' ? 'text-rose-800' : 'text-rose-400'}`}>20 minutes have elapsed and physiological risk is still elevated. Seek immediate medical assistance.</p>
                         </div>
                       </div>
                     </div>
                     <div className="flex justify-end">
                       <button 
                         onClick={handleResetMedication}
                         className={`px-4 py-2 hover:scale-105 active:scale-95 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${theme === 'light' ? 'bg-rose-200 text-rose-800 hover:bg-rose-300' : 'bg-rose-600/30 text-rose-400 hover:bg-rose-600/50'}`}
                       >
                         Acknowledge & Clear
                       </button>
                     </div>
                   </div>
                 )}

              </div>

              {/* Environmental Panel */}
              <div className={`border rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group ${themeClasses.card}`}>
                 <div className="flex justify-between items-start mb-10 relative z-10">
                    <div>
                        <h3 className={`text-xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>Surroundings</h3>
                        <p className={`text-xs font-bold uppercase tracking-widest ${themeClasses.subtext}`}>Environmental risk monitoring</p>
                    </div>
                    <RiskBadge level={sensors.envRisk} theme={theme} />
                 </div>

                 <div className="grid grid-cols-2 gap-8 mb-10 relative z-10">
                    <Reading label="Temp Index" value={sensors.temperature} unit="°C" icon={<Thermometer className="text-orange-500"/>} theme={theme} />
                    <Reading label="Humidity" value={sensors.humidity} unit="%" icon={<Droplets className="text-cyan-500"/>} theme={theme} />
                    <Reading label="Particulate PM2.5" value={sensors.pm25} unit="µg/m³" icon={<Wind className="text-lime-600"/>} theme={theme} />
                    <Reading label="Air Quality Index" value={sensors.aqi} unit="" icon={<ShieldCheck className="text-emerald-500"/>} smallValue theme={theme} />
                 </div>

                 <div className={`pt-8 border-t relative z-10 ${themeClasses.border}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${themeClasses.subtext}`}>Active Trigger Warnings</p>
                    <div className="flex flex-wrap gap-2">
                        {sensors.envTriggers.length > 0 ? sensors.envTriggers.map((t, idx) => (
                            <span key={idx} className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black border border-amber-100">{t}</span>
                        )) : <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={14}/> Atmosphere is clear</span>}
                    </div>
                 </div>
              </div>
            </div>

            <div className={`border rounded-[2.5rem] p-10 shadow-sm relative group overflow-hidden ${themeClasses.card}`}>
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <Activity size={200} className={theme === 'light' ? 'text-[#1e3a8a]' : 'text-blue-400'} />
                </div>
                <div className="flex items-center justify-between mb-10 relative z-10">
                    <div>
                        <h3 className={`text-xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>Continuity Log (24h)</h3>
                        <p className={`text-xs font-bold uppercase tracking-widest ${themeClasses.subtext}`}>SpO2 & Environmental data points</p>
                    </div>
                </div>

                <div className="h-[300px] w-full relative z-10">
                  {vitalsTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={vitalsTrend}>
                        <defs>
                          <linearGradient id="colorSp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme === 'light' ? "#1e3a8a" : "#60a5fa"} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={theme === 'light' ? "#1e3a8a" : "#60a5fa"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#f1f5f9" : "#334155"} vertical={false} />
                        <XAxis dataKey="time" stroke="#cbd5e1" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis domain={[90, 100]} stroke="#cbd5e1" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: theme === 'light' ? 'white' : '#1e293b', borderRadius: '20px', border: theme === 'light' ? '1px solid #f1f5f9' : '1px solid #334155', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '16px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: theme === 'light' ? '#1e3a8a' : '#60a5fa' }}
                        />
                        <Area type="monotone" dataKey="spo2" stroke={theme === 'light' ? "#1e3a8a" : "#60a5fa"} strokeWidth={4} fillOpacity={1} fill="url(#colorSp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-70">
                      <Clock size={36} className={`mb-3 ${theme === 'light' ? 'text-slate-300' : 'text-slate-600'}`} />
                      <p className={`font-black text-sm uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>No Data Yet</p>
                      <p className={`text-[10px] uppercase font-bold mt-1 tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>Device hasn't sent data in the last 24h</p>
                    </div>
                  )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
               <ActionCard 
                  onClick={() => { setActiveTab('history');  }} 
                  icon={<History size={24}/>} 
                  title="Historical Archives" 
                  desc="Review longitudinal data patterns for medical assessment." 
                  color="bg-indigo-600"
                  theme={theme}
               />
               <ActionCard 
                  onClick={() => { setActiveTab('settings');  }} 
                  icon={<Settings size={24}/>} 
                  title="System Configuration" 
                  desc="Manage device sync and clinical alert thresholds." 
                  color="bg-blue-500"
                  theme={theme}
               />
            </div>
          </div>
        ) : activeTab === 'risk' ? (
          <div className="p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Banner */}
            <div className={`rounded-[2rem] p-6 border flex items-center gap-4 ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/10 border-amber-900/30'}`}>
              <ShieldCheck size={28} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className={`text-sm font-black ${theme === 'light' ? 'text-amber-900' : 'text-amber-400'}`}>Raw Risk Assessment — No Calibration Applied</p>
                <p className={`text-xs font-bold ${theme === 'light' ? 'text-amber-700' : 'text-amber-500'}`}>Values are read directly from Supabase without any sensor offset corrections. Patient-filtered.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* RAW Physiological Panel */}
              <div className={`border rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group ${themeClasses.card}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-rose-500/5 to-orange-500/5 blur-3xl opacity-70 pointer-events-none" />
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <div>
                    <h3 className={`text-xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>Raw Physical Status</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest ${themeClasses.subtext}`}>Uncalibrated physiological risk</p>
                  </div>
                  <RiskBadge level={rawSensors.physioRisk} theme={theme} />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6 relative z-10">
                  <Reading label="SpO2 (Raw)" value={rawSensors.spo2} unit="%" icon={<Activity className="text-blue-500"/>} theme={theme} />
                  <Reading label="Heart Rate (Raw)" value={rawSensors.heartRate} unit="bpm" icon={<Heart className="text-rose-500"/>} theme={theme} />
                  <Reading label="Breathing Rate" value={rawSensors.breathingRate} unit="br/m" icon={<Wind className="text-cyan-500"/>} theme={theme} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>Risk Score</p>
                    <p className={`text-2xl font-black ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-blue-400'}`}>{rawSensors.riskScore.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>Confidence</p>
                    <p className={`text-2xl font-black ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>{(rawSensors.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${themeClasses.subtext}`}>Assessment</p>
                  <p className={`text-xs font-semibold leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>{rawSensors.reasoning}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[['Symptom', rawSensors.individualRisks?.symptom], ['SpO2', rawSensors.individualRisks?.spo2], ['Breathing', rawSensors.individualRisks?.breathing]].map(([label, val]) => (
                    <div key={label} className={`p-3 rounded-xl ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>{label}</p>
                      <p className={`text-lg font-black ${val === 0 ? 'text-emerald-500' : val === 1 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {val === 0 ? 'Safe' : val === 1 ? 'Medium' : 'High'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Wheeze:</span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${rawSensors.wheezeCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{rawSensors.wheezeCount > 0 ? rawSensors.wheezeCount : 'None'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Coughs:</span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${rawSensors.coughCount > 5 ? 'bg-rose-100 text-rose-700' : rawSensors.coughCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{rawSensors.coughCount}</span>
                  </div>
                  {rawSensors.spo2WasCritical && (
                    <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-rose-100 text-rose-700 animate-pulse">
                      <AlertTriangle size={10} className="inline mr-1" /> Critical Alert
                    </div>
                  )}
                </div>

                <div className={`pt-6 mt-6 border-t ${themeClasses.border}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${themeClasses.subtext}`}>Potential Warnings</p>
                  <div className="flex flex-wrap gap-2">
                    {rawSensors.physioTriggers.length > 0 ? rawSensors.physioTriggers.map((t, i) => (
                      <span key={i} className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100">{t}</span>
                    )) : <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={14}/> All vitals optimal</span>}
                  </div>
                </div>
              </div>

              {/* RAW Environmental Panel */}
              <div className={`border rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group ${themeClasses.card}`}>
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <div>
                    <h3 className={`text-xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>Surroundings</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest ${themeClasses.subtext}`}>Environmental risk monitoring</p>
                  </div>
                  <RiskBadge level={rawSensors.envRisk} theme={theme} />
                </div>
                <div className="grid grid-cols-2 gap-8 mb-10 relative z-10">
                  <Reading label="Temp Index" value={rawSensors.temperature} unit="°C" icon={<Thermometer className="text-orange-500"/>} theme={theme} />
                  <Reading label="Humidity" value={rawSensors.humidity} unit="%" icon={<Droplets className="text-cyan-500"/>} theme={theme} />
                  <Reading label="Particulate PM2.5" value={rawSensors.pm25} unit="µg/m³" icon={<Wind className="text-lime-600"/>} theme={theme} />
                  <Reading label="Air Quality Index" value={rawSensors.aqi} unit="" icon={<ShieldCheck className="text-emerald-500"/>} smallValue theme={theme} />
                </div>
                <div className={`pt-8 border-t relative z-10 ${themeClasses.border}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${themeClasses.subtext}`}>Active Trigger Warnings</p>
                  <div className="flex flex-wrap gap-2">
                    {rawSensors.envTriggers.length > 0 ? rawSensors.envTriggers.map((t, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black border border-amber-100">{t}</span>
                    )) : <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={14}/> Atmosphere is clear</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`border rounded-[2.5rem] p-10 shadow-sm ${themeClasses.card}`}>
              <h3 className={`text-xl font-black mb-8 flex items-center gap-3 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <Settings size={24} className="text-blue-500" /> System Settings
              </h3>

              <div className="space-y-10">
                {/* Visual Theme Toggles Info */}
                <div className="space-y-4">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Quick Access Theme Switch</p>
                  <div className={`p-6 rounded-3xl border flex items-center justify-between ${theme === 'light' ? 'bg-blue-50 border-blue-100' : 'bg-blue-900/10 border-blue-900/30'}`}>
                    <div>
                      <p className="font-bold text-sm">Theme Toggle available in Header</p>
                      <p className={`text-xs ${themeClasses.subtext}`}>Switch between Light and Midnight modes instantly from any page.</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <Zap size={16} />
                    </div>
                  </div>
                </div>


                {/* NEW: Fusion Logic Test Controls */}
                {userRole === 'admin' && (
                <div className="space-y-4 pt-6 border-t border-slate-700/10">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Fusion Logic Testing</p>
                  
                  <div className={`p-6 rounded-3xl border space-y-4 ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/10 border-amber-900/30'}`}>
                    <p className={`font-bold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Manual Test Controls</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => {
                          setIsTestingMode(true);
                          setSensors(prev => {
                            const newWheezeCount = prev.wheezeCount + 1;
                            const newCoughCount = prev.coughCount + 3;
                            const fusionResult = hybridFusion(newWheezeCount, newCoughCount, parseFloat(prev.spo2), prev.breathingRate);
                            
                            return {
                              ...prev,
                              wheezeCount: newWheezeCount,
                              coughCount: newCoughCount,
                              physioRisk: fusionResult.finalRisk.toLowerCase(),
                              riskScore: fusionResult.riskScore,
                              confidence: fusionResult.confidence,
                              reasoning: fusionResult.reasoning,
                              individualRisks: fusionResult.individualRisks,
                              symptomLog: fusionResult.symptomLog,
                              spo2WasCritical: fusionResult.spo2WasCritical,
                              isPhysicalActivity: fusionResult.isPhysicalActivity,
                              physioTriggers: fusionResult.triggers,
                              respiratorySounds: 'Wheeze Detected'
                            };
                          });
                        }}
                        className={`px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all active:scale-95 ${theme === 'light' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-rose-900/30 text-rose-400 hover:bg-rose-900/50'}`}
                      >
                        Simulate Wheeze
                      </button>
                      
                      <button 
                        onClick={() => {
                          setIsTestingMode(true);
                          setSensors(prev => {
                            const newCoughCount = prev.coughCount + 1;
                            const fusionResult = hybridFusion(prev.wheezeCount, newCoughCount, parseFloat(prev.spo2), prev.breathingRate);
                            
                            return {
                              ...prev,
                              coughCount: newCoughCount,
                              physioRisk: fusionResult.finalRisk.toLowerCase(),
                              riskScore: fusionResult.riskScore,
                              confidence: fusionResult.confidence,
                              reasoning: fusionResult.reasoning,
                              individualRisks: fusionResult.individualRisks,
                              symptomLog: fusionResult.symptomLog,
                              spo2WasCritical: fusionResult.spo2WasCritical,
                              isPhysicalActivity: fusionResult.isPhysicalActivity,
                              physioTriggers: fusionResult.triggers,
                              respiratorySounds: newCoughCount > 5 ? 'Frequent Coughing' : prev.respiratorySounds
                            };
                          });
                        }}
                        className={`px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all active:scale-95 ${theme === 'light' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'}`}
                      >
                        Add Cough
                      </button>
                      
                      <button 
                        onClick={() => {
                          setIsTestingMode(true);
                          setSensors(prev => {
                            const newSpo2 = 91;
                            const newBreathingRate = 42;
                            const fusionResult = hybridFusion(prev.wheezeCount, prev.coughCount, newSpo2, newBreathingRate);
                            
                            return {
                              ...prev,
                              spo2: newSpo2,
                              breathingRate: newBreathingRate,
                              physioRisk: fusionResult.finalRisk.toLowerCase(),
                              riskScore: fusionResult.riskScore,
                              confidence: fusionResult.confidence,
                              reasoning: fusionResult.reasoning,
                              individualRisks: fusionResult.individualRisks,
                              symptomLog: fusionResult.symptomLog,
                              spo2WasCritical: fusionResult.spo2WasCritical,
                              isPhysicalActivity: fusionResult.isPhysicalActivity,
                              physioTriggers: fusionResult.triggers
                            };
                          });
                        }}
                        className={`px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all active:scale-95 ${theme === 'light' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-rose-900/30 text-rose-400 hover:bg-rose-900/50'}`}
                      >
                        Critical SpO2
                      </button>
                      
                      <button 
                        onClick={() => {
                          setIsTestingMode(false);
                          setSensors(prev => {
                            const newSpo2 = 98;
                            const newBreathingRate = 18;
                            const newWheezeCount = 0;
                            const newCoughCount = 0;
                            const fusionResult = hybridFusion(newWheezeCount, newCoughCount, newSpo2, newBreathingRate);
                            
                            return {
                              ...prev,
                              spo2: newSpo2,
                              breathingRate: newBreathingRate,
                              wheezeCount: newWheezeCount,
                              coughCount: newCoughCount,
                              physioRisk: fusionResult.finalRisk.toLowerCase(),
                              riskScore: fusionResult.riskScore,
                              confidence: fusionResult.confidence,
                              reasoning: fusionResult.reasoning,
                              individualRisks: fusionResult.individualRisks,
                              symptomLog: fusionResult.symptomLog,
                              spo2WasCritical: fusionResult.spo2WasCritical,
                              isPhysicalActivity: fusionResult.isPhysicalActivity,
                              physioTriggers: fusionResult.triggers,
                              respiratorySounds: 'Normal'
                            };
                          });
                        }}
                        className={`px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all active:scale-95 ${theme === 'light' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'}`}
                      >
                        Reset to Safe
                      </button>
                    </div>

                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${themeClasses.subtext}`}>Current Status</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>SpO2: <span className="font-black">{sensors.spo2}%</span></div>
                        <div>Breathing: <span className="font-black">{sensors.breathingRate} br/m</span></div>
                        <div>Wheezes: <span className="font-black">{sensors.wheezeCount}</span></div>
                        <div>Coughs: <span className="font-black">{sensors.coughCount}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Account Settings */}
                <div className="space-y-4 pt-6 border-t border-slate-700/10">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Account Management</p>
                  <div className={`p-6 rounded-3xl border flex items-center justify-between ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#1e293b] border-slate-700'}`}>
                    <div>
                        <p className="font-bold text-sm">Sign Out</p>
                        <p className={`text-xs ${themeClasses.subtext}`}>Switch between Admin and User access levels.</p>
                    </div>
                    <button 
                      onClick={() => setUserRole(null)}
                      className={`px-4 py-2 font-bold text-xs uppercase tracking-wide rounded-xl transition-all ${theme === 'light' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          <div className="p-10 max-w-[1800px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Date Range Selector */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
                  Health Trends & Analytics
                </h2>
                <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${themeClasses.subtext}`}>
                  Longitudinal data analysis & correlation insights
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={20} className={themeClasses.subtext} />
                <button
                  onClick={() => handleDateRangeChange('7d')}
                  className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                    dateRange === '7d'
                      ? theme === 'light' ? 'bg-[#1e3a8a] text-white' : 'bg-blue-600 text-white'
                      : theme === 'light' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => handleDateRangeChange('30d')}
                  className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                    dateRange === '30d'
                      ? theme === 'light' ? 'bg-[#1e3a8a] text-white' : 'bg-blue-600 text-white'
                      : theme === 'light' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => handleDateRangeChange('90d')}
                  className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                    dateRange === '90d'
                      ? theme === 'light' ? 'bg-[#1e3a8a] text-white' : 'bg-blue-600 text-white'
                      : theme === 'light' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  90 Days
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            {trendData.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-24 rounded-[2.5rem] border ${themeClasses.card}`}>
                <History size={48} className={`${themeClasses.subtext} mb-4 opacity-40`} />
                <p className={`text-lg font-black ${themeClasses.subtext}`}>No data available for this patient yet.</p>
                <p className={`text-xs font-bold uppercase tracking-widest mt-2 ${themeClasses.subtext} opacity-60`}>Data will appear once the device starts sending readings.</p>
              </div>
            ) : (<>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard 
                title="Avg SpO2" 
                value={`${(trendData.reduce((sum, d) => sum + d.spo2, 0) / trendData.length).toFixed(1)}%`}
                trend={trendData[trendData.length - 1].spo2 > trendData[0].spo2 ? 'up' : 'down'}
                icon={<Activity size={20} />}
                theme={theme}
                themeClasses={themeClasses}
              />
              <StatCard 
                title="Asthma Events" 
                value={trendData.filter(d => d.hasAsthmaEvent).length}
                trend={trendData.filter((d, i) => i >= trendData.length / 2 && d.hasAsthmaEvent).length < trendData.filter((d, i) => i < trendData.length / 2 && d.hasAsthmaEvent).length ? 'down' : 'up'}
                icon={<AlertTriangle size={20} />}
                theme={theme}
                themeClasses={themeClasses}
              />
              <StatCard 
                title="Avg Air Quality" 
                value={`${(trendData.reduce((sum, d) => sum + d.pm25, 0) / trendData.length).toFixed(1)} µg/m³`}
                trend={trendData[trendData.length - 1].pm25 < trendData[0].pm25 ? 'down' : 'up'}
                icon={<Wind size={20} />}
                theme={theme}
                themeClasses={themeClasses}
              />
              <StatCard 
                title="Avg Risk Score" 
                value={(trendData.reduce((sum, d) => sum + d.riskScore, 0) / trendData.length).toFixed(2)}
                trend={trendData[trendData.length - 1].riskScore < trendData[0].riskScore ? 'down' : 'up'}
                icon={<ShieldCheck size={20} />}
                theme={theme}
                themeClasses={themeClasses}
              />
            </div>

            {/* PHYSIOLOGICAL TRENDS */}
            <div className={`border rounded-[2.5rem] p-8 shadow-sm ${themeClasses.card}`}>
              <div className="mb-6">
                <h3 className={`text-lg font-black tracking-tight flex items-center gap-3 ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
                  <Activity size={22} className="text-blue-500" />
                  Physiological Vitals Trend
                </h3>
                <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>SpO2, Heart Rate & Breathing Rate Over Time</p>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <defs>
                      <linearGradient id="spo2Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#f1f5f9" : "#334155"} vertical={false} />
                    <XAxis dataKey="date" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                    <YAxis yAxisId="left" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" domain={[85, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'light' ? 'white' : '#1e293b', 
                        borderRadius: '16px', 
                        border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
                        padding: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                    <ReferenceLine yAxisId="left" y={95} stroke="#84cc16" strokeDasharray="3 3" label={{ value: 'Safe SpO2', fill: '#84cc16', fontSize: 10 }} />
                    <Area yAxisId="left" type="monotone" dataKey="spo2" stroke="#3b82f6" strokeWidth={3} fill="url(#spo2Gradient)" name="SpO2 %" />
                    <Line yAxisId="right" type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} name="Heart Rate (bpm)" />
                    <Line yAxisId="right" type="monotone" dataKey="breathingRate" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} name="Breathing Rate (br/m)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SYMPTOM EVENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className={`border rounded-[2.5rem] p-8 shadow-sm ${themeClasses.card}`}>
                <div className="mb-6">
                  <h3 className={`text-lg font-black tracking-tight flex items-center gap-3 ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
                    <Activity size={22} className="text-rose-500" />
                    Daily Symptom Events
                  </h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Cough & Wheeze Detection Frequency</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#f1f5f9" : "#334155"} vertical={false} />
                      <XAxis dataKey="date" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={10} fontWeight="bold" />
                      <YAxis stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'light' ? 'white' : '#1e293b', 
                          borderRadius: '16px', 
                          border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
                          padding: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                      <Bar dataKey="coughCount" fill="#f59e0b" name="Cough Count" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="wheezeCount" fill="#ef4444" name="Wheeze Count" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RISK SCORE HISTORY */}
              <div className={`border rounded-[2.5rem] p-8 shadow-sm ${themeClasses.card}`}>
                <div className="mb-6">
                  <h3 className={`text-lg font-black tracking-tight flex items-center gap-3 ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
                    <ShieldCheck size={22} className="text-purple-500" />
                    Risk Score History
                  </h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Fusion Logic Assessment Over Time</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#f1f5f9" : "#334155"} vertical={false} />
                      <XAxis dataKey="date" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={10} fontWeight="bold" />
                      <YAxis domain={[0, 2.5]} stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: theme === 'light' ? 'white' : '#1e293b', 
                          borderRadius: '16px', 
                          border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
                          padding: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      />
                      <ReferenceLine y={0.67} stroke="#84cc16" strokeDasharray="3 3" label={{ value: 'Safe', fill: '#84cc16', fontSize: 9 }} />
                      <ReferenceLine y={1.33} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Medium', fill: '#f59e0b', fontSize: 9 }} />
                      <Area type="monotone" dataKey="riskScore" stroke="#8b5cf6" strokeWidth={3} fill="url(#riskGradient)" name="Risk Score" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ENVIRONMENTAL TRENDS */}
            <div className={`border rounded-[2.5rem] p-8 shadow-sm ${themeClasses.card}`}>
              <div className="mb-6">
                <h3 className={`text-lg font-black tracking-tight flex items-center gap-3 ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
                  <Cloud size={22} className="text-cyan-500" />
                  Environmental Conditions Trend
                </h3>
                <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Temperature, Humidity & Air Quality (PM2.5)</p>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <defs>
                      <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#f1f5f9" : "#334155"} vertical={false} />
                    <XAxis dataKey="date" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                    <YAxis yAxisId="left" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" label={{ value: 'PM2.5 (µg/m³)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fontWeight: 'bold' } }} />
                    <YAxis yAxisId="right" orientation="right" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'light' ? 'white' : '#1e293b', 
                        borderRadius: '16px', 
                        border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
                        padding: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                    <ReferenceLine yAxisId="left" y={12} stroke="#84cc16" strokeDasharray="3 3" label={{ value: 'Good AQI', fill: '#84cc16', fontSize: 10 }} />
                    <ReferenceLine yAxisId="left" y={35.4} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Moderate AQI', fill: '#f59e0b', fontSize: 10 }} />
                    <Area yAxisId="left" type="monotone" dataKey="pm25" stroke="#84cc16" strokeWidth={3} fill="url(#pm25Gradient)" name="PM2.5 Air Quality" />
                    <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} name="Temperature (°C)" />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} name="Humidity (%)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CORRELATION ANALYSIS */}
            <div className={`border rounded-[2.5rem] p-8 shadow-sm ${themeClasses.card}`}>
              <div className="mb-6">
                <h3 className={`text-lg font-black tracking-tight flex items-center gap-3 ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
                  <AlertTriangle size={22} className="text-amber-500" />
                  Asthma Events vs Environmental Triggers
                </h3>
                <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>Correlation Analysis: When Do Events Occur?</p>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <defs>
                      <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#f1f5f9" : "#334155"} vertical={false} />
                    <XAxis dataKey="date" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                    <YAxis yAxisId="left" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                    <YAxis yAxisId="right" orientation="right" stroke={theme === 'light' ? "#94a3b8" : "#64748b"} fontSize={11} fontWeight="bold" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'light' ? 'white' : '#1e293b', 
                        borderRadius: '16px', 
                        border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
                        padding: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                    <Bar yAxisId="left" dataKey="hasAsthmaEvent" fill="url(#eventGradient)" name="Asthma Event" radius={[8, 8, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="pm25" stroke="#84cc16" strokeWidth={2} name="PM2.5 Level" />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={2} name="Humidity %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div className={`mt-6 p-5 rounded-2xl border ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/10 border-amber-900/30'}`}>
                <p className={`text-xs font-bold mb-2 ${theme === 'light' ? 'text-amber-900' : 'text-amber-400'}`}>
                  📊 Correlation Insights:
                </p>
                <ul className={`text-xs space-y-1 ${theme === 'light' ? 'text-amber-800' : 'text-amber-300'}`}>
                  <li>• <strong>{Math.round((trendData.filter(d => d.hasAsthmaEvent && d.pm25 > 25).length / trendData.filter(d => d.hasAsthmaEvent).length) * 100)}%</strong> of asthma events occurred when PM2.5 was elevated (&gt;25 µg/m³)</li>
                  <li>• <strong>{Math.round((trendData.filter(d => d.hasAsthmaEvent && d.humidity > 70).length / trendData.filter(d => d.hasAsthmaEvent).length) * 100)}%</strong> of events happened during high humidity (&gt;70%)</li>
                  <li>• Most events cluster in {dateRange === '7d' ? 'recent days' : 'mid-period'} - consider environmental interventions</li>
                </ul>
              </div>
            </div>
            </>)}
          </div>
        ) : activeTab === 'patients' ? (
          <div className="p-10 max-w-[1800px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Patient Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map(patient => {
                const patientData = patientSensorData[patient.id];
                const isSelected = selectedPatientId === patient.id;
                
                return (
                  <div 
                    key={patient.id}
                    className={`border rounded-3xl p-6 shadow-sm cursor-pointer transition-all hover:shadow-lg ${isSelected ? (theme === 'light' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' : 'bg-blue-900/20 border-blue-600 ring-2 ring-blue-500') : themeClasses.card}`}
                    onClick={() => {
                      setSelectedPatientId(patient.id);
                      updateActivePatientInSupabase(patient);
                      setActiveTab('dashboard');
                      
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-blue-100 text-blue-600' : 'bg-blue-900/30 text-blue-400'}`}>
                          <User size={24} />
                        </div>
                        <div>
                          <h3 className={`text-lg font-black ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
                            {patient.name}
                          </h3>
                          <p className={`text-xs font-bold ${themeClasses.subtext}`}>
                            {patient.age}y • {patient.gender}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                      )}
                    </div>
                    
                    <div className={`p-4 rounded-xl mb-4 ${theme === 'light' ? 'bg-white' : 'bg-slate-800'}`}>
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${themeClasses.subtext}`}>Current Status</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className={theme === 'light' ? 'text-slate-600' : 'text-slate-400'}>Risk:</span>
                          <span className={`ml-2 font-black ${patientData.physioRisk === 'safe' ? 'text-emerald-500' : patientData.physioRisk === 'medium' ? 'text-amber-500' : 'text-rose-500'}`}>
                            {patientData.physioRisk.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className={theme === 'light' ? 'text-slate-600' : 'text-slate-400'}>SpO2:</span>
                          <span className="ml-2 font-black">{patientData.spo2}%</span>
                        </div>
                        <div>
                          <span className={theme === 'light' ? 'text-slate-600' : 'text-slate-400'}>Heart:</span>
                          <span className="ml-2 font-black">{patientData.heartRate} bpm</span>
                        </div>
                        <div>
                          <span className={theme === 'light' ? 'text-slate-600' : 'text-slate-400'}>Breathing:</span>
                          <span className="ml-2 font-black">{patientData.breathingRate} br/m</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`text-[10px] mb-4 ${themeClasses.subtext}`}>
                      <div>Patient ID: <span className="font-bold">{patient.patientId}</span></div>
                      <div>Added: <span className="font-bold">{new Date(patient.addedDate).toLocaleDateString()}</span></div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditPatientModal(patient);
                        }}
                        className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all hover:scale-105 active:scale-95 ${theme === 'light' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePatient(patient.id);
                        }}
                        className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all hover:scale-105 active:scale-95 ${theme === 'light' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-rose-900/30 text-rose-400 hover:bg-rose-900/50'}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Add New Patient Card */}
              <div 
                onClick={openAddPatientModal}
                className={`border-2 border-dashed rounded-3xl p-6 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:scale-105 active:scale-95 flex flex-col items-center justify-center min-h-[320px] ${theme === 'light' ? 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50' : 'border-slate-700 hover:border-blue-600 bg-slate-800/50 hover:bg-blue-900/20'}`}
              >
                <Plus size={48} className={`mb-4 ${theme === 'light' ? 'text-slate-400' : 'text-slate-600'}`} />
                <p className={`text-lg font-black ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                  Add New Patient
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* PATIENT MANAGEMENT MODAL */}
      {isPatientModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl border-2 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#1e293b] border-slate-700'}`}>
            <h2 className={`text-2xl font-black mb-6 ${theme === 'light' ? 'text-[#1e3a8a]' : 'text-white'}`}>
              {editingPatient ? 'Edit Patient' : 'Add New Patient'}
            </h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className={`text-xs font-black uppercase tracking-widest mb-2 block ${themeClasses.subtext}`}>
                  Patient Name
                </label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className={`w-full px-4 py-3 rounded-xl border-2 font-bold transition-all ${theme === 'light' ? 'bg-white border-slate-200 text-slate-900 focus:border-blue-400' : 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'}`}
                />
              </div>
              
              <div>
                <label className={`text-xs font-black uppercase tracking-widest mb-2 block ${themeClasses.subtext}`}>
                  Age
                </label>
                <input
                  type="number"
                  value={newPatientAge}
                  onChange={(e) => setNewPatientAge(e.target.value)}
                  placeholder="Enter age"
                  min="1"
                  max="150"
                  className={`w-full px-4 py-3 rounded-xl border-2 font-bold transition-all ${theme === 'light' ? 'bg-white border-slate-200 text-slate-900 focus:border-blue-400' : 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'}`}
                />
              </div>
              
              <div>
                <label className={`text-xs font-black uppercase tracking-widest mb-2 block ${themeClasses.subtext}`}>
                  Gender
                </label>
                <select
                  value={newPatientGender}
                  onChange={(e) => setNewPatientGender(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 font-bold transition-all cursor-pointer ${theme === 'light' ? 'bg-white border-slate-200 text-slate-900 focus:border-blue-400' : 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'}`}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={closePatientModal}
                className={`flex-1 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${theme === 'light' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                Cancel
              </button>
              <button
                onClick={savePatient}
                className={`flex-1 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg ${theme === 'light' ? 'bg-[#1e3a8a] text-white hover:bg-[#162a63]' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
              >
                {editingPatient ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className={`fixed bottom-0 left-0 lg:left-72 right-0 h-12 border-t px-10 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.3em] z-40 transition-colors duration-300 ${themeClasses.footer}`}>
        <div className="flex items-center gap-4">
           <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> ENCRYPTED: ON</span>
           <span className={themeClasses.subtext}>|</span>
           <span className={themeClasses.subtext}>FIRMWARE: V3.2.0</span>
        </div>
        <div>HIKON MONITORING SOLUTIONS &copy; 2026</div>
      </footer>
    </div>
  );
};

// --- REFINED SUB-COMPONENTS ---

const NavItem = ({ icon, label, active, onClick, theme }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 active:scale-95 relative group ${
      active 
        ? (theme === 'light' ? 'bg-[#1e3a8a] text-white shadow-xl shadow-blue-900/10' : 'bg-blue-600 text-white shadow-xl shadow-blue-900/30') 
        : (theme === 'light' ? 'text-slate-400 hover:bg-slate-50 hover:text-slate-700' : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-100')
    }`}
  >
    <span>{icon}</span>
    <span className={`hidden lg:block text-xs font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{label}</span>
    {active && <div className="absolute right-3 w-1.5 h-1.5 bg-lime-400 rounded-full shadow-[0_0_8px_#a3e635]" />}
  </button>
);

export default App;