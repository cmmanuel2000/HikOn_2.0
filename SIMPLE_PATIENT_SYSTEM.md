# 🎯 Simple Patient System - How It Works

## Overview

This is the **SIMPLE** system you wanted! 

- ✅ ONE ESP32 device for all patients
- ✅ Dashboard controls which patient gets the data
- ✅ Switch patients anytime - no code changes
- ✅ All data automatically tagged with patient ID

---

## 🚀 How It Works

### The Flow:

```
1. Dashboard: Select "Patient 1" 
   → Sets active patient to PATIENT-001

2. ESP32: Checks "Who's active?"
   → Gets PATIENT-001

3. ESP32: Uploads sensor data
   → Tagged as PATIENT-001

4. Dashboard: View Patient 1
   → Shows all PATIENT-001 data

5. Dashboard: Switch to "Patient 2"
   → Sets active patient to PATIENT-002

6. ESP32: Checks again
   → Gets PATIENT-002

7. ESP32: Uploads more data
   → Now tagged as PATIENT-002

8. Dashboard: View Patient 2
   → Shows all PATIENT-002 data
```

**Result:** Same device, different patients, perfectly separated data! 🎉

---

## 📋 Setup Steps

### Step 1: Setup Supabase (ONE TIME)

1. Go to: https://supabase.com/dashboard
2. Select your project: `ogapdrgcwmzecbwwrmre`
3. Click **"SQL Editor"**
4. Click **"New Query"**
5. Copy the entire contents of `setup_active_patient.sql`
6. Paste and click **"Run"**
7. Should see: ✅ "Active patient system setup complete!"

This creates:
- `active_patient` table - Stores which patient is currently active
- `patient_id` column in `s3_sensor_data` - Tags each reading with patient

### Step 2: Upload Arduino Code (ONE TIME)

1. Open `hardware/hikon_pm2.5.ino` in Arduino IDE
2. Upload to ESP32
3. Open Serial Monitor (115200 baud)
4. You'll see:
   ```
   === ESP32-S3 Multi-Sensor + TinyML + PM2.5 ===
   📋 Device controlled by dashboard
      Data goes to currently selected patient
   
   ✅ WiFi connected
   📋 Active Patient: PATIENT-001
   ✅ Data uploaded to PATIENT-001
   ```

### Step 3: Use the Dashboard

1. **Add Patients:**
   - Click "Patients" tab
   - Click "+" or "Add New Patient" card
   - Enter name, age, gender
   - Save

2. **Select Active Patient:**
   - Use dropdown in header to select a patient
   - **This tells the ESP32 where to send data**

3. **Monitor Patient:**
   - Switch to "Safety Dashboard" tab
   - See real-time data for selected patient

4. **View History:**
   - Click "Health Trends" tab
   - See historical data for selected patient

---

## 💡 Example Usage

### Scenario: Morning Check (Patient 1)

```
9:00 AM - Select "Patient 1" in dashboard
9:05 AM - Put wearable on Patient 1
9:10 AM - ESP32 sends data → Goes to PATIENT-001
9:20 AM - View Patient 1 dashboard → See their data
```

### Scenario: Afternoon Check (Patient 2)

```
2:00 PM - Select "Patient 2" in dashboard
2:05 PM - Move wearable to Patient 2
2:10 PM - ESP32 sends data → Goes to PATIENT-002
2:20 PM - View Patient 2 dashboard → See their data
```

### Scenario: Review Patient 1's Data Later

```
4:00 PM - Select "Patient 1" in dropdown
4:01 PM - View dashboard → See only Patient 1's historical data
```

**Note:** Switching patients in the dropdown does TWO things:
1. **Changes what you SEE** (filters display by that patient)
2. **Changes where NEW data GOES** (ESP32 reads this and tags data accordingly)

---

## 🔍 How to View Data in Supabase

### See Current Active Patient:
```sql
SELECT * FROM active_patient;
```

Shows which patient is currently selected in the dashboard.

