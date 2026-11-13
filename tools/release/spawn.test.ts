// spawn.ts — a child's exit status as these tools read it (review round 5, A1). The end-to-end cases
// run a REAL stub executable (built by `zig cc`) that exits with the code it is given, through the
// real runner: what Bun alone reads as 0 must be a failure, and Ctrl-C must read as interrupted.
// Run: `bun test tools/release`.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { plan, runner, status } from "./spawn.ts";

test("plan: elsewhere the child runs directly", () => {
  expect(plan("zig", ["build", "test"], "linux")).toEqual({ file: "zig", args: ["build", "test"], windowsVerbatimArguments: false });
});

test("plan: on Windows through cmd.exe, every argument quoted, the exit code mapped", () => {
  const p = plan("git", ["commit", "-m", "bump to v5.0.2"], "win32", "C:\\Windows\\system32\\cmd.exe");
  expect(p.file).toBe("C:\\Windows\\system32\\cmd.exe");
  expect(p.windowsVerbatimArguments).toBe(true);
  expect(p.args.slice(0, 4)).toEqual(["/d", "/v:on", "/s", "/c"]);
  expect(p.args[4]).toStartWith(`""git" "commit" "-m" "bump to v5.0.2" & if !errorlevel!==-1073741510 (exit 130)`);
});

test("plan: an argument that would not arrive EXACTLY is refused, never quoted around (rounds 5, 6)", () => {
  for (const bad of ['a"b', "%PATH%", "a!b", "a\nb", "a\rb", "C:\\dir\\", "x\\\\"])
    expect(() => plan("git", ["log", bad], "win32", "cmd.exe")).toThrow("cannot pass");
  expect(() => plan("git", ["log", "a%b"], "linux")).not.toThrow(); // only cmd.exe reads them
});

test("plan: a command line past cmd.exe's limit is refused by name (round 6)", () => {
  expect(() => plan("git", ["x".repeat(9000)], "win32", "cmd.exe")).toThrow("cmd.exe takes at most");
});

test("status: pass, interrupted (SIGINT, 130, and Windows' 58 = cmd ended by Ctrl-C), missing", () => {
  expect(status(0, null)).toEqual({ ok: true, interrupted: false, missing: false });
  expect(status(1, null).ok).toBe(false);
  expect(status(null, "SIGINT").interrupted).toBe(true);
  expect(status(130, null).interrupted).toBe(true);
  expect(status(58, null, "win32").interrupted).toBe(true);
  expect(status(58, null, "linux").interrupted).toBe(false);
  expect(status(null, "SIGTERM")).toEqual({ ok: false, interrupted: false, missing: false });
  expect(status(127, null).missing).toBe(true);
});

const stubDir = mkdtempSync(join(tmpdir(), "wazmrt-spawn-stub-"));
const exe = (n: string) => join(stubDir, process.platform === "win32" ? `${n}.exe` : n);
const stub = exe("stub");
const echo = exe("echo-argv");
afterAll(() => rmSync(stubDir, { recursive: true, force: true }));
beforeAll(() => {
  writeFileSync(
    join(stubDir, "stub.c"),
    `#include <stdlib.h>
int main(int argc, char **argv) { return argc > 1 ? (int)strtoul(argv[1], 0, 0) : 0; }
`,
  );
  writeFileSync(
    join(stubDir, "echo.c"),
    `#include <stdio.h>
int main(int argc, char **argv) { for (int i = 1; i < argc; i++) printf("[%s]\\n", argv[i]); return 0; }
`,
  );
  for (const [src, out] of [["stub.c", stub], ["echo.c", echo]]) {
    const cc = spawnSync("zig", ["cc", join(stubDir, src), "-o", out], { encoding: "utf8" });
    if (cc.status !== 0) throw new Error(`zig cc failed: ${cc.stderr}`);
  }
}, 120_000);

test("end to end: every argument the plan ALLOWS arrives exactly, one argument each (round 6)", () => {
  const args = ["Program Files (x86)", "a&b", "a|b", "a<b", "a>b", "a^b", "a b c", "C:\\dir\\x", "", "=,;@~", "HEAD~1:src/root.zig", "-Dtestsuite=D:\\a\\_temp\\corpus\\x"];
  const r = runner(stubDir)(echo, args);
  expect(r.ok).toBe(true);
  expect(r.out.split(/\r?\n/)).toEqual(args.map((a) => `[${a}]`));
});

test("a cmd.exe that cannot be started is said so, not reported as the command missing (round 6)", () => {
  if (process.platform !== "win32") return;
  const saved = process.env.ComSpec;
  process.env.ComSpec = join(stubDir, "no-such-cmd.exe");
  try {
    expect(() => runner(stubDir)("git", ["--version"])).toThrow("cannot start cmd.exe");
  } finally {
    process.env.ComSpec = saved;
  }
});

test("end to end: the codes Bun alone reads as 0 are failures; 0 is a pass", () => {
  const run = runner(stubDir);
  expect(run(stub, ["0"]).ok).toBe(true);
  for (const code of ["1", "256", "512", "0xC0000100", "0xC0000005"]) {
    const r = run(stub, [code]);
    expect({ code, ok: r.ok }).toEqual({ code, ok: false });
    expect(r.interrupted).toBe(false);
  }
});

test("end to end: STATUS_CONTROL_C_EXIT reads as interrupted (Bun alone reads 58, which nothing checked)", () => {
  const r = runner(stubDir)(stub, ["0xC000013A"]);
  expect(r.ok).toBe(false);
  expect(r.interrupted).toBe(true);
});

test("end to end: a command that does not exist reads as missing", () => {
  const r = runner(stubDir)("wazmrt-no-such-command-xyz", []);
  expect(r.ok).toBe(false);
  expect(r.missing).toBe(true);
});
