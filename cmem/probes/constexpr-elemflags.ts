// Re-measures two fuzz findings wasmrt reported on wazmrt's 2026-09-21 build (wasmrt's
// `cmem/shared-definitions.md`, differential fuzz): (1) a constant expression whose operand stack
// is deeper than 8 was refused (`ConstantExpressionRequired`) where wasm-tools accepts to 64;
// (2) element-segment flags 0x41 / 0x4b / 0x0d validated "OK" though the spec allows 0–7.
//
// Every tool validates the SAME .wasm bytes with every feature on: wazmrt and wasmrt by their
// bare-path form (summarize + validate; no module here has a `_start`), `wasm-tools validate
// --features all`, binaryang's `wasm-validate --enable-all`.
//
//   bun constexpr-elemflags.ts <work dir> <wazmrt exe> <wasmrt exe> <binaryang checkout>

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { output } from "./run.ts";

const [work, wazmrt, wasmrt, binaryang] = process.argv.slice(2);
mkdirSync(work, { recursive: true });

const tools: [string, (f: string) => Promise<boolean>][] = [
  ["wazmrt", async (f) => (await output(wazmrt, { args: [f] })).success],
  ["wasmrt", async (f) => (await output(wasmrt, { args: [f] })).success],
  ["wasm-tools", async (f) => (await output("wasm-tools", { args: ["validate", "--features", "all", f] })).success],
  ["binaryang", async (f) => (await output("bun", { args: ["main.ts", "wasm-validate", "--enable-all", f], cwd: binaryang })).success],
];

async function row(label: string, file: string, expect: string) {
  const verdicts = [];
  for (const [name, judge] of tools) verdicts.push(`${name} ${(await judge(file)) ? "valid" : "REFUSED"}`);
  console.log(`${label.padEnd(26)} (spec: ${expect.padEnd(7)}) ${verdicts.join(" · ")}`);
}

// (1) Constant-expression depth: N pushes, then N−1 adds (extended-const), so the operand stack
// peaks at exactly N.
console.log("== const-expr operand-stack depth (a global's initializer)");
for (const n of [1, 8, 9, 16, 64, 65, 128]) {
  const expr = "(i32.const 1) ".repeat(n) + "(i32.add) ".repeat(n - 1);
  const wat = join(work, `depth-${n}.wat`);
  const wasm = join(work, `depth-${n}.wasm`);
  writeFileSync(wat, `(module (global i32 ${expr}))\n`);
  const r = await output("wasm-tools", { args: ["parse", wat, "-o", wasm] });
  if (!r.success) throw new Error(`wasm-tools cannot assemble depth ${n}`);
  await row(`depth ${n}`, wasm, "valid");
}

// (2) Element-segment flags. One function, one funcref table, one element segment whose FLAGS byte
// varies; the rest of the segment is flags-0's layout (an offset, then a vector of function
// indices), so only flags 0 is well-formed.
console.log("== element-segment flags (spec: 0–7)");
const sec = (id: number, body: number[]) => [id, body.length, ...body];
for (const flags of [0, 8, 0x0d, 0x41, 0x4b]) {
  const bytes = [
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...sec(1, [1, 0x60, 0, 0]), // one type: [] -> []
    ...sec(3, [1, 0]), // one function of that type
    ...sec(4, [1, 0x70, 0, 1]), // one funcref table, min 1
    ...sec(9, [1, flags, 0x41, 0, 0x0b, 1, 0]), // one segment: flags, (i32.const 0), [func 0]
    ...sec(10, [1, 2, 0, 0x0b]), // the function's body
  ];
  const f = join(work, `elemflags-${flags.toString(16)}.wasm`);
  writeFileSync(f, Uint8Array.from(bytes));
  await row(`flags 0x${flags.toString(16).padStart(2, "0")}`, f, flags === 0 ? "valid" : "invalid");
}
