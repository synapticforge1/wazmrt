# open-work.md — what is outstanding in wazmrt

**The ONE list of open work, and the only status line** (`../../cmem/memory-conventions.md`: "the
status narrative exists once"). Only open items; each points at its record. Done work leaves this file
and is summarized in [`roadmap.md`](roadmap.md) with its commits.

## 🏁 Status — 2026-10-23

**`1.0.4` is released** (2026-10-23, owner: "release 1.0.4"), the first release under SemVer and
the compatibility gate. ⚠️ **UNRELEASED on `main` since: the 64-bit-table gating fix (accepting less,
kind 4). `zig build surface` puts the next number's floor at MAJOR (`2.0.0`)**, unless the owner
calls a patch as for `1.0.2` / `1.0.3` (`known-issues.md`, the README's `_next release_` row). Its number is the gate's patch floor, and it carries the two wrong-trap
fixes ([`releasing.md`](releasing.md)). Earlier releases are tagged `v1.0.1`–`v1.0.3` on
`synapticforge1/wazmrt`. Contract: `interop.md` **v33** (lockstep ended); wasmrt's copy is at v32 + the folded annexes. The counts are in
[`testing.md`](testing.md) and the sizes in `tools/size-ceilings.txt`, one place each; what landed
is in [`roadmap.md`](roadmap.md)'s milestone table.

## 🗓️ Owner calls

- **Tracks O and S: REVISE them when we get there** (owner, 2026-10-23: "revise Track O and S when
  we get there"). Their scope and order are reviewed at the start of each, not now. Their numbers
  come from the gate.
- ✅ **Tagged 2026-10-23** (owner: "yes lets tag those commits properly"): annotated `v1.0.2` →
  `c7a7588` and `v1.0.3` → `67d82e7`, each verified to carry its version in `root.zig`,
  `build.zig.zon` and the header, with the noreply tagger. ✅ `v1.0.1` → `9acdcb4` (Track H, the
  commit that first set it) was tagged the same day at the owner's word. **There is no
  `v1.0.0`: no commit ever carried it** (`0.1.0` went straight to `1.0.1` in `9acdcb4`), so a tag
  would claim a version the tree does not state.
- 🔒 **H6's rule 3 as behaviour carried forward from a tag: DECIDED 2026-10-23** (`releasing.md`
  → "Rule 3 as behaviour carried forward"):
  - S1 and S2 agreed, as complementary layers; S3 agreed for local testing;
  - the stages run in order and stop at the first issue until it is resolved (intended counts as
    resolved, by a deliberate re-baseline);
  - ✅ **S1 built 2026-10-23**, on `zig build test`: 198 accepted pairs (47 modules × 32 configs),
    equal to `v1.0.3`'s CLI, inverted both ways.
  - ✅ **S2 built 2026-10-23**, inside the conformance step: `v1.0.3`'s per-file results, pinned by
    content (288/288 equal to the `v1.0.3` binary's own runner), inverted six ways.
  - ✅ **S3** is `probes/carry-forward.ts`, local testing (owner).

    **H6's rule 3 is MET** by these three, in the owner's order.
  - 📬 Owner-directed: written up as workspace letter **H23** to wasmrt ("lets also make this a
    letter for wasmrt team on testing", 2026-10-23), `../../cmem/handoffs.md`, with the check
    (`probes/carry-forward.ts`), not the conclusion.
- **GitHub Support request** to purge the cached pre-rewrite commits (letter H19; only the owner can
  file it).

## ⏳ Waiting on something outside this repo

- **wasmrt: checked 2026-10-23 late (owner: "check item 7 now with wasmrt")**, READ-ONLY. Its
  committed HEAD `97d2d55` was built from a scratch clone, and both binaries were RUN on the same
  bytes:
  - ✅ **Contract mirrored to v32** (`28f2982`, `6c06f5d`), with two wasmrt annexes, §2.2f and
    §2.2m. ✅ **Folded verbatim in v33** (2026-10-23), and the copies were byte-identical at the
    fold. v33 also ends lockstep (owner) and carries the meanings answer below. ⏳ **wasmrt
    mirrors v33.** Still for wazmrt as pen holder: refresh the stale wasmrt cells §2.2m lists, after
    re-running them. §2.2m asked whether v32 reverses v30's MEANINGS too, or
    only the vocabulary. 🔒 **ANSWERED (owner, 2026-10-23): "aligning with binaryang means its
    meanings also."** So the migration takes D2's names AND its semantics: which feature gates which
    instruction comes from D1's `feature` column (e.g. `memory.copy` is `bulkMemory`, not
    wasm-tools' `bulk-memory-opt`), and the preset / dependency rules come from binaryang, not
    from wasm-tools' measured ones. ⏳ The fold (v33) carries this answer, so the two copies say it
    once.
  - ✅ **Letter H13 done and VERIFIED** (`97d2d55`): over wasmtk's 609 `.wat`, wazmrt and wasmrt
    agree on 607, differ on 0, and both equal `wasm-tools parse` on all 607. The other 2
    (`ArtOfWebAssembly_tests/Chapter3/table_export.wat` and `table_test.wat`) are refused by all
    three tools.
  - ✅ **`--dir`**: its help states the v27 grammar, and 10 spellings run with no shell
    (`./data:/m`, `.:/`, `data:/m`, `C:`, …) give identical exit codes in both. ⚠️ Through Git
    Bash the single-colon rows looked broken in both: the MSYS rewrite again, so measure with a
    direct spawn.
  - ✅ **H23 committed by wasmrt** (`188fe8a`, 23:27; it was uncommitted when this check began):
    - S1 in `cargo test`: 71 modules × 38 configs, 1,523 accepted pairs, validate-only;
    - a carry-forward script that judges a tag with the current judge;
    - S2 pinned by content SHA-256, the same choice wazmrt made, reached independently;
    - and a fix for a defect it found, "MVP element segments".

    ⬜ **Claimed in its commit, NOT verified here by running** (that is wasmrt's `cargo test`,
    from a clone).
  - 🗄️ **Lockstep ENDED** (owner, 2026-10-23: "we are officially out of lock step now due to
    differences"; `interop.md` v33 §1e, checklist gate 11 retired). wasmrt is `0.9.0`; the two
    release independently.

  ⚠️ **Do NOT ask it to match v30's wasm-tools `--features` vocabulary** (owner reversed it; v32).
  Letters H1 and H8 close in the workspace once wasmrt records its side.
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
    0. 🔒 **Names AND meanings** (owner, 2026-10-23: "aligning with binaryang means its meanings
       also"): gating per instruction follows D1's `feature` column, and the rules follow D2.
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
