# open-work.md — what is outstanding in wazmrt

**The ONE list of open work, and the only status line** (`../../cmem/memory-conventions.md`: "the
status narrative exists once"). Only open items; each points at its record. Done work leaves this file
and is summarized in [`roadmap.md`](roadmap.md) with its commits.

## 🏁 Status — 2026-10-24

**`2.0.1` is released** (2026-10-24, owner: "ship 2.0.1"): a `--pins` DB that cannot be read
REFUSES (contract v35, §5 #14), and `--env` takes only well-formed `KEY=VALUE`, a repeated KEY
replacing (§5 #13). Both refuse what `2.0.0` accepted; 🔒 the owner ships them as a **PATCH**, as
security fixes, with README Breaking Changes rows (`releasing.md`).

**`2.0.0`** (2026-10-23, owner: "2.0.0 is fine", then "yes"): a 64-bit table needs
`memory64`. That is accepting less, so it took the gate's MAJOR floor, the first major the gate set
(`releasing.md`). `1.0.4` shipped earlier the same day. Its number is the gate's patch floor, and it carries the two wrong-trap
fixes ([`releasing.md`](releasing.md)). Every release from `v1.0.1` to `v2.0.1` is tagged on
`synapticforge1/wazmrt`. Contract: `interop.md` **v36** (v33 ended lockstep; v35 refreshed the stale wasmrt cells and decided §5 #13/#14; v36 records #13 met on both); wasmrt's copy was byte-identical at v35 (2026-10-24), and v36 is PENDING MIRROR. The counts are in
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
    fold. v33 also ends lockstep (owner) and carries the meanings answer below. ✅ **wasmrt
    mirrored v33 and v34** (wasmrt `37f0187`, 2026-10-24): the two copies are byte-identical,
    checked with `cmp`. ✅ **The stale wasmrt cells §2.2m lists were REFRESHED in v35**
    (2026-10-24), each re-run on both binaries; all agree but two, decided by the owner the same
    day. ✅ **wasmrt mirrored v35 and made §5 #13's change by letter** (`cfeee31`); re-verified by
    running both, identical on six `--env` cases, recorded as v36. ⏳ **wasmrt to mirror v36**
    (record-only). §2.2m asked whether v32 reverses v30's MEANINGS too, or
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

    ✅ **VERIFIED BY RUNNING 2026-10-24** (owner: "verify H23 is done"), on wasmrt HEAD `6df2108`
    exported into a scratch dir (nothing written to its tree). `188fe8a` is now `6f68bab`
    (history map 10-24).
    - S1 is `crates/wasmrt-core/tests/behaviour.rs`, validate-only: 71 modules × 38 configs =
      1,523 pairs, as claimed. `cargo test --workspace`: 604 passed, 0 failed, 1 ignored.
    - S2 is `scripts/behaviour-s2.ts`, pinned by content SHA-256: 288 files, 0 regressed.
    - S3 is `scripts/carry-forward.ts`. From `v0.9.0`: 0 accepted → refused over 1,201 modules.
    - Each stage goes red when broken. Restoring the MVP-element defect gives S1 57 accepted →
      refused (major) and S3 306. The fix `6f68bab` has its own two-way test.
    - Recorded in wasmrt's `releasing.md` step 1c, `testing.md`, `roadmap.md` and
      `known-issues.md`.

    ⚠️ **Two claims did not reproduce:**
    - The "661 accepted → refused" in its commit and `known-issues.md` measures **306** today. Its
      corpus has moved (1,201 modules, against ~1,195 then), so this may be drift.
    - There is no tag-to-tag history yet: `v0.8.0` has no `features.rs`, so the only pair that
      runs is `v0.9.0` → HEAD.

    Notes for wasmrt, not defects:
    - `carry-forward.ts` adds a `git worktree` to the repo it runs from, then prunes it.
    - `carry-forward.ts` exits 0 at a MAJOR floor; `bump.ts` is what enforces the floor.
    - S2 only warns on a hash mismatch.
    - S2 needs `../wasmtk` to be a git checkout.
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
  (The earlier note that binaryang lacked `0xfb 20`–`26` is stale: D1 has them.)
  - ✅ **The opcode follow-up, steps 1, 2 and 4 — DONE 2026-10-24** (owner: "yes go ahead" to the
    plan, once binaryang's opcode work and FL1 were done):
    - step 1: `src/definitions.zig` regenerated from binaryang main `fa00de253` (D1 1.0.1, D2
      2.1.0), `ef74a0a`;
    - step 2 + 4: **`--features` takes D2's names AND meanings** (decided 2026-10-23, shape
      answers 0–2 kept). The record is `interop.md` v37 and the README's _next release_ rows. A test
      holds every D1 instruction to exactly its D1 feature (141 of 582 differed before, every one a
      wasm-tools layer). The six wasm-tools-only names are deprecated aliases with a warning.
    - Shape answer 3 is met by keeping the C ABI's values 20–24 valid and inert. **Nothing was
      APPENDED**: the three D2 features wazmrt has no bit for (`annotations`, `code-metadata`,
      `compact-imports`) name no module capability it can refuse, so they are names that switch
      nothing.
    - 🚦 **The gate says MAJOR**: S1 +62 −2, `wasm3` without `threads` (D2's release 3.0 has
      none) and `lime1` without the overlong `call_indirect`. Spec conformance unchanged. The
      owner's "one minor release of aliases" therefore lands in a major unless the owner calls it
      otherwise.
    - ⚠️ `cmem/probes/feature-matrix.ts` compares against wasm-tools, and now differs ON PURPOSE.
  - ⏳ **stage B — now unblocked**: replace the hand tables with reads from the copy, one table at
    a time, full gate each.
  - ✅ **D3 — adopted 2026-10-23** (owner: "start checking against binaryang's trap classes").
    `assert_trap` is class-checked, and the first run found two wrong-trap defects, both fixed
    (`known-issues.md`). ⏳ A D3 class for "expected shared memory" is a request to binaryang.
  - ⚠️ **The copy is binaryang's MAIN, not a release** (the guide: D1 1.0.1 / D2 2.1.0 ship in
    binaryang's next release). When that release is cut, regenerate from it: the hashes must not
    move, and the header's version will read the release's.
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
