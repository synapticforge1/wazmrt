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
// `cmd.exe` would read some characters as its own syntax, so an argument holding one is REFUSED,
// never quoted around (every argument these tools pass is a git ref, a path, a flag or a version).

import { spawnSync } from "node:child_process";

export const EXIT_INTERRUPTED = 130;
export const EXIT_MISSING = 127;
const CMD_SPECIAL = /["%!^&|<>()\r\n]/;

export type Plan = { file: string; args: string[]; windowsVerbatimArguments: boolean };

export function plan(cmd: string, args: string[], platform: string = process.platform, comspec = process.env.ComSpec): Plan {
  if (platform !== "win32") return { file: cmd, args, windowsVerbatimArguments: false };
  for (const a of [cmd, ...args])
    if (CMD_SPECIAL.test(a)) throw new Error(`cannot pass ${JSON.stringify(a)} to ${cmd} through cmd.exe: it holds one of " % ! ^ & | < > ( )`);
  const line = [cmd, ...args].map((a) => `"${a}"`).join(" ");
  const map =
    "if !errorlevel!==-1073741510 (exit 130) else if !errorlevel!==9009 (exit 127) else if not !errorlevel!==0 (exit 1)";
  return { file: comspec || "cmd.exe", args: ["/d", "/v:on", "/s", "/c", `"${line} & ${map}"`], windowsVerbatimArguments: true };
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
    return { ok: s.ok && !r.error, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim(), missing: s.missing || enoent, interrupted: s.interrupted, raw: r.stdout ?? "" };
  };
}
