// Slider engine tests: node shaping/test.js [path to ui.qml.in] [path to a previous ui.qml.in for non-regression]
// Exits with code 1 on the first failure.
var fs = require("fs"), path = require("path");
var E = require("./shaping.js");
var failed = 0, passed = 0;
function ok(cond, msg) { if (cond) { passed++; } else { failed++; console.log("FAIL: " + msg); } }
function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
function posList(n) { var d = E.SLIDERS[n], st = d.step || 1, a = [], x; for (x = d.min; x <= d.max + 1e-9; x += st) a.push(Math.round(x * 10) / 10); return a; }
function f32(x) { return Math.fround(x); }

// Stock Refloat 1.3 (boosterPitchKP) defaults for the parameters read by the engine
var nico = {kp: 20, kp2: 0.6, mahony_kp: 2.0, mahony_kp_roll: 1.4, dynamic_mahony_kp: 0, kp_brake: 1, kp2_brake: 1,
    booster_angle: 8, booster_mahony_kp: 0, brkbooster_angle: 8, brkbooster_ramp: 4, brkbooster_mahony_kp: 0, torquetilt_start_current: 15,
    torquetilt_angle_limit: 8, torquetilt_strength: 0.1, torquetilt_strength_regen: 0.1, atr_strength_up: 1,
    atr_strength_down: 0.5, atr_angle_limit: 8, turntilt_strength: 0, "turn_tilt.filter.time_constant": 0.2,
    tiltback_constant: 0, "atr.filter.time_constant": 0.3, "atr.filter.on_speed_time_constant": 0.1,
    "atr.filter.off_speed_time_constant": 0.01, "torque_tilt.filter.time_constant": 0.2,
    "torque_tilt.filter.on_speed_time_constant": 0.08, "torque_tilt.filter.off_speed_time_constant": 0.16};
["atr.filter.", "torque_tilt.filter."].forEach(function (p) {
    ["on_speed_limit", "off_speed_limit", "on_speed_limit_down", "off_speed_limit_down"].forEach(function (q) { nico[p + q] = 24; });
});
ok(E.params().every(function (k) { return k in nico; }), "every parameter read has a stock test value");

// Reference tune (slider positions) validated on the board, and its config as written by the sliders
var s10 = {carveTrim: 9, carveTrimSpeed: 0, stance: 0, responseLimit: 6, accelFeelSpeed: 5, forceUp: 4, speedUp: 1,
    forceDown: 2, speedDown: 1, brakeFeel: 6, accelFeel: 1, inputPlay: 2};
var st10 = {}; Object.keys(s10).forEach(function (k) { st10[k] = {on: true, pos: s10[k]}; });
var cfg10 = Object.assign({}, nico, E.compute(st10, nico).changes, {torquetilt_angle_limit: 6});
// the same config read back as float32, as from the board
var cfg10f = {}; Object.keys(cfg10).forEach(function (k) { cfg10f[k] = f32(cfg10[k]); });

// 1) everything at 0 (Response Limit at 8°) = exact stock values; the Torque Tilt limit is never written
var st0 = {}; E.NAMES.forEach(function (n) { st0[n] = {on: true, pos: E.defaultPos(n)}; });
var r0 = E.compute(st0, nico);
// shaping 6: both Booster targets are active at 0 (95 % of the effective KP); everything else stock
var boost0 = {booster_mahony_kp: 1.9, brkbooster_mahony_kp: 1.9};
var bad = Object.keys(r0.changes).filter(function (k) {
    return Math.abs(r0.changes[k] - (k in boost0 ? boost0[k] : nico[k])) > 1e-9; });
ok(bad.length === 0, "all at 0 = stock except Boosters at 95 %; differences: " + bad.join(", "));
ok(Object.keys(r0.diff).sort().join() === "booster_mahony_kp,brkbooster_mahony_kp", "all at 0 from stock: only the Boosters change");
ok(r0.errors.block.length === 0, "all at 0: nothing blocking");
ok(r0.changes.torquetilt_angle_limit === 8 && r0.changes.atr_angle_limit === 8, "Response Limit at 8 (default): ATR and Torque Tilt limits at stock 8°");

// 2) everything disabled = nothing
var rOff = E.compute({}, nico).changes;
ok(Object.keys(rOff).sort().join() === "booster_mahony_kp,brkbooster_mahony_kp,dynamic_mahony_kp" &&
   rOff.booster_mahony_kp === 0 && rOff.brkbooster_mahony_kp === 0 && rOff.dynamic_mahony_kp === 0,
   "all disabled: only Dynamic KP and Boosters written, all off " + JSON.stringify(rOff));

