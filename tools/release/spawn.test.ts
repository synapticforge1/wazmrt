// spawn.ts — a child's exit status as these tools read it (review round 5, A1). The end-to-end cases
// run a REAL stub executable (built by `zig cc`) that exits with the code it is given, through the
// real runner: what Bun alone reads as 0 must be a failure, and Ctrl-C must read as interrupted.
// Run: `bun test tools/release`.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { copyFileSync, linkSync, lstatSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, win32 } from "node:path";
import { spawnSync } from "node:child_process";
import { DEFAULT_PATHEXT, checkPath, pathOf, plan, runner, splitPath, status, whichWin } from "./spawn.ts";

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

test("splitPath: on `;` outside quotes, quotes dropped, empty entries skipped", () => {
  expect(splitPath('"C:\\a;b";C:\\c')).toEqual(["C:\\a;b", "C:\\c"]); // `;` inside quotes is part of the folder
  expect(splitPath("D;;Y;")).toEqual(["D", "Y"]);
  expect(splitPath('X;"D";Y')).toEqual(["X", "D", "Y"]);
});

test("checkPath: every shape cmd.exe reads differently BY MACHINE or from Node is refused by name (round 11, measured)", () => {
  const refused: [string, string, string][] = [
    [" C:\\d;C:\\y", "", "leading or trailing spaces"], // the first entry: depends on NoDefaultCurrentDirectoryInExePath
    ["\tC:\\d;C:\\y", "", "leading or trailing spaces"],
    ["C:\\x; C:\\d", "", "leading or trailing spaces"],
    ["C:\\d ;C:\\y", "", "leading or trailing spaces"],
    ['C:\\x;" C:\\d";C:\\y', "", "leading or trailing spaces"], // spaces INSIDE the quotes
    [";C:\\d", "", "starts with an empty entry"], // also depends on the variable
    ["  ;C:\\d", "", "starts with an empty entry"],
    ['C:\\x;"";C:\\d', "", "quoted empty entry"], // ends cmd's search
    ["C:\\d.;C:\\y", "", "ending in `.`"], // cmd drops the dot, Node does not
    ['C:\\x;"C:\\d;C:\\y', "", "unclosed double quote"],
    ["C:\\d", ".COM; .EXE", "PATHEXT holds"], // cmd does not trim PATHEXT
    ["C:\\d", ".COM;;.EXE", "PATHEXT holds"],
  ];
  for (const [path, pathext, why] of refused) expect(() => checkPath(path, pathext || DEFAULT_PATHEXT)).toThrow(why);
  expect(() => checkPath("C:\\x;;C:\\d;", DEFAULT_PATHEXT)).not.toThrow(); // empty entries LATER are read alike
  expect(() => whichWin("C:\\bin\\zig.exe", ";C:\\bin")).not.toThrow(); // a full path is not searched
});

test("whichWin: an App Execution Alias (stat cannot open it) counts as a program, as cmd runs it (round 10, measured)", () => {
  if (process.platform !== "win32") return;
  const apps = join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WindowsApps");
  // Only where such an alias exists (not on every runner): the alias itself is the proof.
  const alias = ["winget.exe", "python.exe", "wt.exe"].map((n) => join(apps, n)).find((p) => {
    try {
      lstatSync(p);
      return true;
    } catch {
      return false;
    }
  });
  if (!alias) return;
  expect(whichWin(basename(alias, ".exe"), apps)?.toLowerCase()).toBe(alias.toLowerCase());
});

test("plan: a resolved file whose extension is not in PATHEXT is refused — it would open by file association (round 10)", () => {
  expect(() => plan("z.ps1", [], "win32", "cmd.exe", () => "C:\\bin\\z.ps1")).toThrow("not a program");
  expect(() => plan("v.txt", [], "win32", "cmd.exe", () => "C:\\bin\\v.txt")).toThrow("not a program");
});

test("plan: three leading separators is no UNC path: refused (round 9)", () => {
  expect(() => plan("zig", [], "win32", "cmd.exe", () => "\\\\\\x\\zig.exe")).toThrow("a relative path");
});

test("whichWin: PATH folders in order, PATHEXT in order, a named file as written first", () => {
  const d1 = join(stubDir, "w1");
  const d2 = join(stubDir, "w2");
  mkdirSync(d1, { recursive: true });
  mkdirSync(d2, { recursive: true });
  writeFileSync(join(d1, "tool.cmd"), "");
  writeFileSync(join(d2, "tool.exe"), "");
  writeFileSync(join(d2, "tool.com"), "");
  // The first FOLDER wins, whatever the extension (cmd's order), then PATHEXT within a folder.
  // NTFS is case-blind: the result carries PATHEXT's spelling of the extension.
  const lc = (p: string | null) => p?.toLowerCase() ?? null;
  expect(lc(whichWin("tool", `${d1};${d2}`))).toBe(lc(join(d1, "tool.cmd")));
  expect(lc(whichWin("tool", d2))).toBe(lc(join(d2, "tool.com")));
  expect(lc(whichWin("tool", d2, ".EXE;.COM"))).toBe(lc(join(d2, "tool.exe")));
  expect(lc(whichWin(join(d2, "tool.exe"), ""))).toBe(lc(join(d2, "tool.exe")));
  expect(whichWin("nothing-here", `${d1};${d2}`)).toBeNull();
});

