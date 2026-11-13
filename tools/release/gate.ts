// tools/release/gate.ts — run one `zig build` gate in CI and, when it fails, publish WHY.
//
//   bun tools/release/gate.ts <zig build args...>
//
// A job's log needs a signed-in reader, but a check run's annotations are public: on failure the
// error lines of the output (Zig's `error:`, a failed `expect`, a test name, a panic) are emitted as
// `::error::` annotations, so a failure can be diagnosed with no token (no `gh`: Tooling rule 9).
// The output is also streamed to the log as it runs. Exit status: 0 when zig passed, non-zero when
// not (on Windows as `spawn.ts` maps it, since Bun alone reads only the low byte — round 5, A1).
//
// 🔒 The streamed output is wrapped in `::stop-commands::<random>` (review round 1, B5), so what a
// build or a test PRINTS cannot act as a workflow command (`::add-mask::`, a `::stop-commands::` of
// its own that would swallow this tool's annotations, a forged `::error::`). Commands resume only
// with the token, which the output cannot know. Two more parts make that hold (review round 2):
//   - the child's stderr is written to OUR stdout (A1): the runner reads a step's stdout and stderr
//     on two pipes with no fixed order between them, so a stderr line could land after the resume;
//   - the child gets none of `WITHHELD` below, nor any `ACTIONS_*` (A2; round 3, A5): the command
//     FILES, their folder `RUNNER_TEMP`, and the runner's tokens. Code that finds those files some
//     other way could still write one; the frame is about printed output.

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { type Plan, plan } from "./spawn.ts";

const MAX_ANNOTATIONS = 40;

export function errorLines(output: string): string[] {
  // "did not": the CLI-behaviour gate's own wording ("did not complete", "did not exit normally"),
  // missed by the first version of this filter on the run that needed it.
  const keep = /error|fail|FAIL|expected|panic|refused|REFUSED|OVER|mismatch|not found|did not/;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || !keep.test(line) || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length === MAX_ANNOTATIONS) break;
  }
  return out;
}

/** GitHub's workflow-command escaping for a message (the text after `::`). */
export function escape(msg: string): string {
  return msg.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/** ... and for a property value (`title=`), which also ends at `,` and `:` (review round 1, B6). */
export function escapeProperty(value: string): string {
  return escape(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

/**
 * What the build does not get (review round 2, A2; round 3, A5): the runner's command FILES, the
 * folder they live in (`RUNNER_TEMP`, where `_runner_file_commands` is), and every token the runner
 * may hold (`GITHUB_TOKEN`, `ACTIONS_*` — the runtime and OIDC request tokens). The build needs none.
 */
export const WITHHELD = ["GITHUB_ENV", "GITHUB_PATH", "GITHUB_OUTPUT", "GITHUB_STATE", "GITHUB_STEP_SUMMARY", "GITHUB_TOKEN", "RUNNER_TEMP"];

export function childEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const out = { ...env };
  for (const k of Object.keys(out)) {
    const K = k.toUpperCase(); // Windows environment names are case-insensitive
    if (WITHHELD.includes(K) || K.startsWith("ACTIONS_")) delete out[k];
  }
  return out;
}

/**
 * zig's exit code as ours; a child killed by a signal has none and is a failure (round 4: untested).
 * 🔒 Bun's `process.exit(n)` keeps only n's LOW BYTE (measured, Bun 1.4.4 on Windows: 256, 512 and
 * 0xC0000100 all exit 0) — so any failure whose low byte is 0 becomes 1, never a green step (round 5, A1).
 */
export function exitCode(code: number | null): number {
  if (code === 0) return 0;
  if (code === null) return 1;
  return code & 0xff || 1;
}

/** The lines this tool prints around the build output and after a failure. */
export function frame(token: string, title: string, failed: boolean, output: string, code: number | null): { before: string; after: string[] } {
  // The runner reads a command only at the START of a line: if the build's last byte was not a
  // newline, end that line first, or the resume is never seen and every annotation is lost (round 3, A3).
  const after = output !== "" && !output.endsWith("\n") ? ["", `::${token}::`] : [`::${token}::`];
  if (failed) {
    const lines = errorLines(output);
    if (lines.length === 0) lines.push(`exited ${code} with no error line; the tail: ${output.slice(-500)}`);
    for (const l of lines) after.push(`::error title=${escapeProperty(title)}::${escape(l)}`);
  }
  return { before: `::stop-commands::${token}`, after };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: bun tools/release/gate.ts <zig build args...>");
    process.exit(2);
  }
  // Through spawn.ts's `plan` (round 5, A1): Bun alone would read a zig exit of 256 as 0, a pass.
  // Planned BEFORE the frame opens: a refused argument is a plain error, not one hidden inside it.
  let p: Plan;
  try {
    p = plan("zig", ["build", ...args]);
  } catch (err) {
    console.error(`gate.ts: ${err instanceof Error ? err.message : err}`);
    process.exit(2);
  }
  const token = randomBytes(16).toString("hex");
  const title = `zig build ${args.join(" ")}`;
  console.log(`::stop-commands::${token}`);
  const child = spawn(p.file, p.args, { stdio: ["ignore", "pipe", "pipe"], env: childEnv(process.env), windowsVerbatimArguments: p.windowsVerbatimArguments });
  // Decode at the stream, not per chunk: a UTF-8 character split across chunks stays whole (B6).
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let all = "";
  // Both of the child's streams go to OUR stdout, the one the frame is on (round 2, A1).
  const take = (s: string) => {
    all += s;
    process.stdout.write(s);
  };
  child.stdout.on("data", take);
  child.stderr.on("data", take);
  const finish = (code: number | null) => {
    const failed = code !== 0;
    for (const l of frame(token, title, failed, all, code).after) console.log(l);
    process.exit(exitCode(code));
  };
  child.on("error", (e) => {
    all += `\nspawn failed: ${e.message}`;
    finish(1);
  });
  child.on("close", (code) => finish(code));
}
