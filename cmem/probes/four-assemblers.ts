// Workspace letter H8 — run one or more .wat files through the FOUR assemblers and report what each
// emits: exit status, the ordered list of custom sections (name + payload size), and whether the
// whole file equals `wasm-tools parse`'s (the canonical reference).
//
// Behavioural measurement only. The siblings' BUILT tools are run; their trees are not written.
// binaryang runs with `--no-text-form` (its own `binaryang.text-form` section is DESIGN, I15) and
// `--no-lock`, so it leaves no lock file behind.
//
//   deno run -A four-assemblers.ts <wazmrt.exe> <wasmrt.exe> <binaryang dir> <out dir> <file.wat>...

const [wazmrt, wasmrt, binaryang, outDir, ...files] = Deno.args;
await Deno.mkdir(outDir, { recursive: true });

const tools: Record<string, (i: string, o: string) => { cmd: string; args: string[]; cwd?: string }> = {
  "wasm-tools": (i, o) => ({ cmd: "wasm-tools", args: ["parse", i, "-o", o] }),
  wazmrt: (i, o) => ({ cmd: wazmrt, args: ["wat", i, "-o", o] }),
  wasmrt: (i, o) => ({ cmd: wasmrt, args: ["wat", i, "-o", o] }),
  binaryang: (i, o) => ({ cmd: "deno", args: ["run", "--no-lock", "-A", "main.ts", "wat2wasm", i, "-o", o, "--no-text-form"], cwd: binaryang }),
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
    try { Deno.removeSync(o); } catch { /* absent */ }
    const t = mk(f, o);
    const r = await new Deno.Command(t.cmd, { args: t.args, cwd: t.cwd, stdout: "piped", stderr: "piped" }).output();
    if (r.code !== 0) {
      const err = new TextDecoder().decode(r.stderr).trim().split("\n")[0].slice(0, 110);
      console.log(`  ${name.padEnd(11)} REFUSED  ${err}`);
      continue;
    }
    const b = Deno.readFileSync(o);
    if (name === "wasm-tools") ref = b;
    const same = ref && b.length === ref.length && b.every((v, i) => v === ref![i]);
    console.log(`  ${name.padEnd(11)} ok  ${String(b.length).padStart(4)}B  customs: [${customs(b).join(", ")}]${name === "wasm-tools" ? "  (reference)" : same ? "  == wasm-tools" : "  ≠ wasm-tools"}`);
  }
}
