# cmem — Portable Project Memory for wazmrt

> **At session start, read `../../cmem/handoffs.md` for letters addressed to this repo.** The workspace
> session (`../../cmem/INDEX.md`) reviews across the sibling repos and reports there; nothing is ever
> written into this repo from outside. (owner directive, 2026-09-20)
>
> 🔤 **ID namespace (owner, 2026-09-21):** a bare `H<n>` means a WORKSPACE LETTER; wazmrt's own
> Track H items are `zH1`–`zH8` (renamed in `da4e558cf` — the two had collided).

This folder is the **authoritative, portable project memory** for `wazmrt`: committed, it travels with
the repo. **Format:** plain Markdown, one topic per file, and **this file stays small** — policy,
triggers, one line per file. ⚠️ No status narrative here: the state lives in
[`open-work.md`](open-work.md) and nowhere else, and completed work is summarized in
[`roadmap.md`](roadmap.md) with its commits (`../../cmem/memory-conventions.md`, adopted 2026-09-21 by
letter H3; the file this replaced was 192 KB — `git show 3f1bfbc1d:cmem/INDEX.md`).

**Reading order for a new session:** this file → [`open-work.md`](open-work.md) →
[`working-rules.md`](working-rules.md) → the topic file the task needs.

## Policy (durable — set by the project owner 2026-07-02)

- **`cmem/` is the single home for ALL project memory.** When the owner (or anyone) says "**update the
  project memory**," that means: fold the latest decisions, found bugs, design changes, and current
  state into the matching `cmem/` topic file(s) — then add/refresh its one-line pointer in the Files
  table below. Convert relative dates to absolute; update existing entries rather than duplicating.
- **`README.md` is NOT project memory.** It is the public, user-facing document — a concise guide to
  *using* wazmrt (what it is, install, CLI/C-ABI usage, examples). Keep internal decision logs and bug
  post-mortems out of it; those live here.
- **`third_party/LICENSES.md` is the compliance source of truth**, not memory. `cmem/licensing.md`
  records the *why* and the strategy; the ledger of actually-reused code lives in
  `third_party/LICENSES.md`. Keep them consistent.

### The "update the project memory" trigger (binding on every agent)

