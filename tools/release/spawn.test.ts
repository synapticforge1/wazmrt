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

test("plan: an argument cmd.exe would read as syntax is REFUSED, never quoted around", () => {
  for (const bad of ['a"b', "%PATH%", "a!b", "a^b", "a&b", "a|b", "a<b", "a>b", "(a)", "a\nb"])
    expect(() => plan("git", ["log", bad], "win32", "cmd.exe")).toThrow("cannot pass");
  expect(() => plan("git", ["log", "a%b"], "linux")).not.toThrow(); // only cmd.exe reads them
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
const stub = join(stubDir, process.platform === "win32" ? "stub.exe" : "stub");
afterAll(() => rmSync(stubDir, { recursive: true, force: true }));
beforeAll(() => {
  writeFileSync(
    join(stubDir, "stub.c"),
    `#include <stdlib.h>
int main(int argc, char **argv) { return argc > 1 ? (int)strtoul(argv[1], 0, 0) : 0; }
`,
  );
  const cc = spawnSync("zig", ["cc", join(stubDir, "stub.c"), "-o", stub], { encoding: "utf8" });
  if (cc.status !== 0) throw new Error(`zig cc failed: ${cc.stderr}`);
}, 120_000);

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
