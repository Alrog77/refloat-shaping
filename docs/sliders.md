# Sliders reference (shaping 6.2)

The *Sliders* page (UI only) writes normal Refloat parameters. It adds nothing to the control loop, and every parameter stays available in *Refloat Cfg* for manual fine-tuning.

- Each parameter is **owned by one slider**. A few values are **derived** from several sliders (see below); the preview labels them as such.
- **0 = stock values** of the `v1.3-mkp_booster` branch, except the two Booster Pitch KP targets, which are active at 95 % of the effective KP at 0.
- Ranges are limited to what was ridden plus a small margin. Between the listed points, values are interpolated (linear, or geometric where noted).
- A disabled slider writes nothing, except Accel Feel, Accel Feel (speed) and Brake Feel: when disabled, they switch their Booster target / Dynamic Pitch KP off (0). Slider positions are saved with tunes.

## Owned parameters

Values at −10 / 0 / +10. Internal names in `code`.

| Slider | Range | Parameters |
|---|---|---|
| **Accel Feel** | −10 … +10 | Angle P `kp`: 14 / 20 / 24 · Pitch KP `mahony_kp`: 2.6 / 2.0 / 1.8 |
| **Accel Feel (speed)** | 0 … +10 | — (drives the derived Dynamic Pitch KP) |
| **Brake Feel** | −10 … +10 | Braking stiffness ratio 0.8 / 1.0 / 3.0 (gives the derived Angle P (Braking), see below) · Rate P (Braking) `kp2_brake`: 0.8 / 1.0 / 1.6 · Brake Booster start angle `brkbooster_angle`: 8 / 8 / 2° and ramp `brkbooster_ramp`: 4 / 4 / 2° (stock at 0 and below) |
| **Input Play** | −10 … +10 | Rate P `kp2`: 0.8 / 0.6 / 0.45 · Torque Tilt start current `torquetilt_start_current`: 10 / 15 / 25 A · Accel Booster start angle `booster_angle`: 5 / 8 / 10° |
| **Carve Trim** | 0 … +10 | Turn Tilt strength `turntilt_strength`: 0 … 10 |
| **Carve Trim Speed** | −10 … +10 | Turn Tilt smoothing `turn_tilt.filter.time_constant`: 0.30 / 0.20 / 0.12 s (geometric) |
| **Adaptive Response — uphill strength** | −10 … +10 | ATR strength up `atr_strength_up`: 0.5 / 1.0 / 1.8 · Torque Tilt strength `torquetilt_strength`: 0.05 / 0.10 / 0.20 (may be limited, see stability) |
| **Adaptive Response — downhill strength** | −10 … +10 | ATR strength down `atr_strength_down`: 0.3 / 0.5 / 1.3 · Torque Tilt regen `torquetilt_strength_regen`: 0.05 / 0.10 / 0.22 (may be limited, see stability) |
| **Adaptive Response — uphill speed** | −10 … +10 | ATR and Torque Tilt max tiltback / release speeds, *Up*: 16 / 24 / 36 °/s (geometric) |
| **Adaptive Response — downhill speed** | −10 … +10 | Same four speeds, *Down* (downhill for ATR, braking for Torque Tilt): 16 / 24 / 36 °/s (geometric) |
| **Response Limit** | 0 … 18°, step 0.5 (default 8) | One Max Angle for the whole correction: ATR limit `atr_angle_limit` = position, Torque Tilt limit `torquetilt_angle_limit` = position, 8° max. 0 = off |
| **Stance Profile** | −2 … +2°, step 0.2 | Constant tiltback `tiltback_constant` (applies above 500 ERPM) |

## Derived values

| Value | Computed from | Rule |
|---|---|---|
| Angle P (Braking) `kp_brake` | Brake Feel, Accel Feel | 20 × ratio ÷ Angle P, within 0.2 to 3: braking stiffness (Angle P × Angle P (Braking)) does not depend on Accel Feel and never exceeds 60 |
| Dynamic Pitch KP `dynamic_mahony_kp` | Accel Feel (speed), Accel Feel | 0 (off) at 0, else Pitch KP × (1 − 0.02 × position): 80 % at +10, floor 1.2 |
| Accel Booster target `booster_mahony_kp` | Accel Feel, Accel Feel (speed) | Off at −10; 100 % → 95 % of the effective KP from −10 to 0 (100 % = no effect, so no jump); 80 % at +10; floor 0.8 |
| Brake Booster target `brkbooster_mahony_kp` | Brake Feel, Accel Feel, Accel Feel (speed) | Off at −10; 100 % → 95 % of the effective KP from −10 to 0; 0.82 at +10; floor 0.8 |
| ATR / Torque Tilt smoothing (6 time constants) | Uphill speed, downhill speed | Factor f from the average of both speed positions (0.7 at −10, 1 at 0, 1.4 at +10, geometric); each stock time constant ÷ f, within 0.01–0.5 s |

*Effective KP* = the lower of Pitch KP and Dynamic Pitch KP (when on). In this branch, a **lower** Pitch KP means a **firmer** board.

## Stability (automatic limits)

A strong Torque Tilt on a stiff board makes a loop: the Torque Tilt moves the setpoint with the current, the stiff board turns that into more current, and the board pumps under braking. Rides showed calm at a product of about 5, slight pumping at 5.8, clear pumping at 9.6 and 13. The written Torque Tilt strengths are therefore limited:

- Torque Tilt regen ≤ 5 ÷ (Angle P × Angle P (Braking));
- Torque Tilt strength ≤ 4.5 ÷ Angle P.

The preview shows each automatic limit (for example "Downhill strength: Torque Tilt strength limited to 0.08 instead of 0.22"). The ATR part of the strength sliders is never limited. Every slider at its maximum was ridden with these limits: no oscillation.

## Checks before writing

- Writing only with the board stopped, after a preview listing every changed parameter, its old and new value, its source slider (or "derived from …"), and any automatic limit. Only values that actually change are written.
- **Blocking**: non-finite value; value outside `settings.xml` bounds; any ATR / Torque Tilt speed below 4 °/s; ATR angle limit above 18°; a Booster target outside [0.8, effective KP); a Torque Tilt loop above its limit (only reachable with hand-set values, otherwise a warning).
- **Warnings**: Response Limit above 10°; Torque Tilt angle limit above 8° (set by hand); Pitch KP or Dynamic Pitch KP below Roll KP + 0.1.

## Tests

`make test` (Node) checks the engine and the battery estimate: all sliders at 0 give the stock values (Boosters at 95 %), monotonic owned parameters, braking stiffness never above 60, Torque Tilt loops within limits over 50,000 random states, 200,000 random combinations without unexpected blocking, positions round-trip through tunes, and the engine copies embedded in `ui.qml.in` are identical to `shaping/*.js`.
