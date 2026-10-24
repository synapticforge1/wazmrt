// wazmrt vs binaryang, validate-only, over S1's corpus (`tests/behaviour`) under D2's
// configurations: D2's presets, every feature alone on top of nothing (`-all,<f>`), every feature
// taken from everything (`all,-<f>`), and `-all`. Asked for by binaryang (letter of 2026-10-24:
// "your feature matrix against its D1 / D2 — every difference back to us, so the migration settles
// once"). The verdict is the exit code: `wazmrt --features <cfg> <m.wasm>` (no corpus module has a
// `_start`, so nothing runs) and binaryang's `wasm-validate` with the flags that make its default
// set equal the config. `.wat` files are assembled by wazmrt first, so both read the same bytes.
//
//   bun d2-matrix.ts <wazmrt exe> <binaryang checkout> <corpus dir> <work dir>

import { copyFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { output } from "./run.ts";

const [wazmrt, binaryang, corpus, work] = process.argv.slice(2);
mkdirSync(work, { recursive: true });
const d2 = JSON.parse(readFileSync(join(binaryang, "src/definitions/features.json"), "utf8"));
const feats: { name: string; cli: string; defaultOn: boolean }[] = d2.entries;
const presets: { name: string; features: string[] }[] = d2.presets;

type Cfg = { label: string; on: Set<string> };
const cfgs: Cfg[] = presets.map((p) => ({ label: p.name, on: new Set(p.features) }));
const all = new Set(feats.map((f) => f.name));
for (const f of feats) cfgs.push({ label: `-all,${f.cli}`, on: new Set([f.name]) });
for (const f of feats) cfgs.push({ label: `all,-${f.cli}`, on: new Set([...all].filter((n) => n !== f.name)) });
cfgs.push({ label: "-all", on: new Set() });

// binaryang's flags toggle FROM its defaults, so a config is the set of toggles that reach it.
const binFlags = (on: Set<string>) =>
  feats.flatMap((f) => (on.has(f.name) === f.defaultOn ? [] : [`--${on.has(f.name) ? "enable" : "disable"}-${f.cli}`]));

const mods: string[] = [];
for (const n of readdirSync(corpus).sort()) {
  if (n.endsWith(".wasm")) {
    copyFileSync(join(corpus, n), join(work, n));
    mods.push(n);
  } else if (n.endsWith(".wat")) {
    const out = n.replace(/\.wat$/, ".wasm");
    const r = await output(wazmrt, { args: ["wat", join(corpus, n), "-o", join(work, out)] });
    if (!r.success) throw new Error(`wazmrt cannot assemble ${n}`);
    mods.push(out);
  }
}

const jobs: (() => Promise<string | null>)[] = [];
for (const c of cfgs) {
  for (const m of mods) {
    jobs.push(async () => {
      const a = (await output(wazmrt, { args: ["--features", c.label, join(work, m)] })).success;
      const b = (await output("bun", { args: ["main.ts", "wasm-validate", ...binFlags(c.on), join(work, m)], cwd: binaryang })).success;
      return a === b ? null : `${c.label.padEnd(30)} ${m.padEnd(36)} wazmrt ${a ? "ACCEPTS" : "refuses"}, binaryang ${b ? "ACCEPTS" : "refuses"}`;
    });
  }
}
const diffs: string[] = [];
let next = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  while (next < jobs.length) {
    const d = await jobs[next++]();
    if (d) diffs.push(d);
  }
}));
diffs.sort();
console.log(`${mods.length} modules × ${cfgs.length} configs = ${jobs.length} judgements; ${diffs.length} differ`);
for (const d of diffs) console.log(d);
