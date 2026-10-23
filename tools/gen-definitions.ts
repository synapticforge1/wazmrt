// gen-definitions.ts — write `src/definitions.zig`, wazmrt's GENERATED copy of binaryang's shared
// definitions (workspace letter H10; `../../cmem/divergences.md` § "The shared definitions").
//
// 🔒 The owner, 2026-09-20: the DEFINITION is shared, binaryang is its source, and every other repo
// GENERATES its copy, commits it (so a clone builds without binaryang present), and has its gate
// regenerate and diff. Change flows source → copies, never back: **editing `src/definitions.zig`
// by hand is a DEFECT.** A wazmrt need is a row in the workspace's divergences and a letter to
// binaryang; the copy changes only when the source does.
//
// The three sources are binaryang's `src/definitions/{opcodes,features,verdicts}.json` (D1, D2,
// D3). Each states a `sha256` over its canonical content (object keys sorted, no whitespace, the
// hash field empty — binaryang `scripts/definitions.ts`), and this script RECOMPUTES it before it
// trusts a byte: a source whose stated hash does not match its content is refused.
//
//   bun tools/gen-definitions.ts [--source <binaryang>/src/definitions] [--check]
//
// Without --check it writes the copy (its own commit, naming the binaryang version it moved to).
// With --check it renders the copy and fails if the committed one differs: the gate step
// `zig build definitions`, which needs the source present (default: the sibling checkout).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const source = resolve(flag("--source") ?? join(repo, "..", "binaryang", "src", "definitions"));
const check = args.includes("--check");
const outPath = join(repo, "src", "definitions.zig");

type Json = any;

/** binaryang's canonical form: object keys sorted, no whitespace. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v !== null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

function load(file: string, definition: string): Json {
  const path = join(source, file);
  let data: Json;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`gen-definitions: cannot read ${path} (${(e as Error).message})`);
    console.error("  pass --source <binaryang>/src/definitions, or check out binaryang beside wazmrt");
    process.exit(2);
  }
  if (data.definition !== definition) throw new Error(`${file}: definition is ${data.definition}, expected ${definition}`);
  const want = createHash("sha256").update(canonical({ ...data, sha256: "" })).digest("hex");
  if (data.sha256 !== want) {
    console.error(`gen-definitions: ${file} states sha256 ${data.sha256} but its content hashes to ${want}`);
    console.error("  the source is stale or altered; it is not used");
    process.exit(1);
  }
  return data;
}

const d1 = load("opcodes.json", "D1");
const d2 = load("features.json", "D2");
const d3 = load("verdicts.json", "D3");
let version = "unknown";
try {
  version = JSON.parse(readFileSync(join(source, "..", "..", "jsr.json"), "utf8")).version;
} catch { /* a source outside a binaryang checkout: the hashes still identify it */ }

// ---- Zig rendering ------------------------------------------------------------------------------

/** A Zig string literal. */
function str(s: string): string {
  let o = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === "\\") o += "\\\\";
    else if (ch === '"') o += '\\"';
    else if (ch === "\n") o += "\\n";
    else if (ch === "\t") o += "\\t";
    else if (c < 0x20) o += `\\x${c.toString(16).padStart(2, "0")}`;
    else o += ch;
  }
  return o + '"';
}
const strs = (xs: string[]) => (xs.length ? `&.{ ${xs.map(str).join(", ")} }` : "&.{}");
const opt = <T>(v: T | null | undefined, f: (x: T) => string) => (v === null || v === undefined ? "null" : f(v));
const hex = (n: number) => `0x${n.toString(16).padStart(2, "0")}`;

function header(d: Json) {
  return `.{ .data_version = ${str(d.dataVersion)}, .sha256 = ${str(d.sha256)}, .entries = ${d.entries.length} }`;
}

const opcodes = d1.entries.map((e: Json) =>
  `    .{ .name = ${str(e.name)}, .encoding = ${str(e.encoding)}, .prefix = ${opt(e.prefix, (p: string) => hex(parseInt(p, 16)))}, ` +
  `.opcode = ${hex(e.opcode)}, .immediates = ${strs(e.immediates)}, .natural_align = ${opt(e.align, String)}, ` +
  `.signature = ${opt(e.signature, (s: Json) => `.{ .params = ${strs(s.params)}, .results = ${strs(s.results)} }`)}, ` +
  `.feature = ${opt(e.feature, str)}, .class = ${str(e.class)} },`
);
const features = d2.entries.map((e: Json) =>
  `    .{ .name = ${str(e.name)}, .cli = ${str(e.cli)}, .default_on = ${e.defaultOn}, .implemented = ${e.implemented}, ` +
  `.testsuite_dirs = ${strs(e.testsuiteDirs)}, .only_in = ${opt(e.onlyIn, strs)}, .off_in = ${opt(e.offIn, strs)}, ` +
  `.note = ${opt(e.note, str)}, .since = ${str(e.since)} },`
);
const verdicts = d3.entries.map((e: Json) =>
  `    .{ .verdict = .${e.verdict}, .key = ${str(e.key)}, .message = ${str(e.message)} },`
);