// 3) Response Limit: one Max Angle for ATR and Torque Tilt (Torque Tilt held at 8°), monotonic, 0 to 18°
var prev = -1, rlOnly = true, rlMono = true;
posList("responseLimit").forEach(function (p) {
    var ch = E.compute({responseLimit: {on: true, pos: p}}, nico).changes, ks = Object.keys(ch);
    ks = ks.filter(function (k) { return ["booster_mahony_kp", "brkbooster_mahony_kp", "dynamic_mahony_kp"].indexOf(k) < 0; });
    if (ks.sort().join() !== "atr_angle_limit,torquetilt_angle_limit" || ch.torquetilt_angle_limit !== Math.min(p, 8)) rlOnly = false;
    if (!(ch.atr_angle_limit > prev)) rlMono = false;
    prev = ch.atr_angle_limit;
});
ok(rlOnly, "Response Limit writes the ATR limit and the Torque Tilt limit (min with 8°)");
ok(rlMono && prev === 18 && E.SLIDERS.responseLimit.min === 0, "Response Limit monotonic from 0 to 18°");

// 4) Torque Tilt limit at 9° in the config (Response Limit off): warning, never blocking
var r4 = E.compute({stance: {on: true, pos: 0}}, Object.assign({}, nico, {torquetilt_angle_limit: 9}));
ok(r4.errors.block.length === 0, "Torque Tilt 9° not written: not blocking");
ok(r4.errors.warn.some(function (w) { return w.indexOf("Torque Tilt") >= 0; }), "Torque Tilt 9°: warning");

// 5) closest Response Limit position: exact when both limits match; Response Limit 0 switches both off
[[6, 6], [12, 8], [18, 8], [0, 0]].forEach(function (p) {
    var c = Object.assign({}, cfg10, {atr_angle_limit: p[0], torquetilt_angle_limit: p[1]});
    var n = E.nearest("responseLimit", c, st10);
    ok(n.pos === p[0] && n.err < 1e-12, "closest Response Limit = exact " + p[0] + " (got " + n.pos + ")");
});
var r5 = E.compute({responseLimit: {on: true, pos: 0}}, nico);
ok(r5.changes.atr_angle_limit === 0 && r5.changes.torquetilt_angle_limit === 0 && r5.errors.block.length === 0, "Response Limit 0: ATR and Torque Tilt off");

// 6) reference config: every slider at its exact position, nothing to write, nothing out of sync
[cfg10, cfg10f].forEach(function (cfg, i) {
    var lbl = i ? " (float32)" : "";
    var r = E.compute(st10, cfg);
    ok(Object.keys(r.diff).length === 0, "ref" + lbl + ": no real change; " + JSON.stringify(r.diff));
    ok(r.errors.block.length === 0, "ref" + lbl + ": nothing blocking " + r.errors.block);
    E.NAMES.forEach(function (n) {
        ok(E.desync(n, st10, cfg).length === 0, "ref" + lbl + " : " + n + " in sync; " + E.desync(n, st10, cfg));
        var st = Object.assign({}, st10); st[n] = {on: false, pos: 0};
        var near = E.nearest(n, cfg, st);
        ok(near.pos === s10[n], "ref" + lbl + ": closest position of " + n + " = " + s10[n] + " (got " + near.pos + ")");
    });
});

// 6b) "Street" tune validated on the board (rides a to d, 9 Oct 2026): exact values
var stS = {}; E.NAMES.forEach(function (n) { stS[n] = {on: true, pos: E.defaultPos(n)}; });
stS.accelFeel.pos = -6; stS.brakeFeel.pos = 10; stS.responseLimit.pos = 4;
var rS = E.compute(stS, nico), cS = rS.changes;
var wantS = {kp: 16.4, mahony_kp: 2.36, booster_mahony_kp: 2.31, dynamic_mahony_kp: 0, kp_brake: 3.0, kp2_brake: 1.6,
    brkbooster_angle: 2, brkbooster_ramp: 2, brkbooster_mahony_kp: 0.82, booster_angle: 8, kp2: 0.6, atr_angle_limit: 4};
