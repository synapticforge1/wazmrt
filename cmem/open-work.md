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
- **Letter H10** — generated opcode/feature tables wait on binaryang's H9 schema. Filed for it: wazmrt's
  table has `0xfb 20`–`26` (custom-descriptors), which binaryang lacks.
- **The macOS pass** of the POSIX path fix — when the owner has the machine. Checklist and every probe
  it needs: [`probes/README.md`](probes/README.md) → "Open: the macOS pass".

## 📬 Workspace letters still open for this repo

- **H6** — SemVer 2.0.0 with a compatibility gate on every bump script; the ★ rules block copied into
  `best-practices.md` under a dated stamp; memory layout per `memory-conventions.md`.
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
