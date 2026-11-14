// tools/mutants.ts — the review's mutation runner: does each test fail for the reason it names?
//
//   bun tools/mutants.ts <file> <test file or folder> <mutants.json>
//
// <mutants.json> is a list of [name, from, to]: each `from` must occur EXACTLY ONCE in <file>; the
// runner replaces it with `to`, runs `bun test <test>`, expects it RED (a test fails — "CAUGHT"), and
// puts the file back. A mutant whose tests stay green has SURVIVED: the guard it removes is held by
// no test. Exit 0 only when every mutant applied and was caught. The file is restored after every
// mutant, on a failure, and on Ctrl-C, and checked byte-identical at the end.
//
// 🎓 A test is only proven by the mutant that re-creates the BUG it names (review round 3) — write
// that mutant, not the easiest one. Moved into the repo from a session scratchpad, 2026-11-13
// (`cmem/working-rules.md` § "Everything about this project lives IN this project folder").

import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const [file, testPath, mutantsPath] = process.argv.slice(2);
if (!file || !testPath || !mutantsPath) {
  console.error("usage: bun tools/mutants.ts <file> <test file or folder> <mutants.json>");
  process.exit(2);
}
const target = resolve(file);
const original = readFileSync(target, "utf8");
const mutants: [string, string, string][] = JSON.parse(readFileSync(mutantsPath, "utf8"));
const restore = () => writeFileSync(target, original);
process.on("SIGINT", () => {
  restore();
  console.error("interrupted: the file is restored");
  process.exit(130);
});

let bad = 0;
try {
  for (const [name, from, to] of mutants) {
    const count = original.split(from).length - 1;
    if (count !== 1) {
      console.log(`SETUP ERROR ${name}: the pattern occurs ${count} times, not once`);
      bad++;
      continue;
    }
    // The replacement is inserted LITERALLY (`replace` with a string would read `$&`, `$1`, … in it).
    writeFileSync(target, original.replace(from, () => to));
    const r = spawnSync("bun", ["test", testPath], { encoding: "utf8" });
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    const fails = out.match(/(\d+) fail/)?.[1] ?? "?";
    const red = r.status !== 0;
    if (!red) bad++;
    console.log(`${red ? "CAUGHT  " : "SURVIVED"} ${name} (${fails} failing)`);
    restore();
  }
} finally {
  restore();
}
console.log(readFileSync(target, "utf8") === original ? "restored: identical" : "RESTORE MISMATCH");
console.log(`${mutants.length} mutants, ${bad} survived or failed to apply`);
process.exit(bad === 0 ? 0 : 1);
