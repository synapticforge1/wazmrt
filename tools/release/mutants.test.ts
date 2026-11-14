// tools/mutants.ts — the review's mutation runner, held by its own tests (review round 12: it
// counted ANY non-zero exit as "caught"; class C re-check: a red baseline made every mutant
// "caught"). ⚠️ Not held here: its Ctrl-C handler — a test on Windows cannot send a console Ctrl-C.
// Run: `bun test tools/release`.
import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failCount, verdict } from "../mutants.ts";

test("failCount reads bun's LAST `N fail` line; none is null", () => {
  expect(failCount(" 3 pass\n 0 fail\n")).toBe(0);
  expect(failCount(" 0 fail\n ... \n 2 fail\n")).toBe(2); // a test that printed " 0 fail" first
  expect(failCount("error: Cannot find module './x.ts'\n")).toBeNull();
});

test("verdict: a failing test is CAUGHT, all passing SURVIVED, no summary is an ERROR — never 'caught'", () => {
  expect(verdict(" 1 pass\n 1 fail\n")).toBe("CAUGHT");
  expect(verdict(" 2 pass\n 0 fail\n")).toBe("SURVIVED");
  expect(verdict("SyntaxError: Unexpected token\n")).toBe("ERROR");
  // bun 1.4.4's summary for a module that does not load (measured): a fail AND an error.
  expect(verdict(" 0 pass\n 1 fail\n 1 error\nRan 1 test across 1 file.\n")).toBe("ERROR");
});

const dir = mkdtempSync(join(tmpdir(), "wazmrt-mutants-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("end to end: caught, survived and a test file that no longer LOADS each read right; the file restored byte for byte", async () => {
  const code = "export function add(a: number, b: number) {\n  return a + b;\n}\nexport const unused = 1;\n";
  writeFileSync(join(dir, "m.ts"), code);
  writeFileSync(join(dir, "m.test.ts"), 'import { expect, test } from "bun:test";\nimport { add } from "./m.ts";\ntest("add", () => expect(add(2, 3)).toBe(5));\n');
  writeFileSync(
    join(dir, "list.json"),
    JSON.stringify([
      ["breaks add", "return a + b;", "return a - b;"],
      ["changes nothing tested", "export const unused = 1;", "export const unused = 2;"],
      ["breaks the file's syntax", "return a + b;", "return a + ;"],
    ]),
  );
  const p = Bun.spawn([process.execPath, join(import.meta.dir, "..", "mutants.ts"), join(dir, "m.ts"), join(dir, "m.test.ts"), join(dir, "list.json")], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(p.stdout).text();
  expect(await p.exited).toBe(1); // a survivor and an error: not a clean run
  expect(out).toMatch(/CAUGHT\s+breaks add/);
  expect(out).toMatch(/SURVIVED\s+changes nothing tested/);
  // A mutant that stops the module from loading is not proof that a test held the guard.
  expect(out).toMatch(/ERROR\s+breaks the file's syntax/);
  expect(out).toContain("restored: identical");
  expect(readFileSync(join(dir, "m.ts"), "utf8")).toBe(code);
}, 60_000);

test("an EMPTY list is refused, exit 2 — it would 'pass' having proven nothing (class C re-check 2)", async () => {
  const sub = join(dir, "empty");
  mkdirSync(sub, { recursive: true });
  writeFileSync(join(sub, "e.ts"), "export const x = 1;\n");
  writeFileSync(join(sub, "e.test.ts"), 'import { expect, test } from "bun:test";\nimport { x } from "./e.ts";\ntest("x", () => expect(x).toBe(1));\n');
  writeFileSync(join(sub, "list.json"), "[]");
  const p = Bun.spawn([process.execPath, join(import.meta.dir, "..", "mutants.ts"), join(sub, "e.ts"), join(sub, "e.test.ts"), join(sub, "list.json")], {
    cwd: sub,
    stdout: "pipe",
    stderr: "pipe",
  });
  const err = await new Response(p.stderr).text();
  expect(await p.exited).toBe(2);
  expect(err).toContain("no mutants in the list");
}, 60_000);

test("a suite that is ALREADY red: no mutant is judged, exit 2 (class C re-check: every mutant read 'caught')", async () => {
  const sub = join(dir, "red");
  mkdirSync(sub, { recursive: true });
  const code = "export const unused = 1;\n";
  writeFileSync(join(sub, "r.ts"), code);
  writeFileSync(join(sub, "r.test.ts"), 'import { expect, test } from "bun:test";\nimport "./r.ts";\ntest("always red", () => expect(1).toBe(2));\n');
  writeFileSync(join(sub, "list.json"), JSON.stringify([["changes nothing tested", "export const unused = 1;", "export const unused = 2;"]]));
  const p = Bun.spawn([process.execPath, join(import.meta.dir, "..", "mutants.ts"), join(sub, "r.ts"), join(sub, "r.test.ts"), join(sub, "list.json")], {
    cwd: sub,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = [await new Response(p.stdout).text(), await new Response(p.stderr).text()];
  expect(await p.exited).toBe(2);
  expect(err).toContain("not green on the UNMUTATED file");
  expect(out).not.toContain("CAUGHT");
  expect(readFileSync(join(sub, "r.ts"), "utf8")).toBe(code);
}, 60_000);
