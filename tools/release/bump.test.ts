// Self-test for tools/release/bump.ts. Run from the repo root: `bun test tools/release`.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { edits, next, replaceOnce } from "./bump.ts";

test("next: each level", () => {
  expect(next("5.0.0", "patch")).toBe("5.0.1");
  expect(next("5.0.9", "minor")).toBe("5.1.0");
  expect(next("5.3.2", "major")).toBe("6.0.0");
  expect(() => next("5.0", "patch")).toThrow();
});

test("replaceOnce refuses zero and two matches", () => {
  expect(replaceOnce("a x b", "x", "y", "f")).toBe("a y b");
  expect(() => replaceOnce("a b", "x", "y", "f")).toThrow(/found 0/);
  expect(() => replaceOnce("x x", "x", "y", "f")).toThrow(/found 2/);
});

// The four places as they are in THIS tree: every pattern must match exactly once, or a bump
// would refuse at release time. A format change in any of them turns this red first.
test("the four places each match exactly once in the tree", () => {
  const version = readFileSync("src/root.zig", "utf8").match(/^pub const version: \[:0\]const u8 = "(\d+\.\d+\.\d+)";$/m)![1];
  for (const [file, old] of edits(version, next(version, "patch"))) {
    const text = readFileSync(file, "utf8");
    expect(text.split(old).length - 1).toBe(1);
  }
});
