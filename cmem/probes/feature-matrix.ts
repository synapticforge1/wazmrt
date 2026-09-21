// What does each wasm-tools `--features` name actually admit? MEASURED from wasm-tools, not recalled
// from the spec (owner, 2026-09-21: support every wat/wasm name wasm-tools accepts, by default).
//
// One minimal module per feature. Each is validated with `wasm-tools validate --features <X>` for:
//   - the presets (mvp, wasm1, wasm2, wasm3, lime1) → which features each preset CONTAINS;
//   - `-all,<one name>` for every name → which single name is SUFFICIENT for which module, which
//     exposes implications (e.g. does `bulk-memory` alone admit `memory.copy`?).
// Pass a runtime exe to run the same matrix against it (it must speak `--features <list> <file>`).
//
//   deno run -A feature-matrix.ts <out dir> [runtime exe]

const [outDir, runtime] = Deno.args;
await Deno.mkdir(outDir, { recursive: true });

const probes: Record<string, string> = {
  "mutable-global": `(module (global (export "g") (mut i32) (i32.const 0)))`,
  "floats": `(module (func (result f32) f32.const 0))`,
  "sign-extension": `(module (func (result i32) i32.const 0 i32.extend8_s))`,
  "saturating-float-to-int": `(module (func (result i32) f32.const 0 i32.trunc_sat_f32_s))`,
  "multi-value": `(module (func (result i32 i32) i32.const 0 i32.const 0))`,
  "reference-types": `(module (func (result externref) ref.null extern))`,
  "bulk-memory": `(module (memory 1) (data "x") (func i32.const 0 i32.const 0 i32.const 0 memory.init 0))`,
  "bulk-memory-opt": `(module (memory 1) (func i32.const 0 i32.const 0 i32.const 0 memory.copy))`,
  "simd": `(module (func (result v128) v128.const i64x2 0 0))`,
  "relaxed-simd": `(module (func (result v128) v128.const i64x2 0 0 v128.const i64x2 0 0 v128.const i64x2 0 0 f32x4.relaxed_madd))`,
  "threads": `(module (memory 1 1 shared) (func (result i32) i32.const 0 i32.atomic.load))`,
  "tail-call": `(module (func return_call 0))`,
  "multi-memory": `(module (memory 1) (memory 1))`,
  "exceptions": `(module (tag) (func throw 0))`,
  "legacy-exceptions": `(module (tag) (func try catch 0 end))`,
  "memory64": `(module (memory i64 1))`,
  "extended-const": `(module (global i32 (i32.add (i32.const 1) (i32.const 2))))`,
  "function-references": `(module (type $t (func)) (func (param (ref $t))))`,
  "gc": `(module (type $s (struct)) (func (result (ref $s)) struct.new $s))`,
  "gc-types": `(module (type $s (struct)))`,
  "custom-page-sizes": `(module (memory 1 (pagesize 1)))`,
  "wide-arithmetic": `(module (func (result i64 i64) i64.const 0 i64.const 0 i64.const 0 i64.const 0 i64.add128))`,
};
// Binary only: text cannot write an overlong LEB. `call_indirect type 0, table 0` with the table
// index encoded as `80 00` instead of `00` (both decode to 0).
const hex = (s: string) => Uint8Array.from(s.trim().split(/\s+/).map((h) => parseInt(h, 16)));
const binaries: Record<string, Uint8Array> = {
  "call-indirect-overlong": hex(
    "00 61 73 6d 01 00 00 00  01 04 01 60 00 00  03 02 01 00  04 04 01 70 00 01" +
      "  0a 0a 01 08 00 41 00 11 00 80 00 0b",
  ),
  "call-indirect-normal (control)": hex(
    "00 61 73 6d 01 00 00 00  01 04 01 60 00 00  03 02 01 00  04 04 01 70 00 01" +
      "  0a 09 01 07 00 41 00 11 00 00 0b",
  ),
};

const files: Array<[string, string]> = [];
for (const [n, src] of Object.entries(probes)) {
  const f = `${outDir}/${n}.wat`;
  await Deno.writeTextFile(f, src + "\n");
  files.push([n, f]);
}
for (const [n, bytes] of Object.entries(binaries)) {
  const f = `${outDir}/${n.split(" ")[0]}${n.includes("control") ? "-control" : ""}.wasm`;
  await Deno.writeFile(f, bytes);
  files.push([n, f]);
}

