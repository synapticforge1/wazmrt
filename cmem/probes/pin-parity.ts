// `.wat` PIN parity between the two runtimes (interop.md §3.1). A `.wat` pin is the SHA-256 of the
// ASSEMBLED bytes, so two runtimes' pins agree exactly when their full output files are identical —
// custom sections included (the `name` section was Z4's cause). This compares full files, which is
// the pin comparison, without needing either side's `pin` subcommand.
//
// Behavioural measurement of the sibling's BUILT binary only: nothing is written to its tree.
//
//   deno run -A pin-parity.ts <wazmrt.exe> <wasmrt.exe | wasm-tools> <corpus dir> <out dir>
//
// Pass the literal `wasm-tools` as the second argument to compare against the canonical assembler
// (`wasm-tools parse`) instead of the sibling runtime.

const [ours, theirs, corpus, outDir] = Deno.args;
await Deno.mkdir(outDir, { recursive: true });

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of Deno.readDirSync(dir)) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory && e.name !== "node_modules") walk(p, acc);
    else if (e.isFile && e.name.endsWith(".wat")) acc.push(p);
  }
  return acc;
}
async function assemble(exe: string, f: string, o: string): Promise<boolean> {
  try {
    const sub = exe === "wasm-tools" ? "parse" : "wat";
    const r = await new Deno.Command(exe, { args: [sub, f, "-o", o], stdout: "null", stderr: "null" }).output();
    return r.code === 0;
  } catch {
    return false;
  }
}
const eq = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

const files = walk(corpus).sort();
let agree = 0, differ = 0, refused = 0, next = 0;
async function worker() {
  while (next < files.length) {
    const n = next++;
    const a = `${outDir}/w-${n}.wasm`, b = `${outDir}/r-${n}.wasm`;
    const [okA, okB] = await Promise.all([assemble(ours, files[n], a), assemble(theirs, files[n], b)]);
    if (!okA || !okB) { refused++; continue; }
    if (eq(Deno.readFileSync(a), Deno.readFileSync(b))) agree++; else differ++;
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`corpus ${files.length} .wat: pins agree ${agree}, differ ${differ}, refused by one side ${refused}`);
