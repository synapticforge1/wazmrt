// run.ts — the one process helper the probes share (Bun since 2026-10-23, workspace letter H15).
//
// It returns what `await new Deno.Command(cmd, opts).output()` returned, so porting a probe off Deno
// is a mechanical swap: `code`, `success`, and `stdout` / `stderr` as BYTES. Three Deno behaviours
// are kept on purpose, because a probe's verdict can hang on each:
//   - `env` is MERGED into the parent's environment (Deno's `clearEnv` defaults to false);
//   - stdin is inherited, stdout and stderr are piped unless a probe says "null";
//   - a command that does not exist REJECTS (Deno threw NotFound), so `try { … } catch` still works.
//
//   import { output } from "./run.ts";
//   const r = await output("wasm-tools", { args: ["validate", f], stdout: "null", stderr: "null" });
import { spawn } from "node:child_process";

type Io = "piped" | "null" | "inherit";
export type Output = { code: number; success: boolean; stdout: Uint8Array; stderr: Uint8Array };
export type Options = { args?: string[]; cwd?: string; env?: Record<string, string>; stdout?: Io; stderr?: Io };

const stdio = (s: Io = "piped") => (s === "piped" ? "pipe" : s === "null" ? "ignore" : "inherit");

export function output(cmd: string, opts: Options = {}): Promise<Output> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, opts.args ?? [], {
      cwd: opts.cwd,
      env: opts.env ? { ...process.env, ...opts.env } : process.env,
      stdio: ["inherit", stdio(opts.stdout), stdio(opts.stderr)],
    });
    const out: Buffer[] = [], err: Buffer[] = [];
    p.stdout?.on("data", (b: Buffer) => out.push(b));
    p.stderr?.on("data", (b: Buffer) => err.push(b));
    p.on("error", reject);
    p.on("close", (code) => {
      const c = code ?? 1; // killed by a signal: never a success
      resolve({ code: c, success: c === 0, stdout: new Uint8Array(Buffer.concat(out)), stderr: new Uint8Array(Buffer.concat(err)) });
    });
  });
}
