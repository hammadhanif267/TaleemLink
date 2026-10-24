import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../src/app/phase-d.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/app/phase-c.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.js", import.meta.url), "utf8");

function luminance(hex) {
  const rgb = hex.match(/[a-f0-9]{2}/gi).map((part) => parseInt(part, 16) / 255);
  const linear = rgb.map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test("theme stylesheet is loaded after the old component rules", () => {
  assert.ok(layout.indexOf('import "./phase-c.css"') < layout.indexOf('import "./phase-d.css"'));
});

test("assignment, quiz and study summary cards explicitly override old white surfaces", () => {
  for (const selector of [".assignment-summary > div", ".quiz-summary > div", ".study-plan-stats > div"]) {
    assert.ok(css.includes(selector), `Missing color correction for ${selector}`);
  }
  assert.match(css, /background:\s*var\(--tl-surface\)\s*!important/);
  assert.match(css, /color:\s*var\(--tl-ink\)\s*!important/);
  assert.match(css, /color:\s*var\(--tl-muted\)\s*!important/);
});

test("light and dark summary text tokens meet WCAG AA normal-text contrast", () => {
  const light = ["#ffffff", "#121619", "#58616b"];
  const dark = ["#161b20", "#f2f4f6", "#b2b9c1"];
  for (const [background, main, muted] of [light, dark]) {
    assert.ok(contrast(background, main) >= 4.5, `Main text contrast too low: ${contrast(background, main)}`);
    assert.ok(contrast(background, muted) >= 4.5, `Muted text contrast too low: ${contrast(background, muted)}`);
  }
  for (const hex of [...light, ...dark]) assert.ok(tokens.includes(hex), `Theme token missing: ${hex}`);
});
