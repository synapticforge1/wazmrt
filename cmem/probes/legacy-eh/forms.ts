// Legacy exception handling (owner, 2026-09-21: build it in for the broadest coverage).
// Which TEXT forms does wazmrt assemble today, and does wasm-tools accept each? Folded and flat,
// every legacy instruction: try / catch / catch_all / rethrow / delegate.
//
//   bun forms.ts <wazmrt.exe> <out dir>

import { mkdir, writeFile } from "node:fs/promises";
import { output } from "../run.ts";

const [exe, outDir] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });

const forms: Record<string, string> = {
  "flat try/catch": `(module (tag $e) (func try catch $e end))`,
  "flat try/catch_all": `(module (func try catch_all end))`,
  "flat try/catch + catch_all": `(module (tag $e) (func try catch $e catch_all end))`,
  "flat rethrow": `(module (tag $e) (func try catch $e rethrow 0 end))`,
  "flat delegate": `(module (func block try try delegate 1 end end))`,
  "flat try with result": `(module (tag $e (param i32)) (func (result i32) try (result i32) i32.const 1 catch $e end))`,
  "folded try/do/catch": `(module (tag $e) (func (try (do) (catch $e))))`,
  "folded try/catch_all": `(module (func (try (do nop) (catch_all))))`,
  "folded delegate": `(module (func (block (try (do (try (do) (delegate 1)))))))`,
  "folded rethrow": `(module (tag $e) (func (try (do) (catch $e (rethrow 0)))))`,
};

async function run(cmd: string, args: string[]) {
  const r = await output(cmd, { args, stdout: "piped", stderr: "piped" });
  return { code: r.code, text: (new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr)).trim().split("\n")[0] };
}

console.log(`${"form".padEnd(30)} ${"wasm-tools".padEnd(12)} wazmrt`);
let n = 0;
for (const [name, src] of Object.entries(forms)) {
  const f = `${outDir}/form-${n++}.wat`;
  await writeFile(f, src + "\n");
  const t = await run("wasm-tools", ["validate", "--features=all", f]);
  const w = await run(exe, ["wat", f, "-o", `${f}.wasm`]);
  console.log(`${name.padEnd(30)} ${(t.code === 0 ? "valid" : "INVALID").padEnd(12)} ${w.code === 0 ? "assembles" : "✗ " + w.text.slice(0, 70)}`);
}