Object.keys(wantS).forEach(function (k) { ok(Math.abs(cS[k] - wantS[k]) < 1e-9, "Street: " + k + " = " + wantS[k] + " (got " + cS[k] + ")"); });
ok(rS.errors.block.length === 0, "Street: nothing blocking " + rS.errors.block);
// Brake Feel <= 0: start angle and ramp stock; brake Booster off only at -10, 95 % of KP at 0
[-10, -3, 0].forEach(function (p) {
    var c = E.compute({brakeFeel: {on: true, pos: p}}, nico).changes;
    var want = p === -10 ? 0 : Math.round(2 * (1 - 0.05 * (p + 10) / 10) * 100) / 100;
    ok(c.brkbooster_mahony_kp === want && c.brkbooster_angle === 8 && c.brkbooster_ramp === 4,
       "Brake Feel " + p + ": brake Booster " + want + " (got " + c.brkbooster_mahony_kp + "), start/ramp stock");
});
[-10, -5, 0, 5, 10].forEach(function (p) {
    var c = E.compute({accelFeel: {on: true, pos: p}}, nico).changes, kp = c.mahony_kp;
    var want = p === -10 ? 0 : Math.round(kp * (p <= 0 ? 1 - 0.05 * (p + 10) / 10 : 0.95 - 0.015 * p) * 100) / 100;
    ok(Math.abs(c.booster_mahony_kp - want) < 1e-9, "Accel Feel " + p + ": accel Booster " + want + " (got " + c.booster_mahony_kp + ")");
});
// disabled Feel sliders switch their Booster / Dynamic KP off, whatever the config
var hot = Object.assign({}, nico, {dynamic_mahony_kp: 1.6, booster_mahony_kp: 1.5, brkbooster_mahony_kp: 0.82});
var cOff = E.compute({accelFeel: {on: false, pos: 5}, accelFeelSpeed: {on: false, pos: 5}, brakeFeel: {on: false, pos: 10}}, hot).changes;
ok(cOff.dynamic_mahony_kp === 0 && cOff.booster_mahony_kp === 0 && cOff.brkbooster_mahony_kp === 0, "disabled sliders: Dynamic KP and Boosters off");
// braking stiffness never above 60 (20 x 3), whatever Accel Feel / Brake Feel; equal to 20 x ratio unless at a bound
posList("accelFeel").forEach(function (a) { posList("brakeFeel").forEach(function (b) {
    var r = E.compute({accelFeel: {on: true, pos: a}, brakeFeel: {on: true, pos: b}}, nico), m = r.merged;
    var want = 20 * E.lin(b, 0.8, 1.0, 3.0), got = m.kp * m.kp_brake;
    ok(got <= 60 * 1.005 && (Math.abs(got - want) / want < 0.01 || m.kp_brake >= 3 - 1e-9) && r.errors.block.length === 0,
       "braking stiffness accel " + a + " brake " + b + ": " + got.toFixed(2) + " (target " + want.toFixed(2) + ")");
}); });
[0, -3, NaN, undefined, 40].forEach(function (k) {
    var c = Object.assign({}, nico, {kp: k}), r = E.compute({brakeFeel: {on: true, pos: 10}}, c).changes.kp_brake;
    ok(isFinite(r) && r >= 0.2 && r <= 3, "Angle P " + k + " in config: Angle P (Braking) bounded (" + r + ")");
});
// reduced ranges: extremes of every slider within the agreed limits
var ext = {};
E.NAMES.forEach(function (n) { var d = E.SLIDERS[n]; [d.min, d.max].forEach(function (p) {
    var st = {}; st[n] = {on: true, pos: p}; var c = E.compute(st, nico).changes;
    Object.keys(c).forEach(function (k) { ext[k] = ext[k] || [Infinity, -Infinity]; ext[k][0] = Math.min(ext[k][0], c[k]); ext[k][1] = Math.max(ext[k][1], c[k]); });
}); });
ok(ext.kp[1] <= 24 && ext.kp[0] >= 14 && ext.mahony_kp[0] >= 1.8 && ext.kp2[0] >= 0.45 && ext.kp2_brake[0] >= 0.8 &&
   ext.atr_angle_limit[1] <= 18 && ext.torquetilt_angle_limit[1] <= 8 && ext.tiltback_constant[1] <= 2 && ext.tiltback_constant[0] >= -2 &&
   ext["atr.filter.on_speed_limit"][1] <= 36 && ext["atr.filter.on_speed_limit"][0] >= 16 &&
   ext.atr_strength_up[1] <= 1.8 && ext.torquetilt_strength[1] <= 0.2 && ext.atr_strength_down[1] <= 1.3 &&
   ext.torquetilt_strength_regen[1] <= 0.22 && ext.torquetilt_start_current[0] >= 10 && ext.torquetilt_start_current[1] <= 25,
   "reduced ranges respected " + JSON.stringify(ext));
