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

## Shaping 5 — estimated battery charge (display only)

- Molicel P42A discharge curves at 0 and 20 A, interpolated with the pack current (current clamped to 0-20 A; previous estimate kept while braking), 0 % = low-voltage threshold, 10 s smoothing, controller value in parentheses, automatic fallback to the controller value. Voltage protections, LEDs and BMS are unchanged.

## Fix — preview dialog

- With many changes, the long list in the write dialog pushed the *Apply* button off screen. The dialog now shows a one-line summary; the full list of changes (old -> new value, source slider) is shown on the Sliders page, under *Preview and write*. The dialog's own *Differences* list is unchanged.

## Accel Feel and Brake Feel ranges (validated on the board, 9 Oct 2026)

Found by manual tuning over four logged rides, then moved into the sliders. 0 is still the stock config.

- **Accel Feel**, negative side softer: −10 now gives Angle P 12.8 and Pitch KP 2.72 (was 14 / 2.6). +10 unchanged (30 / 1.5). The tuned nose sits at −5: Angle P 16.4, Pitch KP 2.36.
- **Brake Feel**, +10 = the validated braking:
  - Angle P (Braking) 3.0 (was 1.5, briefly 2.5): the `settings.xml` maximum.
  - Rate P (Braking) 1.6 (was 1.3). 2.2 was tried: the board was slow to come back level after braking.
  - Brake Booster start angle 2° and ramp 2° (stock 8° / 4°), now owned by Brake Feel. They stay stock at 0 and below, where the brake Booster is off. Input Play now only sets the accel Booster start angle.
  - Brake Booster Pitch KP: goes from the effective KP at 0 to 0.82 at +10 (absolute, whatever Accel Feel). It stays inside [0.8, effective KP) for every position, which the tests check.
- Reason for the extra braking parts: Angle P (Braking) multiplies Angle P, so softening the nose (Accel Feel −5) also took about 18 % off braking stiffness, with Angle P (Braking) already at its maximum.
- Logs with Accel Feel −5 and Brake Feel +10 settings: tail angle under braking p90 9.7°, max 10.6° at −71 A (was 11.2° / 12.9°). Return to level after braking about 0.6 s. Loop at 499 Hz minimum, no wheelslip, no slow oscillation. The log samples at 11 Hz, so it cannot show fast vibrations.
- Slider positions saved in older tunes now map to the new values for Accel Feel (negative side), Brake Feel (positive side) and Input Play (brake Booster angle no longer written).

## Shaping 6 — safer slider ranges

Reason: at the old extremes (for example Accel Feel +10 with Brake Feel +10, or Input Play +10) the board oscillated. Each value was inside the `settings.xml` bounds, but the combination was not stable. Every range is now limited to what was ridden plus a small margin.

- Values at −10 / 0 / +10 (old values in brackets):
  - Accel Feel: Angle P 14 / 20 / 24 (12.8 / 20 / 30); Pitch KP 2.6 / 2.0 / 1.8 (2.72 / 2.0 / 1.5). The validated nose (Angle P 16.4, Pitch KP 2.36) is now at **−6**.
  - Accel Feel (speed): Dynamic Pitch KP down to 80 % of Pitch KP at +10 (65 %).
  - Brake Feel: Rate P (Braking) 0.8 / 1.0 / 1.6 (0.6 / 1.0 / 1.6); braking stiffness ratio 0.8 / 1.0 / 3.0 (0.6 / 1.0 / 3.0).
  - Input Play: Rate P 0.8 / 0.6 / 0.45 (1.0 / 0.6 / 0.3); Torque Tilt start current 10 / 15 / 25 A (5 / 15 / 35); accel Booster start angle 5 / 8 / 10° (2 / 8 / 12).
  - Carve Trim Speed: 0.30 / 0.20 / 0.12 s (0.40 / 0.20 / 0.08).
  - Uphill strength: ATR 0.5 / 1.0 / 1.8, Torque Tilt 0.05 / 0.10 / 0.20 (0.3 / 1.0 / 2.2, 0.03 / 0.10 / 0.25).
  - Downhill strength: ATR 0.3 / 0.5 / 1.3, Regen 0.05 / 0.10 / 0.22 (0.2 / 0.5 / 1.6, 0.03 / 0.10 / 0.25).
  - Uphill / downhill speeds: 16 / 24 / 36 °/s (12 / 24 / 60). Shared smoothing factor 0.7 / 1 / 1.4 (0.5 / 1 / 2).
  - Response Limit: 2 to 10° (2 to 18°). Stance Profile: −2 to +2° (−3 to +3°).
