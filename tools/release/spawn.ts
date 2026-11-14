// tools/release/spawn.ts — run a child so that its exit status survives Bun on Windows.
//
// 🔒 Review round 5, A1 (measured, Bun 1.4.4 on Windows 11): Bun reads only the LOW BYTE of a
// child's exit code — `spawnSync`, `spawn` and `Bun.spawn` alike report 256, 512 and 0xC0000100 as
// 0, a pass, and STATUS_CONTROL_C_EXIT (0xC000013A) as 58. PowerShell sees the true 256. So on
// Windows every child of these tools runs through `cmd.exe`, which reads the whole code and maps it
// to one Bun reads exactly:
//
//   0 → 0 · STATUS_CONTROL_C_EXIT → 130 · any other → 1
//
// and when `cmd.exe` ITSELF is ended by the Ctrl-C (before its mapping runs) Bun reads 58, which the
// mapping never produces — so 58 also means "interrupted". Elsewhere the child runs directly.
//
// "Missing" is never read from an exit code (round 7: a real exit of 9009 — cmd's "not recognized"
// — or 127 read as missing). On Windows the command is RESOLVED first, by `whichWin`, which searches
// PATH as cmd.exe does (entries split outside quotes, each folder with each PATHEXT extension in
// order; round 9 — `Bun.which` could not take an entry holding `;`), and cmd is handed that
// absolute path — so a same-named file in the current directory, which cmd would search first, is
// never the one run; unresolved, it is missing and nothing runs. Elsewhere, missing is ENOENT.
//
// An argument that would not reach the child EXACTLY is REFUSED, never quoted around (round 6,
// measured with a stub that prints its argv): `"` ends the quoting; `%` and `!` are expanded by
// cmd (`/v:on`); CR / LF end the line; a TRAILING backslash escapes the closing quote, so
// `C:\dir\` arrives as `C:\dir" next` (two arguments merged). Inside the quotes `( ) & | < > ^` arrive
// unchanged and are allowed (round 6: `Program Files (x86)` was refused for nothing). A line past
// cmd's limit is refused by name.

import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { win32 } from "node:path";