async function ok(features: string, file: string): Promise<boolean> {
  const r = runtime
    ? await new Deno.Command(runtime, { args: ["--features", features, file], stdout: "null", stderr: "null" }).output()
    // ⚠️ `--features=<list>` as ONE argument: clap reads a separate leading `-all` as an unknown
    // FLAG and exits 2, which the first run of this probe scored as "the module was refused".
    : await new Deno.Command("wasm-tools", { args: ["validate", `--features=${features}`, file], stdout: "null", stderr: "null" }).output();
  return r.code === 0;
}

const presets = ["all", "mvp", "wasm1", "wasm2", "wasm3", "lime1"];
console.log(`subject: ${runtime ?? "wasm-tools 'validate'"}`);
console.log(`\n== presets: ✅ = the preset admits the module\n${"module".padEnd(32)}${presets.map((p) => p.padStart(7)).join("")}`);
for (const [n, f] of files) {
  const row = [];
  for (const p of presets) row.push((await ok(p, f)) ? "✅" : "·");
  console.log(`${n.padEnd(32)}${row.map((c) => c.padStart(6)).join(" ")}`);
}

// MEMBERSHIP, exactly: name N is IN preset P iff P admits N's module and `P,-N` does not.
// (The admit table above cannot say this: a preset can admit a module through a different name.)
console.log(`\n== membership: names each preset CONTAINS (P admits N's module, P,-N refuses it)`);
for (const p of presets.slice(1)) {
  const members: string[] = [];
  for (const [n, f] of files) {
    if (!(n in probes) && n !== "call-indirect-overlong") continue;
    if ((await ok(p, f)) && !(await ok(`${p},-${n}`, f))) members.push(n);
  }
  // gc-types has no module of its own that needs nothing else; externref (the reference-types
  // module) needs reference-types AND gc-types, so probe gc-types through it.
  const ext = files.find(([n]) => n === "reference-types")![1];
  if ((await ok(p, ext)) && !(await ok(`${p},-gc-types`, ext))) members.push("gc-types(via externref)");
  console.log(`${p.padEnd(6)} ${members.join(", ")}`);
}

// Which REFERENCE TYPES need gc-types? One module per type as a function result.
console.log(`\n== gc-types: which reference types need it (all,-gc-types refuses)`);
const refTypes = ["funcref", "externref", "anyref", "eqref", "i31ref", "structref", "arrayref", "exnref", "nullref", "nullexternref", "nullfuncref", "(ref func)", "(ref extern)", "(ref any)"];
const needGcTypes: string[] = [], fine: string[] = [];
for (const t of refTypes) {
  const f = `${outDir}/ref-${refTypes.indexOf(t)}.wat`;
  await Deno.writeTextFile(f, `(module (func (param ${t})))\n`);
  if (!(await ok("all", f))) continue;
  ((await ok("all,-gc-types", f)) ? fine : needGcTypes).push(t);
}
console.log(`needs gc-types: ${needGcTypes.join(", ")}\nfine without:   ${fine.join(", ")}`);

// Overlaps: a name turned off while a name that IMPLIES it stays on.
console.log(`\n== overlaps`);
const copy = files.find(([n]) => n === "bulk-memory-opt")![1];
console.log(`memory.copy under all,-bulk-memory-opt (bulk-memory still on): ${(await ok("all,-bulk-memory-opt", copy)) ? "admitted" : "REFUSED"}`);
const overlong = files.find(([n]) => n === "call-indirect-overlong")![1];
console.log(`overlong call_indirect under all,-call-indirect-overlong (reference-types on): ${(await ok("all,-call-indirect-overlong", overlong)) ? "admitted" : "REFUSED"}`);
const simdF = `${outDir}/simd-float.wat`;
await Deno.writeTextFile(simdF, `(module (func (result v128) v128.const i64x2 0 0 v128.const i64x2 0 0 f32x4.add))\n`);
const simdI = `${outDir}/simd-int.wat`;
await Deno.writeTextFile(simdI, `(module (func (result v128) v128.const i64x2 0 0 v128.const i64x2 0 0 i32x4.add))\n`);
console.log(`f32x4.add under all,-floats: ${(await ok("all,-floats", simdF)) ? "admitted" : "REFUSED"} · i32x4.add under all,-floats: ${(await ok("all,-floats", simdI)) ? "admitted" : "REFUSED"}`);
const legacyTry = files.find(([n]) => n === "legacy-exceptions")![1];
console.log(`legacy try under all,-exceptions (legacy-exceptions on): ${(await ok("all,-exceptions", legacyTry)) ? "admitted" : "REFUSED"}`);

