# open-work.md — what is outstanding in wazmrt

**The ONE list of open work, and the only status line** (`../../cmem/memory-conventions.md`: "the
status narrative exists once"). Only open items; each points at its record. Done work leaves this file
and is summarized in [`roadmap.md`](roadmap.md) with its commits.

## 🏁 Status — 2026-10-24

**`4.0.0` is released** (2026-10-24, owner: "update the project memory files, bump then push"):
value types follow binaryang D2 2.2.0's `typeRules`, read from the definitions copy (`interop.md`
v39). A MAJOR by the gate: S1 −20 since `3.0.0`. wazmrt and binaryang 2.2.0 agree on all 2,352
judgements of the D2 matrix. wasmrt made the same change (`cee7bd1`) and released its own `1.0.0`
(`9871fd4`); the two agree on every D2-matrix judgement and every CLI case. ⏳ The v39 mirror.

**`3.0.0`** (2026-10-24, owner: "cut the 3.0.0 after the H23 id clash is fixed"):
`--features` takes binaryang D2's names AND meanings (`interop.md` v37). A MAJOR by the gate: S1
−2 since `2.0.1` (`wasm3` without threads, kept by the owner; `lime1` without the overlong
`call_indirect`). README Breaking Changes has the four rows (`releasing.md`).

