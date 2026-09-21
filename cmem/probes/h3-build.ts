// Letter H3 — rebuild INDEX.md and create working-rules.md, MOVING the kept sections verbatim out of
// the INDEX.md of a baseline commit by line range (a rewrite by hand is where a rule silently changes).
// open-work.md and the milestone summary are written separately, by hand, and reviewed on their own.
//
//   deno run -A h3-build.ts <repo root> <baseline commit>
//
// Every range is ASSERTED to start with the heading it is expected to start with, so a baseline that
// has moved fails loudly instead of copying the wrong lines.

const [root, baseline] = Deno.args;
const r = await new Deno.Command("git", { args: ["show", `${baseline}:cmem/INDEX.md`], cwd: root, stdout: "piped" }).output();
const old = new TextDecoder().decode(r.stdout).split("\n");

/** Lines [from, to] (1-based, inclusive), asserting the first line starts with `expect`. */
function take(from: number, to: number, expect: string): string {
  if (!old[from - 1].startsWith(expect)) throw new Error(`line ${from} is not "${expect}": ${old[from - 1].slice(0, 80)}`);
  return old.slice(from - 1, to).join("\n");
}

// ---------------------------------------------------------------------------------------------
const workingRules = `# working-rules.md — the standing rules for working in wazmrt

The checklist: boundaries, tooling, line endings, how to build and test on this repo's drives.
**Rules, not lessons** — the method lessons with their incidents are in
[\`best-practices.md\`](best-practices.md). Moved here verbatim from \`INDEX.md\` on 2026-09-21 (letter H3,
\`../../cmem/memory-conventions.md\`); the text as it stood is \`git show ${baseline}:cmem/INDEX.md\`.

${take(437, 447, "### 🔒 Two things to know before touching anything").replace(/^### /, "## ")}

${take(609, 654, "## 🚫🔒 THE EDITING BOUNDARY IS ABSOLUTE")}

${take(655, 673, "## 🔒🔒 PROVE OR VALIDATE BEFORE ACTING")}

${take(674, 708, "## 🔧 TOOLING")}

${take(709, 744, "## 📏 LINE ENDINGS")}

## 🏗️ BUILDING AND TESTING FROM THE \`D:\` DRIVE (exFAT)

${take(465, 474, "**Set the zig LOCAL CACHE")}

${take(511, 524, "### Still true").replace(/^### Still true, and unchanged by any of this — /, "### ")}

*(How the env-var fix was found — the FOURTH diagnosis of one symptom; three earlier ones blamed
hardware/event-51 (\`e507d1c\`, \`ed05905\`, \`458bc96\`, \`46a0bdb\`) and were wrong — is summarized in
\`best-practices.md\`; the full account is \`git show ${baseline}:cmem/INDEX.md\`, lines 475–510.)*
`;

// ---------------------------------------------------------------------------------------------
const files: Array<[string, string]> = [
  ["open-work.md", "🎯 **Start here for state.** The ONE list of what is outstanding, and the only status line."],
  ["working-rules.md", "The standing rules: editing boundary, prove-before-acting, tooling (Deno/Bun, no heredocs), LF line endings, building and testing from the exFAT `D:` drive."],
  ["overview.md", "What wazmrt is; the source layout; **live artifact sizes** (the one place they are recorded)."],
  ["vision.md", "The goal: a fast, small, embeddable WebAssembly runtime, itself wasm-compilable."],
  ["architecture.md", "The decode → validate → instantiate → execute pipeline, module layout, the libc-free core, the C ABI and freestanding targets."],
  ["design-decisions.md", "Load-bearing invariants and decisions with their reasons — kept in full, never silently reverted."],
  ["security-model.md", "The sandbox (WASI rights, symlink resolution, per-host path rules), pin verification and signatures, resource ceilings, feature gating as a control."],
  ["interop.md", "🤝 THE CONTRACT with `wasmrt` (CLI + security checks), its version and change log; the `coordinate` protocol (§1)."],
  ["roadmap.md", "The tracks (H ✅, B ✅, O, S), their items and gates; **milestone summaries** with commits at the top."],
  ["testing.md", "How to run every gate, what each can see, and **the dated counts** (the one place they are recorded)."],
  ["known-issues.md", "The defect log: fixed-with-root-cause and deferred-with-surfacing-condition."],
  ["releasing.md", "The version (`1.0.2`), the cadence and ladder, what counts as breaking, the binding per-release checklist."],
  ["best-practices.md", "METHOD rules, one bold rule + the incident that paid for it."],
  ["text-toolchain.md", "The `.wat`/`.wast` assembler and script runner: spellings accepted, encoding decisions."],
  ["licensing.md", "Why `MIT OR Apache-2.0`, the zero-dependency verification, the reference-code obligations."],
  ["reference-projects.md", "The reference runtimes studied, and what each was used for (the retired-oracle scope is in `interop.md`)."],
  ["probes/README.md", "📂 Measurement scripts kept with the memory (owner: scratch work belongs in cmem): how to run each, and the dated results."],
];

const index = `# cmem — Portable Project Memory for wazmrt

> **At session start, read \`../../cmem/handoffs.md\` for letters addressed to this repo.** The workspace
> session (\`../../cmem/INDEX.md\`) reviews across the sibling repos and reports there; nothing is ever
> written into this repo from outside. (owner directive, 2026-09-20)
>
> 🔤 **ID namespace (owner, 2026-09-21):** a bare \`H<n>\` means a WORKSPACE LETTER; wazmrt's own
> Track H items are \`zH1\`–\`zH8\` (renamed in \`50f5bf417\` — the two had collided).

This folder is the **authoritative, portable project memory** for \`wazmrt\`: committed, it travels with
the repo. **Format:** plain Markdown, one topic per file, and **this file stays small** — policy,
triggers, one line per file. ⚠️ No status narrative here: the state lives in
[\`open-work.md\`](open-work.md) and nowhere else, and completed work is summarized in
[\`roadmap.md\`](roadmap.md) with its commits (\`../../cmem/memory-conventions.md\`, adopted 2026-09-21 by
letter H3; the file this replaced was 192 KB — \`git show ${baseline}:cmem/INDEX.md\`).

**Reading order for a new session:** this file → [\`open-work.md\`](open-work.md) →
[\`working-rules.md\`](working-rules.md) → the topic file the task needs.

${take(553, 608, "## Policy (durable")}

${take(745, 774, "### The \"look for code issues\" trigger")}

## Rules — in [\`working-rules.md\`](working-rules.md)

The editing boundary (\`interop.md\` §1a, absolute) · prove or validate before acting · tooling (Deno
or Bun only, no heredocs, no \`deno eval\`; scratch work lives in [\`probes/\`](probes/README.md)) · LF
line endings everywhere · building and testing from the exFAT \`D:\` drive.

## Files

| File | What it holds |
| --- | --- |
${files.map(([f, d]) => `| [${f}](${f}) | ${d} |`).join("\n")}

${take(795, 800, "## Related files outside cmem").trimEnd()}
`;

Deno.writeTextFileSync(`${root}/cmem/working-rules.md`, workingRules);
Deno.writeTextFileSync(`${root}/cmem/INDEX.md`, index);
const kb = (s: string) => (new TextEncoder().encode(s).length / 1024).toFixed(1);
console.log(`INDEX.md          ${kb(index)} KB (was ${kb(old.join("\n"))} KB)`);
console.log(`working-rules.md  ${kb(workingRules)} KB`);
