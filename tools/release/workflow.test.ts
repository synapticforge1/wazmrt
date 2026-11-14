// The release workflow's rules, held by a test (review round 1: C1, C3, C5 and the U9 pins are
// properties of `.github/workflows/release.yml`, which no unit test runs). Run: `bun test tools/release`.
//
// What it holds, in three layers:
//   1. 🔒 THE WHOLE FILE, pinned (owner, 2026-11-13, review round 6: "pin all of it"). Rounds 2–6
//      each found edits that made a check useless while every rule passed — a line rewriting the
//      value a check compares, a check made unreachable, an early exit, a setting reset in a new
//      spelling. pwsh is too large to list every such form, so ANY edit to release.yml fails here
//      until `RELEASE_YML_SHA256` is updated IN THE SAME COMMIT — a visible, deliberate edit that
//      the commit's review must approve. And release.yml must be the only workflow file;
//   2. the STRUCTURE, by name — jobs, runs-on / needs / if / timeout, allowed keys, steps in order,
//      their `if` and `env`, and every CHECK line by its exact text (round 5, A2). These say WHAT
//      the pinned text must keep, so an update of the pin cannot quietly drop one;
//   3. the RULES, for the edits a reviewer might miss — each pwsh step opens with the two settings
//      and nothing undoes them (in the spellings listed); each exe run is followed by its exit
//      check; no per-command -ErrorAction, `exit`, `return`, `trap`, Invoke-Expression, variable:
//      drive or block comment; bash opens with `set -euo pipefail`.
// ⚠️ What it cannot do: run the workflow (only GitHub does; a branch push is the rehearsal), or judge
// whether a DELIBERATE edit is safe — layers 2 and 3 catch the forms they list, and a crafted edit
// that passes them is caught only by the review of the commit that moves the pin.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

/**
 * The sha256 of release.yml's text, CRLF read as LF (a Windows checkout may convert line endings).
 * To change the workflow: edit it, run this test, review the diff of release.yml, then put the new
 * value printed below here — in the same commit, whose message says what changed and why.
 */
const RELEASE_YML_SHA256 = "9bc66a23a205cd7ae9351fb26c12b7f1697b33daba3bdc6a137a1a70afe0eccf"; // round 12, class C: RELEASE_TESTS_MIN 217 -> 223

test("release.yml is exactly the reviewed text: any edit moves this pin, in the same commit (round 6)", () => {
  const text = readFileSync(".github/workflows/release.yml", "utf8").replace(/\r\n/g, "\n");
  const got = new Bun.CryptoHasher("sha256").update(text).digest("hex");
  expect(`release.yml sha256 ${got}`).toBe(`release.yml sha256 ${RELEASE_YML_SHA256}`);
});

test("release.yml is the only workflow: no second file can tag or release (round 6)", () => {
  expect(readdirSync(".github/workflows")).toEqual(["release.yml"]);
});

test("the COMMIT holds exactly one file under .github: release.yml (round 7: a case variant like RELEASE.yml checks out as one file on Windows, but GitHub runs both)", () => {
  const r = spawnSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--", ".github"], { encoding: "utf8" });
  expect(r.status).toBe(0);
  expect(r.stdout.trim().split(/\r?\n/)).toEqual([".github/workflows/release.yml"]);
});
test("the commit holds no bun config: a bunfig preload could make every test pass with the count unchanged (round 8)", () => {
  const r = spawnSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], { encoding: "utf8" });
  expect(r.status).toBe(0);
  const configs = r.stdout.split(/\r?\n/).filter((f) => BUNFIG.test(f));
  expect(configs).toEqual([]);
});

/** A bun config file, anywhere, any case — with a trailing dot or space too: Windows drops it at checkout, and bun then reads the file (round 9). */
const BUNFIG = /(^|\/)\.?bunfig\.toml[. ]*$/i;

test("BUNFIG matches every name bun would read on a Windows checkout, and nothing else", () => {
  for (const f of ["bunfig.toml", ".bunfig.toml", "tools/release/bunfig.toml", "BunFig.TOML", "bunfig.toml.", "bunfig.toml ", "a/bunfig.toml. ."])
    expect(`${f}: ${BUNFIG.test(f)}`).toBe(`${f}: true`);
  for (const f of ["bunfig.toml.bak", "notbunfig.toml", "bunfig.tomlx", "docs/bunfig.md"]) expect(`${f}: ${BUNFIG.test(f)}`).toBe(`${f}: false`);
});

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
        const sanctioned = EXE_RUN_LINE.test(l) || l === BUN_TEST_LINE;
        expect(`${where}: ${assigns && !sanctioned ? `later override: ${l}` : "ok"}`).toBe(`${where}: ok`);
      }
    }
  expect(seen).toBeGreaterThan(5);
});

