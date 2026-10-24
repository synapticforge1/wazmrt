// H6 rule 3, scoped 2026-10-23 — would a behaviour check carried forward from a TAG have caught a
// release's accepting-less change? Builds each ref in a throwaway worktree, judges every module of a
// corpus under several presets with each binary, and diffs the verdicts of consecutive refs.
//
//   bun carry-forward.ts <repo root> <corpus dir> <out dir> <ref> <ref> [<ref>…]
//   e.g. bun carry-forward.ts . ../wasmtk/tests <scratch> v1.0.2 v1.0.3 HEAD
//
// ⚠️ A verdict here is the exit code of `wazmrt [--features X] <module>`, and that RUNS a module
// with `_start`: it mixes validation with execution (the scope's finding 1). Read an exit code
// other than 0/1 as "it ran", not as a validation verdict.
//
// Measured 2026-10-23 over wasmtk/tests (1,189 modules): v1.0.2 → v1.0.3 changed 1,549 verdicts,
// of which 24 rows (13 modules) were accepted → refused under `mvp`, all for `mutable_global`;
// v1.0.3 → HEAD changed 0. `cmem/releasing.md` → "Rule 3 as behaviour carried forward".

import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { output } from "./run.ts";

const [repo, corpus, outDir, ...refs] = process.argv.slice(2);
if (!repo || !corpus || !outDir || refs.length < 2) {
  console.error("usage: carry-forward.ts <repo root> <corpus dir> <out dir> <ref> <ref> [<ref>…]");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const configs = ["default", "mvp", "wasm1", "wasm2"];

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== "testsuite-main") walk(p, acc);
    } else if (e.name.endsWith(".wat") || e.name.endsWith(".wasm")) acc.push(p);
  }
  return acc;
}
const modules = walk(corpus).sort();
console.log(`modules: ${modules.length}`);

// ---- build each ref ------------------------------------------------------------------------
const exes = new Map<string, string>();
for (const ref of refs) {
  const wt = join(outDir, `wt-${ref.replace(/[^\w.-]/g, "_")}`);
  const add = await output("git", { args: ["-C", repo, "worktree", "add", "-q", "--detach", wt, ref] });
  if (!add.success) throw new Error(`worktree for ${ref}: ${new TextDecoder().decode(add.stderr)}`);
  try {
    const b = await output("zig", { args: ["build", "-Doptimize=ReleaseSmall"], cwd: wt, env: { ZIG_LOCAL_CACHE_DIR: join(outDir, `cache-${ref.replace(/[^\w.-]/g, "_")}`) } });
    const exe = join(outDir, `wazmrt-${ref.replace(/[^\w.-]/g, "_")}.exe`);
    copyFileSync(join(wt, "zig-out", "bin", "wazmrt.exe"), exe);
    const v = await output(exe, { args: ["--version"] });
    // ⚠️ `zig build -Doptimize=ReleaseSmall` also runs the SIZE GATE, and `wazmrt.lib` embeds the
    // cache path (`cmem/known-issues.md`), so a cache under a longer path than the one the ceilings
    // were recorded with turns the build red on the LIB alone (+132 bytes here, measured
    // 2026-10-23). The exe this probe uses is unaffected; any OTHER failure is a real one.
    const log = new TextDecoder().decode(b.stdout) + new TextDecoder().decode(b.stderr);
    const libOnly = !b.success && /wazmrt\.lib .*OVER/.test(log) && !/wazmrt\.(exe|dll) .*OVER/.test(log) && /SizeOverCeiling/.test(log);
    if (!b.success && !libOnly) throw new Error(`build ${ref} failed:\n${log.slice(-2000)}`);
    console.log(`build ${ref} ${b.success ? "ok" : "ok (size gate red on wazmrt.lib only: the embedded cache path)"} ${statSync(exe).size} bytes, says: ${new TextDecoder().decode(v.stdout).split("\n")[0]}`);
    exes.set(ref, exe);
  } finally {
    await output("git", { args: ["-C", repo, "worktree", "remove", "--force", wt] });
  }
}

// ---- verdicts --------------------------------------------------------------------------------
const verdicts = new Map<string, string[]>();
for (const ref of refs) {
  const rows: string[] = [];
  for (const cfg of configs) {
    for (const m of modules) {
      const args = cfg === "default" ? [m] : ["--features", cfg, m];
      const r = await output(exes.get(ref)!, { args, stdout: "null", stderr: "null" });
      rows.push(`${cfg}\t${r.code}\t${relative(corpus, m).replaceAll("\\", "/")}`);
    }
  }
  verdicts.set(ref, rows);
  writeFileSync(join(outDir, `verdicts-${ref.replace(/[^\w.-]/g, "_")}.txt`), rows.join("\n") + "\n");
}

// ---- diffs of consecutive refs ---------------------------------------------------------------
for (let i = 0; i + 1 < refs.length; i++) {
  const [a, b] = [verdicts.get(refs[i])!, verdicts.get(refs[i + 1])!];
  const changed: string[] = [];
  for (let k = 0; k < a.length; k++) {
    const [cfg, ra, m] = a[k].split("\t");
    const rb = b[k].split("\t")[1];
    if (ra !== rb) changed.push(`${cfg}  ${ra} -> ${rb}  ${m}`);
  }
  console.log(`\n== ${refs[i]} -> ${refs[i + 1]}: ${changed.length} changed verdicts (cfg, old rc -> new rc, module)`);
  const groups = new Map<string, number>();
  for (const c of changed) {
    const key = c.split("  ").slice(0, 2).join("  ");
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  for (const [k, n] of [...groups].sort()) console.log(`  ${String(n).padStart(5)}  ${k}${/ 0 -> 1$/.test(k) ? "   ← accepted → refused: ACCEPTING LESS" : ""}`);
  writeFileSync(join(outDir, `diff-${refs[i]}-${refs[i + 1]}.txt`.replace(/[^\w./-]/g, "_")), changed.join("\n") + "\n");
}