### See Recent Data with Patient IDs:
```sql
SELECT 
    created_at,
    patient_id,
    heart_rate,
    spo2,
    risk_level
FROM s3_sensor_data
ORDER BY created_at DESC
LIMIT 20;
```

### Get All Data for Patient 1:
```sql
SELECT * 
FROM s3_sensor_data
WHERE patient_id = 'PATIENT-001'
ORDER BY created_at DESC;
```

### Count Readings Per Patient:
```sql
SELECT 
    patient_id,
    COUNT(*) as total_readings,
    MIN(created_at) as first_reading,
    MAX(created_at) as last_reading
FROM s3_sensor_data
GROUP BY patient_id
ORDER BY patient_id;
```

---

## ✅ What Happens Automatically

### When You Create a Patient:
✅ Patient gets automatic ID: `PATIENT-001`, `PATIENT-002`, etc.  
✅ Patient card shows their ID  
✅ Ready to receive data immediately

### When You Select a Patient:
✅ Dashboard shows their data  
✅ Supabase `active_patient` table updates  
✅ ESP32 reads this on next upload  
✅ New data goes to that patient

### When ESP32 Uploads:
✅ Fetches current active patient  
✅ Tags data with patient_id  
✅ Sends to Supabase  
✅ Shows in Serial Monitor: "✅ Data uploaded to PATIENT-001"

---

## 🎯 Key Points

1. **ONE device, MANY patients** - No reprogramming needed
2. **Dashboard is in control** - Just select the patient
3. **Data auto-tagged** - ESP32 reads who's active
4. **Perfect separation** - Each patient sees only their data
5. **Historical tracking** - All past data preserved with patient IDs

---

## 🔧 Troubleshooting

### Data going to wrong patient?
- Check dashboard: Which patient is currently selected?
- Check Supabase: `SELECT * FROM active_patient;`
- Wait a moment - ESP32 checks every upload

### Can't see patient's data?
- Make sure patient is selected in dropdown
- Check Supabase: `SELECT * FROM s3_sensor_data WHERE patient_id = 'PATIENT-001';`
- Verify ESP32 is uploading: Watch Serial Monitor for "✅ Data uploaded"

### ESP32 Serial Monitor shows old patient?
- It only updates when sending new data
- Wait for next sensor reading (~10 seconds)
- Should show: "📋 Active Patient: PATIENT-XXX"

---

## 📊 System Architecture

```
┌─────────────────┐
│   Dashboard     │
│ (Select Patient)│
└────────┬────────┘
         │ Updates
         ▼
┌─────────────────┐
│    Supabase     │
│ active_patient  │ ← Stores: "PATIENT-001"
│     table       │
└────────┬────────┘
         │ ESP32 reads
         ▼
┌─────────────────┐
│     ESP32       │
│ Sends data with │
│ patient_id =    │
│ "PATIENT-001"   │
└────────┬────────┘
         │ Uploads
         ▼
┌─────────────────┐
│    Supabase     │
│ s3_sensor_data  │ ← Stores data with patient_id
│     table       │
└────────┬────────┘
         │ Dashboard reads
         ▼
┌─────────────────┐
│   Dashboard     │
│(View Patient 1) │ ← Filters by "PATIENT-001"
└─────────────────┘
```

---

## ✨ Summary

**Old way:** Program device for each patient, manage multiple devices  
**New way:** ONE device, switch patients in dashboard  

**Old way:** Confusing data from multiple devices  
**New way:** Clear separation - each patient has their own ID  

**Old way:** Change code to reassign device  
**New way:** Click dropdown, select patient, done!  

**It's that simple!** 🎉

---

## 🎓 Quick Reference

### Dashboard Actions:
- **Add Patient**: Patients tab → Add button
- **Select Patient**: Dropdown in header
- **View Data**: Patient's data filters automatically
- **Switch Patient**: Just select different patient

### What ESP32 Does:
- Checks active patient before upload
- Tags data with patient_id
- Shows in Serial Monitor which patient got the data
- No manual configuration needed!

---

**Questions? Check the Serial Monitor** - it shows which patient is receiving data in real-time!
