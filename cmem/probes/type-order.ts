// Workspace letter H13 / divergence I14 — print the TYPE SECTION of one .wat as assembled by wazmrt
// and by wasm-tools, side by side, marking the indices that differ. Built for the implicit-type
// interning-order class (Z4 cause 3, I14): a type the text never declares gets an index from the
// ORDER in which the assembler meets it, and that order is the whole bug.
//
//   bun type-order.ts <wazmrt.exe> <file.wat> <out dir>

import { mkdir } from "node:fs/promises";
import { output } from "./run.ts";

const [exe, wat, outDir] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });

async function run(cmd: string, args: string[]): Promise<string> {
  const r = await output(cmd, { args, stdout: "piped", stderr: "piped" });
  if (r.code !== 0) throw new Error(`${cmd} ${args.join(" ")}: ${new TextDecoder().decode(r.stderr)}`);
  return new TextDecoder().decode(r.stdout);
}

const ours = `${outDir}/type-order-wazmrt.wasm`, theirs = `${outDir}/type-order-wasmtools.wasm`;
await run(exe, ["wat", wat, "-o", ours]);
await run("wasm-tools", ["parse", wat, "-o", theirs]);

const typesOf = async (f: string) =>
  (await run("wasm-tools", ["print", f])).split("\n").filter((l) => /^\s*\(type \(;\d+;\)/.test(l)).map((l) => l.trim());
const a = await typesOf(ours), b = await typesOf(theirs);
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  const mark = a[i] === b[i] ? "  " : "≠ ";
  console.log(`${mark}${String(i).padStart(3)}  wazmrt: ${a[i] ?? "-"}`);
  if (a[i] !== b[i]) console.log(`       wasm-tools: ${b[i] ?? "-"}`);
}
