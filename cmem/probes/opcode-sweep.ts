// Workspace letter H8 / divergence I5 — do the opcode TABLES of wasm-tools (reference), wazmrt,
// wasmrt and binaryang contain the same opcodes?
//
// Method: one tiny module per candidate opcode — the opcode alone in a function body, followed by
// `end`. A decoder recognises (or rejects) an opcode BEFORE it reads any immediate, so one input
// per candidate is enough: "unknown opcode" means the opcode is not in that tool's table, and any
// OTHER outcome — valid, a truncated immediate, a type error — means it is. Each tool's
// unknown-opcode message is CALIBRATED first, on opcodes no proposal assigns, and printed so the
// classification can be checked by eye.
//
//   deno run -A opcode-sweep.ts <out dir> <wazmrt.exe> <wasmrt.exe> <binaryang dir> [--calibrate]
//
// Behavioural only: the siblings' BUILT tools are run; nothing is written to their trees.

const [outDir, wazmrt, wasmrt, binaryang] = Deno.args;
const calibrateOnly = Deno.args.includes("--calibrate");
await Deno.mkdir(outDir, { recursive: true });

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
function section(id: number, payload: number[]): number[] {
  return [id, ...leb(payload.length), ...payload];
}
/** A module with a type, a table, a memory, a global, a tag and one function whose body is `code`. */
function moduleWith(code: number[]): Uint8Array {
  // ⚠️ PADDED with zero bytes before `end`. The first sweep put `end` (0x0b) straight after the
  // opcode, so an opcode WITH an immediate read `end` as it: a lane op read lane 11, and wasmrt
  // reports an out-of-range lane as "unsupported instruction opcode" — which scored wasmrt as
  // lacking eleven SIMD lane ops it runs correctly (verified with a complete module). Zeros are
  // valid immediates for nearly every shape (index 0, lane 0, memarg 0 0, 16 zero v128 bytes), and
  // an UNKNOWN opcode is still rejected before any immediate is read.
  const body = [0x00, ...code, ...new Array(20).fill(0x00), 0x0b];
  return Uint8Array.from([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...section(1, [0x01, 0x60, 0x00, 0x00]), // type 0: () -> ()
    ...section(3, [0x01, 0x00]), // func 0: type 0
    ...section(4, [0x01, 0x70, 0x00, 0x01]), // table 0: funcref, min 1
    ...section(5, [0x01, 0x00, 0x01]), // memory 0: min 1
    ...section(13, [0x01, 0x00, 0x00]), // tag 0: type 0
    ...section(6, [0x01, 0x7f, 0x01, 0x41, 0x00, 0x0b]), // global 0: mut i32 = 0
    ...section(10, [0x01, ...leb(body.length), ...body]),
  ]);
}

type Tool = { name: string; run: (files: string[]) => Promise<Map<string, string>> };
async function exec(cmd: string, args: string[], cwd?: string) {
  const r = await new Deno.Command(cmd, { args, cwd, stdout: "piped", stderr: "piped" }).output();
  return { code: r.code, text: (new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr)).trim() };
}
const perFile = (cmd: (f: string) => [string, string[], string?]): Tool["run"] => async (files) => {
  const out = new Map<string, string>();
  let next = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < files.length) {
      const f = files[next++];
      const [c, a, cwd] = cmd(f);
      const r = await exec(c, a, cwd);
      // The WHOLE text, newlines folded, NEVER truncated here: the reason is often on a later line
      // ("Caused by: …"), and wazmrt prints its section summary BEFORE its verdict — the first
      // sweep truncated to 400 characters and scored wazmrt as knowing every opcode, because
      // `IllegalOpcode` was past the cut. Truncate only for display.
      out.set(f, `${r.code === 0 ? "OK" : `rc${r.code}`} ${r.text.replace(/\s+/g, " ")}`);
    }
  }));
  return out;
};
const tools: Tool[] = [
  { name: "wasm-tools", run: perFile((f) => ["wasm-tools", ["validate", "--features=all", f]]) },
  { name: "wazmrt", run: perFile((f) => [wazmrt, [f]]) },
  { name: "wasmrt", run: perFile((f) => [wasmrt, [f]]) },
  // `--enable-all`: binaryang's validator ships with exceptions (and others) OFF — calibration
  // first saw it refuse even `nop` with "tag not allowed".
  { name: "binaryang", run: perFile((f) => ["deno", ["run", "--no-lock", "-A", "main.ts", "wasm-validate", "--enable-all", f], binaryang]) },
];

