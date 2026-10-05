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
    booster_angle: 8, booster_mahony_kp: 0, brkbooster_angle: 8, brkbooster_mahony_kp: 0, torquetilt_start_current: 15,
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
    forceDown: 6, speedDown: 1, brakeFeel: 6, accelFeel: 1, inputPlay: 2};
var st10 = {}; Object.keys(s10).forEach(function (k) { st10[k] = {on: true, pos: s10[k]}; });
var cfg10 = Object.assign({}, nico, E.compute(st10, nico).changes, {torquetilt_angle_limit: 6});
// the same config read back as float32, as from the board
var cfg10f = {}; Object.keys(cfg10).forEach(function (k) { cfg10f[k] = f32(cfg10[k]); });

// 1) everything at 0 (Response Limit at 8°) = exact stock values; the Torque Tilt limit is never written
var st0 = {}; E.NAMES.forEach(function (n) { st0[n] = {on: true, pos: E.defaultPos(n)}; });
var r0 = E.compute(st0, nico);
var bad = Object.keys(r0.changes).filter(function (k) { return Math.abs(r0.changes[k] - nico[k]) > 1e-9; });
ok(bad.length === 0, "all at 0 = stock; differences: " + bad.join(", "));
ok(Object.keys(r0.diff).length === 0, "all at 0 from stock: no real change");
ok(r0.errors.block.length === 0, "all at 0: nothing blocking");
ok(!("torquetilt_angle_limit" in r0.changes), "Response Limit no longer writes the Torque Tilt limit");

// 2) everything disabled = nothing
ok(Object.keys(E.compute({}, nico).changes).length === 0, "all disabled: no parameter written");

// 3) Response Limit: a single parameter, monotonic, bounded
var prev = -1, rlOnly = true, rlMono = true;
posList("responseLimit").forEach(function (p) {
    var ch = E.compute({responseLimit: {on: true, pos: p}}, nico).changes, ks = Object.keys(ch);
    if (ks.length !== 1 || ks[0] !== "atr_angle_limit") rlOnly = false;
    if (!(ch.atr_angle_limit > prev)) rlMono = false;
    prev = ch.atr_angle_limit;
});
ok(rlOnly, "Response Limit only writes atr_angle_limit");
ok(rlMono && prev === 18, "Response Limit monotonic from 2 to 18°");

// 4) Torque Tilt limit at 9° in the config: warning, never blocking
var r4 = E.compute({responseLimit: {on: true, pos: 6}}, Object.assign({}, nico, {torquetilt_angle_limit: 9}));
ok(r4.errors.block.length === 0, "Torque Tilt 9° not written: not blocking");
ok(r4.errors.warn.some(function (w) { return w.indexOf("Torque Tilt") >= 0; }), "Torque Tilt 9°: warning");

// 5) closest Response Limit position independent of the Torque Tilt limit
[2, 6, 8, 9].forEach(function (tt) {
    var n = E.nearest("responseLimit", Object.assign({}, cfg10, {torquetilt_angle_limit: tt}), st10);
    ok(n.pos === 6 && n.err < 1e-12, "closest Response Limit = exact 6 with Torque Tilt at " + tt + "°");
});

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

// 7) random combinations: nothing blocking, invalid inputs neutral
function randomState(pOn) {
    var st = {};
    E.NAMES.forEach(function (n) { var d = E.SLIDERS[n]; st[n] = {on: Math.random() < pOn, pos: rnd([d.min, d.max, rnd(posList(n))])}; });
    return st;
}
// Only expected blocking case: a Booster target left by a disabled Feel slider that became
// higher than the effective KP after a firmness change. Any other blocking case is a failure.
var fails = {}, expected = 0;
for (var i = 0; i < 200000; i++) {
    var base = i % 2 ? nico : cfg10, st7 = randomState(0.85);
    E.compute(st7, base).errors.block.forEach(function (e) {
        var owner = e.indexOf("brkbooster_mahony_kp") === 0 ? "brakeFeel" : (e.indexOf("booster_mahony_kp") === 0 ? "accelFeel" : null);
        if (owner && !st7[owner].on) expected++; else fails[e] = (fails[e] || 0) + 1;
    });
}
ok(Object.keys(fails).length === 0, "200,000 combinations: unexpected blocking " + JSON.stringify(fails));
console.log("  (expected blocking, Booster of a disabled Feel slider: " + expected + ")");
var rBad = E.compute({accelFeel: {on: true, pos: NaN}, speedUp: {on: true, pos: Infinity},
    stance: {on: true, pos: -1e9}, responseLimit: {on: true, pos: "x"}, carveTrim: {on: true, pos: undefined}}, nico);
ok(rBad.changes.kp === 20 && rBad.changes.tiltback_constant === -3 && rBad.changes.atr_angle_limit === 8 &&
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
