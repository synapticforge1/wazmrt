// The release workflow's rules, held by a test (review round 1: C1, C3, C5 and the U9 pins are
// properties of `.github/workflows/release.yml`, which no unit test runs). Run: `bun test tools/release`.
//
// What this guards against: an EDIT that drops a rule — a setting deleted, moved, commented out or
// overridden; an exit-code check removed; a step's shell changed; a write permission or a `uses:`
// added. Rounds 2 and 3 found ways past earlier versions of it; each rule below now tests the SHAPE
// it requires (the first lines of a step, the line after an exe run), not "somewhere in the text".
// ⚠️ What it cannot do: judge a deliberately crafted workaround, or run the workflow. The workflow
// runs only on GitHub, and a branch push of it is the rehearsal.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const wf: any = Bun.YAML.parse(readFileSync(".github/workflows/release.yml", "utf8"));
const jobs: [string, any][] = Object.entries(wf.jobs);

/** The shell a step runs under: step, then job defaults, then WORKFLOW defaults (round 3, C1), then GitHub's default. */
export function shellOf(job: any, step: any, workflow: any = wf): string {
  return step.shell ?? job.defaults?.run?.shell ?? workflow.defaults?.run?.shell ?? (String(job["runs-on"]).startsWith("windows") ? "pwsh" : "bash");
}

/** A step's lines with comments and blank lines dropped. */
const code = (run: string) => run.split("\n").map((l) => l.trim()).filter((l) => l !== "" && !l.startsWith("#"));

const STOP = "$ErrorActionPreference = 'Stop'";
const NATIVE_ON = "$PSNativeCommandUseErrorActionPreference = $true";
const EXE_RUN = "& { $PSNativeCommandUseErrorActionPreference = $false;"; // the one sanctioned scoped override

test("shellOf reads the workflow-level default (round 3, C1)", () => {
  const winJob = { "runs-on": "windows-latest" };
  expect(shellOf(winJob, {}, { defaults: { run: { shell: "cmd" } } })).toBe("cmd");
  expect(shellOf({ ...winJob, defaults: { run: { shell: "pwsh" } } }, {}, { defaults: { run: { shell: "cmd" } } })).toBe("pwsh");
});

test("every step of a Windows job runs under pwsh, nothing else", () => {
  for (const [name, job] of jobs)
    if (String(job["runs-on"]).startsWith("windows")) for (const step of job.steps) if (step.run) expect(`${name}/${step.name}: ${shellOf(job, step)}`).toBe(`${name}/${step.name}: pwsh`);
});

test("every multi-line pwsh step OPENS with the two settings, and nothing later undoes them (C1; round 3, C3/C4)", () => {
  // No native-command detection: EVERY multi-line pwsh step, so a command the detector missed
  // (node, tar, a script) cannot slip through, and the settings cannot sit inside an `if` or after
  // the first command.
  let seen = 0;
  for (const [name, job] of jobs)
    for (const step of job.steps) {
      if (!step.run || shellOf(job, step) !== "pwsh") continue;
      const lines = code(step.run);
      const where = `${name}/${step.name}`;
      if (lines.length === 1) {
        // One line is one command: the runner exits with its code. `;`, `&&` or `||` would make it
        // several (round 4: pwsh 7 has `&&` / `||` too).
        expect(`${where}: ${/;|&&|\|\|/.test(lines[0]) ? "several commands on one line" : "ok"}`).toBe(`${where}: ok`);
        continue;
      }
      seen++;
      expect(`${where}: ${lines.slice(0, 2).join(" | ")}`).toBe(`${where}: ${STOP} | ${NATIVE_ON}`);
      for (const l of lines.slice(2)) {
        // Any later assignment to either setting, in ANY case and with any scope prefix (round 4:
        // `$erroractionpreference`, `$global:…` passed) — except the one exact exe-run line.
        const assigns = OVERRIDE.test(l);
        const sanctioned = EXE_RUN_LINE.test(l);
        expect(`${where}: ${assigns && !sanctioned ? `later override: ${l}` : "ok"}`).toBe(`${where}: ok`);
      }
    }
  expect(seen).toBeGreaterThan(5);
});

