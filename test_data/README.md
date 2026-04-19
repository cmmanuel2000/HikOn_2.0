# 🧪 HikOn 2.1.1 Testing Guide

Welcome to your testing suite! Use these scripts to validate your system before the April 22nd presentation. 

### How to use:
1.  Open your **Supabase SQL Editor**.
2.  Copy the contents of any script in this folder.
3.  Click **Run**.
4.  Open your **HikOn Dashboard** and watch the real-time updates.

---

### 📂 Test Files Overview:

#### 1. [01_calibration_test.sql](file:///c:/Users/chriz/Desktop/Hikon2.1.1/test_data/01_calibration_test.sql)
**Purpose**: Tests the "Personal Best" feature.
- **Workflow**: Run the script ➔ Go to Dashboard ➔ Click **Record Personal Best** ➔ It will fetch this high-frequency data and calculate the average.

#### 2. [02_motion_test.sql](file:///c:/Users/chriz/Desktop/Hikon2.1.1/test_data/02_motion_test.sql)
**Purpose**: Tests the Motion Tiers and Alert Suppression.
- **Steady**: Alerts work normally.
- **Moving**: Risk Badge switches to **"MOTION"** and suppresses SpO2 alarms.
- **Cooldown**: After "Moving" ends, watch for the **5-minute countdown** before alerts turn back on.

#### 3. [03_risk_test.sql](file:///c:/Users/chriz/Desktop/Hikon2.1.1/test_data/03_risk_test.sql)
**Purpose**: Tests the Clinical Risk Assessment levels.
- **Safe**: Green badge.
- **Medium**: Amber badge (SpO2 < 96%).
- **High**: Red badge (SpO2 < 92%).
- **Environmental**: High PM2.5 or Humidity triggers surround warnings.

---
**Good luck with your Clinical Validation!**
