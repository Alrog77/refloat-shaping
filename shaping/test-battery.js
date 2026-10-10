// Battery estimate tests: node shaping/test-battery.js [ui.qml.in] [CSV ride logs…]
var fs = require("fs"), path = require("path");
var B = require("./battery.js");
var failed = 0, passed = 0;
function ok(c, m) { if (c) passed++; else { failed++; console.log("FAIL: " + m); } }

// 1) reading at rest: 67.6 V, reference app showed 61 %
var r = B.socRaw(67.6 / 18, 0);
ok(Math.abs(r - 61) < 1.5, "3.76 V per cell at rest ≈ 61 % (got " + r.toFixed(1) + ")");
ok(Math.abs(B.estimate(67.6, 0, 18, 3.0) - (r - 10) / 90 * 100) < 1e-6, "usable = 0 % at the 3.0 V threshold");
// 2) bounds
ok(B.socRaw(4.2, 0) === 100 && B.socRaw(4.3, 5) === 100, "full charge: 100 %");
ok(B.estimate(54, 0, 18, 3.0) === 0 && B.estimate(50, 0, 18, 3.0) === 0, "at and below the threshold: 0 %");
ok(B.estimate(75.6, 0, 18, 3.0) > 99.9, "75.6 V at rest: 100 %");
ok(B.estimate(54 * 1, 0, 18, 54) === 0, "threshold given as pack voltage (old format): converted");
// 3) monotonic in voltage, for any current from 0 to 20 A and above (capped)
var mono = true;
[0, 5, 10, 20, 30, 60].forEach(function (i) {
    var prev = -1;
    for (var v = 2.6; v <= 4.25; v += 0.005) { var s = B.socRaw(v, i); if (s < prev - 1e-9) mono = false; prev = s; }
});
ok(mono, "charge increases with voltage, at any current");
var dec = true;
for (var v = 3.1; v <= 4.15; v += 0.05) { var p = -1; [0, 5, 10, 20].forEach(function (i) { var s = B.socRaw(v, i); if (s < p - 1e-9) dec = false; p = s; }); }
ok(dec, "same voltage, more current = higher estimate (sag correction)");
ok(B.socRaw(3.6, 40) === B.socRaw(3.6, 20), "above 20 A, correction capped (conservative)");
// 4) invalid inputs
ok(B.estimate(NaN, 0, 18, 3) === null && B.estimate(70, 0, 0, 3) === null && B.estimate(70, 0, 40, 3) === null &&
   B.estimate(Infinity, 0, 18, 3) === null && B.socRaw(1.0, 0) === null, "invalid inputs: null (controller value)");
ok(B.estimate(70, -10, 18, 3) === undefined, "regenerative braking: estimate kept (undefined)");
ok(B.estimate(70, NaN, 18, 3) !== null && isFinite(B.estimate(70, NaN, 18, 3)), "invalid current: treated as 0 A");
ok(B.estimate(70, 0, 18, 9.9) === B.estimate(70, 0, 18, 3.0), "absurd threshold: 3.0 V default");
// 5) smoothing
ok(B.smooth(null, 50, 0.1) === 50 && B.smooth(40, 50, 0) === 50 && B.smooth(40, 50, 99) === 50, "smoothing: invalid dt -> target");
var sm = B.smooth(40, 50, 1); ok(sm > 40 && sm < 41.5, "smoothing: 1 s towards a 10 point gap ≈ +1 point");
ok(B.smooth(40, NaN, 1) === 40, "smoothing: invalid target -> previous value");

// 6) ride logs: the estimate should barely depend on the current
var logs = process.argv.slice(3);
logs.forEach(function (f) {
    if (!fs.existsSync(f)) return;
    var lines = fs.readFileSync(f, "utf8").trim().split("\n"), h = lines[0].split(",");
    var iv = h.indexOf("batt_voltage"), ii = h.indexOf("batt_current"), ir = h.indexOf("state.running");
    var S = [], I = [];
    lines.slice(1).forEach(function (l) {
        var c = l.split(","); if (+c[ir] !== 1) return;
        var e = B.estimate(+c[iv], +c[ii], 18, 3.0); if (typeof e === "number") { S.push(e); I.push(+c[ii]); }
    });
    function corr(a, b) { var n = a.length, ma = 0, mb = 0, i; for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
        var sab = 0, sa = 0, sb = 0; for (i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) * (a[i] - ma); sb += (b[i] - mb) * (b[i] - mb); }
        return sab / Math.sqrt(sa * sb); }
    var c = corr(S, I);
    ok(Math.abs(c) < 0.4, path.basename(f) + ": estimate/current correlation " + c.toFixed(2));
    console.log("  " + path.basename(f) + ": median estimate " + S.slice().sort(function (a, b) { return a - b; })[S.length >> 1].toFixed(0) + " %, correlation with current " + c.toFixed(2));
});

// 7) copy in ui.qml.in identical
var uiPath = process.argv[2];
if (uiPath) {
    function block(t) { var a = t.indexOf("// <battery-engine>"), b = t.indexOf("// </battery-engine>"); return a >= 0 && b > a ? t.slice(a, b) : null; }
    function norm(t) { return t.split("\n").map(function (l) { return l.trim(); }).join("\n"); }
    var src = fs.readFileSync(path.join(__dirname, "battery.js"), "utf8"), ui = fs.readFileSync(uiPath, "utf8");
    ok(block(src) && block(ui) && norm(block(src)) === norm(block(ui)), "battery engine in ui.qml.in identical to battery.js");
}
console.log((failed ? "FAILURES: " + failed : "ALL BATTERY TESTS PASSED") + " (" + passed + " checks)");
process.exit(failed ? 1 : 0);
