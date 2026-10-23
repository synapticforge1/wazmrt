// Workspace letter H8 — run one or more .wat files through the FOUR assemblers and report what each
// emits: exit status, the ordered list of custom sections (name + payload size), and whether the
// whole file equals `wasm-tools parse`'s (the canonical reference).
//
// Behavioural measurement only. The siblings' BUILT tools are run; their trees are not written.
// binaryang runs with `--no-text-form` (its own `binaryang.text-form` section is DESIGN, I15), as
// `bun main.ts` — its CLI left Deno (the workspace measured the two byte-identical, 21/21).
//
//   bun four-assemblers.ts <wazmrt.exe> <wasmrt.exe> <binaryang dir> <out dir> <file.wat>...

import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { output } from "./run.ts";

const [wazmrt, wasmrt, binaryang, outDir, ...files] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const tools: Record<string, (i: string, o: string) => { cmd: string; args: string[]; cwd?: string }> = {
  "wasm-tools": (i, o) => ({ cmd: "wasm-tools", args: ["parse", i, "-o", o] }),
  wazmrt: (i, o) => ({ cmd: wazmrt, args: ["wat", i, "-o", o] }),
  wasmrt: (i, o) => ({ cmd: wasmrt, args: ["wat", i, "-o", o] }),
  binaryang: (i, o) => ({ cmd: "bun", args: ["main.ts", "wat2wasm", i, "-o", o, "--no-text-form"], cwd: binaryang }),
};

function readLeb(b: Uint8Array, at: number): [number, number] {
  let r = 0, s = 0, i = at;
  for (;;) {
    const c = b[i++];
    r |= (c & 0x7f) << s;
    if (!(c & 0x80)) break;
    s += 7;
  }
  return [r >>> 0, i];
}
function customs(b: Uint8Array): string[] {
  const out: string[] = [];
  let i = 8;
  while (i < b.length) {
    const id = b[i];
    const [size, p] = readLeb(b, i + 1);
    if (id === 0) {
      const [n, q] = readLeb(b, p);
      out.push(`${new TextDecoder().decode(b.subarray(q, q + n))}(${size - (q - p) - n}B)`);
    }
    i = p + size;
  }
  return out;
}

for (const f of files) {
  console.log(`\n== ${f.split(/[\\/]/).pop()}`);
  let ref: Uint8Array | null = null;
  for (const [name, mk] of Object.entries(tools)) {
    const o = `${outDir}/${name}.wasm`;
    try { rmSync(o); } catch { /* absent */ }
    const t = mk(f, o);
    const r = await output(t.cmd, { args: t.args, cwd: t.cwd, stdout: "piped", stderr: "piped" });
    if (r.code !== 0) {
      const err = new TextDecoder().decode(r.stderr).trim().split("\n")[0].slice(0, 110);
      console.log(`  ${name.padEnd(11)} REFUSED  ${err}`);
      continue;
    }
    const b = new Uint8Array(readFileSync(o));
    if (name === "wasm-tools") ref = b;
    const same = ref && b.length === ref.length && b.every((v, i) => v === ref![i]);
    console.log(`  ${name.padEnd(11)} ok  ${String(b.length).padStart(4)}B  customs: [${customs(b).join(", ")}]${name === "wasm-tools" ? "  (reference)" : same ? "  == wasm-tools" : "  ≠ wasm-tools"}`);
  }
}
