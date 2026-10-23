# open-work.md — what is outstanding in wazmrt

**The ONE list of open work, and the only status line** (`../../cmem/memory-conventions.md`: "the
status narrative exists once"). Only open items; each points at its record. Done work leaves this file
and is summarized in [`roadmap.md`](roadmap.md) with its commits.

## 🏁 Status — 2026-10-23

**`1.0.3` is the released version** (2026-09-21; on `synapticforge1/wazmrt`, not tagged).
⚠️ **UNRELEASED on `main`: two bug fixes**: out-of-range truncation now traps "integer overflow",
and `ref.get_desc` on null traps "null reference" (`a65c677`). With them come the class-checked
`.wast` runner and today's tooling. The public surface is unchanged since `1.0.3`, so
`zig build surface`'s floor for the next number is a **patch, `1.0.4`**. Whether to ship it is an
owner call below. Contract: `interop.md` **v31**; wasmrt's copy is at 10. Every gate is green at
`a65c677` + `27e5f93` (2026-10-23). The counts are in [`testing.md`](testing.md) and the sizes in
`tools/size-ceilings.txt`, one place each; what landed is in [`roadmap.md`](roadmap.md)'s
milestone table.

## 🗓️ Owner calls

- **Release the two unreleased fixes as `1.0.4`** (the gate's floor), or hold them for Track O.
- **Track O / Track S numbering.** It was a reading of "release 1.0.3 now", never a decision. Under
  SemVer the gate sets each number from the surface (`releasing.md`), so all that is left to
  confirm is the ORDER.
- ✅ **Tagged 2026-10-23** (owner: "yes lets tag those commits properly"): annotated `v1.0.2` →
  `c7a7588` and `v1.0.3` → `67d82e7`, each verified to carry its version in `root.zig`,
  `build.zig.zon` and the header, with the noreply tagger. Still untagged, an offer: `1.0.1`, first
  set in `9acdcb4` (Track H), and `1.0.0`, whose commit is not yet located. ⚠️ **H6's rule 3 does
  not apply as written**: wazmrt's tests live INSIDE `src/` (Zig inline `test` blocks), so "the
  previous tag's tests against the new `src/`" cannot separate the two. The equivalent would be
  `.wast` fixtures or a script carried forward from a tag. Unscoped; an owner call.
- **GitHub Support request** to purge the cached pre-rewrite commits (letter H19; only the owner can
  file it).

## ⏳ Waiting on something outside this repo

- **wasmrt**: mirror `interop.md` v31 (it holds 10); make letter H13's three encoder fixes (`.wat`
  pins agree 64/528 until it does, §3.1); its `--dir` help still shows the pre-v27 rules. ⚠️ **Do
  NOT ask it to match v30's wasm-tools `--features` vocabulary any more**: the owner reversed that on
  2026-10-23 (align with binaryang's D2, below), so wasmrt should wait for the contract row that
  change brings. Lockstep engages when wasmrt reaches `1.0.1` (`interop.md` §1e). Letters H1 and H8
  close in the workspace once wasmrt records its side.
- **Letter H10 — stage A done 2026-10-23.** `src/definitions.zig` is a GENERATED copy of
  binaryang 1.15.0's D1/D2/D3 (`tools/gen-definitions.ts`, which verifies each source file's own
  SHA-256; `zig build definitions` regenerates and diffs when binaryang is present). On
  `zig build test`, always: the decoder knows exactly D1's 582 opcodes in both directions, every D1
  mnemonic assembles to D1's encoding, and every default alignment is D1's. Each test is inverted.
  (The earlier note that binaryang lacked `0xfb 20`–`26` is stale: D1 has them.) ⏳ **Open:**
  - **stage B** — replace the hand tables with reads from the copy, one table at a time, full gate
    each;
  - 🔒 **D2 and D1's `feature` column — DECIDED (owner, 2026-10-23): "we need to align with
    binaryang not wasm-tools."** This REVERSES the 2026-09-21 wasm-tools decision. ⏳ **Not yet
    implemented, because it is BREAKING on three fronts:**
    - the `--features` names, a CLI contract change and kind 3 in `releasing.md`;
    - the C ABI `wazmrt_feature_t` enum (25 values), whose renumbering or removal is a major and an
      `abi_version` bump;
    - `interop.md` v30's `--features` row, which binds wasmrt too.

    🔒 **Shape DECIDED (owner, 2026-10-23), three answers:**
    1. **D2's names become canonical, and the wasm-tools-only names stay as deprecated ALIASES**
       for one minor release, then go in a major (`floats`, `gc-types`, `legacy-exceptions`,
       `bulk-memory-opt`, `call-indirect-overlong`, `mutable-global`). Deprecate before removing;
       the README Breaking Changes row lands with the deprecation.
    2. **It lands AFTER binaryang's FL1 settles**, together with the opcode follow-up below, so the
       vocabulary migrates once, to D2's final `cli` spellings.
    3. **The C ABI's `wazmrt_feature_t` APPENDS** any D2 feature it lacks and keeps every existing
       value valid (deprecated where it has no D2 counterpart). That is additive: a minor, with no
       `abi_version` bump.

    Contract v30's `--features` row changes with it (a contract version bump, PENDING MIRROR to
    wasmrt).
  - ✅ **D3 — adopted 2026-10-23** (owner: "start checking against binaryang's trap classes").
    `assert_trap` is class-checked, and the first run found two wrong-trap defects, both fixed
    (`known-issues.md`). ⏳ A D3 class for "expected shared memory" is a request to binaryang.
  - ⏳ **FOLLOW-UP on the opcodes, once binaryang's opcode work is complete** (owner, 2026-10-23:
    "some of the binaryang opcode work is ongoing"). That work is binaryang `cmem/open-work.md`
    item 34: the opcode profile every widely used engine runs, the relaxed-SIMD lowering, D4, and
    the final `opcode-guide.md` "for the other projects to follow" (owner there: "wasmrt / wazmrt
    adopt it afterwards"); also its FL1, D2's `cli` spelling. **When it ships:**
    1. regenerate `src/definitions.zig` from that release (`bun tools/gen-definitions.ts`, its own
       commit) and re-run the H10 tests: any D1 change shows up as a named disagreement;
    2. read `opcode-guide.md` and adopt the profile, in a scoped plan put to the owner first;
    3. only then stage B, so the hand tables are migrated once, to the settled table;
    4. revisit the D2 vocabulary question with FL1's outcome.
    **Do not start stage B before this:** migrating to a table that is still moving means doing it twice.
- **The macOS pass** of the POSIX path fix — when the owner has the machine. Checklist and every probe
  it needs: [`probes/README.md`](probes/README.md) → "Open: the macOS pass".

## 📬 Workspace letters

**Every letter addressed to wazmrt is done on wazmrt's side** (2026-10-23). The summaries, with
their commits, are in [`roadmap.md`](roadmap.md)'s milestone table. Two remnants:

- **H10** is open in its later stages, waiting on binaryang (above).
- **H6's rule 3** waits for a tag (an owner call above) and for consumers (none yet).

Old commit ids in the workspace's letters, in older trees and in GitHub's cache are pre-purge: look
them up in [`history-map-2026-10-23.md`](history-map-2026-10-23.md).

## 🛠️ Roadmap items not started

- **wazmrt flags before the module path** (`wazmrt --dir .::/ m.wasm`), the last of the four §2.1
  spellings ([`roadmap.md`](roadmap.md)).
- **Track O** (optimization review) and **Track S** (security review): review and recommend, not
  unilateral passes ([`roadmap.md`](roadmap.md)). Their numbers come from the gate.
- **Finer trap errors**: one `NullReference` for D3's five null classes, one `TableOutOfBounds` for
  two (the trap checker accepts the set; `known-issues.md`).
- **The static library embeds the Zig cache path**: fix before any binary is published
  (`known-issues.md`).
- **A self-contained round-trip test** for the emitter — blocked: wazmrt has no disassembler.
- **Four `.wat` files of the wasmtk corpus refused by one side** in the parity probes
  ([`probes/body-parity.ts`](probes/body-parity.ts)) — which side, and why, is unexamined.
- Low-value duplicates of trivial code (`readF32Bits` ≡ `readU32Le` and similar) — left standing on
  purpose ([`roadmap.md`](roadmap.md)).

## 🧊 Holding, not tasks

- **SD-1** (wasmtime emits 222 bytes where five implementations emit 223) and **SD-2** (`path_link`
  ENOTSUP on Windows, upstream Zig) — holding for upstream. ⚠️ Re-test SD-2's reopen condition on every
  Zig upgrade.
- **The Bake Off** — a COMPARE task, scheduled when a number is wanted, never "done".
- Owner decisions, unstarted and not gaps: comptime per-proposal gating (`-Dgc=false` style); the
  `wasm-keys.json` keystore tier.

## ❌ Decided against — do not reopen without the owner

- 🔒 **The 44 opcodes of stack-switching, memory-control and shared-everything-threads** (owner,
  2026-09-21): wasm-tools validates them only with `--features=all`, and wasmtime 48 runs none of them
  even with its switches — "off the table for inclusion" ([`probes/three-proposals.ts`](probes/three-proposals.ts)).