[-10, 10].forEach(function (p) {
    var c = E.compute({inputPlay: {on: true, pos: p}}, nico).changes;
    ok(!("brkbooster_angle" in c) && "booster_angle" in c, "Input Play " + p + ": accel Booster angle only");
});
// brake Booster target always inside [0.8, effective KP) when Brake Feel > 0, whatever Accel Feel
posList("accelFeel").forEach(function (a) { posList("accelFeelSpeed").forEach(function (v) { [1, 5, 10].forEach(function (b) {
    var r = E.compute({accelFeel: {on: true, pos: a}, accelFeelSpeed: {on: true, pos: v}, brakeFeel: {on: true, pos: b}}, nico);
    var m = r.merged, kr = m.dynamic_mahony_kp > 0 ? Math.min(m.mahony_kp, m.dynamic_mahony_kp) : m.mahony_kp;
    ok(m.brkbooster_mahony_kp >= 0.8 && m.brkbooster_mahony_kp < kr && r.errors.block.length === 0,
       "brake Booster target in range (accel " + a + ", speed " + v + ", brake " + b + ")");
}); }); });

// 6d) shaping 6.1: Torque Tilt loop check
function stAll(o) { var st = {}; E.NAMES.forEach(function (n) { st[n] = {on: true, pos: E.defaultPos(n)}; });
    Object.keys(o).forEach(function (k) { st[k].pos = o[k]; }); return st; }
var maxAll = {accelFeel: 10, accelFeelSpeed: 10, brakeFeel: 10, inputPlay: -10, carveTrim: 10, carveTrimSpeed: 10,
    forceUp: 10, forceDown: 10, speedUp: 10, speedDown: 10, responseLimit: 4};
// shaping 6.2: no longer blocked, the Torque Tilt strengths are capped automatically with a note
function loops(m) { return [m.torquetilt_strength_regen * m.kp * m.kp_brake, m.torquetilt_strength * m.kp]; }
var rAll = E.compute(stAll(maxAll), nico), gAll = loops(rAll.merged);
ok(rAll.errors.block.length === 0 && gAll[0] <= 5 + 1e-9 && gAll[1] <= 4.5 + 1e-9 &&
   rAll.errors.warn.some(function (w) { return w.indexOf("Downhill strength: Torque Tilt strength limited") === 0; }) &&
   rAll.errors.warn.some(function (w) { return w.indexOf("Uphill strength: Torque Tilt strength limited") === 0; }),
   "all sliders at max (ride of 10 Oct, oscillation): capped " + gAll + " " + rAll.errors.warn.join(" | "));
var rMed = E.compute(stAll({accelFeel: 4, accelFeelSpeed: 4, brakeFeel: 10, inputPlay: 6, carveTrim: 5, forceUp: 5, forceDown: 5, speedUp: 5, speedDown: 5, responseLimit: 4}), nico);
ok(rMed.errors.block.length === 0 && loops(rMed.merged)[0] <= 5 + 1e-9 && rMed.merged.atr_strength_down === 0.9,
   "medium settings ride (9.6): Torque Tilt regen capped, ATR downhill kept " + loops(rMed.merged) + " " + rMed.merged.torquetilt_strength_regen);
var rStreet = E.compute(stAll({accelFeel: -6, brakeFeel: 10, responseLimit: 4}), nico);
ok(rStreet.changes.torquetilt_strength_regen === 0.1 && rStreet.changes.torquetilt_angle_limit === 4 && rStreet.errors.warn.length === 0,
   "Street: regen 0.10 kept, Torque Tilt limit 4°, no note " + JSON.stringify(rStreet.errors.warn));