/** An assignment to either setting: any case, any scope prefix, any spacing. */
const OVERRIDE = /\$(?:(?:global|script|local|private|using):)?(?:ErrorActionPreference|PSNativeCommandUseErrorActionPreference)\s*=/i;
/** The ONE sanctioned scoped override: `$x = & { …$false; & <path>wazmrt.exe <args> }`, nothing else on the line. */
const EXE_RUN_LINE = /^\$\w+ = & \{ \$PSNativeCommandUseErrorActionPreference = \$false; & ("[^"]*"|\S+)wazmrt\.exe"? [^;{}|&]* \}$/;
/** The exit-code check that must follow it: exactly these shapes, and it must throw. */
const EXIT_CHECK = /^if \(\$LASTEXITCODE -ne 0( -or \(\$hello -join "`n"\) -ne 'hello from wasi')?\) \{ throw "[^"]*" \}$/;

/** Every `run:` of a pwsh step, as lines without comments. */
const pwshSteps = () =>
  jobs.flatMap(([name, job]) => job.steps.filter((s: any) => s.run && shellOf(job, s) === "pwsh").map((s: any) => ({ where: `${name}/${s.name}`, lines: code(s.run) })));

test("pwsh steps hold no other way to soften a failure (round 4: the crafted bypasses)", () => {
  const forbidden: [RegExp, string][] = [
    [/\b(Set|New|Remove|Clear)-Variable\b|(^|[\s;(])(sv|nv|rv|clv)\s/i, "a *-Variable command (could rewrite a setting)"],
    [/\$PSDefaultParameterValues/i, "$PSDefaultParameterValues (could set -ErrorAction for every command)"],
    [/-(ErrorAction|ea)\s+(SilentlyContinue|Ignore|Continue)\b/i, "-ErrorAction that does not stop"],
    [/(^|[\s;{])trap\b/i, "a trap (could swallow the stop)"],
    [/<#|#>/, "a block comment (hides lines from these checks)"],
  ];
  for (const { where, lines } of pwshSteps())
    for (const l of lines)
      for (const [re, why] of forbidden) expect(`${where}: ${re.test(l) ? `${why}: ${l}` : "ok"}`).toBe(`${where}: ok`);
});

test("a `try` in a pwsh step only wraps Invoke-WebRequest, and its catch re-throws (round 4: try/catch around a native command)", () => {
  let seen = 0;
  for (const { where, lines } of pwshSteps())
    lines.forEach((l, i) => {
      if (!/(^|[\s;{])try\s*\{/i.test(l)) return;
      seen++;
      expect(`${where}: ${/^try \{ Invoke-WebRequest /.test(l) ? "ok" : `try around something else: ${l}`}`).toBe(`${where}: ok`);
      const c = lines[i + 1] ?? "";
      expect(`${where}: ${/^catch \{.*\bthrow\b/.test(c) ? "ok" : `catch that does not re-throw: ${c}`}`).toBe(`${where}: ok`);
    });
  expect(seen).toBe(2); // the two download retries
});

test("no `run:` is a folded scalar (round 4: `run: >` joins lines into one command)", () => {
  const raw = readFileSync(".github/workflows/release.yml", "utf8");
  expect(raw).not.toMatch(/^\s*run:\s*>/m);
});

test("every exe run with the setting off is followed DIRECTLY by its exit-code check (round 3, C2)", () => {
  let seen = 0;
  for (const [name, job] of jobs)
    for (const step of job.steps) {
      if (!step.run) continue;
      const lines = code(step.run);
      lines.forEach((l, i) => {
        if (!l.includes(EXE_RUN)) return;
        seen++;
        // The line is exactly the sanctioned shape (a wazmrt.exe run, nothing else on it), and the
        // next is an exit-code check of an exact shape that throws (round 4: `-or $true { }` passed).
        expect(`${name}/${step.name}: ${EXE_RUN_LINE.test(l) ? "ok" : `not the exe-run shape: ${l}`}`).toBe(`${name}/${step.name}: ok`);
        const next = lines[i + 1] ?? "(end)";
        expect(`${name}/${step.name}: ${EXIT_CHECK.test(next) ? "ok" : `not an exit-code check that throws: ${next}`}`).toBe(`${name}/${step.name}: ok`);
      });
    }
  expect(seen).toBeGreaterThanOrEqual(4); // --version and hello_wasi, in checks and in readback
});

test("every multi-line bash step OPENS with set -euo pipefail; a one-line one chains nothing (round 3, C5)", () => {
  for (const [name, job] of jobs)
    for (const step of job.steps) {
      if (!step.run || shellOf(job, step) !== "bash") continue;
      const lines = code(step.run);
      const where = `${name}/${step.name}`;
      if (lines.length === 1) expect(`${where}: ${/;|&&|\|\|/.test(lines[0]) ? "chained" : "ok"}`).toBe(`${where}: ok`);
      else expect(`${where}: ${lines[0]}`).toBe(`${where}: set -euo pipefail`);
      // Nothing later may soften it (round 4: `|| true` passed).
      for (const l of lines.slice(1)) {
        const softens = /\|\|\s*(true|:|exit\s+0)\b|\|\|\s*:$/.test(l) || /\bset\s+\+[eou]/.test(l) || /(^|[\s;])trap\b/.test(l);
        expect(`${where}: ${softens ? `softens a failure: ${l}` : "ok"}`).toBe(`${where}: ok`);
      }
    }
});

/** Does a `permissions` value grant any write? A string form (`write-all`) counts (round 2). */
function grantsWrite(p: unknown): boolean {
  if (p === undefined) return true;
  if (typeof p === "string") return p !== "read-all";
  return Object.values(p as Record<string, string>).some((v) => v === "write");
}

test("no `uses:` at all, step or job; top-level permissions {}; write only on tag and release (U9)", () => {
  for (const [name, job] of jobs) {
    expect(`${name}: ${job.uses}`).toBe(`${name}: undefined`);
    for (const step of job.steps ?? []) expect(step.uses).toBeUndefined();
  }
  expect(wf.permissions).toEqual({});
  for (const [name, job] of jobs) {
    expect(job.permissions).toBeDefined();
    expect(`${name}: write=${grantsWrite(job.permissions)}`).toBe(`${name}: write=${name === "tag" || name === "release"}`);
  }
});

test("grantsWrite reads the string forms", () => {
  expect(grantsWrite("write-all")).toBe(true);
  expect(grantsWrite("read-all")).toBe(false);
  expect(grantsWrite({ contents: "read" })).toBe(false);
  expect(grantsWrite({ contents: "read", packages: "write" })).toBe(true);
});

test("concurrency is per ref AND commit, never cancelling (C5)", () => {
  expect(wf.concurrency.group).toContain("${{ github.ref }}");
  expect(wf.concurrency.group).toContain("${{ github.sha }}");
  expect(wf.concurrency["cancel-in-progress"]).toBe(false);
});

test("the corpus is pinned by commit and by tree, and the step checks both (C3)", () => {
  expect(wf.env.CORPUS_COMMIT).toMatch(/^[0-9a-f]{40}$/);
  expect(wf.env.CORPUS_TREE).toMatch(/^[0-9a-f]{40}$/);
  const step = wf.jobs.checks.steps.find((s: any) => s.name.startsWith("Spec conformance"));
  expect(step.run).toContain("$env:CORPUS_COMMIT");
  expect(step.run).toContain("-ne $env:CORPUS_TREE");
  expect(step.run).not.toMatch(/clone[^\n]*--sparse/);
});

test("the tag job runs only on main, after checks", () => {
  expect(wf.jobs.tag.needs).toBe("checks");
  expect(wf.jobs.tag.if).toContain("github.ref == 'refs/heads/main'");
  expect(wf.jobs.tag.if).toContain("needs.checks.outputs.release == 'true'");
});

test("the read-back fetches the tag by its full ref, not `clone --branch` (C6)", () => {
  const step = wf.jobs.readback.steps[0];
  expect(step.run).toContain("refs/tags/");
  expect(step.run).not.toMatch(/git clone[^\n]*--branch/);
});

test("output checks compare joined text and the exit code (C2; round 3, C2)", () => {
  let seen = 0;
  for (const [, job] of jobs)
    for (const step of job.steps)
      if (step.run?.includes("hello from wasi")) {
        seen++;
        expect(step.run).toContain(`if ($LASTEXITCODE -ne 0 -or ($hello -join "\`n") -ne 'hello from wasi')`);
      }
  expect(seen).toBe(2);
});
