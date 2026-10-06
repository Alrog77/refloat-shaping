# Sliders reference

The *Sliders* page (UI only) writes normal Refloat parameters. It adds nothing to the control loop, and every parameter stays available in *Refloat Cfg* for manual fine-tuning.

- Each parameter is **owned by exactly one slider**. A few values are **derived** from several sliders (see below); the preview labels them as such.
- **0 = stock values** of the `v1.3-mkp_booster` branch. Between the listed points, values are interpolated (linear, or geometric where noted).
- A disabled slider writes nothing. Slider positions are saved with tunes (shaping 4).

## Owned parameters

Values at the lowest position / 0 / highest position. Internal names in `code`.

| Slider | Range | Parameter (low / 0 / high) |
|---|---|---|
| **Accel Feel** | −10 … +10 | Angle P `kp`: 14 / 20 / 30 · Pitch KP `mahony_kp`: 2.6 / 2.0 / 1.5 |
| **Accel Feel (speed)** | 0 … +10 | — (drives the derived Dynamic Pitch KP) |
| **Brake Feel** | −10 … +10 | Angle P (Braking) `kp_brake`: 0.6 / 1.0 / 1.5 · Rate P (Braking) `kp2_brake`: 0.6 / 1.0 / 1.3 |
| **Input Play** | −10 … +10 | Rate P `kp2`: 1.0 / 0.6 / 0.3 · Torque Tilt start current `torquetilt_start_current`: 5 / 15 / 35 A · Booster start angle, accel and brake `booster_angle`, `brkbooster_angle`: 2 / 8 / 12° |
| **Carve Trim** | 0 … +10 | Turn Tilt strength `turntilt_strength`: 0 … 10 (one per step) |
| **Carve Trim Speed** | −10 … +10 | Turn Tilt smoothing `turn_tilt.filter.time_constant`: 0.40 / 0.20 / 0.08 s (geometric) |
| **Adaptive Response — uphill strength** | −10 … +10 | ATR strength up `atr_strength_up`: 0.3 / 1.0 / 2.2 · Torque Tilt strength `torquetilt_strength`: 0.03 / 0.10 / 0.25 |
| **Adaptive Response — downhill strength** | −10 … +10 | ATR strength down `atr_strength_down`: 0.2 / 0.5 / 1.6 · Torque Tilt regen strength `torquetilt_strength_regen`: 0.03 / 0.10 / 0.25 |
| **Adaptive Response — uphill speed** | −10 … +10 | ATR and Torque Tilt max tiltback / release speeds, *Up* (4 params): 12 / 24 / 60 °/s (geometric) |
| **Adaptive Response — downhill speed** | −10 … +10 | Same four speeds, *Down* (new in this fork; downhill for ATR, braking for Torque Tilt): 12 / 24 / 60 °/s (geometric) |
| **Response Limit** | 2 … 18°, step 0.5 (default 8) | ATR tiltback angle limit `atr_angle_limit`. The Torque Tilt angle limit is **not** written by any slider. |
| **Stance Profile** | −3 … +3°, step 0.2 | Constant tiltback `tiltback_constant` |

## Derived values

| Value | Computed from | Rule |
|---|---|---|
| Dynamic Pitch KP `dynamic_mahony_kp` | Accel Feel (speed), Accel Feel | 0 (disabled) at 0, else Pitch KP × (1 − 0.035 × position), i.e. 100 % → 65 % of Pitch KP at +10, floor 1.2 |
| Accel Booster target `booster_mahony_kp` | Accel Feel, Accel Feel (speed) | 0 (disabled) for position ≤ 0, else effective KP × (1 − 0.04 × position), i.e. down to 60 % at +10, floor 0.8 |
| Brake Booster target `brkbooster_mahony_kp` | Brake Feel, Accel Feel, Accel Feel (speed) | Same rule with the Brake Feel position |
| ATR / Torque Tilt smoothing (6 time constants) | Uphill speed, downhill speed | Factor f from the average of both speed positions (0.5 at −10, 1 at 0, 2 at +10, geometric); each stock time constant ÷ f, clamped to 0.01–0.5 s |

*Effective KP* = the lower of Pitch KP and Dynamic Pitch KP (when enabled). In this branch, a **lower** Pitch KP means a **firmer** board, so moving Accel Feel or Accel Feel (speed) also moves the Booster targets. This compounding is intentional but real: it is the main thing to keep in mind when using the sliders.

## Checks before writing

- Writing only with the board stopped, after a preview listing every changed parameter, its old and new value, and its source slider (or "derived from …"). Only values that actually change are written.
- **Blocking**: non-finite value; value outside `settings.xml` bounds; any ATR / Torque Tilt speed below 4 °/s; ATR angle limit above 18°; a Booster target outside [0.8, effective KP) when written.
- **Warnings**: Response Limit above 10°; Torque Tilt angle limit above 8° (set outside the sliders); Pitch KP or Dynamic Pitch KP below Roll KP + 0.1; a Booster target left by a disabled Feel slider that no longer fits the effective KP.

## Tests

`make test` (Node) checks the engine: all sliders at 0 give the stock values exactly, monotonic owned parameters, 200,000 random combinations, positions round-trip through tunes, and that the engine copy embedded in `ui.qml.in` is identical to `shaping/shaping.js`.