// random states: the capped products never exceed the limits when a related slider is on
var capFail = 0;
for (i = 0; i < 50000; i++) {
    var stc = {}; E.NAMES.forEach(function (n) { var d = E.SLIDERS[n]; stc[n] = {on: Math.random() < 0.85, pos: rnd(posList(n))}; });
    var mc = E.compute(stc, i % 2 ? nico : cfg10).merged, g = loops(mc);
    if ((stc.forceDown.on || stc.brakeFeel.on || stc.accelFeel.on) && g[0] > 5 * 1.005) capFail++;
    if ((stc.forceUp.on || stc.accelFeel.on) && g[1] > 4.5 * 1.005) capFail++;
}
ok(capFail === 0, "50,000 random states: Torque Tilt loops always within limits (" + capFail + " failures)");
// only Accel Feel / Brake Feel moved (strengths at 0): never blocked by the Torque Tilt loop
posList("accelFeel").forEach(function (a) { posList("brakeFeel").forEach(function (b) {
    ok(E.compute(stAll({accelFeel: a, brakeFeel: b}), nico).errors.block.length === 0, "strengths at 0, accel " + a + " brake " + b + ": not blocked");
}); });
// a loop exceeded only by values set by hand (not written by the sliders): warning, not blocking
var hand = Object.assign({}, nico, {torquetilt_strength_regen: 0.5, kp_brake: 3});
var rHand = E.compute({responseLimit: {on: true, pos: 4}}, hand);
ok(rHand.errors.block.length === 0 && rHand.errors.warn.some(function (w) { return w.indexOf("Downhill strength too high") === 0; }),
   "Torque Tilt loop exceeded by hand-set values: warning only");

// 7) random combinations: nothing blocking, invalid inputs neutral
function randomState(pOn) {
    var st = {};
    E.NAMES.forEach(function (n) { var d = E.SLIDERS[n]; st[n] = {on: Math.random() < pOn, pos: rnd([d.min, d.max, rnd(posList(n))])}; });
    return st;
}
// Only expected blocking case: a Booster target left by a disabled Feel slider that became
// higher than the effective KP after a firmness change. Any other blocking case is a failure.
var fails = {}, expected = 0, ttLoop = 0;
for (var i = 0; i < 200000; i++) {
    var base = i % 2 ? nico : cfg10, st7 = randomState(0.85);
    E.compute(st7, base).errors.block.forEach(function (e) {
        var owner = e.indexOf("brkbooster_mahony_kp") === 0 ? "brakeFeel" : (e.indexOf("booster_mahony_kp") === 0 ? "accelFeel" : null);
        var m7 = E.compute(st7, base).merged;
        if (owner && !st7[owner].on) expected++;
        else if (e.indexOf("Downhill strength too high") === 0 && m7.torquetilt_strength_regen * m7.kp * m7.kp_brake > 6) ttLoop++;
        else if (e.indexOf("Uphill strength too high") === 0 && m7.torquetilt_strength * m7.kp > 4.5) ttLoop++;
        else fails[e] = (fails[e] || 0) + 1;
    });
}
ok(Object.keys(fails).length === 0, "200,000 combinations: unexpected blocking " + JSON.stringify(fails));
console.log("  (expected blocking, Booster of a disabled Feel slider: " + expected + "; Torque Tilt loop: " + ttLoop + ")");
var rBad = E.compute({accelFeel: {on: true, pos: NaN}, speedUp: {on: true, pos: Infinity},
    stance: {on: true, pos: -1e9}, responseLimit: {on: true, pos: "x"}, carveTrim: {on: true, pos: undefined}}, nico);
ok(rBad.changes.kp === 20 && rBad.changes.tiltback_constant === -2 && rBad.changes.atr_angle_limit === 8 &&
   rBad.changes.turntilt_strength === 0 && Object.keys(rBad.changes).every(function (k) { return isFinite(rBad.changes[k]); }),
   "invalid inputs: neutral or clamped " + JSON.stringify(rBad.changes));
ok(Object.keys(E.compute(st10, {}).changes).length > 0 && E.compute(st10, {}).errors.block.length >= 0,
   "empty config (not loaded): no exception");

// 8) monotonicity of owned parameters
E.NAMES.forEach(function (n) {
    var p0 = null, dir = {};
    posList(n).forEach(function (p) {
        var o = E.SLIDERS[n].f(p);
        Object.keys(o).forEach(function (q) {
            if (p0 && p0[q] !== undefined) { var d = o[q] - p0[q]; if (d > 1e-12) dir[q] = (dir[q] || "") + "+"; if (d < -1e-12) dir[q] = (dir[q] || "") + "-"; }
        });
        p0 = o;
    });
    Object.keys(dir).forEach(function (q) { ok(!(dir[q].indexOf("+") >= 0 && dir[q].indexOf("-") >= 0), "monotonic " + n + " / " + q); });
});

