# open-work.md — what is outstanding in wazmrt

**The ONE list of open work, and the only status line** (`../../cmem/memory-conventions.md`: "the
status narrative exists once"). Only open items; each points at its record. Done work leaves this file
and is summarized in [`roadmap.md`](roadmap.md) with its commits.

## 🏁 Status — 2026-09-21

**`1.0.3` is released** (2026-09-21, the release commit; pushed to `synapticforge1/wazmrt` 2026-10-21, not tagged) — fixes for four
defects that shipped in `1.0.2`, flat legacy exceptions and wasm-tools' whole feature vocabulary
([`releasing.md`](releasing.md)). Nothing is unreleased. Contract: `interop.md` **v31** (2026-10-23,
record-only: wasmrt's post-rewrite commit ids, letter H21); wasmrt's copy is at 10. Every gate green at the release — the counts are in [`testing.md`](testing.md) and the sizes
in `tools/size-ceilings.txt`, one place each.

## 🗓️ Owner calls

- **Confirm the ladder shift.** `1.0.3` was Track O's number; `releasing.md` and `roadmap.md` now read
  Track O `1.0.4` and Track S `1.0.5` — a reading of "release 1.0.3 now", not a decision.
- **Tagging** `1.0.2` and `1.0.3` — both commits are on the remote (pushed by the owner's order
  2026-10-21, `39ff19e62..46edee93d`); nothing is tagged unless the owner says so.

## ⏳ Waiting on something outside this repo

- **wasmrt** — mirror `interop.md` v31 (it holds 10); make letter H13's three encoder fixes (`.wat`
  pins agree 64/528 until it does, §3.1); match v30's `--features` vocabulary and semantics, checked
  by running [`probes/feature-matrix.ts`](probes/feature-matrix.ts) on it; its `--dir` help still shows
  the pre-v27 rules. Lockstep engages when wasmrt reaches `1.0.1` (`interop.md` §1e).
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

## 📬 Workspace letters still open for this repo

- **H6** — ✅ addressed 2026-10-23. **SemVer 2.0.0** replaces the single-digit odometer
  (`releasing.md`). **The compatibility gate** is `zig build surface` (`tools/surface.zig`, on
  `zig build test` too). It snapshots the C header, `root.zig`'s `pub` decls and the `--help` syntax,
  and refuses a bump below the floor; inverted, every mutant red for its own reason. **The ★ block**
  (28 rules, verbatim) is `best-practices.md` §7. **Memory layout** was H3 and **tooling** was H15, both
  closed. The README has a **⚠️ Breaking Changes** table (the `1.0.2`/`1.0.3` rows). ⬜ **What H6's rule 3 needs and
  wazmrt lacks**: a TAG, for "the previous tag's tests against the new `src/`", which waits on the
  owner's tagging call above; and consumers, none yet.
- **2026-10-23 sweep** (owner: "review letters or rules that have changed"): **H18** — addressed
  (`.claude/settings.local.json` untracked and gitignored, `design-decisions.md`'s drive path → a
  placeholder, real paths in the gitignored `cmem/local/`). **H20** — not applicable: wazmrt has no
  CI workflows and publishes to no registry, so no trusted-publishing policy pins its owner ID.
  **H21** — addressed (contract v31). **H15** — ✅ addressed: no committed script runs on Deno.
  `tools/{phases,bakeoff,emitter-diff}.mjs`, the FFI demo (now `examples/bun_ffi_capi.mjs`) and the
  25 probes in `cmem/probes/` run under Bun, each proven against its Deno original. Owner,
  2026-10-23: `build.zig`'s Zig tools are build steps, not scripts, and one-time scripts are relaxed
  (`working-rules.md` → TOOLING). **H19** — ✅ done 2026-10-23 (owner: yes to the purge and the force-push): every
  commit rewritten, with no drive path in any tree or message, the noreply address as author and
  committer, and the final tree byte-identical. **Every commit id changed**: old ids (in older
  trees, in the workspace's letters, in GitHub's cache) are looked up in
  [`history-map-2026-10-23.md`](history-map-2026-10-23.md). **H16** — a per-clone fix, so its
  record is the private `cmem/local/environment.md`.
- H1, H3, H8, H13 are addressed; each closes in `../../cmem/handoffs.md` when the workspace names the
  commit. (H3: INDEX 192 KB → 10.7 KB, this file and `working-rules.md` created, drift rows Z1–Z6
  closed, one number per place — proven by `probes/h3-check.ts`, which the workspace can re-run.)

## 🛠️ Roadmap items not started

- **wazmrt flags before the module path** (`wazmrt --dir .::/ m.wasm`), the last of the four §2.1
  spellings ([`roadmap.md`](roadmap.md)).
- **Track O** (optimization review, `1.0.4`) and **Track S** (security review, `1.0.5`) — review and
  recommend, not unilateral passes ([`roadmap.md`](roadmap.md)).
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