test("end to end: a command in a QUOTED PATH entry holding `;` is found and runs (round 9, measured with cmd)", () => {
  if (process.platform !== "win32") return;
  const odd = join(stubDir, "a;b");
  mkdirSync(odd, { recursive: true });
  copyFileSync(echo, join(odd, "semi-echo.exe"));
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const saved = process.env[pathKey];
  process.env[pathKey] = `"${odd}";${saved ?? ""}`;
  try {
    const r = runner(stubDir)("semi-echo", ["s"]);
    expect(r.missing).toBe(false);
    expect(r.out).toBe("[s]");
  } finally {
    process.env[pathKey] = saved;
  }
}, 60_000); // the FIRST run of a freshly copied .exe is slow on Windows (measured 11.5 s here; likely the antivirus scan)

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
const whereExe = exe("where-am-i"); // prints the path it was started from
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
  writeFileSync(
    join(stubDir, "where.c"),
    process.platform === "win32"
      ? `#include <windows.h>
#include <stdio.h>
int main(void) { char b[MAX_PATH]; GetModuleFileNameA(NULL, b, MAX_PATH); printf("%s\\n", b); return 0; }
`
      : "int main(void) { return 0; }\n",
  );
  for (const [src, out] of [["stub.c", stub], ["echo.c", echo], ["where.c", whereExe]]) {
    const cc = spawnSync("zig", ["cc", join(stubDir, src), "-o", out], { encoding: "utf8" });
    if (cc.status !== 0) throw new Error(`zig cc failed: ${cc.stderr}`);
    // Run each once HERE: the first run of a new .exe is slow on Windows (measured 11.5 s; likely the
    // antivirus scan), and a test's own limit is Bun's 5 s (round 10).
    spawnSync(out, ["0"], { encoding: "utf8" });
  }
}, 600_000); // a cold `zig cc` builds the C library first: see ZIG_COLD_MS in gate.test.ts (round 9)

test("DIFFERENTIAL: on every PATH shape accepted, whichWin picks the program the REAL cmd.exe runs — with NoDefaultCurrentDirectoryInExePath set AND unset (round 11)", () => {
  if (process.platform !== "win32") return;
  const root = join(stubDir, "diff");
  const dir = (n: string) => {
    const d = join(root, n);
    mkdirSync(d, { recursive: true });
    return d;
  };
  const [D, Y, X, semi, J] = [dir("D"), dir("Y"), dir("X"), dir("a;b"), dir("J")];
  const empty = dir("cwd-empty");
  // HARD links of one already-run stub: the same file, so no slow first run per folder.
  for (const d of [D, Y, semi]) linkSync(whereExe, join(d, "zq.exe"));
  // A DANGLING junction named zq.exe (round 11: cmd skips it).
  const gone = dir("gone");
  symlinkSync(gone, join(J, "zq.exe"), "junction");
  rmSync(gone, { recursive: true, force: true });
  const shapes = [
    `${D};${Y}`,
    `${X};${D};${Y}`,
    `${X};;${D}`,
    `${D};`,
    `"${D}";${X}`,
    `${X};"${D}";${Y}`,
    `${X};${D}\\;${Y}`,
    `${X};${D.replaceAll("\\", "/")}/;${Y}`,
    `${X};${Y}`,
    `${X}`,
    `"${semi}";${Y}`,
    `${J};${Y}`,
  ];
  // PATHEXT decides between two programs in ONE folder (round 12: no PATHEXT case was compared).
  const both = dir("both");
  linkSync(whereExe, join(both, "zq.exe"));
  linkSync(whereExe, join(both, "zq.com"));
  const cases: [string, string][] = [
    ...shapes.map((p) => [p, DEFAULT_PATHEXT] as [string, string]),
    [`${X};${both}`, ".COM;.EXE"],
    [`${X};${both}`, ".EXE;.COM"],
    [`${X};${both}`, ".com;.exe"], // lower case
    [`${X};${both}`, ".EXE;.EXE;.COM"], // a duplicate
  ];
  const cmdRuns = (path: string, pathext: string, flag: boolean): string | null => {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env))
      if (v !== undefined && !["PATH", "PATHEXT", "NODEFAULTCURRENTDIRECTORYINEXEPATH"].includes(k.toUpperCase())) env[k] = v;
    env.PATH = path;
    env.PATHEXT = pathext;
    if (flag) env.NoDefaultCurrentDirectoryInExePath = "1";
    const r = spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", "zq"], { cwd: empty, env, encoding: "utf8" });
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim().toLowerCase() : null;
  };
  const norm = (p: string | null) => (p === null ? null : win32.normalize(p).toLowerCase());
  for (const [path, pathext] of cases) {
    const ours = norm(whichWin("zq", path, pathext));
    for (const flag of [true, false]) {
      const label = `${path} PATHEXT=${pathext} [variable ${flag ? "set" : "unset"}]`;
      expect(`${label}: ${ours}`).toBe(`${label}: ${norm(cmdRuns(path, pathext, flag))}`);
    }
  }
}, 60_000);

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
