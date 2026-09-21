// Workspace letter H13 — wazmrt's module BODIES vs wasm-tools', custom sections stripped.
//
// The workspace measured it across seven assemblers (../tools/assembler-parity/measure.ts). This is
// the wazmrt-only form of the same check, runnable from this repo and writing nothing outside the
// output dir it is given. For every .wat under the corpus it classifies the pair as:
//   same      bodies identical
//   locals    identical once wazmrt's local declarations are regrouped into runs (I12)
//   other     still different — export order (I13), type interning order (I14), or new
//   refused   one of the two would not assemble it
//
//   deno run -A body-parity.ts <wazmrt.exe> <corpus dir> <out dir> [--list]
//
// Baseline in the letter (2026-09-20): bodies differ on 464/528, 460 fixed by regrouping alone.
// Expect 0 differ once I12-I14 are fixed; invert by breaking one fix and watching a class reappear.

const [exe, corpus, outDir] = Deno.args;
const list = Deno.args.includes("--list");
if (!exe || !corpus || !outDir) {
  console.error("usage: body-parity.ts <wazmrt.exe> <corpus dir> <out dir> [--list]");
  Deno.exit(2);
}
await Deno.mkdir(outDir, { recursive: true });

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of Deno.readDirSync(dir)) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory && e.name !== "node_modules") walk(p, acc);
    else if (e.isFile && e.name.endsWith(".wat")) acc.push(p);
  }
  return acc;
}

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
function leb(n: number): number[] {
  const out: number[] = [];
  do {
    let c = n & 0x7f;
    n >>>= 7;
    if (n !== 0) c |= 0x80;
    out.push(c);
  } while (n !== 0);
  return out;
}
function cat(parts: (Uint8Array | number[])[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p instanceof Uint8Array ? p : Uint8Array.from(p), o);
    o += p.length;
  }
  return out;
}
// A value type can be multi-byte: (ref null ht) / (ref ht) carry an s33 heap type.
function valTypeEnd(b: Uint8Array, at: number): number {
  const t = b[at];
  if (t === 0x63 || t === 0x64) {
    let i = at + 1;
    while (b[i++] & 0x80) { /* LEB continuation */ }
    return i;
  }
  return at + 1;
}

/** Drop custom sections; optionally regroup every body's locals into maximal runs. */
function body(b: Uint8Array, regroup: boolean): Uint8Array {
  const parts: (Uint8Array | number[])[] = [b.subarray(0, 8)];
  let i = 8;
  while (i < b.length) {
    const id = b[i];
    const [size, p] = readLeb(b, i + 1);
    const end = p + size;
    if (id === 0) {
      i = end;
      continue;
    }
    if (id !== 10 || !regroup) {
      parts.push(b.subarray(i, end));
      i = end;
      continue;
    }
    const [count, q] = readLeb(b, p);
    let j = q;
    const bodies: Uint8Array[] = [];
    for (let k = 0; k < count; k++) {
      const [bsize, r] = readLeb(b, j);
      const fb = b.subarray(r, r + bsize);
      let [n, x] = readLeb(fb, 0);
      const runs: { count: number; type: Uint8Array }[] = [];
      for (let e = 0; e < n; e++) {
        const [c, y] = readLeb(fb, x);
        const tEnd = valTypeEnd(fb, y);
        const type = fb.subarray(y, tEnd);
        x = tEnd;
        const last = runs[runs.length - 1];
        if (last && last.type.length === type.length && last.type.every((v, z) => v === type[z])) last.count += c;
        else runs.push({ count: c, type });
      }
      const enc: (Uint8Array | number[])[] = [leb(runs.length)];
      for (const run of runs) enc.push(leb(run.count), run.type);
      const nb = cat([...enc, fb.subarray(x)]);
      bodies.push(cat([leb(nb.length), nb]));
      j = r + bsize;
    }
    const payload = cat([leb(count), ...bodies]);
    parts.push([10, ...leb(payload.length)], payload);
    i = end;
  }
  return cat(parts);
}
const eq = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

async function assemble(argv: string[]): Promise<boolean> {
  try {
    const r = await new Deno.Command(argv[0], { args: argv.slice(1), stdout: "null", stderr: "null" }).output();
    return r.code === 0;
  } catch {
    return false;
  }
}

const files = walk(corpus).sort();
const tally = { same: 0, locals: 0, other: 0, refused: 0 };
const others: string[] = [];
let localBytesOurs = 0, localBytesTheirs = 0;

let next = 0;
async function worker() {
  while (next < files.length) {
    const n = next++;
    const f = files[n];
    const ours = `${outDir}/z-${n}.wasm`, theirs = `${outDir}/t-${n}.wasm`;
    const [okA, okB] = await Promise.all([
      assemble([exe, "wat", f, "-o", ours]),
      assemble(["wasm-tools", "parse", f, "-o", theirs]),
    ]);
    if (!okA || !okB) {
      tally.refused++;
      continue;
    }
    const a = Deno.readFileSync(ours), b = Deno.readFileSync(theirs);
    const tb = body(b, false);
    const ab = body(a, false);
    localBytesOurs += ab.length;
    localBytesTheirs += tb.length;
    if (eq(ab, tb)) tally.same++;
    else if (eq(body(a, true), tb)) tally.locals++;
    else {
      tally.other++;
      others.push(f.slice(corpus.length + 1));
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

const both = files.length - tally.refused;
console.log(`corpus: ${files.length} .wat, both assembled: ${both}`);
console.log(`  same bodies:                 ${tally.same}`);
console.log(`  differ, fixed by regrouping: ${tally.locals}`);
console.log(`  differ, other cause:         ${tally.other}`);
console.log(`  refused by one side:         ${tally.refused}`);
console.log(`  body bytes wazmrt/wasm-tools: ${localBytesOurs}/${localBytesTheirs} (${((localBytesOurs / localBytesTheirs - 1) * 100).toFixed(2)} %)`);
if (list || tally.other <= 20) for (const o of others.sort()) console.log(`    other: ${o}`);
