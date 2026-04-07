import pandas as pd
import numpy as np

def count_zero_crossings(signal):
    if len(signal) < 2: return 0
    signal = np.array(signal)
    signal = signal - np.mean(signal)
    crossings = 0
    for i in range(1, len(signal)):
        if (signal[i-1] < 0 and signal[i] >= 0) or (signal[i-1] >= 0 and signal[i] < 0):
            crossings += 1
    return crossings

files = [
    (r"c:\Users\chriz\Desktop\Hikon2.1.1\[DWAYNE-TESTING] April 06, 2026_accel_values_rows.csv", "Dwayne", 21, 27),
    (r"c:\Users\chriz\Desktop\Hikon2.1.1\[KIM-TESTING] April 06, 2026_accel_values_rows.csv", "Kim", 22, 29),
    (r"c:\Users\chriz\Desktop\Hikon2.1.1\[MIGUELITO-TESTING] April 06, 2026_accel_values_rows.csv", "Miguelito", 32, 29)
]

with open('analysis_output.txt', 'w') as f:
    results = []
    for filepath, name, rest_bpm, active_bpm in files:
        df = pd.read_csv(filepath)
        f.write(f"\n--- {name} ---\n")
        
        # In current JS logic, we take a sliding window of 10 consecutive readings.
        # Let's find exactly the "resting" part (std < 0.05) and "active" part (std > 0.05 or higher).
        
        resting_z_zcs = []
        active_z_zcs = []
        
        for i in range(len(df) - 10 + 1):
            window = df.iloc[i:i+10]
            mag_std = window['accel_magnitude'].std(ddof=0)
            zc_x = count_zero_crossings(window['accel_x'])
            zc_y = count_zero_crossings(window['accel_y'])
            zc_z = count_zero_crossings(window['accel_z'])
            
            if mag_std < 0.05:
                resting_z_zcs.append((zc_x, zc_y, zc_z))
            else:
                active_z_zcs.append((zc_x, zc_y, zc_z))
                
        if len(resting_z_zcs) > 0:
            avg_x = np.mean([r[0] for r in resting_z_zcs])
            avg_y = np.mean([r[1] for r in resting_z_zcs])
            avg_z = np.mean([r[2] for r in resting_z_zcs])
            f.write(f"RESTING (Target {rest_bpm} BPM): ZC_X={avg_x:.2f}, ZC_Y={avg_y:.2f}, ZC_Z={avg_z:.2f}\n")
            results.append((rest_bpm, avg_x, avg_y, avg_z))
        
        if len(active_z_zcs) > 0:
            avg_x = np.mean([r[0] for r in active_z_zcs])
            avg_y = np.mean([r[1] for r in active_z_zcs])
            avg_z = np.mean([r[2] for r in active_z_zcs])
            f.write(f"ACTIVE (Target {active_bpm} BPM): ZC_X={avg_x:.2f}, ZC_Y={avg_y:.2f}, ZC_Z={avg_z:.2f}\n")
            results.append((active_bpm, avg_x, avg_y, avg_z))
            
    f.write("\n\nSummary mappings (BPM, ZC_X, ZC_Y, ZC_Z):\n")
    for r in results:
        f.write(f"{r[0]} BPM -> Z_X: {r[1]:.2f}, Z_Y: {r[2]:.2f}, Z_Z: {r[3]:.2f}\n")
