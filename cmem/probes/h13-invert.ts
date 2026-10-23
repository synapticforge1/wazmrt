// Workspace letter H13 — INVERSION: undo each of the three fixes in turn and prove that BOTH the
// unit test and the corpus measurement notice. A fix whose removal nothing detects is unguarded.
//
//   bun h13-invert.ts <repo root> <corpus dir> <out dir>
//
// Every sabotage must match EXACTLY ONCE (working-rules.md → TOOLING). The original `src/wat.zig` is
// restored in `finally` and re-checked byte for byte at the end, so an aborted run cannot leave a
// sabotaged tree behind.

import { readFile, writeFile } from "node:fs/promises";
import { output } from "./run.ts";

const [root, corpus, outDir] = process.argv.slice(2);
const file = `${root}/src/wat.zig`;
const original = await readFile(file, "utf8");

type Edit = [from: string, to: string];
const inversions: Array<{ name: string; edits: Edit[]; expect: string }> = [
  {
    name: "I12 — one group per local",
    // ⚠️ Each sabotage must still COMPILE, or "the test did not fail" means nothing: Zig rejects
    // `_ = t;` for a used `t` and an unused loop capture, and the first draft of this inversion
    // reported "unguarded" for a tree that never built. These keep every name in use and make
    // the grouping condition false at RUNTIME (`j` starts at i+1, so it is never 0).
    edits: [
      ["if (i == 0 or !std.mem.eql(u8, typeAt(lt, le, i), typeAt(lt, le, i - 1))) runs += 1;", "if (i < le.len) runs += 1;"],
      ["while (j < le.len and std.mem.eql(u8, typeAt(lt, le, j), t)) j += 1;", "while (j < le.len and j == 0 and t.len != 0) j += 1;"],
    ],
    expect: "corpus: ~460 back in 'fixed by regrouping'",
  },
  {
    name: "I13 — deferred exports moved to the end",
    edits: [
      [
        "try pending_exports.append(a, .{ .slot = exports.items.len, .items = items });\n            try exports.append(a, undefined);",
        "try pending_exports.append(a, .{ .slot = 0, .items = items });",
      ],
      ["exports.items[pe.slot] = .{ .name = name, .kind = kind, .index = idx };", "try exports.append(a, .{ .name = name, .kind = kind, .index = idx });"],
    ],
    expect: "corpus: 2 'other' (the export-order files)",
  },
  {
    name: "I14 — every signature interned before any body",
    edits: [[
      "    for (funcs.items, 0..) |*f, di| {\n        const ti = if (f.type_ref) |tr| blk: {",
      "    for (funcs.items) |f2| if (f2.type_ref == null) {\n        _ = try internSig(a, &sigs, f2.params.items, f2.results.items);\n    };\n    for (funcs.items, 0..) |*f, di| {\n        const ti = if (f.type_ref) |tr| blk: {",
    ]],
    expect: "corpus: 2 'other' (the type-order files)",
  },
];

async function run(cmd: string, args: string[], cwd?: string) {
  const r = await output(cmd, { args, cwd, stdout: "piped", stderr: "piped" });
  return { code: r.code, out: new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr) };
}

try {
  for (const inv of inversions) {
    let src = original;
    for (const [from, to] of inv.edits) {
      const hits = src.split(from).length - 1;
      if (hits !== 1) throw new Error(`${inv.name}: sabotage anchor matched ${hits} times, expected exactly 1:\n${from}`);
      src = src.replace(from, to);
    }
    await writeFile(file, src);
    // Build FIRST: a sabotage that does not compile proves nothing, and must say so.
    const build = await run("zig", ["build"], root);
    if (build.code !== 0) {
        console.log(`\n== ${inv.name}\n   ⚠️ SABOTAGE DID NOT COMPILE — no verdict. First error:\n   ${build.out.split("\n").find((l) => l.includes("error:"))}`);
        continue;
    }
    const test = await run("zig", ["build", "test"], root);
    const h13Failed = /H13: the module BODY matches wasm-tools/.test(test.out) && test.code !== 0;
    const parity = build.code === 0
      ? (await run("bun", [`${root}/cmem/probes/body-parity.ts`, `${root}/zig-out/bin/wazmrt.exe`, corpus, outDir])).out
      : "BUILD FAILED\n" + build.out;
    console.log(`\n== ${inv.name}`);
    console.log(`   unit test H13 FAILED under sabotage: ${h13Failed ? "YES ✅" : "NO ❌ — the test does not guard this fix"}`);
    console.log(`   expected: ${inv.expect}`);
    console.log(parity.split("\n").filter((l) => /same|regroup|other/.test(l)).map((l) => "   " + l).join("\n"));
  }
} finally {
  await writeFile(file, original);
}
const restored = await readFile(file, "utf8");
console.log(`\nsrc/wat.zig restored byte-for-byte: ${restored === original ? "yes" : "NO — INVESTIGATE"}`);
