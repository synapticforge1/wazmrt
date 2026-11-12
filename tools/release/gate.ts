// tools/release/gate.ts — run one `zig build` gate in CI and, when it fails, publish WHY.
//
//   bun tools/release/gate.ts <zig build args...>
//
// A job's log needs a signed-in reader, but a check run's annotations are public: on failure the
// error lines of the output (Zig's `error:`, a failed `expect`, a test name, a panic) are emitted as
// `::error::` annotations, so a failure can be diagnosed with no token (no `gh`: Tooling rule 9).
// The output is also streamed to the log as it runs. Exit status is zig's.

import { spawn } from "node:child_process";

const MAX_ANNOTATIONS = 40; // GitHub keeps 10 per step type in the UI, all of them in the API

export function errorLines(output: string): string[] {
  const keep = /error|fail|FAIL|expected|panic|refused|REFUSED|OVER|mismatch|not found/;
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

/** GitHub's workflow-command escaping for a message. */
export function escape(msg: string): string {
  return msg.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: bun tools/release/gate.ts <zig build args...>");
    process.exit(2);
  }
  const child = spawn("zig", ["build", ...args], { stdio: ["ignore", "pipe", "pipe"] });
  let all = "";
  const take = (chunk: Buffer, to: NodeJS.WriteStream) => {
    const s = chunk.toString("utf8");
    all += s;
    to.write(s);
  };
  child.stdout.on("data", (c) => take(c, process.stdout));
  child.stderr.on("data", (c) => take(c, process.stderr));
  child.on("close", (code) => {
    if (code !== 0) {
      const title = `zig build ${args.join(" ")}`;
      const lines = errorLines(all);
      if (lines.length === 0) lines.push(`exited ${code} with no error line; the tail: ${all.slice(-500)}`);
      for (const l of lines) console.log(`::error title=${escape(title)}::${escape(l)}`);
    }
    process.exit(code ?? 1);
  });
}