- **Braking stiffness capped**: Brake Feel sets Angle P × Angle P (Braking) = 20 × ratio, whatever Accel Feel. Angle P (Braking) = 20 × ratio ÷ Angle P, within 0.2 to 3, divisor floor 5. The maximum is 60, the value ridden at Accel Feel 0 and Brake Feel +10. Old worst case: 90.
- **Boosters off only at −10**: both Booster Pitch KP targets go from off at −10 to 95 % of the effective KP at 0. 100 % means no effect, so there is no jump. Above 0, the accel target goes down to 80 % at +10 (was 60 %) and the brake target down to 0.82. All sliders at 0 are therefore no longer exactly stock: both Boosters are active at 95 %.
- **Disabled slider = off**: Accel Feel, Accel Feel (speed) and Brake Feel switch their Booster target / Dynamic Pitch KP to 0 when disabled. Previously they left the old value in the config.
- "Street" tune: Accel Feel −6, Brake Feel +10, Response Limit 4°, other sliders at 0. Same values as before, except the accel Booster: 2.31, 98 % of 2.36, was off. To check on a ride.
- Worst combination now reachable (Accel Feel +10, Accel Feel (speed) +10, Input Play +10, Brake Feel +10): Angle P 24, Rate P 0.45, Pitch KP 1.8, Dynamic KP 1.44, braking stiffness 60. Not ridden yet. Before: Angle P 30, Rate P 0.3, braking stiffness 90.

## Shaping 6.1 — Torque Tilt loop check

- Ride of 10 Oct with every slider at its maximum (Input Play −10): the board pumped under braking at about 1.5 Hz. Braking current swung between −50 and −7 A in step with the Torque Tilt setpoint (−5.4° / −1.6°), and the brake Booster switched between 0.82 and 1.8 on every cycle. Acceleration and cruising stayed calm. A strong Torque Tilt (regen 0.22 °/A, 36 °/s) on a very stiff braking (60) makes a loop that keeps itself going.
- New blocking checks on the combination, before writing:
  - Torque Tilt regen strength × Angle P × Angle P (Braking) ≤ 6. Validated rides: about 5. That ride: 13.
  - Torque Tilt strength × Angle P ≤ 4.5. Validated: 3.4. That ride: 4.8, with too few hard accelerations to judge.
  - Small tolerance (0.5 %) for the rounding of the written values. A product exceeded only by hand-set values (not written by the sliders) gives a warning instead.
- Effect: with "Street" (Accel Feel −6, Brake Feel +10), downhill strength is allowed up to +2. With Accel Feel and Brake Feel alone, strengths at 0, nothing is ever blocked.

## Shaping 6.2 — one Max Angle, Torque Tilt capped automatically

Based on Neil Bennett ("Any strain on the motor simulates a change in gradient" and "max gradient with limited max angle", 22 Sept 2025) and on the rides of 10 Oct.

- **Response Limit = one Max Angle for the whole correction**, 0 to 18° like the FM Max Angle (default 8°). It now writes the ATR limit and the Torque Tilt limit (held at 8° max). 0 switches both off (both are plain clamps in the C code). Refloat keeps the larger of ATR and Torque Tilt, so the common limit caps the total correction. A capped Torque Tilt also stops following the current under hard braking, which breaks the loop there.
- **Torque Tilt strengths capped automatically** instead of blocking (6.1). Whenever a slider moving them or the stiffness is on, the written values are limited:
  - Torque Tilt regen ≤ 5 ÷ (Angle P × Angle P (Braking)) (limit lowered from 6: 5.8 still pumped slightly on a ride, 4.9 was calm);
  - Torque Tilt strength ≤ 4.5 ÷ Angle P.
  - Rounded down. The preview shows a note, e.g. "Downhill strength: Torque Tilt strength limited to 0.08 instead of 0.22". The ATR part of the strength sliders is never limited. The 6.1 checks stay as a safety net for hand-set values.
- Effects:
  - "Street" unchanged apart from the Torque Tilt limit: 4° instead of 8°, since Response Limit is 4. Downhill strength now only adds ATR, the regen stays at 0.10.
  - All sliders at max: braking loop 13.2 → 4.8, accel 4.8 → 4.3.
  - The cap can go below stock 0.10 (0.08 at braking stiffness 60): less Torque Tilt tail lift under braking.