// --- calibration: opcodes NO proposal assigns, and one every tool knows --------------------
const calib: Array<[string, number[]]> = [
  ["unassigned single byte 0xff", [0xff]],
  ["unassigned 0xfc sub 0x7f", [0xfc, 0x7f]],
  ["unassigned 0xfd sub 0x7ff", [0xfd, ...leb(0x7ff)]],
  ["known: nop (control)", [0x01]],
  ["known: i32.const, immediate MISSING (control)", [0x41]],
];
console.log("== calibration");
const calFiles: string[] = [];
for (const [i, [, code]] of calib.entries()) {
  const f = `${outDir}/cal-${i}.wasm`;
  await Deno.writeFile(f, moduleWith(code));
  calFiles.push(f);
}
for (const t of tools) {
  const res = await t.run(calFiles);
  console.log(`-- ${t.name}`);
  calib.forEach(([what], i) => {
    const t = res.get(calFiles[i])!;
    // Show the head AND the tail: the verdict can be at either end.
    console.log(`   ${what.padEnd(46)} ${t.length > 260 ? t.slice(0, 120) + " … " + t.slice(-120) : t}`);
  });
}
if (calibrateOnly) Deno.exit(0);

// "Not in this tool's table", per tool — the calibrated messages above, 2026-09-21. Any other
// outcome (OK, a truncated immediate, a type error) means the opcode IS in the table.
const unknown: Record<string, RegExp> = {
  "wasm-tools": /illegal opcode|unknown 0x[0-9a-f]+ subopcode/i,
  wazmrt: /IllegalOpcode|UnsupportedOpcode/,
  wasmrt: /unsupported instruction opcode/i,
  binaryang: /unknown (misc |simd |atomic |gc |threads )?opcode/i,
};

// --- the sweep ------------------------------------------------------------------------------
// Every single byte except the four prefixes, then each prefix's sub-opcode range with a margin
// past its highest assigned member (so a tool accepting an UNASSIGNED sub-opcode shows up too).
const candidates: Array<[string, number[]]> = [];
for (let b = 0; b <= 0xff; b++) {
  if ([0xfb, 0xfc, 0xfd, 0xfe].includes(b)) continue;
  candidates.push([`0x${b.toString(16).padStart(2, "0")}`, [b]]);
}
// ⚠️ WIDENED 2026-09-21: the first ranges stopped the atomic prefix at 0xfe 0x4f — exactly where
// wasm-tools' `global.atomic.get` sits — so the count of opcodes "only wasm-tools knows" could not
// see anything past the margin. Each range now runs well past its highest known member.
const ranges: Array<[number, number]> = [[0xfb, 0x100], [0xfc, 0x80], [0xfd, 0x180], [0xfe, 0x100]];
for (const [p, n] of ranges) {
  for (let s = 0; s < n; s++) candidates.push([`0x${p.toString(16)} ${s.toString(16)}`, [p, ...leb(s)]]);
}
const files: string[] = [];
for (const [i, [, code]] of candidates.entries()) {
  const f = `${outDir}/op-${i}.wasm`;
  await Deno.writeFile(f, moduleWith(code));
  files.push(f);
}
console.log(`\n== sweep: ${candidates.length} candidate opcodes × ${tools.length} tools`);
const member: Record<string, boolean[]> = {};
for (const t of tools) {
  const res = await t.run(files);
  member[t.name] = files.map((f) => !unknown[t.name].test(res.get(f)!));
  console.log(`${t.name.padEnd(11)} knows ${member[t.name].filter(Boolean).length}`);
}

// Report only disagreements with the reference.
console.log(`\n== opcodes where a tool disagrees with wasm-tools  (✅ in the table · — not)`);
console.log(`${"opcode".padEnd(12)}${tools.map((t) => t.name.padStart(12)).join("")}`);
let rows = 0;
for (let i = 0; i < candidates.length; i++) {
  const ref = member["wasm-tools"][i];
  if (tools.every((t) => member[t.name][i] === ref)) continue;
  rows++;
  console.log(`${candidates[i][0].padEnd(12)}${tools.map((t) => (member[t.name][i] ? "✅" : "—").padStart(11)).join(" ")}`);
}
console.log(rows === 0 ? "(none — all four tables agree on membership)" : `${rows} disagreeing opcode(s)`);