/** An assignment to either setting: any case, any scope prefix, braced or not, any spacing (round 5: `${…}`). */
const OVERRIDE = /\$\{?(?:(?:global|script|local|private|using):)?(?:ErrorActionPreference|PSNativeCommandUseErrorActionPreference)\}?\s*=/i;
/** The ONE sanctioned scoped override: `$x = & { …$false; & <path>wazmrt.exe <args> }`, nothing else on the line. */
const EXE_RUN_LINE = /^\$\w+ = & \{ \$PSNativeCommandUseErrorActionPreference = \$false; & ("[^"]*"|\S+)wazmrt\.exe"? [^;{}|&]* \}$/;
/** The one other sanctioned scoped override: the self-test run, its output kept for the summary check (round 7, A1). */
const BUN_TEST_LINE =
  '& { $PSNativeCommandUseErrorActionPreference = $false; & bun test tools/release 2>&1 } | ForEach-Object { "$_" } | Tee-Object -Variable t';
/** The exit-code check that must follow it: exactly these shapes, and it must throw. */
const EXIT_CHECK = /^if \(\$LASTEXITCODE -ne 0( -or \(\$hello -join "`n"\) -ne 'hello from wasi')?\) \{ throw "[^"]*" \}$/;

/** Every `run:` of a pwsh step, as lines without comments. */
const pwshSteps = () =>
  jobs.flatMap(([name, job]) => job.steps.filter((s: any) => s.run && shellOf(job, s) === "pwsh").map((s: any) => ({ where: `${name}/${s.name}`, lines: code(s.run) })));

