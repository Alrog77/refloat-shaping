// Refloat Shaping 4 — slider engine (UI only, never in the control loop).
// Single source: the body between the two markers is copied verbatim into ui.qml.in
// (property var shapingEngine: (function () { … })()). test.js checks both copies are identical.
// Plain ES5 on purpose (VESC Tool JS engine).
var ShapingEngine = (function () {
// <shaping-engine>
    var VERSION = "4";

    // Min / max of every parameter written or read (settings.xml)
    var XML = {
        kp: [0, 40], kp2: [0, 3], mahony_kp: [0.2, 3], mahony_kp_roll: [0, 3], dynamic_mahony_kp: [0, 3],
        kp_brake: [0.2, 3], kp2_brake: [0, 3],
        booster_angle: [0, 15], booster_mahony_kp: [0, 3], brkbooster_angle: [0, 15], brkbooster_mahony_kp: [0, 3],
        torquetilt_start_current: [0, 100], torquetilt_angle_limit: [0, 30],
        torquetilt_strength: [0, 1], torquetilt_strength_regen: [0, 1],
        atr_strength_up: [0, 3.5], atr_strength_down: [0, 3.5], atr_angle_limit: [0, 30],
        "atr.filter.on_speed_limit": [0, 100], "atr.filter.off_speed_limit": [0, 100],
        "atr.filter.on_speed_limit_down": [1, 100], "atr.filter.off_speed_limit_down": [1, 100],
        "torque_tilt.filter.on_speed_limit": [0, 100], "torque_tilt.filter.off_speed_limit": [0, 100],
        "torque_tilt.filter.on_speed_limit_down": [1, 100], "torque_tilt.filter.off_speed_limit_down": [1, 100],
        "atr.filter.time_constant": [0.01, 0.5], "atr.filter.on_speed_time_constant": [0.01, 0.5],
        "atr.filter.off_speed_time_constant": [0.01, 0.5],
        "torque_tilt.filter.time_constant": [0.01, 0.5], "torque_tilt.filter.on_speed_time_constant": [0.01, 0.5],
        "torque_tilt.filter.off_speed_time_constant": [0.01, 0.5],
        "turn_tilt.filter.time_constant": [0.01, 0.5], turntilt_strength: [-30, 30], tiltback_constant: [-10, 10]
    };

    // Stock Refloat 1.3 smoothing time constants, base of the shared smoothing
    var NICO_TC = {
        "atr.filter.time_constant": 0.3, "atr.filter.on_speed_time_constant": 0.1,
        "atr.filter.off_speed_time_constant": 0.01,
        "torque_tilt.filter.time_constant": 0.2, "torque_tilt.filter.on_speed_time_constant": 0.08,
        "torque_tilt.filter.off_speed_time_constant": 0.16
    };
    var TCS = Object.keys(NICO_TC);
    var SPEEDS_UP = ["atr.filter.on_speed_limit", "atr.filter.off_speed_limit",
                     "torque_tilt.filter.on_speed_limit", "torque_tilt.filter.off_speed_limit"];
    var SPEEDS_DN = SPEEDS_UP.map(function (n) { return n + "_down"; });

    var DYN_FLOOR = 1.2, BOOST_FLOOR = 0.8, KP_MARGIN = 0.1, REL_MIN = 4;
    var TT_LIM_MAX = 8, ATR_LIM_MAX = 18, ATR_LIM_WARN = 10, TC_F = [0.5, 2.0];
    var EPS_CHANGE = 1e-4;   // below this: not a change (values read back as float32)
    var EPS_DESYNC = 0.005;  // tolerance for "differs from current config"

    function fin(x) { return typeof x === "number" && isFinite(x); }
    function cl(x, a, b) { return Math.min(Math.max(x, a), b); }
    function r2(x) { return Math.round(x * 100) / 100; }
    function lin(s, aN, a0, aP) { return s >= 0 ? a0 + (aP - a0) * s / 10 : a0 + (a0 - aN) * s / 10; }
    function geo(s, aN, a0, aP) { return s >= 0 ? a0 * Math.pow(aP / a0, s / 10) : a0 * Math.pow(a0 / aN, s / 10); }

    // Sliders and the parameters they own (each parameter belongs to exactly one slider).
    // Derived values (Dynamic Pitch KP, Booster targets, shared smoothing): see compute().
    var SLIDERS = {
        accelFeel: {min: -10, max: 10, f: function (s) {
            return {kp: lin(s, 14, 20, 30), mahony_kp: lin(s, 2.6, 2.0, 1.5)}; }},
        accelFeelSpeed: {min: 0, max: 10, f: function (s) { return {}; }},
        brakeFeel: {min: -10, max: 10, f: function (s) {
            return {kp_brake: lin(s, 0.6, 1.0, 1.5), kp2_brake: lin(s, 0.6, 1.0, 1.3)}; }},
        inputPlay: {min: -10, max: 10, f: function (s) {
            var a = lin(s, 2, 8, 12);
            return {kp2: lin(s, 1.0, 0.6, 0.3), torquetilt_start_current: lin(s, 5, 15, 35),
                    booster_angle: a, brkbooster_angle: a}; }},
        carveTrim: {min: 0, max: 10, f: function (s) { return {turntilt_strength: s}; }},
        carveTrimSpeed: {min: -10, max: 10, f: function (s) {
            return {"turn_tilt.filter.time_constant": geo(s, 0.40, 0.20, 0.08)}; }},
        forceUp: {min: -10, max: 10, f: function (s) {
            return {atr_strength_up: lin(s, 0.3, 1.0, 2.2), torquetilt_strength: lin(s, 0.03, 0.10, 0.25)}; }},
        forceDown: {min: -10, max: 10, f: function (s) {
            return {atr_strength_down: lin(s, 0.2, 0.5, 1.6), torquetilt_strength_regen: lin(s, 0.03, 0.10, 0.25)}; }},
        speedUp: {min: -10, max: 10, f: function (s) {
            var v = geo(s, 12, 24, 60), o = {}; SPEEDS_UP.forEach(function (n) { o[n] = v; }); return o; }},
        speedDown: {min: -10, max: 10, f: function (s) {
            var v = geo(s, 12, 24, 60), o = {}; SPEEDS_DN.forEach(function (n) { o[n] = v; }); return o; }},
        // Response Limit drives the ATR only (Torque Tilt keeps its own limit from the config)
        responseLimit: {min: 2, max: 18, step: 0.5, def: 8, f: function (s) { return {atr_angle_limit: s}; }},
        stance: {min: -3, max: 3, step: 0.2, f: function (s) { return {tiltback_constant: s}; }}
    };
    var NAMES = Object.keys(SLIDERS);

    function defaultPos(name) { var d = SLIDERS[name]; return d && fin(d.def) ? d.def : 0; }

    // Valid slider position (snapped to the step, clamped; invalid input -> default position)
    function snap(name, p) {
        var d = SLIDERS[name], st = d.step || 1;
        if (!fin(p)) p = defaultPos(name);
        return cl(Math.round(Math.round(p / st) * st * 10) / 10, d.min, d.max);
    }
    function isOn(state, name) { return !!(state && state[name] && state[name].on); }
    function posOf(state, name) { return snap(name, state[name].pos); }

    // state: {name: {on, pos}}; cur: current config {param: value}
    // changes: everything the active sliders write; diff: the part that actually changes;
    // sources: sliders each written parameter depends on (several = derived value).
    function compute(state, cur) {
        state = state || {}; cur = cur || {};
        var out = {}, src = {}, merged = {}, k;
        for (k in cur) merged[k] = cur[k];
        function put(key, v, from) { out[key] = r2(v); merged[key] = out[key]; src[key] = from; }

        NAMES.forEach(function (n) {
            if (!isOn(state, n)) return;
            var p = SLIDERS[n].f(posOf(state, n));
            Object.keys(p).forEach(function (key) { put(key, p[key], [n]); });
        });

        // Shared ATR / Torque Tilt smoothing: average of both speed sliders (disabled = 0)
        var su = isOn(state, "speedUp"), sd = isOn(state, "speedDown");
        if (su || sd) {
            var m = (su ? posOf(state, "speedUp") : 0) / 2 + (sd ? posOf(state, "speedDown") : 0) / 2;
            var f = geo(m, TC_F[0], 1, TC_F[1]), from = [];
            if (su) from.push("speedUp");
            if (sd) from.push("speedDown");
            TCS.forEach(function (key) { put(key, cl(NICO_TC[key] / f, 0.01, 0.5), from); });
        }

        // Dynamic Pitch KP: fraction of the final Pitch KP (100 % at 0, 65 % at +10), floor 1.2
        var kpFrom = isOn(state, "accelFeel") ? ["accelFeel"] : [];
        if (isOn(state, "accelFeelSpeed")) {
            var s = posOf(state, "accelFeelSpeed");
            put("dynamic_mahony_kp", s === 0 ? 0 : Math.max(merged.mahony_kp * (1 - 0.035 * s), DYN_FLOOR),
                ["accelFeelSpeed"].concat(kpFrom));
        }
        // Booster targets: fraction of the effective KP (lower of Pitch KP and Dynamic Pitch KP)
        function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }
        var dynFrom = uniq((src.dynamic_mahony_kp || []).concat(kpFrom));
        var kpref = merged.dynamic_mahony_kp > 0 ? Math.min(merged.mahony_kp, merged.dynamic_mahony_kp) : merged.mahony_kp;
        function boost(s) { return s <= 0 ? 0 : Math.max(kpref * (1 - 0.04 * s), BOOST_FLOOR); }
        if (isOn(state, "accelFeel"))
            put("booster_mahony_kp", boost(posOf(state, "accelFeel")), uniq(["accelFeel"].concat(dynFrom)));
        if (isOn(state, "brakeFeel"))
            put("brkbooster_mahony_kp", boost(posOf(state, "brakeFeel")), uniq(["brakeFeel"].concat(dynFrom)));

        var diff = {};
        Object.keys(out).forEach(function (key) {
            if (!fin(cur[key]) || Math.abs(out[key] - cur[key]) > EPS_CHANGE) diff[key] = out[key];
        });
        return {changes: out, diff: diff, sources: src, merged: merged, errors: check(merged, Object.keys(out))};
    }

    // {block, warn}. A rule blocks if it involves a written parameter;
    // if it only involves existing values that are not written, it only warns.
    function check(m, keys) {
        var block = [], warn = [], w = {};
        keys.forEach(function (k) { w[k] = true; });
        function rule(ok, msg, params, softOnly) {
            if (ok) return;
            var mine = params.some(function (p) { return w[p]; });
            if (softOnly || !mine) warn.push(msg); else block.push(msg);
        }
        function known(names) { return names.every(function (n) { return fin(m[n]); }); }
        keys.forEach(function (k) {
            var v = m[k];
            if (!fin(v)) block.push(k + " is not finite");
            else if (XML[k] && (v < XML[k][0] || v > XML[k][1])) block.push(k + " outside XML bounds");
        });
        if (known(["mahony_kp", "mahony_kp_roll"]))
            rule(m.mahony_kp >= m.mahony_kp_roll + KP_MARGIN - 1e-9,
                 "Pitch KP below Roll KP + 0.1 (feel guideline)", ["mahony_kp"], true);
        if (known(["dynamic_mahony_kp", "mahony_kp_roll"]))
            rule(m.dynamic_mahony_kp === 0 || m.dynamic_mahony_kp >= m.mahony_kp_roll + KP_MARGIN - 1e-9,
                 "Dynamic Pitch KP below Roll KP + 0.1 (feel guideline)", ["dynamic_mahony_kp"], true);
        if (known(["mahony_kp", "dynamic_mahony_kp"])) {
            var kpref = m.dynamic_mahony_kp > 0 ? Math.min(m.mahony_kp, m.dynamic_mahony_kp) : m.mahony_kp;
            [["booster_mahony_kp", "Accel Feel"], ["brkbooster_mahony_kp", "Brake Feel"]].forEach(function (b) {
                var k = b[0], v = m[k];
                if (!fin(v)) return;
                rule(v === 0 || (v >= BOOST_FLOOR - 1e-9 && v < kpref),
                     k + " (" + r2(v) + ") outside [0.8, effective KP " + r2(kpref) + "): enable " + b[1] +
                     " to recompute the target, or keep a higher effective KP",
                     [k, "mahony_kp", "dynamic_mahony_kp"]);
            });
        }
        SPEEDS_UP.concat(SPEEDS_DN).forEach(function (k) {
            if (fin(m[k])) rule(m[k] >= REL_MIN, k + " below 4 °/s", [k]);
        });
        if (fin(m.torquetilt_angle_limit))
            rule(m.torquetilt_angle_limit <= TT_LIM_MAX, "Torque Tilt Angle Limit above 8° (set outside the sliders)",
                 ["torquetilt_angle_limit"]);
        if (fin(m.atr_angle_limit)) {
            rule(m.atr_angle_limit <= ATR_LIM_MAX, "ATR Angle Limit above 18°", ["atr_angle_limit"]);
            if (m.atr_angle_limit > ATR_LIM_WARN) warn.push("Response Limit above 10°: only for really steep hills");
        }
        return {block: block, warn: warn};
    }

    function positions(name) {
        var d = SLIDERS[name], st = d.step || 1, a = [], s;
        for (s = d.min; s <= d.max + 1e-9; s += st) a.push(Math.round(s * 10) / 10);
        return a;
    }
    function withPos(state, name, p) {
        var o = {}, k;
        for (k in state) o[k] = state[k];
        o[name] = {on: true, pos: p};
        return o;
    }
    // Parameters related to a slider: its own, plus everything that changes when it moves
    // (derived values), the other sliders staying where they are.
    function relatedKeys(name, state, cur) {
        var keys = {}, ref = null;
        positions(name).forEach(function (p) {
            var ch = compute(withPos(state, name, p), cur).changes;
            Object.keys(SLIDERS[name].f(snap(name, p))).forEach(function (k) { keys[k] = true; });
            if (ref) Object.keys(ch).forEach(function (k) { if (ch[k] !== ref[k]) keys[k] = true; });
            else ref = ch;
        });
        if (name === "accelFeelSpeed") keys.dynamic_mahony_kp = true;
        return Object.keys(keys);
    }

    // Slider position closest to the current config, the other sliders staying where they are.
    // Error normalised by the range of each parameter.
    function nearest(name, cur, state) {
        state = state || {}; cur = cur || {};
        var keys = relatedKeys(name, state, cur);
        var cand = positions(name).map(function (p) {
            return {pos: p, ch: compute(withPos(state, name, p), cur).changes};
        });
        var span = {};
        keys.forEach(function (k) {
            cand.forEach(function (c) {
                if (!(k in c.ch)) return;
                var v = c.ch[k];
                if (!span[k]) span[k] = [v, v];
                span[k][0] = Math.min(span[k][0], v); span[k][1] = Math.max(span[k][1], v);
            });
        });
        var best = null;
        cand.forEach(function (c) {
            var err = 0, det = {};
            keys.forEach(function (k) {
                if (!(k in c.ch)) return;
                var w = Math.max(span[k][1] - span[k][0], 1e-6), a = fin(cur[k]) ? cur[k] : c.ch[k];
                var e = (c.ch[k] - a) / w;
                err += e * e;
                det[k] = {slider: c.ch[k], actuel: cur[k]};
            });
            if (!best || err < best.err - 1e-12) best = {pos: c.pos, err: err, detail: det};
        });
        return best;
    }

    // Parameters related to this slider that differ from the current config (tolerance 0.005)
    function desync(name, state, cur) {
        state = state || {}; cur = cur || {};
        if (!isOn(state, name)) return [];
        var ch = compute(state, cur).changes;
        return relatedKeys(name, state, cur).filter(function (k) {
            return (k in ch) && !(fin(cur[k]) && Math.abs(ch[k] - cur[k]) <= EPS_DESYNC);
        });
    }

    // Slider positions read back from a saved tune: only known sliders are kept,
    // each position is snapped and clamped; invalid input -> null.
    function sanitizePositions(obj) {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
        var out = {}, n = 0;
        NAMES.forEach(function (name) {
            var v = obj[name];
            if (!v || typeof v !== "object") return;
            out[name] = {on: v.on === true, pos: snap(name, typeof v.pos === "number" ? v.pos : NaN)};
            n++;
        });
        return n ? out : null;
    }

    // Every parameter read by the engine (to build the current config)
    function params() {
        var o = {mahony_kp_roll: true, dynamic_mahony_kp: true, booster_mahony_kp: true,
                 brkbooster_mahony_kp: true, torquetilt_angle_limit: true};
        NAMES.forEach(function (n) {
            var d = SLIDERS[n];
            [d.min, d.max].forEach(function (s) { Object.keys(d.f(s)).forEach(function (k) { o[k] = true; }); });
        });
        TCS.concat(SPEEDS_UP).concat(SPEEDS_DN).forEach(function (k) { o[k] = true; });
        return Object.keys(o);
    }

    return {VERSION: VERSION, SLIDERS: SLIDERS, NAMES: NAMES, defaultPos: defaultPos, snap: snap,
            compute: compute, check: check, nearest: nearest, desync: desync, params: params,
            sanitizePositions: sanitizePositions,
            lin: lin, geo: geo};
// </shaping-engine>
})();
if (typeof module !== "undefined") module.exports = ShapingEngine;
