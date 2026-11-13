// tools/release/spawn.ts — run a child so that its exit status survives Bun on Windows.
//
// 🔒 Review round 5, A1 (measured, Bun 1.4.4 on Windows 11): Bun reads only the LOW BYTE of a
// child's exit code — `spawnSync`, `spawn` and `Bun.spawn` alike report 256, 512 and 0xC0000100 as
// 0, a pass, and STATUS_CONTROL_C_EXIT (0xC000013A) as 58. PowerShell sees the true 256. So on
// Windows every child of these tools runs through `cmd.exe`, which reads the whole code and maps it
// to one Bun reads exactly:
//
//   0 → 0 · STATUS_CONTROL_C_EXIT → 130 · "not recognized" (9009) → 127 · any other → 1
//
// and when `cmd.exe` ITSELF is ended by the Ctrl-C (before its mapping runs) Bun reads 58, which the
// mapping never produces — so 58 also means "interrupted". Elsewhere the child runs directly.
//
// An argument that would not reach the child EXACTLY is REFUSED, never quoted around (round 6,
// measured with a stub that prints its argv): `"` ends the quoting; `%` and `!` are expanded by
// cmd (`/v:on`); CR / LF end the line; a TRAILING backslash escapes the closing quote, so
// `C:\dir\` arrives as `C:\dir" next` (two arguments merged). Inside the quotes `( ) & | < > ^` arrive
// unchanged and are allowed (round 6: `Program Files (x86)` was refused for nothing). A line past
// cmd's limit is refused by name.

import { spawnSync } from "node:child_process";

export const EXIT_INTERRUPTED = 130;
export const EXIT_MISSING = 127;
const CMD_UNSAFE = /["%!\r\n]|\\$/;
const CMD_MAX_LINE = 8000; // cmd.exe's limit is 8191 characters, the mapping included

export type Plan = { file: string; args: string[]; windowsVerbatimArguments: boolean };

export function plan(cmd: string, args: string[], platform: string = process.platform, comspec = process.env.ComSpec): Plan {
  if (platform !== "win32") return { file: cmd, args, windowsVerbatimArguments: false };
  for (const a of [cmd, ...args])
    if (CMD_UNSAFE.test(a))
      throw new Error(`cannot pass ${JSON.stringify(a)} to ${cmd} through cmd.exe unchanged: it holds " % ! a line break, or ends in a backslash`);
  const line = [cmd, ...args].map((a) => `"${a}"`).join(" ");
  const map =
    "if !errorlevel!==-1073741510 (exit 130) else if !errorlevel!==9009 (exit 127) else if not !errorlevel!==0 (exit 1)";
  const full = `"${line} & ${map}"`;
  if (full.length > CMD_MAX_LINE) throw new Error(`the command line for ${cmd} is ${full.length} characters; cmd.exe takes at most ${CMD_MAX_LINE} here`);
  return { file: comspec || "cmd.exe", args: ["/d", "/v:on", "/s", "/c", full], windowsVerbatimArguments: true };
}

/** The child's status, as these tools read it: did it pass, was it interrupted, was it missing? */
export function status(code: number | null, signal: string | null, platform: string = process.platform) {
  const interrupted = signal === "SIGINT" || code === EXIT_INTERRUPTED || (platform === "win32" && code === 58);
  return { ok: code === 0, interrupted, missing: code === EXIT_MISSING };
}

// `out` is trimmed for convenience; `raw` is the stdout exactly as written, for comparing file
// CONTENTS (review round 3, B1: a trimmed comparison could not see whitespace at either end).
export type Result = { ok: boolean; out: string; err: string; missing?: boolean; interrupted?: boolean; raw?: string };
export type Run = (cmd: string, args: string[], inherit?: boolean) => Result;

/** The runner `bump.ts` and `push.ts` use: synchronous, through `plan`, read through `status`. */
export function runner(cwd: string): Run {
  return (cmd, args, inherit = false) => {
    const p = plan(cmd, args);
    const r = spawnSync(p.file, p.args, { cwd, encoding: "utf8", stdio: inherit ? "inherit" : "pipe", windowsVerbatimArguments: p.windowsVerbatimArguments });
    const s = status(r.status, r.signal);
    const enoent = (r.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
    // On Windows the process started is cmd.exe: its absence is not "<cmd> is missing" (round 6).
    if (enoent && p.windowsVerbatimArguments) throw new Error(`cannot start cmd.exe (${p.file}); check ComSpec`);
    return { ok: s.ok && !r.error, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim(), missing: s.missing || enoent, interrupted: s.interrupted, raw: r.stdout ?? "" };
  };
}
