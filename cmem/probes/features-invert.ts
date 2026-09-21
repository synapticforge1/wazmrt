// INVERSION for the 2026-09-21 feature work (every wasm-tools name, matched semantics): undo each
// piece in turn; `zig build test` must FAIL every time. A piece whose removal nothing detects is
// unguarded — the extended_const lesson.
//
// Builds FIRST — a sabotage that does not compile is "no verdict", never "unguarded". Each edit
// must match EXACTLY once. Every touched file is restored in `finally` and re-checked byte for byte.
//
//   deno run -A features-invert.ts <repo root>

const [root] = Deno.args;
type Inv = { name: string; file: string; from: string; to: string };

const inversions: Inv[] = [
  { name: "mutable-global: export check removed", file: "src/features.zig", from: "for (module.exports) |ex| if (ex.type == .global and ex.type.global.mutable) {", to: "for (module.exports) |ex| if (false and ex.type == .global) {" },
  { name: "floats: no plain opcode is a float", file: "src/features.zig", from: "    return float_bits.isSet(@intFromEnum(op));", to: "    return float_bits.isSet(@intFromEnum(op)) and false;" },
  { name: "floats: f32x4.add (0xe4) dropped from the SIMD list", file: "src/features.zig", from: "0xe0, 0xe1, 0xe3, 0xe4, 0xe5,", to: "0xe0, 0xe1, 0xe3, 0xe5," },
  { name: "bulk-memory-opt: memory.copy/fill back under bulk_memory", file: "src/features.zig", from: "        .memory_copy, .memory_fill => .bulk_memory_opt,", to: "        .memory_copy, .memory_fill => .bulk_memory," },
  { name: "call-indirect-overlong: decoder never records it", file: "src/opcode.zig", from: ".table_overlong = r.pos - at > minimal", to: ".table_overlong = r.pos - at > minimal + 99" },
  { name: "gc-types: externref no longer needs it", file: "src/features.zig", from: "        .externref => {\n            req.add(.reference_types);\n            req.add(.gc_types);\n        },", to: "        .externref => req.add(.reference_types)," },
  { name: "legacy-exceptions: legacy ops need only exceptions", file: "src/features.zig", from: "        .try_, .catch_, .catch_all, .rethrow, .delegate => req.add(.legacy_exceptions),\n", to: "" },
  { name: "typed refs: reference-types not required", file: "src/features.zig", from: "    if (vt.isConcrete()) {\n        req.add(.reference_types);\n", to: "    if (vt.isConcrete()) {\n" },
  { name: "HOLE 1 back: a funcref table judged as a value type", file: "src/features.zig", from: "for (module.tables) |t| if (t.element != .funcref) {", to: "for (module.tables) |t| if (true) {" },
  { name: "HOLE 2 back: locals not walked", file: "src/features.zig", from: "        for (code.locals) |l| requireValType(fs, l.type, &found) catch return found;\n", to: "" },
  { name: "leak back: freeBody forgets try_table", file: "src/opcode.zig", from: "        .try_table => |tt| a.free(tt.catches),\n", to: "" },
  // Letter H8 / I5 (same day): the decoder refusing the twenty unassigned 0xFD gaps.
  { name: "SIMD gaps back: decoder ignores unassigned_simd_subs", file: "src/opcode.zig", from: "if (sub > max_simd_sub or std.mem.indexOfScalar(u32, &unassigned_simd_subs, sub) != null)", to: "if (sub > max_simd_sub or (false and std.mem.indexOfScalar(u32, &unassigned_simd_subs, sub) != null))" },
];

async function run(cmd: string, args: string[]) {
  const r = await new Deno.Command(cmd, { args, cwd: root, stdout: "piped", stderr: "piped" }).output();
  return { code: r.code, out: new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr) };
}

const originals = new Map<string, string>();
for (const inv of inversions) if (!originals.has(inv.file)) originals.set(inv.file, await Deno.readTextFile(`${root}/${inv.file}`));

let unguarded = 0;
try {
  for (const inv of inversions) {
    const orig = originals.get(inv.file)!;
    const hits = orig.split(inv.from).length - 1;
    if (hits !== 1) throw new Error(`${inv.name}: anchor matched ${hits} times in ${inv.file}, expected 1`);
    await Deno.writeTextFile(`${root}/${inv.file}`, orig.replace(inv.from, inv.to));
    const build = await run("zig", ["build"]);
    if (build.code !== 0) {
      console.log(`⚠️  ${inv.name}: SABOTAGE DID NOT COMPILE — no verdict\n    ${build.out.split("\n").find((l) => l.includes("error:"))}`);
      unguarded++;
    } else {
      const test = await run("zig", ["build", "test"]);
      const caught = test.code !== 0;
      if (!caught) unguarded++;
      console.log(`${caught ? "✅" : "❌"} ${inv.name}: ${caught ? "tests FAIL" : "tests still PASS — UNGUARDED"}`);
    }
    await Deno.writeTextFile(`${root}/${inv.file}`, orig);
  }
} finally {
  for (const [f, text] of originals) await Deno.writeTextFile(`${root}/${f}`, text);
}
for (const [f, text] of originals) {
  const now = await Deno.readTextFile(`${root}/${f}`);
  console.log(`${f} restored byte-for-byte: ${now === text ? "yes" : "NO — INVESTIGATE"}`);
}
console.log(unguarded === 0 ? "\nALL GUARDED" : `\n${unguarded} piece(s) without a verdict or unguarded`);
