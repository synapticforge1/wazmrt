// Flat legacy EH — INVERSION. Undo each piece of the fix; the unit test
// "legacy EH, FLAT: …" must fail every time. Builds FIRST (a sabotage that does not compile is
// "no verdict", never "unguarded"), matches each edit EXACTLY once, restores in `finally`.
//
//   deno run -A invert.ts <repo root>

const [root] = Deno.args;
const file = `${root}/src/wat.zig`;
const original = await Deno.readTextFile(file);

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
  const r = await new Deno.Command(cmd, { args, cwd: root, stdout: "piped", stderr: "piped" }).output();
  return { code: r.code, out: new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr) };
}

try {
  for (const inv of inversions) {
    const hits = original.split(inv.from).length - 1;
    if (hits !== 1) throw new Error(`${inv.name}: anchor matched ${hits} times, expected 1`);
    await Deno.writeTextFile(file, original.replace(inv.from, inv.to));
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
  await Deno.writeTextFile(file, original);
}
console.log(`src/wat.zig restored byte-for-byte: ${(await Deno.readTextFile(file)) === original ? "yes" : "NO — INVESTIGATE"}`);