When the owner says **"update the project memory"** (or a clear synonym — "update memory", "record
this", "remember this for the project"), the required action is BOTH of:

1. **Revise all relevant `cmem/` files** — fold in the latest decisions/bugs/design changes/state;
   refresh the one-line pointer in the Files table; convert relative dates to absolute; update existing
   entries instead of duplicating.
2. **Sync `README.md` where, and only where, the change is user-relevant** — install/usage, CLI/C-ABI
   surface, examples, status — so the README matches the new reality without absorbing internal detail.
3. **If the work produced a transferable METHOD lesson — one that would apply to a completely
   different subsystem — add it to [`best-practices.md`](best-practices.md) as well**, one bold rule
   plus a citation back to the incident. The detail stays in its home file; only the rule is copied.
   Lessons buried inside dated post-mortems do not get read by the next pass, which is how the same
   producer/consumer blind spot recurred four times in two days.

### The "evaluate a reference project" trigger (binding on every agent)

Before incorporating or adapting code from any of the reference runtimes (see `reference-projects.md`),
complete the **Adoption Checklist** in `third_party/LICENSES.md` (benefit-vs-drawback + license
compliance), add a Component Ledger entry there, and update `reference-projects.md` status. "Looking at"
a project is free; "copying/porting from" it always requires the ledger entry.


### 🔑 The **`coordinate`** trigger (binding on every agent — owner, 2026-08-19)

**One word. When the owner writes `coordinate` — alone, or anywhere in a request — it is a BINDING
ORDER to run the cross-project protocol against `wasmrt`.** It is not "bear the other project in
mind", and reading the contract does not discharge it.

🔒 **The protocol is defined in [`interop.md`](interop.md) §1 and that file is authoritative** — it is
the **only** document either project may treat as binding on the other. Do not restate the steps here;
*a list written out a second time is a list that will drift*, and this file has paid for that lesson
more than once. In one line: **compare both copies of the contract → read the sibling's UNCOMMITTED
in-flight work → diff what we ship against every in-scope row → ⚠️ verify by RUNNING both binaries on
the SAME BYTES, never by reading either → record the change in OUR OWN copy with a CONTRACT VERSION
bump → report divergences, with reopen conditions, to the owner.**

⚠️ **In scope: CLI options and security checks** (flags, run modes, exit codes; the pin/verification
mechanism, the WASI rights model, the resource ceilings). **Out of scope and deliberately so: the C
ABI, internal design, and performance/size** — the last because that is what the two are *competing*
on, so a contract row must never be justified by "the other one is faster".


### The "look for code issues" trigger (binding on every agent)

When the owner says **"look for code issues"** (or a synonym — "code audit", "audit the code", "hunt
for bugs"), perform a **COMPREHENSIVE audit across BOTH tested AND untested code paths**. The goal is to
catch issues that **won't surface in today's tests but will bite a future change**. Look for all four
categories:

1. **Workarounds / temporary hacks** — is each still needed, or now stale? (e.g. cache-clean races,
   leniency comments, `TODO`/`FIXME`, "for now" shortcuts.) Flag stale ones for removal.
2. **Dead code** — unused methods/fields/helpers, duplicates, orphaned exports. **Verify each with
   grep** before calling it dead (a symbol may be reached via `root.zig` re-export, the C ABI, or a
   test-only path).
3. **Bugs** — silently-wrong codegen, inverted logic, type-inference gaps, scanner/LEB off-by-ones,
   union-field access on the wrong active tag, stack-order mistakes, missing bounds checks.
4. **Fall-throughs (the worst failure mode)** — unhandled input that emits a stub/placeholder (a
   comment + a bare `0` / empty slice / `.none`) **instead of erroring**. Prefer converting
   silent-wrong to a **hard abort** (`error.Unsupported*` / a `diagnostics`-style failure), and guard
   genuinely-speculative probes so they fail loud, not silent. In this codebase the canonical example is
   an assembler/decoder path that should return `error.UnknownInstr` / `error.UnsupportedOpcode` rather
   than emit wrong bytes.

**Method:** ⭐ **read [`best-practices.md`](best-practices.md) first** — it collects the investigation
and verification rules this trigger depends on, each cited to the pass that paid for it. Then: for
large files, **fan out parallel read-only investigators per category** (use the Agent
tool / `Explore`), then consolidate. Report each finding as `file:line` + a one-line description +
severity. **Fix the safe ones** and **keep the full suite green — diff the OUTPUT, not just exit codes**
(`zig build test` *and* re-run the affected `.wast` conformance files via `wazmrt <file.wast>`, comparing
`N passed / N failed` against the pre-change baseline; a build that still exits 0 while silently dropping
passes is a regression). Surface anything risky or ambiguous rather than fixing blind.


## Rules — in [`working-rules.md`](working-rules.md)

The editing boundary (`interop.md` §1a, absolute) · prove or validate before acting · tooling (Bun
for committed scripts, one-time scripts relaxed, no heredocs; scratch work lives in [`probes/`](probes/README.md)) · LF
line endings everywhere · building and testing from the exFAT `D:` drive.

## Files

| File | What it holds |
| --- | --- |
| [open-work.md](open-work.md) | 🎯 **Start here for state.** The ONE list of what is outstanding, and the only status line. |
| [working-rules.md](working-rules.md) | The standing rules: editing boundary, prove-before-acting, tooling (Bun, no heredocs), LF line endings, building and testing from the exFAT `D:` drive. |
| [overview.md](overview.md) | What wazmrt is; its GitHub home (`synapticforge1/wazmrt`); the source layout; the 2026-10-23 history rewrite. (The live artifact sizes are in `tools/size-ceilings.txt`, the one place.) |
| [vision.md](vision.md) | The goal: a fast, small, embeddable WebAssembly runtime, itself wasm-compilable. |
| [architecture.md](architecture.md) | The decode → validate → instantiate → execute pipeline, module layout, the libc-free core, the C ABI and freestanding targets. |
| [design-decisions.md](design-decisions.md) | Load-bearing invariants and decisions with their reasons — kept in full, never silently reverted. |
| [security-model.md](security-model.md) | The sandbox (WASI rights, symlink resolution, per-host path rules), pin verification and signatures, resource ceilings, feature gating as a control. |
| [interop.md](interop.md) | 🤝 THE CONTRACT with `wasmrt` (CLI + security checks), its version and change log; the `coordinate` protocol (§1). |
| [roadmap.md](roadmap.md) | The tracks (H ✅, B ✅, O, S), their items and gates; **milestone summaries** with commits at the top. |
| [testing.md](testing.md) | How to run every gate, what each can see, and **the dated counts** (the one place they are recorded). |
| [known-issues.md](known-issues.md) | The defect log: fixed-with-root-cause and deferred-with-surfacing-condition. |
| [releasing.md](releasing.md) | The version (`1.0.3`, tagged `v1.0.1`–`v1.0.3`), SemVer and the compatibility gate (`zig build surface`, with S1/S2 behaviour carried forward), what counts as breaking, the binding per-release checklist. |
| [best-practices.md](best-practices.md) | METHOD rules, one bold rule + the incident that paid for it. |
| [text-toolchain.md](text-toolchain.md) | The `.wat`/`.wast` assembler and script runner: spellings accepted, encoding decisions. |
| [licensing.md](licensing.md) | Why `MIT OR Apache-2.0`, the zero-dependency verification, the reference-code obligations. |
| [reference-projects.md](reference-projects.md) | The reference runtimes studied, and what each was used for (the retired-oracle scope is in `interop.md`). |
| [history-map-2026-10-23.md](history-map-2026-10-23.md) | Old → new commit ids after the 2026-10-23 history purge (H19): look up any pre-purge id here. |
| [probes/README.md](probes/README.md) | 📂 Measurement scripts kept with the memory (owner: scratch work belongs in cmem): how to run each, and the dated results. |

## Related files outside cmem

- `README.md` — the public, user-facing doc (install, CLI/C-ABI usage, examples). NOT project memory.
- `third_party/LICENSES.md` — the compliance ledger + adoption checklist + verified SPDX inventory.
- `LICENSE-MIT` / `LICENSE-APACHE` / `NOTICE` — the dual license texts and attribution notice.