// 9) sources: every written parameter has at least one source slider; derived values correctly attributed
var rs = E.compute(st10, cfg10);
ok(Object.keys(rs.changes).every(function (k) { return rs.sources[k] && rs.sources[k].length; }), "every written parameter has a source");
ok(rs.sources.brkbooster_mahony_kp.join() === "brakeFeel,accelFeelSpeed,accelFeel", "brake Booster sources: " + rs.sources.brkbooster_mahony_kp);
ok(rs.sources["atr.filter.time_constant"].join() === "speedUp,speedDown", "shared smoothing sources");

// 9b) slider positions saved with a tune
var tuneLike = JSON.parse(JSON.stringify(Object.assign({}, {name: "Street", settings: [{name: "kp", value: 20}]},
    {shapingPositions: E.sanitizePositions(st10)})));
var back = E.sanitizePositions(tuneLike.shapingPositions);
ok(JSON.stringify(back) === JSON.stringify(E.sanitizePositions(st10)), "reference positions identical after a tune JSON round trip");
ok(E.NAMES.every(function (n) { return back[n].on === true && back[n].pos === s10[n]; }), "reference positions restored exactly");
var restored = E.compute(back, cfg10);
ok(Object.keys(restored.diff).length === 0, "after restore, nothing to write on the tune config");
ok(E.NAMES.every(function (n) { return E.desync(n, back, cfg10).length === 0; }), "after restore, no slider out of sync");
ok(E.sanitizePositions(null) === null && E.sanitizePositions("x") === null && E.sanitizePositions([1, 2]) === null &&
   E.sanitizePositions({}) === null && E.sanitizePositions({inconnu: {on: true, pos: 3}}) === null, "invalid positions: ignored");
var junk = E.sanitizePositions({accelFeel: {on: "oui", pos: 99}, stance: {on: true, pos: 0.31}, responseLimit: {on: true, pos: "8"},
    carveTrim: {on: true}, autre: {on: true, pos: 1}});
ok(junk.accelFeel.on === false && junk.accelFeel.pos === 10 && junk.stance.pos === 0.4 && junk.responseLimit.pos === 8 &&
   junk.carveTrim.pos === 0 && !("autre" in junk), "out-of-range or mistyped positions: clamped or neutral " + JSON.stringify(junk));

// 10) non-regression against a previous ui.qml.in (Torque Tilt limit excluded)
var refPath = process.argv[3];
if (refPath && fs.existsSync(refPath)) {
    var t2 = fs.readFileSync(refPath, "utf8");
    var a2 = t2.indexOf("property var shapingEngine: (function() {"), b2 = t2.indexOf("})()", a2);
    var G2 = eval("(" + t2.slice(a2 + "property var shapingEngine: ".length, b2 + 4) + ")");
    var nreg = 0;
    for (i = 0; i < 30000; i++) {
        var st = randomState(0.7), base2 = i % 2 ? nico : cfg10;
        var c2 = G2.compute(st, base2).changes, c3 = E.compute(st, base2).changes;
        delete c2.torquetilt_angle_limit;
        var k2 = Object.keys(c2).sort().join(), k3 = Object.keys(c3).sort().join();
        if (k2 !== k3 || Object.keys(c2).some(function (k) { return c2[k] !== c3[k]; })) nreg++;
    }
    ok(nreg === 0, "non-regression: " + nreg + " differing states out of 30,000");
} else {
    console.log("(non-regression not tested: no previous ui.qml.in given)");
}

// 11) the engine copy in ui.qml.in is identical to shaping.js
var uiPath = process.argv[2] || path.join(__dirname, "ui.qml.in");
var src = fs.readFileSync(path.join(__dirname, "shaping.js"), "utf8");
function block(t) { var a = t.indexOf("// <shaping-engine>"), b = t.indexOf("// </shaping-engine>"); return a >= 0 && b > a ? t.slice(a, b) : null; }
function norm(t) { return t.split("\n").map(function (l) { return l.trim(); }).join("\n"); }
var ui = fs.readFileSync(uiPath, "utf8");
ok(block(src) && block(ui) && norm(block(src)) === norm(block(ui)), "engine in ui.qml.in identical to shaping.js");
ok(ui.indexOf("property var shapingEngine:") >= 0 && ui.indexOf('TabButton {text: "Sliders"}') >= 0, "Sliders page present in ui.qml.in");

console.log((failed ? "FAILURES: " + failed : "ALL TESTS PASSED") + " (" + passed + " checks)");
process.exit(failed ? 1 : 0);
