# HikOn 2.1.1: Final Clinical Monitoring & Alert Logic Plan

This plan finalizes the smart alert logic based on activity tiers and establishes the 2-minute "Personal Best" calibration process.

## User Review Required

> [!IMPORTANT]
> **Smart Alert Logic**:
> - **Steady/Walking**: Alerts are active.
> - **Intense Motion (Running/shaking)**: Alerts are **suppressed** to prevent false positives from motion artifacts.
> - **Stability Cooldown**: After intense motion stops, the system will wait for **5 minutes** of stability before re-enabling alerts (adjustable for testing).
> 
> **Recording Duration**: Set to **2 minutes** for the SpO2 Personal Best session.

## Proposed Changes

### 1. Motion Tiering (Accelerometer)
#### [MODIFY] [breathingRate.js](file:///c:/Users/chriz/Desktop/Hikon2.1.1/src/utils/breathingRate.js)
- Update `isAtRest` to return a 3-tier status:
    1. **Steady** (Std Dev < 0.05)
    2. **Walking** (0.05 <= Std Dev < 0.20)
    3. **Moving/Running** (Std Dev >= 0.20)

### 2. Dashboard: Smart Alerts & UI
#### [MODIFY] [App.jsx](file:///c:/Users/chriz/Desktop/Hikon2.1.1/src/App.jsx)
- **Motion Status UI**: Simple text indicator (e.g., "Status: Steady").
- **Alert Suppression Logic**: 
    - Implement a `stabilityCooldown` timer.
    - If status is `Moving/Running`, set `alertsEnabled = false`.
    - Once status returns to `Steady`, wait 5 minutes before setting `alertsEnabled = true` again.
- **Add Child Pop-up**: Implement as a modal/pop-up.

### 3. SpO2 Personal Best (Calibration)
#### [MODIFY] [App.jsx](file:///c:/Users/chriz/Desktop/Hikon2.1.1/src/App.jsx)
- **2-Minute Recording**: Trigger a session that fetches from `oximeter_calibration` at 10s intervals.
- **Calculation**: Average the readings and save to `patient_id.spo2_baseline`.

### 4. SQL codes (Completed)
- Refer to the `sql_codes/` folder for the required database schemas.

## Open Questions

> [!QUESTION]
> 1. For the **5-minute cooldown**, would you like to see a countdown timer on the dashboard so you know when alerts will resume?
> 2. Should "Walking" status be shown in a different color (e.g., Orange) than "Steady" (Green)?

## Verification Plan

### Automated Tests
- Simulate "Running" motion (Std Dev > 0.2) and verify alerts stay silent even if SpO2 drops.
- Verify that alerts only resume after the 5-minute timer expires.

### Manual Verification
- Perform the 2-minute calibration and check the profile for the saved Personal Best.
- Test the "Add Child" pop-up for new patients.
