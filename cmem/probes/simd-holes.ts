// Letter H8 / I5 follow-up: the 20 UNASSIGNED `0xFD` sub-opcodes the sweep found wazmrt decoding.
// Given two v128 operands and a drop, does each one VALIDATE (a malformed module accepted), and
// does it RUN? wasm-tools refuses every one ("unknown 0xfd subopcode").
//
//   deno run -A simd-holes.ts <wazmrt.exe> <out dir>

const [exe, outDir] = Deno.args;
await Deno.mkdir(outDir, { recursive: true });

const holes = [0x9a, 0xa2, 0xa5, 0xa6, 0xaf, 0xb0, 0xb2, 0xb3, 0xb4, 0xbb, 0xc2, 0xc5, 0xc6, 0xcf, 0xd0, 0xd2, 0xd3, 0xd4, 0xe2, 0xee];

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
const v128zero = [0xfd, 0x0c, ...new Array(16).fill(0)];
function moduleFor(sub: number, operands: number): Uint8Array {
  // (func (export "f") <v128.const 0> × operands, 0xFD sub, drop)
  const body = [0x00, ...Array(operands).fill(v128zero).flat(), 0xfd, ...leb(sub), 0x1a, 0x0b];
  const code = [0x01, ...leb(body.length), ...body];
  return Uint8Array.from([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
    0x03, 0x02, 0x01, 0x00,
    0x07, 0x05, 0x01, 0x01, 0x66, 0x00, 0x00, // export "f" = func 0
    0x0a, ...leb(code.length), ...code,
  ]);
}

async function run(args: string[]) {
  const r = await new Deno.Command(exe, { args, stdout: "piped", stderr: "piped" }).output();
  return { code: r.code, text: (new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr)).replace(/\s+/g, " ").trim() };
}

console.log("sub   | validates with 1 / 2 / 3 v128 operands | runs (`f`)");
for (const sub of holes) {
  const verdicts: string[] = [];
  let runnable: string | null = null;
  for (const n of [1, 2, 3]) {
    const f = `${outDir}/hole-${sub.toString(16)}-${n}.wasm`;
    await Deno.writeFile(f, moduleFor(sub, n));
    const v = await run([f]);
    const ok = v.code === 0;
    verdicts.push(ok ? "VALID" : (v.text.match(/FAILED[^:]*: (\w+)/)?.[1] ?? `rc${v.code}`));
    if (ok && runnable === null) {
      const r = await run([f, "f"]);
      runnable = r.code === 0 ? "RAN" : r.text.slice(-60);
    }
  }
  console.log(`0x${sub.toString(16)}  | ${verdicts.join(" / ").padEnd(40)} | ${runnable ?? "-"}`);
}
