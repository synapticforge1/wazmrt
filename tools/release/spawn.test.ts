// spawn.ts — a child's exit status as these tools read it (review round 5, A1). The end-to-end cases
// run a REAL stub executable (built by `zig cc`) that exits with the code it is given, through the
// real runner: what Bun alone reads as 0 must be a failure, and Ctrl-C must read as interrupted.
// Run: `bun test tools/release`.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { cleanPath, pathOf, plan, runner, status } from "./spawn.ts";

test("plan: elsewhere the child runs directly", () => {
  expect(plan("zig", ["build", "test"], "linux")).toEqual({ file: "zig", args: ["build", "test"], windowsVerbatimArguments: false });
});

const asIs = (c: string) => `C:\\bin\\${c}.exe`; // a resolver that finds everything, absolute

test("plan: on Windows through cmd.exe, the RESOLVED command and every argument quoted, the exit code mapped", () => {
  const p = plan("git", ["commit", "-m", "bump to v5.0.2"], "win32", "C:\\Windows\\system32\\cmd.exe", () => "C:\\Git\\cmd\\git.exe");
  expect(p.file).toBe("C:\\Windows\\system32\\cmd.exe");
  expect(p.windowsVerbatimArguments).toBe(true);
  expect(p.args.slice(0, 4)).toEqual(["/d", "/v:on", "/s", "/c"]);
  expect(p.args[4]).toBe(
    `""C:\\Git\\cmd\\git.exe" "commit" "-m" "bump to v5.0.2" & if !errorlevel!==-1073741510 (exit 130) else if not !errorlevel!==0 (exit 1)"`,
  );
});

test("plan: a resolved path that is relative, a batch file, or holds % ! is refused BY NAME (round 7)", () => {
  expect(() => plan("git", [], "win32", "cmd.exe", () => ".\\git.exe")).toThrow("a relative path");
  expect(() => plan("zig", [], "win32", "cmd.exe", () => "C:\\shims\\zig.cmd")).toThrow("the batch file");
  expect(() => plan("zig", [], "win32", "cmd.exe", () => "C:\\shims\\ZIG.BAT")).toThrow("the batch file");
  expect(() => plan("zig", [], "win32", "cmd.exe", () => "C:\\Users\\a!b\\zig.exe")).toThrow("zig resolves to C:\\Users\\a!b\\zig.exe, whose path holds");
});

test("plan: a path rooted without a drive is drive-relative: refused; UNC and drive paths pass (round 8)", () => {
  expect(() => plan("zig", [], "win32", "cmd.exe", () => "\\tools\\zig.exe")).toThrow("a relative path");
  expect(() => plan("zig", [], "win32", "cmd.exe", () => "/tools/zig.exe")).toThrow("a relative path");
  expect(plan("zig", [], "win32", "cmd.exe", () => "\\\\server\\share\\zig.exe").missing).toBeUndefined();
  expect(plan("zig", [], "win32", "cmd.exe", () => "C:/tools/zig.exe").missing).toBeUndefined();
});

test("cleanPath: quoted and padded PATH entries read as cmd.exe reads them (round 8)", () => {
  expect(cleanPath(' "C:\\a b\\shims" ;C:\\x; ;"D:\\y"')).toBe("C:\\a b\\shims;C:\\x;D:\\y");
});

test("end to end: a command on a QUOTED PATH entry is found, not 'missing' (round 8, measured)", () => {
  if (process.platform !== "win32") return;
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const saved = process.env[pathKey];
  process.env[pathKey] = `"${stubDir}";${saved ?? ""}`;
  try {
    const r = runner(stubDir)("echo-argv", ["q"]);
    expect(r.missing).toBe(false);
    expect(r.out).toBe("[q]");
  } finally {
    process.env[pathKey] = saved;
  }
});

test("pathOf: the first non-empty spelling of PATH (round 7)", () => {
  expect(pathOf({ PATH: "", Path: "B" })).toBe("B");
  expect(pathOf({ Path: "A" })).toBe("A");
  expect(pathOf({})).toBe("");
});

test("end to end: a batch file found on PATH is refused, not run (round 7: its own `exit 256` read as a pass)", () => {
  if (process.platform !== "win32") return;
  const dir = join(stubDir, "bat");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "wazmrt-shim-xyz.cmd"), "@exit 256\r\n");
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const saved = process.env[pathKey];
  process.env[pathKey] = `${dir};${saved ?? ""}`;
  try {
    expect(() => runner(stubDir)("wazmrt-shim-xyz", [])).toThrow("the batch file");
  } finally {
    process.env[pathKey] = saved;
  }
});

test("plan: a command that does not resolve is MISSING, and nothing is planned to run (round 7)", () => {
  const p = plan("zig", ["build"], "win32", "cmd.exe", () => null);
  expect(p.missing).toBe(true);
});

test("plan: an argument that would not arrive EXACTLY is refused, never quoted around (rounds 5, 6)", () => {
  for (const bad of ['a"b', "%PATH%", "a!b", "a\nb", "a\rb", "C:\\dir\\", "x\\\\"])
    expect(() => plan("git", ["log", bad], "win32", "cmd.exe", asIs)).toThrow("cannot pass");
  expect(() => plan("git", ["log", "a%b"], "linux")).not.toThrow(); // only cmd.exe reads them
});

test("plan: a command line past cmd.exe's limit is refused by name (round 6)", () => {
  expect(() => plan("git", ["x".repeat(9000)], "win32", "cmd.exe", asIs)).toThrow("cmd.exe takes at most");
});

test("status: pass, interrupted (SIGINT, 130, and Windows' 58 = cmd ended by Ctrl-C) — and no exit code means 'missing' (round 7)", () => {
  expect(status(0, null)).toEqual({ ok: true, interrupted: false });
  expect(status(1, null).ok).toBe(false);
  expect(status(null, "SIGINT").interrupted).toBe(true);
  expect(status(130, null).interrupted).toBe(true);
  expect(status(58, null, "win32").interrupted).toBe(true);
  expect(status(58, null, "linux").interrupted).toBe(false);
  expect(status(null, "SIGTERM")).toEqual({ ok: false, interrupted: false });
  expect(status(127, null)).toEqual({ ok: false, interrupted: false });
  expect(status(9009, null)).toEqual({ ok: false, interrupted: false });
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

test("end to end: a REAL exit of 9009 or 127 is a failure, not 'missing' (round 7)", () => {
  for (const code of ["9009", "127"]) {
    const r = runner(stubDir)(stub, [code]);
    expect({ code, ok: r.ok, missing: r.missing }).toEqual({ code, ok: false, missing: false });
  }
});

test("end to end: a same-named program in the CURRENT directory is not run — only what PATH resolves (round 7)", () => {
  if (process.platform !== "win32") return;
  // echo-argv.exe sits in the cwd (stubDir) but not on PATH: cmd alone could search the cwd first.
  const r = runner(stubDir)("echo-argv", ["x"]);
  expect(r.missing).toBe(true);
  expect(r.out).toBe("");
});
