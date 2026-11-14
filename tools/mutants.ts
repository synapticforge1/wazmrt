// tools/mutants.ts — the review's mutation runner: does each test fail for the reason it names?
//
//   bun tools/mutants.ts <file> <test file or folder> <mutants.json>     (from the repo root)
//
// <mutants.json> is a list of [name, from, to]: each `from` must occur EXACTLY ONCE in <file>; the
// runner replaces it with `to` (inserted literally), runs `bun test <test>`, and puts the file back.
//
//   CAUGHT    bun's summary shows at least one FAILING test — a test noticed the change;
//   SURVIVED  the tests passed: the guard the mutant removes is held by no test;
//   ERROR     no summary with a failure count (a test file that does not load, a crash) — NOT
//             counted as caught (review round 12: a non-zero exit alone was).
//
// First the tests run on the UNMUTATED file and must be green (exit 2 if not — a red baseline would
// make every mutant read "caught"). Exit 0 only when every mutant applied and was CAUGHT. The file
// is restored after every mutant and on a failure, and checked byte-identical at the end. On
// Ctrl-C a handler stops the child and restores the file (the runner waits asynchronously, so the
// handler CAN run — round 12: a blocking spawn kept it from ever running); ⚠️ no test proves that
// handler — a test on Windows cannot send a console Ctrl-C (a "kill" ends the process outright).
//
// 🎓 A test is only proven by the mutant that re-creates the BUG it names (review round 3) — write
// that mutant, not the easiest one. The lists are kept with the review's record
// (`cmem/review-mutants/`), so every "caught" can be re-run from a clone.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** bun's own summary line `N fail` — the LAST one (a test may print such a line earlier) — or null. */
export function failCount(output: string): number | null {
  const all = [...output.matchAll(/^\s*(\d+) fail\s*$/gm)];
  return all.length ? Number(all[all.length - 1][1]) : null;
}

/** bun's `N error` summary line (errors OUTSIDE a test: a module that does not load, …), or 0. */
export function errorCount(output: string): number {
  const all = [...output.matchAll(/^\s*(\d+) errors?\s*$/gm)];
  return all.length ? Number(all[all.length - 1][1]) : 0;
}

/**
 * The verdict for one mutant from bun's output. Measured (bun 1.4.4): a module that no longer LOADS
 * reports `1 fail` AND `1 error` — so any error makes it ERROR, never "caught": a mutant that only
 * breaks the syntax proves nothing about the guard it touches.
 */
export function verdict(output: string): "CAUGHT" | "SURVIVED" | "ERROR" {
  const fails = failCount(output);
  if (fails === null || errorCount(output) > 0) return "ERROR";
  return fails > 0 ? "CAUGHT" : "SURVIVED";
}

async function main(argv: string[]): Promise<number> {
  const [file, testPath, mutantsPath] = argv;
  if (!file || !testPath || !mutantsPath) {
    console.error("usage: bun tools/mutants.ts <file> <test file or folder> <mutants.json>");
    return 2;
  }
  const target = resolve(file);
  const original = readFileSync(target, "utf8");
  const mutants: [string, string, string][] = JSON.parse(readFileSync(mutantsPath, "utf8"));
  const restore = () => writeFileSync(target, original);
  let child: ReturnType<typeof Bun.spawn> | null = null;
  process.on("SIGINT", () => {
    child?.kill();
    restore();
    console.error("interrupted: the child stopped, the file restored");
    process.exit(130);
  });
  // 🔒 The tests must PASS on the unmutated file first (class C re-check: a suite already red made
  // every mutant read "caught"). A baseline that is not green ends the run, exit 2.
  const runTests = async () => {
    child = Bun.spawn([process.execPath, "test", testPath], { stdout: "pipe", stderr: "pipe" });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    await child.exited;
    child = null;
    return `${out}\n${err}`;
  };
  const baseline = verdict(await runTests());
  if (baseline !== "SURVIVED") {
    console.error(`the tests are not green on the UNMUTATED file (${baseline === "CAUGHT" ? "a test already fails" : "no clean summary"}); fix that first — no mutant can be judged`);
    return 2;
  }
  let bad = 0;
  try {
    for (const [name, from, to] of mutants) {
      const count = original.split(from).length - 1;
      if (count !== 1) {
        console.log(`SETUP ERROR ${name}: the pattern occurs ${count} times, not once`);
        bad++;
        continue;
      }
      writeFileSync(target, original.replace(from, () => to));
      const output = await runTests();
      restore();
      const v = verdict(output);
      if (v !== "CAUGHT") bad++;
      const fails = failCount(output);
      console.log(`${v.padEnd(8)} ${name} (${fails === null ? "no test summary" : `${fails} failing`})`);
    }
  } finally {
    restore();
  }
  console.log(readFileSync(target, "utf8") === original ? "restored: identical" : "RESTORE MISMATCH");
  console.log(`${mutants.length} mutants, ${bad} survived, errored or failed to apply`);
  return bad === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await main(Bun.argv.slice(2)));
