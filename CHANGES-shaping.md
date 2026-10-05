# Refloat Shaping — changes

Base: Refloat 1.3 with Dynamic Pitch KP and Booster Pitch KP (`boosterPitchKP` branch by Nico Aleman).

## Shaping 1 — separate uphill / downhill speeds

- Four new parameters: ATR and Torque Tilt *Max Tiltback Speed (Down)* and *Max Tiltback Release Speed (Down)*. *Down* = downhill for ATR, braking for Torque Tilt. Default 24 °/s (the stock *Up* values), bounds 1 to 100 °/s.
- `atr_configure()` and `torque_tilt_configure()` pass them to the existing *down* limits of the setpoint smoothing, which previously received the *Up* value. Values are clamped in C at configuration time (NaN or < 1 -> 1, > 100 -> 100). Nothing is added to the control loop.
- The config structure changes: back up and restore your config when installing.
- CSV export in the Data tab and six low-passed IMU realtime values (`imu.ax/ay/az`, `imu.gx/gy/gz`), observation only.
