**Refloat Shaping 6.2** — an experimental personal fork of Refloat 1.3 with Dynamic Pitch KP and Booster Pitch KP (`v1.3-mkp_booster` branch by Nico Aleman). The control loop is unchanged apart from the first item below.

- **Separate uphill / downhill speeds** for ATR and Torque Tilt: four new *Down* speed parameters (Refloat Cfg), defaulting to the stock *Up* values.
- **CSV export** in the Data tab (tap: copy everything since the mark to the clipboard; press and hold: start a new log) and six extra realtime values `imu.ax/ay/az` (g) and `imu.gx/gy/gz` (deg/s), low-passed at 3 Hz, for ride analysis.
- **Sliders page** (new *Sliders* tab, UI only): 12 sliders that drive groups of existing parameters. Each parameter belongs to exactly one slider and every range is limited to values tested on the board plus a small margin. 0 gives the stock values, except the two Booster Pitch KP targets (95 % of the effective KP at 0, off only at −10). Stability is built in: braking stiffness is capped at three times stock, Response Limit is one Max Angle for the whole correction (ATR and Torque Tilt, 0 to 18°), and the Torque Tilt strengths are limited automatically when the board is very stiff, so no slider combination makes it pump under braking (every slider at its maximum was ridden). Values are only written with the board stopped, after a preview of every change and of any automatic limit.
- **Slider positions saved with tunes** and restored when a tune is applied; **10 tune slots** instead of 6 (set the number in Refloat preferences).
- **Non-linear estimated battery charge** in the battery bar for Molicel P42A packs: interpolated cell discharge curves instead of a linear voltage scale, corrected for voltage sag under load, 0 % = the board's low-voltage threshold. The controller's own percentage is shown in parentheses. Display only; can be turned off in Refloat preferences.

**Experimental: tested on a single board**. Use at your own risk.

### Before installing
- **Back up your package config** (Start page *Backup Configs*, or save the XML in *Refloat Cfg*). Coming from stock Refloat, the config structure is different (new *Down* speed parameters): the config may be reset to defaults and need to be restored by hand.
- VESC Tool may offer to update to the official Refloat release. Accepting replaces this fork.

---

# Refloat 1.3

A full-featured self-balancing skateboard package.

For details on Refloat 1.3 itself, read the [1.3 release post](https://pev.dev/t/refloat-version-1-3/2995).

## Installation
### Fresh Installation
If doing a fresh board installation, you need to do the **motor** and **IMU** calibration and configuration. If you install the package before that, you need to disable the package before running the **motor** _calibration_ and re-enable it afterwards.

For a detailed guide, read the [Initial Board Setup guide on pev.dev](https://pev.dev/t/initial-board-setup-in-vesc-tool/2190).

## Disclaimer
**Use at your own risk!** Electric vehicles are inherently dangerous, authors of this package shall not be liable for any damage or harm caused by errors in the software. Not endorsed by the VESC project or by the Refloat authors.

## Credits
Refloat author: Lukáš Hrázký

Original Float package authors: Mitch Lustig, Dado Mista, Nico Aleman

Dynamic Pitch KP and Booster Pitch KP: Nico Aleman

Refloat Shaping fork: Alrog

If you would like to support Refloat development, here's [a few options to do so](https://riddimrider.one/donate/).