test("pwsh steps hold no other way to soften a failure (round 4: the crafted bypasses)", () => {
  const forbidden: [RegExp, string][] = [
    [/\b(Set|New|Remove|Clear)-Variable\b|(^|[\s;(])(sv|nv|rv|clv)\s/i, "a *-Variable command (could rewrite a setting)"],
    [/\$PSDefaultParameterValues/i, "$PSDefaultParameterValues (could set -ErrorAction for every command)"],
    // ANY -ErrorAction, in any spelling pwsh accepts (round 5: `-ErrorAction:SilentlyContinue`, `-EA 0`,
    // a prefix like `-ErrorA`): the step setting decides, never a per-command one.
    [/(^|\s)-(ea|errora\w*)(\b|:)/i, "a per-command -ErrorAction"],
    [/\bvariable:/i, "the variable: drive (Set-Item variable:… rewrites a setting; round 5)"],
    [/\b(PSVariable|SessionState)\b/i, "a session-state API (rewrites a setting)"],
    [/\b(Invoke-Expression|iex)\b/i, "Invoke-Expression (runs text these checks cannot read)"],
    [/(^|[\s;{])(exit|return)\b/i, "exit / return (ends the step early, green, after the checks were skipped; round 5)"],
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
        const shaped = EXE_RUN_LINE.test(l) || l === BUN_TEST_LINE;
        expect(`${name}/${step.name}: ${shaped ? "ok" : `not the exe-run shape: ${l}`}`).toBe(`${name}/${step.name}: ok`);
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
        const softens =
          /\|\|\s*(true|:|exit\s+0)\b|\|\|\s*:$/.test(l) || /\bset\s+\+[eou]/.test(l) || /(^|[\s;])trap\b/.test(l) ||
          /(^|[\s;&|])(exit(?!\s+1\b)|return)\b/.test(l); // only `exit 1` (round 5: an early `exit 0` skips the rest, green)
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

// ── The structure, held EXACTLY (round 5, A2: `continue-on-error`, `if: false`, `if: always()`, a
// dropped `needs` or timeout, a step deleted — each passed every rule above). Changing any of it is a
// deliberate edit of this table too, in the same commit, where a reviewer sees it.

test("the workflow's top level: these keys, these triggers, no workflow-wide defaults", () => {
  expect(Object.keys(wf).sort()).toEqual(["concurrency", "env", "jobs", "name", "on", "permissions"]);
  expect(wf.on).toEqual({ push: { branches: ["**"] } });
  expect(Object.keys(wf.env).sort()).toEqual(
    ["BUN_SHA256_LINUX", "BUN_SHA256_WINDOWS", "BUN_VERSION", "CORPUS_COMMIT", "CORPUS_PATH", "CORPUS_REPO", "CORPUS_TREE", "RELEASE_TESTS_MIN", "ZIG_SHA256_WINDOWS", "ZIG_VERSION"],
  );
});

const JOBS: Record<string, { runsOn: string; needs?: string | string[]; if?: string; timeout: number; steps: string[] }> = {
  checks: {
    runsOn: "windows-latest",
    timeout: 60,
    steps: [
      "Clone this commit (no token)",
      "Install Zig and Bun (pinned by sha256)",
      "Release-tool self-tests",
      "Unit suite (the surface gate inside it)",
      "Safety suite (safe)",
      "Shipped suite (small, safety off)",
      "Sandbox security (a skip is a failure)",
      "Feature combinations and the C ABI smoke",
      "Spec conformance (S2 against the last release)",
      "Size gate (the shipped config)",
      "The shipped exe is standalone",
      "Is this a release?",
    ],
  },
  tag: {
    runsOn: "ubuntu-latest",
    needs: "checks",
    if: "needs.checks.outputs.release == 'true' && github.ref == 'refs/heads/main'",
    timeout: 15,
    steps: ["Clone this commit (no token) and install Bun (pinned by sha256)", "Create the tag on the commit checks passed"],
  },
  release: {
    runsOn: "ubuntu-latest",
    needs: ["checks", "tag"],
    timeout: 15,
    steps: ["Clone this commit (no token) and install Bun (pinned by sha256)", "The Release page, from the tag"],
  },
  readback: {
    runsOn: "windows-latest",
    needs: ["checks", "release"],
    timeout: 30,
    steps: ["Clone the TAG as a user would (no token)", "Install Zig (pinned by sha256)", "Build the tag and run it"],
  },
};

/** The only steps with an `if`: the gates after the first, so one run shows every failure (the job still fails). */
const STEP_IF: Record<string, string> = Object.fromEntries(
  [
    "Safety suite (safe)",
    "Shipped suite (small, safety off)",
    "Sandbox security (a skip is a failure)",
    "Feature combinations and the C ABI smoke",
    "Spec conformance (S2 against the last release)",
    "Size gate (the shipped config)",
  ].map((s) => [`checks/${s}`, "${{ !cancelled() }}"]),
);

/** The only step with its own timeout: the self-tests, so a hang fails fast (round 9). */
const STEP_TIMEOUT: Record<string, number> = { "checks/Release-tool self-tests": 20 };

/** The only steps with an `env`: the three that call GitHub, with the job's token and nothing else. */
const STEP_ENV: Record<string, Record<string, string>> = {
  "checks/Is this a release?": { GITHUB_TOKEN: "${{ github.token }}" },
  "tag/Create the tag on the commit checks passed": { GITHUB_TOKEN: "${{ github.token }}" },
  "release/The Release page, from the tag": { GITHUB_TOKEN: "${{ github.token }}" },
};

test("the jobs, exactly: runs-on, needs, if, timeout, and no other key (no continue-on-error, env, strategy, container)", () => {
  expect(Object.keys(wf.jobs)).toEqual(Object.keys(JOBS));
  const allowed = new Set(["runs-on", "timeout-minutes", "permissions", "outputs", "defaults", "steps", "needs", "if"]);
  for (const [name, want] of Object.entries(JOBS)) {
    const job = wf.jobs[name];
    for (const k of Object.keys(job)) expect(`${name}: ${allowed.has(k) ? "ok" : `key ${k}`}`).toBe(`${name}: ok`);
    expect({ name, runsOn: job["runs-on"], needs: job.needs, if: job.if, timeout: job["timeout-minutes"] }).toEqual({
      name,
      runsOn: want.runsOn,
      needs: want.needs,
      if: want.if,
      timeout: want.timeout,
    });
  }
});

test("the steps, exactly: names in order; `if` and `env` only where listed; no other key", () => {
  const allowed = new Set(["name", "id", "run", "if", "env", "timeout-minutes"]);
  for (const [name, want] of Object.entries(JOBS)) {
    const steps = wf.jobs[name].steps as any[];
    expect({ name, steps: steps.map((s) => s.name) }).toEqual({ name, steps: want.steps });
    for (const s of steps) {
      const where = `${name}/${s.name}`;
      for (const k of Object.keys(s)) expect(`${where}: ${allowed.has(k) ? "ok" : `key ${k}`}`).toBe(`${where}: ok`);
      expect({ where, if: s.if }).toEqual({ where, if: STEP_IF[where] });
      expect({ where, env: s.env }).toEqual({ where, env: STEP_ENV[where] });
      expect({ where, timeout: s["timeout-minutes"] }).toEqual({ where, timeout: STEP_TIMEOUT[where] });
    }
  }
  expect(wf.jobs.checks.steps.find((s: any) => s.name === "Is this a release?").id).toBe("isrel");
});

/**
 * Every line that CHECKS something — throws, verifies a hash, a commit or a tree, or runs a gate —
 * by its exact text, in its step (round 5, A2: each could be turned into `Write-Host` or deleted and
 * every rule above still passed). Removing or softening a check means editing this list.
 */
const CHECK_LINES: Record<string, string[]> = {
  "checks/Clone this commit (no token)": [
    "git fetch -q --depth 1 origin $env:GITHUB_SHA",
    "git checkout -q FETCH_HEAD",
    'if ((git rev-parse HEAD) -ne $env:GITHUB_SHA) { throw "HEAD is not $env:GITHUB_SHA" }',
  ],
  "checks/Install Zig and Bun (pinned by sha256)": [
    "catch { if ($i -eq 4) { throw }; Start-Sleep -Seconds (10 * $i) }",
    "$h = (Get-FileHash $out -Algorithm SHA256).Hash.ToLower()",
    'if ($h -ne $sha) { throw "$url sha256 $h, expected $sha" }',
    'Get-Pinned "https://ziglang.org/download/$env:ZIG_VERSION/zig-x86_64-windows-$env:ZIG_VERSION.zip" "$env:RUNNER_TEMP\\zig.zip" $env:ZIG_SHA256_WINDOWS',
    'Get-Pinned "https://github.com/oven-sh/bun/releases/download/bun-v$env:BUN_VERSION/bun-windows-x64.zip" "$env:RUNNER_TEMP\\bun.zip" $env:BUN_SHA256_WINDOWS',
  ],
  "checks/Release-tool self-tests": [
    BUN_TEST_LINE,
    'if ($LASTEXITCODE -ne 0) { throw "bun test tools/release exited $($LASTEXITCODE)" }',
    "$s = ($t -join \"`n\") -replace '\\x1b\\[[0-9;]*m', ''",
    "$pass = @([regex]::Matches($s, '(?m)^\\s*(\\d+) pass\\s*$')) | Select-Object -Last 1",
    "$fail = @([regex]::Matches($s, '(?m)^\\s*(\\d+) fail\\s*$')) | Select-Object -Last 1",
    `if (-not $pass -or -not $fail -or [int]$pass.Groups[1].Value -lt [int]$env:RELEASE_TESTS_MIN -or $fail.Groups[1].Value -ne '0') { throw "bun test tools/release: the summary does not show 0 fail and at least $env:RELEASE_TESTS_MIN pass" }`,
  ],
  "checks/Unit suite (the surface gate inside it)": ["bun tools/release/gate.ts test --summary all"],
  "checks/Safety suite (safe)": ["bun tools/release/gate.ts test-safe --summary all"],
  "checks/Shipped suite (small, safety off)": ["bun tools/release/gate.ts test-shipped --summary all"],
  "checks/Sandbox security (a skip is a failure)": ["bun tools/release/gate.ts test-security --summary all"],
  "checks/Feature combinations and the C ABI smoke": ["bun tools/release/gate.ts features capi-smoke --summary all"],
  "checks/Spec conformance (S2 against the last release)": [
    "git -C $c fetch -q --depth 1 --filter=blob:none origin $env:CORPUS_COMMIT",
    "git -C $c checkout -q FETCH_HEAD",
    'if ((git -C $c rev-parse HEAD) -ne $env:CORPUS_COMMIT) { throw "corpus HEAD is not $env:CORPUS_COMMIT" }',
    '$tree = git -C $c rev-parse "HEAD:$env:CORPUS_PATH"',
    'if ($tree -ne $env:CORPUS_TREE) { throw "corpus tree $tree, expected $env:CORPUS_TREE" }',
    'bun tools/release/gate.ts conformance "-Dtestsuite=$c\\$env:CORPUS_PATH" "-Dbaseline=tools/conformance-baseline.txt"',
  ],
  "checks/Size gate (the shipped config)": ["bun tools/release/gate.ts size -Doptimize=small"],
  "checks/The shipped exe is standalone": [
    "$env:PATH = \"$env:SystemRoot\\System32\"",
    `if ($LASTEXITCODE -ne 0) { throw "--version exited $($LASTEXITCODE): '$($ver -join ' | ')'" }`,
    `if ($out -ne "wazmrt $v (abi 2)") { throw "version line '$out', expected 'wazmrt $v (abi 2)'" }`,
    `if ($LASTEXITCODE -ne 0 -or ($hello -join "\`n") -ne 'hello from wasi') { throw "hello_wasi: '$($hello -join ' | ')' (exit $LASTEXITCODE)" }`,
  ],
  "checks/Is this a release?": ["bun tools/release/github.ts is-release"],
  "tag/Clone this commit (no token) and install Bun (pinned by sha256)": [
    'test "$(git rev-parse HEAD)" = "$GITHUB_SHA"',
    '[ "$i" = 4 ] && exit 1; sleep $((10 * i))',
    'echo "${BUN_SHA256_LINUX}  $RUNNER_TEMP/bun.zip" | sha256sum -c -',
  ],
  "tag/Create the tag on the commit checks passed": ['bun tools/release/github.ts tag "${{ needs.checks.outputs.tag }}"'],
  "release/Clone this commit (no token) and install Bun (pinned by sha256)": [
    'test "$(git rev-parse HEAD)" = "$GITHUB_SHA"',
    '[ "$i" = 4 ] && exit 1; sleep $((10 * i))',
    'echo "${BUN_SHA256_LINUX}  $RUNNER_TEMP/bun.zip" | sha256sum -c -',
  ],
  "release/The Release page, from the tag": ['bun tools/release/github.ts release "${{ needs.checks.outputs.tag }}"'],
  "readback/Clone the TAG as a user would (no token)": [
    'git fetch -q --depth 1 origin "refs/tags/${t}:refs/tags/${t}"',
    'git checkout -q "refs/tags/$t"',
    'if ((git rev-parse HEAD) -ne $env:GITHUB_SHA) { throw "$t peels to $(git rev-parse HEAD), expected $env:GITHUB_SHA" }',
  ],
  "readback/Install Zig (pinned by sha256)": [
    "catch { if ($i -eq 4) { throw }; Start-Sleep -Seconds (10 * $i) }",
    "$h = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()",
    'if ($h -ne $env:ZIG_SHA256_WINDOWS) { throw "zig sha256 $h" }',
  ],
  "readback/Build the tag and run it": [
    "zig build -Doptimize=small",
    `if ($LASTEXITCODE -ne 0) { throw "--version exited $($LASTEXITCODE): '$($ver -join ' | ')'" }`,
    `if ($out -ne "wazmrt \${{ needs.checks.outputs.version }} (abi 2)") { throw "version line '$out'" }`,
    `if ($LASTEXITCODE -ne 0 -or ($hello -join "\`n") -ne 'hello from wasi') { throw "hello_wasi: '$($hello -join ' | ')' (exit $LASTEXITCODE)" }`,
  ],
};

test("every check line is present, exactly, in its step (round 5, A2)", () => {
  const steps = new Map<string, string[]>();
  for (const [name, job] of jobs) for (const s of job.steps) if (s.run) steps.set(`${name}/${s.name}`, code(s.run));
  for (const [where, want] of Object.entries(CHECK_LINES)) {
    const have = steps.get(where) ?? [];
    for (const line of want) expect(`${where}: ${have.includes(line) ? "ok" : `missing: ${line}`}`).toBe(`${where}: ok`);
  }
  // ... and every line in the workflow that throws or verifies is on the list: a NEW check is added
  // to the list, so removing it later is a visible edit too.
  const listed = new Set(Object.values(CHECK_LINES).flat());
  for (const [where, lines] of steps)
    for (const l of lines)
      if (/\bthrow\b|sha256sum|Get-FileHash|^test |gate\.ts|github\.ts|bun test/.test(l))
        expect(`${where}: ${listed.has(l) ? "ok" : `a check not on the list: ${l}`}`).toBe(`${where}: ok`);
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