const zig = `//! GENERATED by \`tools/gen-definitions.ts\` from binaryang's shared definitions — NEVER EDIT BY HAND
//! (workspace letter H10). A change to this file comes from a change to the SOURCE, regenerated:
//! \`bun tools/gen-definitions.ts\`, its own commit. The gate (\`zig build definitions\`) regenerates
//! and diffs; \`src/definitions_agreement.zig\` and the tests beside each hand-kept table fail when
//! wazmrt's tables disagree with what is below.
//!
//! Source: @jrmarcum/binaryang ${version}, \`src/definitions/\`. Each line below is that file's
//! stated SHA-256 over its canonical content, recomputed and matched by the generator.

/// The source, as the generator found and verified it.
pub const source = .{
    .package = "@jrmarcum/binaryang",
    .version = ${str(version)},
    .d1 = ${header(d1)},
    .d2 = ${header(d2)},
    .d3 = ${header(d3)},
};

/// A stack signature: operand types bottom-first, then result types (\`addr\` is the memory's index type).
pub const Signature = struct { params: []const []const u8, results: []const []const u8 };

/// D1 — one WebAssembly instruction.
pub const Opcode = struct {
    /// The text mnemonic, as binaryang prints it.
    name: []const u8,
    /// The opcode bytes, hex: the prefix and the LEB128 sub-opcode.
    encoding: []const u8,
    /// \`null\`, or the prefix byte (0xfb GC, 0xfc misc, 0xfd SIMD, 0xfe threads).
    prefix: ?u8,
    /// The single byte, or the sub-opcode after the prefix.
    opcode: u32,
    /// Immediate kinds, in binary order (the vocabulary is D1's \`rules.immediates\`).
    immediates: []const []const u8,
    /// Memory access width in BYTES, for an instruction with a memarg.
    natural_align: ?u32,
    /// Fixed stack signature, or null where an immediate or the stack decides.
    signature: ?Signature,
    /// The D2 feature (binaryang's name) that gates it; null for core.
    feature: ?[]const u8,
    class: []const u8,
};

/// D2 — one feature or proposal, in binaryang's naming.
pub const Feature = struct {
    name: []const u8,
    cli: []const u8,
    default_on: bool,
    implemented: bool,
    testsuite_dirs: []const []const u8,
    only_in: ?[]const []const u8,
    off_in: ?[]const []const u8,
    note: ?[]const u8,
    since: []const u8,
};

/// D3 — one verdict class: the spec testsuite's expected-failure text, and the key a runner reports.
pub const Verdict = struct { verdict: enum { trap, exhaustion }, key: []const u8, message: []const u8 };

pub const opcodes = [_]Opcode{
${opcodes.join("\n")}
};

pub const features = [_]Feature{
${features.join("\n")}
};

pub const verdicts = [_]Verdict{
${verdicts.join("\n")}
};
`;

if (check) {
  let committed = "";
  try {
    committed = readFileSync(outPath, "utf8");
  } catch { /* absent: a difference */ }
  if (committed !== zig) {
    console.error(`gen-definitions: src/definitions.zig differs from binaryang ${version}'s definitions.`);
    console.error("  If binaryang moved on, regenerate IN ITS OWN COMMIT: bun tools/gen-definitions.ts");
    console.error("  If the copy was edited by hand, that edit is the defect: regenerate to undo it.");
    process.exit(1);
  }
  console.log(`definitions: OK — src/definitions.zig is binaryang ${version}'s D1 (${d1.entries.length}), D2 (${d2.entries.length}), D3 (${d3.entries.length})`);
} else {
  writeFileSync(outPath, zig);
  console.log(`definitions: wrote src/definitions.zig from binaryang ${version}: D1 ${d1.entries.length}, D2 ${d2.entries.length}, D3 ${d3.entries.length}`);
}
