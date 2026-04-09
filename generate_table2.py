import pandas as pd
import numpy as np
import glob
import os
import re

def count_zero_crossings(signal):
    if len(signal) < 2: return 0
    signal = np.array(signal)
    signal = signal - np.mean(signal)
    crossings = 0
    for i in range(1, len(signal)):
        if (signal[i-1] < 0 and signal[i] >= 0) or (signal[i-1] >= 0 and signal[i] < 0):
            crossings += 1
    return crossings

def main():
    files = glob.glob(r"c:\Users\chriz\Desktop\Hikon2.1.1\accel_values\*.csv")
    
    with open(r"c:\Users\chriz\Desktop\Hikon2.1.1\table_output2.txt", "w", encoding="utf-8") as f:
        f.write("| Patient | Rest BR | Active BR |\n")
        f.write("|---|---|---|\n")
        
        for filepath in files:
            basename = os.path.basename(filepath)
            match = re.search(r'\[(.*)-TESTING\]', basename)
            name = match.group(1).title() if match else basename
            name = name.replace('2Nd-', '2nd ')
            
            try:
                df = pd.read_csv(filepath)
            except Exception as e:
                continue
                
            resting_zcs = []
            active_zcs = []
            
            for i in range(len(df) - 10 + 1):
                window = df.iloc[i:i+10]
                mag_std = window['accel_magnitude'].std(ddof=0)
                zc_z = count_zero_crossings(window['accel_z'])
                
                if mag_std < 0.05:
                    resting_zcs.append(zc_z)
                else:
                    active_zcs.append(zc_z)
                    
            rest_str = "N/A"
            act_str = "N/A"
            
            if len(resting_zcs) > 0:
                avg_z_rest = np.mean(resting_zcs)
                rest_bpm = -18.08 * avg_z_rest + 78.50
                rest_str = f"{rest_bpm:.1f} br/m"
            
            if len(active_zcs) > 0:
                avg_z_act = np.mean(active_zcs)
                active_bpm = 1.48 * avg_z_act + 26
                act_str = f"{active_bpm:.1f} br/m"
                
            f.write(f"| {name} | {rest_str} | {act_str} |\n")

if __name__ == '__main__':
    main()
