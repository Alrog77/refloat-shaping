# Refloat Shaping — changes

Base: Refloat 1.3 with Dynamic Pitch KP and Booster Pitch KP (`v1.3-mkp_booster` branch by Nico Aleman).

## Shaping 1 — separate uphill / downhill speeds

- Four new parameters: ATR and Torque Tilt *Max Tiltback Speed (Down)* and *Max Tiltback Release Speed (Down)*. *Down* = downhill for ATR, braking for Torque Tilt. Default 24 °/s (the stock *Up* values), bounds 1 to 100 °/s.
- `atr_configure()` and `torque_tilt_configure()` pass them to the existing *down* limits of the setpoint smoothing, which previously received the *Up* value. Values are clamped in C at configuration time (NaN or < 1 -> 1, > 100 -> 100). Nothing is added to the control loop.
- The config structure changes: back up and restore your config when installing.
- CSV export in the Data tab and six low-passed IMU realtime values (`imu.ax/ay/az`, `imu.gx/gy/gz`), observation only.

## Shaping 3 — Sliders page (UI only)

- New *Sliders* tab: 12 sliders driving groups of existing parameters (Accel Feel, Accel Feel (speed), Brake Feel, Input Play, Carve Trim, Carve Trim Speed, Adaptive Response uphill/downhill strength and speed, Response Limit, Stance Profile).
- Each parameter belongs to exactly one slider; 0 = stock values; all ranges bounded; derived values (Dynamic Pitch KP, Booster targets, shared smoothing) are computed and labelled as derived in the preview.
- Writing only with the board stopped, after a preview listing every change and its source slider; only values that actually change are written; blocking checks on bounds and consistency.
- The engine is a single source (`shaping/shaping.js`) embedded in `ui.qml.in`; `make test` runs its tests (Node required).
- Legacy protocol only (`main.c`): the ATR *Down* speeds now follow the *Up* speeds on live tune and are reset on tune defaults.
- Build: works outside a git checkout (`GIT_HASH` fallback) and on macOS (`sed -i.bak`, portable `date`).

## Shaping 4 — tunes

- Slider positions are saved with each tune (on create or when overwriting its settings) and restored when the tune is applied, without any other write. Tunes without positions leave the page as is.
- 10 tune slots instead of 6. Tune format unchanged (1.0): the extra field is ignored by stock Refloat.
