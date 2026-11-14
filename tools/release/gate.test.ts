// Self-test for tools/release/gate.ts. Run: `bun test tools/release`.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { childEnv, errorLines, escape, escapeProperty, exitCode, frame } from "./gate.ts";

// Every case or hook that waits on a Zig compile (a `zig cc` stub, a `zig build`) gets ten minutes
// (round 9: CI went red when a hook hit its 120 s limit). CI's self-test step runs BEFORE any build,
// so Zig's cache is empty there: measured on 32 logical processors, a cold `zig cc` of a C stub
// takes 12.1 s (it builds the C library first) against 0.1 s warm, and a windows-latest runner has 4.
const ZIG_COLD_MS = 600_000;

test("exitCode: zig's own code passes through; a signal-killed child (null) is a failure (round 4)", () => {
  expect(exitCode(0)).toBe(0);
  expect(exitCode(3)).toBe(3);
  expect(exitCode(null)).toBe(1);
});

test("exitCode: a failure whose low byte is 0 still fails, as Bun keeps only the low byte (round 5, A1)", () => {
  for (const code of [256, 512, 0xc0000100, 2 ** 32, -256]) expect(exitCode(code)).not.toBe(0);
  expect(exitCode(0xc0000005)).toBe(5); // what Bun would report anyway
});

test("childEnv withholds the command files, their folder and the runner's tokens, any case (round 2 A2, round 3 A5)", () => {
  const env = childEnv({
    GITHUB_ENV: "e", github_path: "p", GITHUB_OUTPUT: "o", GITHUB_STATE: "s", GITHUB_STEP_SUMMARY: "m",
    GITHUB_TOKEN: "t", RUNNER_TEMP: "r", ACTIONS_RUNTIME_TOKEN: "a", actions_id_token_request_url: "u",
    PATH: "x", GITHUB_SHA: "a",
  });
  expect(Object.keys(env).sort()).toEqual(["GITHUB_SHA", "PATH"]);
});

test("errorLines keeps error lines once, in order, and drops the rest", () => {
  const out = "Build Summary: 3/4\nsrc\\x.zig:1:2: error: bad\nok line\nsrc\\x.zig:1:2: error: bad\nexpected 3, found 1\n";
  expect(errorLines(out)).toEqual(["src\\x.zig:1:2: error: bad", "expected 3, found 1"]);
});

test("errorLines keeps the CLI-behaviour gate's 'did not complete' line", () => {
  const line = "cli_behaviour: `wazmrt ok.wat` did not complete: FileNotFound";
  expect(errorLines(`x\n${line}\n`)).toContain(line);
});

test("escape protects a workflow command's message", () => {
  expect(escape("50% a\nb\r")).toBe("50%25 a%0Ab%0D");
});

test("escapeProperty also escapes ':' and ',' (B6: a D:\\ path or a comma split the title)", () => {
  expect(escapeProperty("zig build conformance -Dtestsuite=D:\\x,y")).toBe("zig build conformance -Dtestsuite=D%3A\\x%2Cy");
});

test("frame: commands are stopped before the output and resumed, by token, before the annotations (B5)", () => {
  const f = frame("tok123", "zig build conformance -Dtestsuite=D:\\c", true, "::add-mask::secret\nerror: boom\n", 1);
  expect(f.before).toBe("::stop-commands::tok123");
  expect(f.after[0]).toBe("::tok123::");
  expect(f.after.slice(1)).toEqual(["::error title=zig build conformance -Dtestsuite=D%3A\\c::error: boom"]);
});

test("frame: output with no trailing newline is ended first, so the resume starts a line (round 3, A3)", () => {
  const f = frame("t", "x", true, "error: boom", 1);
  expect(f.after.slice(0, 2)).toEqual(["", "::t::"]);
  expect(frame("t", "x", false, "", 0).after).toEqual(["::t::"]);
});

test("frame: a pass resumes commands and annotates nothing", () => {
  expect(frame("t", "x", false, "error: in a passing log is not a failure\n", 0).after).toEqual(["::t::"]);
});

test("frame: a failure with no error line still annotates, with the tail", () => {
  const f = frame("t", "x", true, "quiet\n", 3);
  expect(f.after.at(-1)).toContain("exited 3 with no error line");
});

// The real thing with real zig: exit codes and the stop/resume frame.
test("end to end: exit codes and the stop/resume frame", () => {
  const fail = spawnSync("bun", ["tools/release/gate.ts", "no-such-step-xyz"], { encoding: "utf8" });
  expect(fail.status).not.toBe(0);
  const lines = fail.stdout.split(/\r?\n/);
  const stop = lines.find((l) => l.startsWith("::stop-commands::"))!;
  const token = stop.slice("::stop-commands::".length);
  expect(token).toMatch(/^[0-9a-f]{32}$/);
  const resumeAt = lines.indexOf(`::${token}::`);
  expect(resumeAt).toBeGreaterThan(lines.indexOf(stop));
  // zig prints its error on STDERR; it must arrive on our stdout INSIDE the frame (round 2, A1).
  const inside = lines.slice(lines.indexOf(stop) + 1, resumeAt).join("\n");
  expect(inside).toContain("no-such-step-xyz");
  expect(fail.stderr).toBe("");
  expect(lines.slice(resumeAt + 1).some((l) => l.startsWith("::error title=") && l.includes("no-such-step-xyz"))).toBe(true);
  const pass = spawnSync("bun", ["tools/release/gate.ts", "--help"], { encoding: "utf8" });
  expect(pass.status).toBe(0);
  expect(pass.stdout).not.toContain("::error");
}, ZIG_COLD_MS);

