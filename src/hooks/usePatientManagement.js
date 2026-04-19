import { useState, useCallback, useEffect } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Fallback patients shown while Supabase loads (or if fetch fails)
const FALLBACK_PATIENTS = [
  { id: 1, name: 'Patient 1', age: 5, gender: 'Male', patientId: 'PATIENT-001', addedDate: new Date().toISOString() },
  { id: 2, name: 'Patient 2', age: 6, gender: 'Female', patientId: 'PATIENT-002', addedDate: new Date().toISOString() }
];

export const usePatientManagement = () => {
  const [patients, setPatients] = useState(FALLBACK_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState(1);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('Male');

  // Patient-specific sensor data (initial state for each patient)
  const getInitialSensorData = () => ({
    spo2: 'N/A',
    heartRate: 'N/A',
    breathingRate: 16,
    respiratorySounds: 'Normal',
    temperature: 'N/A',
    humidity: 'N/A',
    pm25: 'N/A',
    aqi: 'N/A',
    wheezeCount: 0,
    coughCount: 0,
    physioRisk: 'safe',
    envRisk: 'safe',
    physioTriggers: [],
    envTriggers: [],
    riskScore: 0,
    confidence: 0.95,
    reasoning: 'Waiting for sensor data...',
    individualRisks: { symptom: 0, spo2: 0, breathing: 0 },
    symptomLog: { wheeze: 0, coughs: 0 },
    spo2WasCritical: false,
    isPhysicalActivity: false
  });

  const [patientSensorData, setPatientSensorData] = useState({
    1: getInitialSensorData(),
    2: getInitialSensorData()
  });

  // Load patients from Supabase on mount
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    fetch(`${SUPABASE_URL}/rest/v1/patient_id?order=id.asc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(rows => {
        if (!rows || rows.length === 0) return;
        const loaded = rows.map(row => ({
          id: row.id,
          name: row.name,
          age: row.age,
          gender: row.gender,
          patientId: row.patient_id,
          addedDate: row.added_date,
          spo2Baseline: row.spo2_baseline
        }));
        setPatients(loaded);
        setPatientsLoaded(true);
        // Auto-select the first patient so data loads immediately on open
        setSelectedPatientId(loaded[0].id);
        // Ensure patientSensorData has an entry for every loaded patient
        setPatientSensorData(prev => {
          const next = { ...prev };
          loaded.forEach(p => { if (!next[p.id]) next[p.id] = getInitialSensorData(); });
          return next;
        });
      })
      .catch(e => console.error('Failed to load patients from Supabase:', e));
  }, []);

  const updateActivePatientInSupabase = useCallback(() => {}, []);

  // Get selected patient
  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  // Helper to access current patient's sensors (fallback to empty defaults while loading)
  const sensors = patientSensorData[selectedPatientId] || patientSensorData[Object.keys(patientSensorData)[0]] || getInitialSensorData();
  const setSensors = useCallback((updateFunc) => {
    setPatientSensorData(prev => ({
      ...prev,
      [selectedPatientId]: typeof updateFunc === 'function' ? updateFunc(prev[selectedPatientId]) : updateFunc
    }));
  }, [selectedPatientId]);

  // Modal management functions
  const openAddPatientModal = () => {
    setEditingPatient(null);
    setNewPatientName('');
    setNewPatientAge('');
    setNewPatientGender('Male');
    setIsPatientModalOpen(true);
  };

  const openEditPatientModal = (patient) => {
    setEditingPatient(patient);
    setNewPatientName(patient.name);
    setNewPatientAge(patient.age.toString());
    setNewPatientGender(patient.gender);
    setIsPatientModalOpen(true);
  };

  const closePatientModal = () => {
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  };

  const savePatient = async () => {
    if (!newPatientName.trim() || !newPatientAge) {
      alert('Please enter patient name and age');
      return;
    }

    if (editingPatient) {
      setPatients(prev => prev.map(p =>
        p.id === editingPatient.id
          ? { ...p, name: newPatientName, age: parseInt(newPatientAge), gender: newPatientGender }
          : p
      ));
      closePatientModal();
    } else {
      // Save to Supabase first — let the DB trigger generate the patient_id
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        alert('Supabase is not configured');
        return;
      }
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/patient_id`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            name: newPatientName.trim(),
            age: parseInt(newPatientAge),
            gender: newPatientGender
          })
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('Failed to save patient to Supabase:', err);
          alert('Failed to save patient. Please try again.');
          return;
        }

        const [created] = await res.json();
        const newPatient = {
          id: created.id,
          name: created.name,
          age: created.age,
          gender: created.gender,
          patientId: created.patient_id,
          addedDate: created.added_date,
          spo2Baseline: created.spo2_baseline
        };

        // Insert a placeholder row in s3_sensor_data so the patient exists in sensor table
        fetch(`${SUPABASE_URL}/rest/v1/s3_sensor_data`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            device_id: `dashboard_placeholder_${created.patient_id}`,
            patient_id: created.patient_id,
            heart_rate: null,
            spo2: null,
            accel_mag: null,
            temperature: null,
            humidity: null,
            pm10: null,
            pm25: null,
            pm100: null,
            cough: 0,
            wheeze: 0,
            prediction_label: null,
            risk_level: 'safe'
          })
        }).then(r => { if (!r.ok) r.text().then(t => console.error('Placeholder row failed:', r.status, t)); })
          .catch(e => console.error('Failed to insert placeholder sensor row:', e));

        setPatients(prev => [...prev, newPatient]);
        setPatientSensorData(prev => ({ ...prev, [created.id]: getInitialSensorData() }));
        setSelectedPatientId(created.id);
      } catch (e) {
        console.error('Error saving patient:', e);
        alert('Failed to save patient. Please try again.');
        return;
      }
      closePatientModal();
    }
  };

  const deletePatient = async (patientId) => {
    if (patients.length <= 1) {
      alert('Cannot delete the last patient');
      return;
    }
    if (confirm('Are you sure you want to delete this patient?')) {
      const patient = patients.find(p => p.id === patientId);

      // Delete from Supabase first
      if (patient && SUPABASE_URL && SUPABASE_KEY) {
        try {
          const res = await fetch(
              `${SUPABASE_URL}/rest/v1/patient_id?id=eq.${patient.id}`,
              {
                method: 'DELETE',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
              }
          );
          if (!res.ok) {
            console.error('Failed to delete patient from Supabase:', await res.text());
            alert('Failed to delete patient. Please try again.');
            return;
          }
        } catch (e) {
          console.error('Error deleting patient:', e);
          alert('Failed to delete patient. Please try again.');
          return;
        }
      }

      setPatients(prev => prev.filter(p => p.id !== patientId));
      setPatientSensorData(prev => {
        const newData = { ...prev };
        delete newData[patientId];
        return newData;
      });
      if (selectedPatientId === patientId) {
        setSelectedPatientId(patients.find(p => p.id !== patientId).id);
      }
    }
  };

  const updateSpo2Baseline = async (patientIdString, newBaseline) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/patient_id?patient_id=eq.${patientIdString}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ spo2_baseline: newBaseline })
      });

      if (res.ok) {
        setPatients(prev => prev.map(p => 
          p.patientId === patientIdString ? { ...p, spo2Baseline: newBaseline } : p
        ));
        return true;
      } else {
        const errorText = await res.text();
        console.error('Supabase Patch Error:', res.status, errorText);
        return false;
      }
    } catch (e) {
      console.error('Error updating SpO2 baseline:', e);
      return false;
    }
  };

  return {
    // State
    patients,
    selectedPatientId,
    selectedPatient,
    patientsLoaded,
    isPatientModalOpen,
    editingPatient,
    newPatientName,
    newPatientAge,
    newPatientGender,
    patientSensorData,
    sensors,
    
    // Setters
    setSelectedPatientId,
    setNewPatientName,
    setNewPatientAge,
    setNewPatientGender,
    setSensors,
    setPatientSensorData,
    
    // Functions
    openAddPatientModal,
    openEditPatientModal,
    closePatientModal,
    savePatient,
    deletePatient,
    updateActivePatientInSupabase,
    updateSpo2Baseline
  };
};
