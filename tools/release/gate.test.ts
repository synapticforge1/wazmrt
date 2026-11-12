// Self-test for tools/release/gate.ts. Run: `bun test tools/release`.
import { expect, test } from "bun:test";
import { errorLines, escape } from "./gate.ts";

test("errorLines keeps error lines once, in order, and drops the rest", () => {
  const out = "Build Summary: 3/4\nsrc\\x.zig:1:2: error: bad\nok line\nsrc\\x.zig:1:2: error: bad\nexpected 3, found 1\n";
  expect(errorLines(out)).toEqual(["Build Summary: 3/4", "src\\x.zig:1:2: error: bad", "expected 3, found 1"].filter((l) => /error|expected/.test(l)));
});

test("errorLines keeps the CLI-behaviour gate's 'did not complete' line", () => {
  const line = "cli_behaviour: `wazmrt ok.wat` did not complete: FileNotFound";
  expect(errorLines(`x\n${line}\n`)).toContain(line);
});

test("escape protects a workflow command's message", () => {
  expect(escape("50% a\nb\r")).toBe("50%25 a%0Ab%0D");
});