// Per-instruction float gating inside SIMD, and wide-arithmetic without a multi-value SIGNATURE.
console.log(`\n== per-instruction checks (all,-<name>)`);
for (const [what, src, spec] of [
  ["f32x4.splat", `(module (func (result v128) f32.const 0 f32x4.splat))`, "all,-floats"],
  ["f32x4.relaxed_madd", `(module (func (result v128) v128.const i64x2 0 0 v128.const i64x2 0 0 v128.const i64x2 0 0 f32x4.relaxed_madd))`, "all,-floats"],
  ["i32x4.relaxed_trunc_f32x4_s", `(module (func (result v128) v128.const i64x2 0 0 i32x4.relaxed_trunc_f32x4_s))`, "all,-floats"],
  ["f64x2.relaxed_min", `(module (func (result v128) v128.const i64x2 0 0 v128.const i64x2 0 0 f64x2.relaxed_min))`, "all,-floats"],
  ["i64.add128, results dropped", `(module (func i64.const 0 i64.const 0 i64.const 0 i64.const 0 i64.add128 drop drop))`, "all,-multi-value"],
  ["(table 1 funcref) — WebAssembly 1.0", `(module (table 1 funcref))`, "mvp"],
  ["(table 1 externref)", `(module (table 1 externref))`, "all,-gc-types"],
] as const) {
  const f = `${outDir}/check-${what.replace(/[^a-z0-9]+/gi, "_")}.wat`;
  await Deno.writeTextFile(f, src + "\n");
  console.log(`${what.padEnd(40)} under ${spec.padEnd(18)}: ${(await ok(spec, f)) ? "admitted" : "REFUSED"}`);
}

// GROUP NAMES: does DISABLING the parent name also clear the bit it switches on? Decides whether a
// name maps to one bit or to a set of bits, in both directions.
console.log(`\n== group names, disabling the parent`);
const fref = files.find(([n]) => n === "function-references")![1];
for (const [spec, f, what] of [
  ["all,-bulk-memory", copy, "memory.copy"],
  ["all,-reference-types", overlong, "overlong call_indirect"],
  ["all,-gc", fref, "(param (ref $t))"],
  // gc stays ON here: admitted means the check is "function-references OR gc";
  // refused means the `gc` NAME switches function-references on, and the check is that bit alone.
  ["all,-function-references", fref, "(param (ref $t)), gc on"],
] as const) {
  console.log(`${what.padEnd(24)} under ${spec.padEnd(22)}: ${(await ok(spec, f)) ? "admitted" : "REFUSED"}`);
}

console.log(`\n== sufficiency: which SINGLE name admits the module (-all,<name>)`);
const names = Object.keys(probes).concat(["call-indirect-overlong"]);
for (const [n, f] of files) {
  const enough: string[] = [];
  for (const name of names) if (await ok(`-all,${name}`, f)) enough.push(name);
  const none = await ok("-all", f);
  let verdict = none ? "(admitted with EVERYTHING off)" : enough.join(", ");
  if (!none && enough.length === 0) {
    // No single name: find every minimal PAIR — those are the dependency rules to copy.
    const pairs: string[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (await ok(`-all,${names[i]},${names[j]}`, f)) pairs.push(`${names[i]}+${names[j]}`);
      }
    }
    verdict = pairs.length ? `pairs: ${pairs.join(" | ")}` : "(no pair suffices either)";
  }
  console.log(`${n.padEnd(32)} ${verdict}`);
}
