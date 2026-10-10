// Refloat Shaping 5 — battery charge estimate (display only: never the control loop,
// voltage protections, LEDs or BMS).
// Single source: the body between the markers is copied into ui.qml.in
// (property var batteryEngine: (function () { … })()). test-battery.js checks both copies.
// Plain ES5 on purpose (VESC Tool JS engine).
var BatteryEngine = (function () {
// <battery-engine>
    // Molicel P42A discharge profile (voltage per cell, 100 % to 0 % in 10 % steps), at 0 A
    // and 20 A. The reference current is the pack current: on 18S2P ride logs, this is the
    // reading that makes the estimate independent of the current.
    var SOC = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];
    var V0 = [4.20, 4.05, 3.91, 3.83, 3.74, 3.65, 3.57, 3.48, 3.38, 3.00, 2.70];
    var V20 = [4.20, 3.73, 3.69, 3.61, 3.53, 3.44, 3.35, 3.27, 3.18, 3.00, 2.70];
    // Current clamped to [0, 20 A]: between the two curves the interpolation stays monotonic.
    // Above 20 A the correction is capped (conservative, never optimistic).
    var I_REF = 20, I_MIN = 0, I_MAX = 20, I_REGEN = -1;
    var CELLS_MIN = 10, CELLS_MAX = 30, LV_DEFAULT = 3.0, TAU = 10;

    function fin(x) { return typeof x === "number" && isFinite(x); }
    function cl(x, a, b) { return Math.min(Math.max(x, a), b); }

    // Expected voltage per cell at charge s (0-100) and current i
    function vAt(s, i) {
        var k = cl((100 - s) / 10, 0, 10), j = Math.min(Math.floor(k), 9), f = k - j;
        var v0 = V0[j] + (V0[j + 1] - V0[j]) * f, v20 = V20[j] + (V20[j + 1] - V20[j]) * f;
        return v0 - (i / I_REF) * (v0 - v20);
    }

    // Raw charge (0-100) from the P42A curve; null if the input is unusable
    function socRaw(vCell, iPack) {
        if (!fin(vCell) || vCell < 2.0 || vCell > 4.5) return null;
        var i = cl(fin(iPack) ? iPack : 0, I_MIN, I_MAX);
        if (vCell >= vAt(100, i)) return 100;
        if (vCell <= vAt(0, i)) return 0;
        var lo = 0, hi = 100, n;                    // vAt increases with s: bisection
        for (n = 0; n < 30; n++) {
            var mid = (lo + hi) / 2;
            if (vAt(mid, i) < vCell) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
    }

    // Usable charge: 0 % at the board's low-voltage threshold (per cell)
    function usable(raw, lvCell) {
        if (!fin(raw)) return null;
        var lv = fin(lvCell) && lvCell >= 2.7 && lvCell <= 3.8 ? lvCell : LV_DEFAULT;
        var s0 = socRaw(lv, 0);
        return cl((raw - s0) / (100 - s0) * 100, 0, 100);
    }

    // Full estimate from the controller values.
    // null -> unusable, show the controller value; undefined -> regenerative braking,
    // keep the previous estimate (voltage rises when braking: it would be optimistic).
    function estimate(vPack, iPack, cells, lvSetting) {
        if (!fin(cells) || cells < CELLS_MIN || cells > CELLS_MAX || !fin(vPack)) return null;
        if (fin(iPack) && iPack < I_REGEN) return undefined;
        var lv = fin(lvSetting) ? (lvSetting > 10 ? lvSetting / cells : lvSetting) : LV_DEFAULT;
        var raw = socRaw(vPack / cells, iPack);
        return raw === null ? null : usable(raw, lv);
    }

    // Exponential smoothing (10 s time constant); invalid dt -> restart from the target
    function smooth(prev, target, dt) {
        if (!fin(target)) return prev;
        if (!fin(prev) || !fin(dt) || dt <= 0 || dt > 5) return target;
        return prev + (target - prev) * (1 - Math.exp(-dt / TAU));
    }

    return {socRaw: socRaw, usable: usable, estimate: estimate, smooth: smooth, vAt: vAt};
// </battery-engine>
})();
if (typeof module !== "undefined") module.exports = BatteryEngine;
