import numpy as np
from sklearn.linear_model import LinearRegression

# Resting
X_rest = np.array([[2.65, 2.38, 2.62], [2.53, 2.09, 2.35], [2.92, 3.37, 3.32]])
y_rest = np.array([21, 22, 32])

# Active (mag_std >= 0.05)
X_active = np.array([[1.35, 2.10, 1.15], [1.97, 2.00, 1.90], [1.74, 1.70, 1.19]])
y_active = np.array([27, 29, 29])

for axis, idx in zip(['X', 'Y', 'Z'], [0, 1, 2]):
    print(f"\n--- AXIS {axis} ---")
    reg_rest = LinearRegression().fit(X_rest[:, idx].reshape(-1, 1), y_rest)
    print(f"REST: BPM = {reg_rest.coef_[0]:.2f} * {axis} + {reg_rest.intercept_:.2f}. R^2 = {reg_rest.score(X_rest[:, idx].reshape(-1, 1), y_rest):.2f}")
    
    reg_active = LinearRegression().fit(X_active[:, idx].reshape(-1, 1), y_active)
    print(f"ACTIVE: BPM = {reg_active.coef_[0]:.2f} * {axis} + {reg_active.intercept_:.2f}. R^2 = {reg_active.score(X_active[:, idx].reshape(-1, 1), y_active):.2f}")

