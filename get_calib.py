import pandas as pd
import numpy as np
import glob
import os
import re
from sklearn.linear_model import LinearRegression

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
    manual_df = pd.read_excel(r'c:\Users\chriz\Desktop\Hikon2.1.1\manual_test\manual_test.xlsx')
    manual_targets = {}
    for idx, row in manual_df.iterrows():
        name_key = str(row['name']).lower().replace('-testing', '')
        rest_br = int(row['spo2/hr/br'].split('/')[-1])
        act_br = int(row['spo2/hr/br (after jumping jacks)'].split('/')[-1])
        manual_targets[name_key] = {'rest': rest_br, 'act': act_br}
        
    files = glob.glob(r"c:\Users\chriz\Desktop\Hikon2.1.1\accel_values\*.csv")
    
    data_points = []
    
    for filepath in files:
        basename = os.path.basename(filepath)
        match = re.search(r'\[(.*)-TESTING\]', basename)
        name_raw = match.group(1) if match else basename.split('_')[0]
        name_key = name_raw.lower()
        
        try:
            df = pd.read_csv(filepath)
        except Exception:
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
                
        dp = {
            'name': name_raw.title().replace('2Nd-', '2nd '),
            'name_key': name_key,
            'rest_z': np.mean(resting_zcs) if len(resting_zcs) > 0 else np.nan,
            'act_z': np.mean(active_zcs) if len(active_zcs) > 0 else np.nan,
        }
        data_points.append(dp)
        
    X_rest = []
    y_rest = []
    X_act = []
    y_act = []
    
    for dp in data_points:
        if dp['name_key'] in manual_targets:
            target = manual_targets[dp['name_key']]
            if not np.isnan(dp['rest_z']):
                X_rest.append([dp['rest_z']])
                y_rest.append(target['rest'])
            if not np.isnan(dp['act_z']):
                X_act.append([dp['act_z']])
                y_act.append(target['act'])
                
    reg_rest = LinearRegression().fit(X_rest, y_rest)
    reg_act = LinearRegression().fit(X_act, y_act)
    
    print(f"REST_ZC_SLOPE = {reg_rest.coef_[0]:.4f}")
    print(f"REST_ZC_INTERCEPT = {reg_rest.intercept_:.4f}")
    print(f"ACTIVE_ZC_SLOPE = {reg_act.coef_[0]:.4f}")
    print(f"ACTIVE_ZC_INTERCEPT = {reg_act.intercept_:.4f}")

if __name__ == '__main__':
    main()