export const EXIT_INTERRUPTED = 130;
const CMD_UNSAFE = /["%!\r\n]|\\$/;
const CMD_MAX_LINE = 8000; // cmd.exe's limit is 8191 characters, the mapping included

/** An environment variable the child will inherit, found case-insensitively (Windows spells it `Path`). */
function envOf(env: Record<string, string | undefined>, name: string): string {
  // The first NON-EMPTY spelling (round 7: `{PATH: "", Path: "B"}` gave "").
  const key = Object.keys(env).find((k) => k.toUpperCase() === name && env[k]);
  return (key && env[key]) || "";
}

/** The PATH the child will inherit — read at run time (round 7: `Bun.which`'s default did not see a changed PATH). */
export function pathOf(env: Record<string, string | undefined>): string {
  return envOf(env, "PATH");
}

/**
 * A Windows PATH split as cmd.exe splits it (measured with cmd.exe, rounds 8–9): `;` separates
 * entries only OUTSIDE double quotes (`"C:\a;b"` is ONE folder); an entry's surrounding spaces are
 * dropped, then its quotes — spaces INSIDE the quotes stay (cmd finds nothing in `" C:\dir "`).
 */
export function splitPath(path: string): string[] {
  const raw: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of path) {
    if (ch === '"') quoted = !quoted;
    if (ch === ";" && !quoted) {
      raw.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  raw.push(cur);
  return raw.map((e) => e.trim().replaceAll('"', "")).filter((e) => e !== "");
}

/**
 * The file cmd.exe would run for `cmd`: a name with a folder is looked up where it says; a bare name
 * in each PATH folder in order, each with each PATHEXT extension in order (and as written first, if
 * it already has an extension). Null when there is none.
 */
export function whichWin(cmd: string, path: string, pathext = ".COM;.EXE;.BAT;.CMD"): string | null {
  const exts = pathext.split(";").map((e) => e.trim()).filter((e) => e !== "");
  const named = /\.[^.\\/]+$/.test(cmd);
  const candidates = (base: string) => (named ? [base, ...exts.map((e) => base + e)] : exts.map((e) => base + e));
  const isFile = (p: string) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  };
  const bases = /[\\/]/.test(cmd) ? [cmd] : splitPath(path).map((dir) => win32.join(dir, cmd));
  for (const base of bases) for (const c of candidates(base)) if (isFile(c)) return c;
  return null;
}

/** What runs: `missing` when the command does not resolve (Windows) — then nothing may run. */
export type Plan = { file: string; args: string[]; windowsVerbatimArguments: boolean; missing?: boolean };

export function plan(
  cmd: string,
  args: string[],
  platform: string = process.platform,
  comspec = process.env.ComSpec,
  resolve: (cmd: string) => string | null = (c) => whichWin(c, pathOf(process.env), envOf(process.env, "PATHEXT") || undefined),
): Plan {
  if (platform !== "win32") return { file: cmd, args, windowsVerbatimArguments: false };
  const exe = resolve(cmd);
  if (exe === null) return { file: cmd, args, windowsVerbatimArguments: true, missing: true };
  // 🔒 Round 7 (both RUN by the reviewer): a RELATIVE result (a `.` or relative PATH entry) is
  // resolved against THIS process's directory but would run in the child's — another file; and a
  // batch file (`.cmd` / `.bat`) runs INSIDE our cmd line, where its own `exit N` ends cmd before
  // the mapping, so a 256 reads as a pass again. Both refused; zig, git and bun are `.exe`.
  // `\dir\x.exe` counts as absolute to `isAbsolute` but is DRIVE-relative (round 8): refused too;
  // a UNC path (`\\server\…`) and a drive path pass.
  // Three leading separators is no UNC path either (round 9).
  if (!win32.isAbsolute(exe) || /^[\\/](?![\\/])/.test(exe) || /^[\\/]{3}/.test(exe))
    throw new Error(`${cmd} resolves to ${exe}, a relative path (a relative PATH entry); refusing to guess which file runs`);
  if (/\.(cmd|bat)$/i.test(exe)) throw new Error(`${cmd} resolves to the batch file ${exe}; its own \`exit\` would bypass the exit-code mapping — put the real .exe first on PATH`);
  if (CMD_UNSAFE.test(exe)) throw new Error(`${cmd} resolves to ${exe}, whose path holds " % or !, which cmd.exe would change; install it on a path without them`);
  for (const a of args)
    if (CMD_UNSAFE.test(a))
      throw new Error(`cannot pass ${JSON.stringify(a)} to ${cmd} through cmd.exe unchanged: it holds " % ! a line break, or ends in a backslash`);
  const line = [exe, ...args].map((a) => `"${a}"`).join(" ");
  const map = "if !errorlevel!==-1073741510 (exit 130) else if not !errorlevel!==0 (exit 1)";
  const full = `"${line} & ${map}"`;
  if (full.length > CMD_MAX_LINE) throw new Error(`the command line for ${cmd} is ${full.length} characters; cmd.exe takes at most ${CMD_MAX_LINE} here`);
  return { file: comspec || "cmd.exe", args: ["/d", "/v:on", "/s", "/c", full], windowsVerbatimArguments: true };
}

/** The child's status, as these tools read it: did it pass, was it interrupted? (Never "missing": see the header.) */
export function status(code: number | null, signal: string | null, platform: string = process.platform) {
  const interrupted = signal === "SIGINT" || code === EXIT_INTERRUPTED || (platform === "win32" && code === 58);
  return { ok: code === 0, interrupted };
}

// `out` is trimmed for convenience; `raw` is the stdout exactly as written, for comparing file
// CONTENTS (review round 3, B1: a trimmed comparison could not see whitespace at either end).
export type Result = { ok: boolean; out: string; err: string; missing?: boolean; interrupted?: boolean; raw?: string };
export type Run = (cmd: string, args: string[], inherit?: boolean) => Result;

/** The runner `bump.ts` and `push.ts` use: synchronous, through `plan`, read through `status`. */
export function runner(cwd: string): Run {
  return (cmd, args, inherit = false) => {
    const p = plan(cmd, args);
    if (p.missing) return { ok: false, out: "", err: `${cmd}: not found on PATH`, missing: true, interrupted: false, raw: "" };
    const r = spawnSync(p.file, p.args, { cwd, encoding: "utf8", stdio: inherit ? "inherit" : "pipe", windowsVerbatimArguments: p.windowsVerbatimArguments });
    const s = status(r.status, r.signal);
    const enoent = (r.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
    // On Windows the process started is cmd.exe: its absence is not "<cmd> is missing" (round 6).
    if (enoent && p.windowsVerbatimArguments) throw new Error(`cannot start cmd.exe (${p.file}); check ComSpec`);
    return { ok: s.ok && !r.error, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim(), missing: enoent, interrupted: s.interrupted, raw: r.stdout ?? "" };
  };
}