**`2.0.1`** (2026-10-24, owner: "ship 2.0.1"): a `--pins` DB that cannot be read
REFUSES (contract v35, §5 #14), and `--env` takes only well-formed `KEY=VALUE`, a repeated KEY
replacing (§5 #13). Both refuse what `2.0.0` accepted; 🔒 the owner ships them as a **PATCH**, as
security fixes, with README Breaking Changes rows (`releasing.md`).

**`2.0.0`** (2026-10-23, owner: "2.0.0 is fine", then "yes"): a 64-bit table needs
`memory64`. That is accepting less, so it took the gate's MAJOR floor, the first major the gate set
(`releasing.md`). `1.0.4` shipped earlier the same day. Its number is the gate's patch floor, and it carries the two wrong-trap
fixes ([`releasing.md`](releasing.md)). Every release from `v1.0.1` to `v4.0.0` is tagged on
`synapticforge1/wazmrt`. Contract: `interop.md` **v39** (v33 ended lockstep; v35 refreshed the stale wasmrt cells and decided §5 #13/#14; v36 records #13 met on both; v37 is D2's `--features`; v38 records it AGREED on both; v39 is D2 2.2.0's type rule); wasmrt's copy was byte-identical at v38 (`f88a9ab`), and v39 is PENDING MIRROR. The counts are in
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
    running both, identical on six `--env` cases, recorded as v36. ✅ **wasmrt mirrored v36 + v37
    and made the v37 `--features` change** (`5315faf`, `4162c52`, `daec1d6`); re-run on both
    binaries: D2 matrix 2,352 / 0 differ, CLI corpus identical, recorded as v38. ✅ **wasmrt
    mirrored v38** (`f88a9ab`): the copies are byte-identical (`cmp`). §2.2m asked whether v32 reverses v30's MEANINGS too, or
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
  - ✅ **stage B — DONE 2026-10-24** (owner: "proceed with stage B"), one table per commit,
    full gate each.
    - Every hand-kept DATA table is generated from D1 at compile time: the three alignment tables
      (`f0d1246`), the SIMD mnemonic table with its immediate shapes (`693f8c8`), the atomics
      mnemonic table (`06b4601`) and `simdIsMemoryOp` (`405431a`).
    - Each was proven equal to the hand table by a temporary test before the hand copy was
      deleted.
    - Conformance unchanged throughout. Size: exe +0, lib −480, dll +0 net.
    - 🔒 **What stays hand-kept, on purpose:** the `Op` enum, the decoder's switches and
      `opFeature`. `Op` gives prefixed instructions internal tags (`struct_new` = 0xf3), not their
      encodings, and the interpreter and validator name it everywhere, so generating it means
      generating the decoder. Both are HELD to D1 by tests instead: the decoder knows exactly
      D1's 582 opcodes, both directions; every instruction is gated by exactly its D1 feature.
  - 🔒 **Owner, 2026-10-24: "keep D2's wasm3"** (no `threads`). The next release is therefore a
    MAJOR, `3.0.0`, by the gate: S1 −2 since `2.0.1`.
  - ⏳ **Waiting on binaryang: the D2 feature matrix, MEASURED 2026-10-24** (owner: "yes feature
    matrix against binaryang"). `probes/d2-matrix.ts`, wazmrt `b534ee4`+ against binaryang 2.1.0
    (`src` unchanged since the tag): 48 modules × 49 configs = 2,352 judgements, **62 differ**, in
    four groups. 📬 **SENT to binaryang by the owner, 2026-10-24.**
    ✅ **ANSWERED the same day** (binaryang § 44, sent by the owner). Every row reproduced, and every
    one was binaryang's. On binaryang `main`, shipping in its next release (≥ 2.2.0):
    - `--disable-mutable-globals` now refuses;
    - the overlong index is reference-types';
    - D2 gains `typeRules`, wasm-tools 1.262's type rule (owner: "wasm-tools' rule"), and
      `encodingRules`;
    - `(ref any)` is gc's.
    - The D3 shared-memory class: **DECLINED** (binaryang, 2026-10-24). See the D3 bullet below.

    ⏳ **wazmrt's side, re-measured against binaryang `main` `4a829d216`: 22 of 2,352 differ, all
    wazmrt ACCEPTING what D2's `typeRules` refuse.** Three gaps in `valTypeNeeds` and the gc
    grant:
    - the GC types (`any` `eq` `i31` struct array, the bottoms) need reference-types AND gc, and
      wazmrt asks gc only (18);
    - `exnref` needs reference-types AND exceptions, and wazmrt asks exceptions only (2);
    - `(ref func)` / `(ref extern)` need reference-types AND function-references, but wazmrt lets
      gc stand in for function-references, which `typeRules` allows only for a concrete
      `(ref $t)` (2).

    🔒 **Owner, 2026-10-24: fix it AFTER binaryang ships.** Re-pin to that release, generate the
    type rules from the copy (the generator renders `typeRules` / `encodingRules` first), fix,
    re-run `probes/d2-matrix.ts` to 0. It is accepting less, so the gate sets **4.0.0**. The
    contract's `--features` row changes for both runtimes: wasmrt applies the same rules (its
    matrix matched wazmrt's), so it migrates at the same time.
    ✅ **DONE 2026-10-24, once binaryang 2.2.0 shipped** (owner: "binaryang release 2.2.0 is live"):
    - re-pinned to 2.2.0, with the generator rendering `typeRules` / `encodingRules` / `presets`
      / `requires` (`ee71a70`);
    - `valTypeNeeds` reads the rules from the copy, with a compile error if a rule or a feature
      name stops matching;
    - matrix vs binaryang 2.2.0: **2,352 / 0 differ**; three new pins, inverted.
    - S1 −20, so the floor is MAJOR: **released as `4.0.0`**. Contract v39.
    - ✅ wasmrt adopted the same rule (`cee7bd1`). Re-run on wasmrt `1.0.0` (`d0cb616`): 2,352 / 0
      differ, CLI corpus identical. ⏳ **The v39 mirror.**
    - ✅ **Re-measured 2026-10-24 on 4.0.0** (wasmrt's ask: const-expr depth > 8 and the element
      flags, unmeasured since the 2026-09-21 build), with `probes/constexpr-elemflags.ts` on four
      tools. **Both are still wazmrt defects**, and wazmrt alone differs:
      - depth ≥ 9 is refused (`var stack: [8]V`);
      - element flags 8 with a valid tail is accepted (flags > 7 never rejected).

      Recorded in `known-issues.md` (top) with cause and fix. ⏳ **Fix, owner's call** — the first
      refuses-valid, the second accepts-invalid; each would be a test plus a small change.

    The letter as sent:

    > **To binaryang — the feature matrix you asked for (letter of 2026-10-24), wazmrt against
    > 2.1.0.** wazmrt now gates each instruction by D1 alone, uses D2's names and presets, and
    > records `requires` without enforcing it; a test holds all 582 D1 instructions to their column.
    > Run validate-only over wazmrt's S1 corpus under D2's presets, `-all,<f>`, `all,-<f>` and
    > `-all`: 2,352 judgements, 62 differ. **The check:** `bun cmem/probes/d2-matrix.ts <wazmrt>
    > <binaryang> <wazmrt>/tests/behaviour <work>`, which spells each config to `wasm-validate` as
    > the `--enable-*`/`--disable-*` toggles from your defaults.
    > 1. **`--disable-mutable-globals` refuses nothing** (23): a module that EXPORTS a mutable global,
    >    and one that IMPORTS one, both validate with it. wazmrt refuses both. Is the switch meant to
    >    be inert? If so, say so in its help the way `compact-imports` does ("declared, changes
    >    nothing").
    > 2. **An overlong `call_indirect` table index (`80 00`) validates with reference-types OFF**
    >    (24: every `-all,<f>` config, and `wasm1`). The 1.0 binary grammar has the single byte
    >    `0x00` there; wazmrt and wasm-tools refuse it. Which feature does D2 say the LEB index
    >    belongs to?
    > 3. **D2 says which feature each INSTRUCTION needs, but not each TYPE** (13). For typed
    >    references `(ref func)`, `(ref extern)` and `(ref $t)`:
    >    - with function-references on and reference-types OFF, binaryang accepts them and wazmrt
    >      refuses them (wazmrt asks reference-types too, as wasm-tools does);
    >    - with gc on and function-references OFF, binaryang refuses them, including `struct.new`'s
    >      `(result (ref $s))`, and wazmrt accepts them (gc admits a typed reference, as wasm-tools
    >      does).
    >
    >    Your letter says "a GC struct is ACCEPTED" under `all,-function-references`. It is, as a
    >    type; a function that returns one is not. Please state the type rule in D2, so both
    >    runtimes take it from there.
    > 4. **`(ref any)` is gated by function-references, not gc** (2): it validates under
    >    `-all,function-references` and `all,-gc`, and is refused under `-all,gc`. `any` is GC's
    >    hierarchy; wazmrt gates it by gc. This looks like a defect.
    >
    > Nothing else differs: every preset, and every other single feature on or off, agrees on all
    > 48 modules. wazmrt's own D1/D2 copy pins 2.1.0; your validator defect with DEFAULT features
    > never touched wazmrt's measurements (its one sweep passes `--enable-all`).
  - ✅ **D3 — adopted 2026-10-23** (owner: "start checking against binaryang's trap classes").
    `assert_trap` is class-checked, and the first run found two wrong-trap defects, both fixed
    (`known-issues.md`). ✅ The request for a D3 class "expected shared memory" was **DECLINED by
    binaryang** (2026-10-24): D3 holds only messages the spec testsuite writes, and the threads
    suite never asserts that trap. wazmrt keeps its own check, `error.ExpectedSharedMemory`
    (`interp.zig`, an `atomic.wait` on an unshared memory), outside D3. Closed.
  - ✅ **The copy pins binaryang 2.1.0** (published 2026-10-24, JSR and npm). Regenerated from the
    release: D1, D2 and D3 hashes identical to the `main` copy of `ef74a0a`, only the header's
    version moved. binaryang's letter of 2026-10-24 confirms the rules wazmrt implemented (v37):
    `return_call_ref` is function-references; `requires` recorded, not enforced; `call_ref` refused
    under `all,-function-references`. FL1: `sat-float-to-int` is GONE in 2.0.0 and D2 has no
    `cliAliases`, so binaryang's own open-work item 33 ("kept as a deprecated alias") is the stale
    text, not a disagreement in the data.
- **The macOS pass** of the POSIX path fix — when the owner has the machine. Checklist and every probe
  it needs: [`probes/README.md`](probes/README.md) → "Open: the macOS pass".

## 📬 Workspace letters

**Every letter addressed to wazmrt is done on wazmrt's side** (2026-10-24, H24 included: the ★
block re-copied, `462e0e8`). The summaries, with their commits, are in [`roadmap.md`](roadmap.md)'s
milestone table. Two remnants:

- **H10**: stages A and B are done, and `--features` takes D2's meanings (3.0.0). What remains
  is DONE on wazmrt's side: D2 2.2.0's `typeRules` closed the 22-case type-rule gap (contract v39;
  released as `4.0.0`). The D3 shared-memory request is closed (declined).
- **H6's rule 3**: every release from `v1.0.1` to `v4.0.0` is tagged, and S1 / S2 / S3 carry
  behaviour forward from them. It waits only for a consumer's own suite (none depends on wazmrt
  yet).

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
