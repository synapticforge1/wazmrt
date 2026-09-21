// The 44 opcodes only wasm-tools knows (letter H8 / I5) belong to three proposals. Do the canonical
// tools IMPLEMENT them — wasm-tools validates, wasmtime compiles and RUNS — by default, or only
// behind a flag? One small valid module per proposal.
//
//   deno run -A three-proposals.ts <out dir>

const [outDir] = Deno.args;
await Deno.mkdir(outDir, { recursive: true });

const cases: Array<{ name: string; wat: string; wasmtimeFlags: string[] }> = [
  {
    name: "stack-switching (cont.new)",
    wat: `(module
  (type $f (func))
  (type $c (cont $f))
  (func $g)
  (elem declare func $g)
  (func (export "f") (drop (cont.new $c (ref.func $g)))))`,
    wasmtimeFlags: ["-W", "stack-switching=y,function-references=y,exceptions=y"],
  },
  {
    name: "memory-control (memory.discard)",
    wat: `(module (memory 1) (func (export "f") (memory.discard (i32.const 0) (i32.const 0))))`,
    wasmtimeFlags: [], // wasmtime has no -W switch for it (measured: `wasmtime run -W help`)
  },
  {
    name: "shared-everything-threads (global.atomic.get)",
    wat: `(module (global $g (mut i32) (i32.const 0)) (func (export "f") (result i32) (global.atomic.get seq_cst $g)))`,
    wasmtimeFlags: ["-W", "shared-everything-threads=y,threads=y"],
  },
];

async function run(cmd: string, args: string[]) {
  const r = await new Deno.Command(cmd, { args, stdout: "piped", stderr: "piped" }).output();
  const text = (new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr)).replace(/\s+/g, " ").trim();
  return r.code === 0 ? "✅ ok" : `❌ ${text.replace(/^.*?(error|Error)[: ]*/, "").slice(0, 110)}`;
}

for (const [i, c] of cases.entries()) {
  const wat = `${outDir}/p${i}.wat`, wasm = `${outDir}/p${i}.wasm`;
  await Deno.writeTextFile(wat, c.wat + "\n");
  console.log(`\n== ${c.name}`);
  const parsed = await run("wasm-tools", ["parse", wat, "-o", wasm]);
  console.log(`   wasm-tools parse                 ${parsed}`);
  if (!parsed.startsWith("✅")) continue;
  console.log(`   wasm-tools validate (default)    ${await run("wasm-tools", ["validate", wasm])}`);
  console.log(`   wasm-tools validate --features=all ${await run("wasm-tools", ["validate", "--features=all", wasm])}`);
  console.log(`   wasmtime run (default)           ${await run("wasmtime", ["run", "--invoke", "f", wasm])}`);
  if (c.wasmtimeFlags.length) {
    console.log(`   wasmtime run ${c.wasmtimeFlags.join(" ").padEnd(19)} ${await run("wasmtime", ["run", ...c.wasmtimeFlags, "--invoke", "f", wasm])}`);
  }
}
