// Flat legacy EH — INVERSION. Undo each piece of the fix; the unit test
// "legacy EH, FLAT: …" must fail every time. Builds FIRST (a sabotage that does not compile is
// "no verdict", never "unguarded"), matches each edit EXACTLY once, restores in `finally`.
//
//   bun invert.ts <repo root>

import { readFile, writeFile } from "node:fs/promises";
import { output } from "../run.ts";

const [root] = process.argv.slice(2);
const file = `${root}/src/wat.zig`;
const original = await readFile(file, "utf8");

const inversions: Array<{ name: string; from: string; to: string }> = [
  {
    name: "the word `try` does not resolve (the original defect)",
    from: `    if (std.mem.eql(u8, name, "try")) return .try_;\n`,
    to: ``,
  },
  {
    name: "flat `delegate` resolves its label WITHOUT popping the try's own",
    from: `            if (ctx.labels.items.len != 0) _ = ctx.labels.pop();\n            const target = try resolveLabel(ctx, items[i + 1]);`,
    to: `            const target = try resolveLabel(ctx, items[i + 1]);`,
  },
];

async function run(cmd: string, args: string[]) {
  const r = await output(cmd, { args, cwd: root, stdout: "piped", stderr: "piped" });
  return { code: r.code, out: new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr) };
}

try {
  for (const inv of inversions) {
    const hits = original.split(inv.from).length - 1;
    if (hits !== 1) throw new Error(`${inv.name}: anchor matched ${hits} times, expected 1`);
    await writeFile(file, original.replace(inv.from, inv.to));
    const build = await run("zig", ["build"]);
    if (build.code !== 0) {
      console.log(`== ${inv.name}\n   ⚠️ SABOTAGE DID NOT COMPILE — no verdict`);
      continue;
    }
    const test = await run("zig", ["build", "test"]);
    const failed = test.code !== 0 && /legacy EH, FLAT/.test(test.out);
    console.log(`== ${inv.name}\n   test FAILED under sabotage: ${failed ? "YES ✅" : "NO ❌ — unguarded"}`);
  }
} finally {
  await writeFile(file, original);
}
console.log(`src/wat.zig restored byte-for-byte: ${(await readFile(file, "utf8")) === original ? "yes" : "NO — INVESTIGATE"}`);