// A stub `zig`, first on PATH, that reports what the build would SEE (round 3, A4: the wiring was
// held only by a source-text match). It also writes its last bytes to STDERR with no newline (A3,
// round 2 A1) and exits 3.
const stubDir = mkdtempSync(join(tmpdir(), "wazmrt-gate-stub-"));
afterAll(() => rmSync(stubDir, { recursive: true, force: true }));

beforeAll(() => {
  writeFileSync(
    join(stubDir, "stub.c"),
    `#include <stdio.h>
#include <stdlib.h>
int main(void) {
  const char *n[] = {"GITHUB_ENV","GITHUB_PATH","GITHUB_OUTPUT","GITHUB_STATE","GITHUB_STEP_SUMMARY",
                     "GITHUB_TOKEN","RUNNER_TEMP","ACTIONS_RUNTIME_TOKEN","ACTIONS_ID_TOKEN_REQUEST_URL"};
  for (unsigned i = 0; i < sizeof n / sizeof *n; i++) if (getenv(n[i])) printf("LEAK %s\\n", n[i]);
  printf("stub ran\\n");
  fflush(stdout);
  fputs("stub: error: no newline at the end", stderr);
  const char *code = getenv("STUB_EXIT");
  return code ? atoi(code) : 3;
}
`,
  );
  const exe = join(stubDir, process.platform === "win32" ? "zig.exe" : "zig");
  const cc = spawnSync("zig", ["cc", join(stubDir, "stub.c"), "-o", exe], { encoding: "utf8" });
  if (cc.status !== 0) throw new Error(`zig cc failed: ${cc.stderr}`);
  // Run it once HERE: the first run of a new .exe is slow on Windows (measured 11.5 s; likely the
  // antivirus scan), and the cases that use it run under shorter limits (round 10).
  spawnSync(exe, [], { encoding: "utf8" });
}, ZIG_COLD_MS);

test("end to end with a stub zig: nothing withheld reaches the build; stderr framed; resume on its own line; a failure", () => {
  const env = stubEnv();
  Object.assign(env, {
    GITHUB_ENV: "e", github_path: "p", GITHUB_OUTPUT: "o", GITHUB_STATE: "s", GITHUB_STEP_SUMMARY: "m",
    GITHUB_TOKEN: "t", RUNNER_TEMP: "r", ACTIONS_RUNTIME_TOKEN: "a", ACTIONS_ID_TOKEN_REQUEST_URL: "u",
  });
  const r = spawnSync("bun", ["tools/release/gate.ts", "anything"], { encoding: "utf8", env });
  expect(r.status).toBe(process.platform === "win32" ? 1 : 3); // Windows: spawn.ts maps any failure to 1
  expect(r.stdout).toContain("stub ran");
  expect(r.stdout).not.toContain("LEAK");
  expect(r.stderr).toBe("");
  const lines = r.stdout.split(/\r?\n/);
  const token = lines.find((l) => l.startsWith("::stop-commands::"))!.slice("::stop-commands::".length);
  expect(lines).toContain(`::${token}::`); // a line of its own, not glued to the stub's last bytes
  expect(lines.some((l) => l.startsWith("::error title=") && l.includes("no newline at the end"))).toBe(true);
}, ZIG_COLD_MS);

function stubEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  env[pathKey] = `${stubDir}${delimiter}${env[pathKey] ?? ""}`;
  return env;
}

test("end to end: no zig on PATH is refused by name, exit 2, before the frame opens (round 7: untested)", () => {
  const env = stubEnv();
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  // Only bun's own folder: no zig there.
  env[pathKey] = join(process.execPath, "..");
  const r = spawnSync(process.execPath, ["tools/release/gate.ts", "anything"], { encoding: "utf8", env });
  expect(r.status).toBe(2);
  expect(r.stderr).toContain("`zig` is not on PATH");
  expect(r.stdout).not.toContain("::stop-commands::");
});

test("end to end: a build failing with exit 256 or 512 is a failed step, not a green one (round 5, A1)", () => {
  for (const code of ["256", "512"]) {
    const r = spawnSync("bun", ["tools/release/gate.ts", "anything"], { encoding: "utf8", env: { ...stubEnv(), STUB_EXIT: code } });
    expect(r.stdout).toContain("stub ran");
    expect(r.status).not.toBe(0);
  }
}, ZIG_COLD_MS);
