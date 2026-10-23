# history-map-2026-10-23.md — old → new commit ids after the H19 history purge

On 2026-10-23 wazmrt's whole history was rewritten (workspace letter H19, owner-approved):
`.claude/settings.local.json` was removed from every commit, one line of
`cmem/design-decisions.md` had the repo's absolute path replaced by `<repo-root>`, and the
owner's personal address was replaced by the GitHub noreply address as author and committer.
Nothing else changed: messages, names and dates are identical apart from this repo's own commit
ids, which were mapped to their new ids (55 citations in 31 messages), and the final tree is
byte-identical to the pre-purge HEAD (`3773dba3cf9b`). No tags existed. 407 commits, one row each,
newest first. The tracked files' own citations (227 of them at the purge) were mapped in the
commit that adds this file; older trees still quote the OLD ids, so look an id up here.

| old | new | date | subject |
| --- | --- | --- | --- |
| `af3bdf026d2c` | `d445fbd67834` | 2026-10-23 | tools: Bun for every script build.zig runs; the FFI demo is a Bun demo (H15) |
| `eed2eb2fa823` | `0327fea6b875` | 2026-10-23 | docs(interop): contract v31 — wasmrt's post-rewrite commit ids (H21) |
| `6970147aa637` | `fd95e775cf63` | 2026-10-23 | docs(cmem): no personal paths in tracked files; wasmtk's move recorded (H18, H20) |
| `4684a838a0dc` | `70432bd1c14d` | 2026-10-21 | docs(cmem): 1.0.2 and 1.0.3 are pushed; tagging stays open |
| `fbc774508108` | `46edee93d893` | 2026-10-21 | docs(cmem): record the move to the synapticforge1 organization |
| `8f9c350d619c` | `67d82e7ee676` | 2026-09-21 | release: 1.0.3 — fixes for four 1.0.2 defects, legacy EH, wasm-tools' feature vocabulary |
| `8e18cab0a43d` | `25ee7358871c` | 2026-09-21 | fix(capi): memory_size_pages honours custom page sizes; capi-smoke un-staled |
| `0c6f4dc46f2d` | `3fe416f122ca` | 2026-09-21 | docs(cmem): letter H3 — INDEX 192 KB to 10.7 KB, open-work.md, working-rules.md, drift Z1-Z6 |
| `21d633b6c876` | `3f1bfbc1da00` | 2026-09-21 | docs(cmem): I5 corrected — 44 wasm-tools-only opcodes, not nine; none run in wasmtime |
| `1f4a83320bc9` | `b783e69206d4` | 2026-09-21 | fix(opcode): refuse the twenty unassigned 0xFD gaps; letter H8 complete (I5) |
| `f00ff6489d5e` | `520e0089d089` | 2026-09-21 | feat(features): wasm-tools' whole feature vocabulary, with wasm-tools' meanings |
| `ee5157419e29` | `b64a048a9e3f` | 2026-09-21 | feat(wat): flat legacy exception handling — try, catch, catch_all, delegate |
| `88b63d008407` | `d138d5b47b66` | 2026-09-21 | docs(probes): wasm-tools feature and preset semantics, measured |
| `0c931de6ef3d` | `5f82c94bf637` | 2026-09-21 | docs(cmem): letter H8 — I6, I7, I8 measured; B-c5's overclaim corrected |
| `f2f890695aff` | `c7a75888d2c0` | 2026-09-21 | release: 1.0.2 — Track B, the --dir grammar, POSIX path rules, letter H13 |
| `9a22cab021d4` | `9aee871d195f` | 2026-09-21 | fix(wat): module bodies match wasm-tools (workspace letter H13: I12, I13, I14) |
| `f734ef7c5e2d` | `ba205dea7ace` | 2026-09-21 | docs(cmem,readme): letter H1 addressed, contract v28, lockstep, probes kept in cmem |
| `24e5e0958ff5` | `589c954e5282` | 2026-09-21 | feat(main,wasi): a --dir host-path grammar, and POSIX path rules in the WASI resolver |
| `50f5bf41731d` | `da4e558cf66f` | 2026-09-21 | refactor: rename wazmrt's own Track H items H1-H8 to zH1-zH8 |
| `7919b64d6493` | `39ff19e62cdd` | 2026-09-21 | update memory management index |
| `79a3dd3887ec` | `ececcb0a29f0` | 2026-09-20 | docs(roadmap): close two rows the custom-annotations work already answered |
| `fce2041be3f3` | `46a8fd3b6e3d` | 2026-09-20 | docs(cmem): sync the counts and add three method lessons |
| `01f92205474b` | `69ad348f3df5` | 2026-09-20 | docs(cmem): four owner decisions, the oracle contradiction retired, H1 measured |
| `89f380a5b5a0` | `2c1fb37f20d7` | 2026-09-20 | feat(main): a wazmrt flag in a guest position is now an ERROR, not a warning |
| `e9d94b5e8c3e` | `a83eb6254ae0` | 2026-09-20 | docs(cmem,readme): custom annotations shipped — and two method lessons from it |
| `bef9372bec73` | `038726e56881` | 2026-09-20 | feat(wat,sexpr): custom annotations — @custom, @name, @metadata.code.branch_hint |
| `22562ebb10ab` | `3774122aa4ce` | 2026-09-20 | docs(roadmap): how wasmrt and binaryang resolved @custom — and a live wazmrt defect |
| `21ea6cc502af` | `95ebb0379497` | 2026-09-20 | docs: the two pub surfaces stay (owner), and the @custom gate question is answered |
| `d084d561f8cd` | `a782b9d642dd` | 2026-09-20 | docs(cmem): the filed items are closed — and one filed REASON was wrong |
| `91aee68c0a42` | `0622496b1630` | 2026-09-20 | fix(wat,sign,interp): clear the filed Track B items before the version bump |
| `a3eca43d58b5` | `ec38223d090b` | 2026-09-20 | docs(roadmap): Track B is complete — and deliberately not versioned |
| `2dbc0a2d809a` | `92608c1277c8` | 2026-09-20 | docs(cmem): update the project memory — stale claims corrected, Files table refreshed |
| `58f14bed18e5` | `132489fb029e` | 2026-09-20 | docs(cmem): the general hunt recorded — and the method result is the finding |
| `7de54a451393` | `6dd8dc9898b4` | 2026-09-20 | fix(wat,tests): a duplicated reftype table refused VALID modules, and a gate was missing a symbol |
| `7a6e7f86622c` | `099e3c1f87d4` | 2026-09-20 | docs(licensing): audit third_party — six of nine reference projects were never used |
| `e5ac7fb36a17` | `7a09b88e2e39` | 2026-09-20 | fix(features,Module,opcode): Track B general hunt — AN UNENFORCED PUBLISHED GATE, AND AN ACCEPT-INVALID |
| `f7c75ff24f1f` | `d588f9935f70` | 2026-09-20 | docs(cmem): B-e recorded, the stale dll numbers corrected, and Track B is NOT done |
| `90d501d23d6d` | `256176df3288` | 2026-09-20 | build: Track B-e — THE SIZE GATE WAS GRADING A 34-DAY-OLD DLL |
| `74bc50733bfe` | `ce6840d4e706` | 2026-09-20 | docs(cmem): contract v25 — B-a found four, and Track B is down to one item |
| `d47ecd1861b1` | `ff8567446818` | 2026-09-20 | fix(wat,opcode,validate): Track B-a — FOUR EMITTER DEFECTS, NONE VISIBLE TO ANY GATE |
| `0b8a4fe913a4` | `b44a2766035f` | 2026-09-20 | docs(cmem): contract v24 — the subcommand spellings, and B-c is complete |
| `8e04263b0cf4` | `b35940cba030` | 2026-09-20 | feat(cli): Track B-c4 — the sibling's four subcommand spellings |
| `739c8903e9c6` | `164772c1d895` | 2026-09-20 | build: standardize on LF — .editorconfig, and the rule written down as binding |
| `ae806c49c7ed` | `bcdb3fdec020` | 2026-09-20 | docs(cmem): contract v23 — B-d closed, parity is total, and LF is the rule |
| `973dc0de37f3` | `35d8aa4b5267` | 2026-09-20 | fix(wat): Track B-d — AN IMPORT COULD GET A SIGNATURE ITS OWN TEXT DENIED |
| `b55e1a454b63` | `2a05a4e4783e` | 2026-09-20 | build: pin line endings to LF with .gitattributes |
| `94294541de53` | `bb3e5225d6bf` | 2026-09-20 | docs(cmem): contract v22 — Z4 is closed, and the run found two more defects |
| `a495424fc587` | `1bfdc6f571dd` | 2026-09-20 | feat(wat): Track B-c2 — Z4. THE ASSEMBLER THREW EVERY IDENTIFIER AWAY |
| `41a96aa3cb18` | `d590bb338b69` | 2026-09-19 | docs(cmem): contract v21 — wazmrt adopts Z1-Z3, --dir, the pin DB order, the vocabulary |
| `f159b053db34` | `00706828a4c3` | 2026-09-19 | docs(cmem): tooling rules corrected to Deno OR Bun, and PROVE-don't-assume |
| `22437455af4d` | `3fb36c7a486e` | 2026-09-19 | feat(cli): Track B-c1/c3/c5 — --dir was broken, and a pin-DB swap could disarm |
| `0a48957ac9b7` | `f780ad279907` | 2026-09-19 | fix(cli): Track B-b — Z1/Z2/Z3, and a flag-list drift that DISARMED --verify |
| `91e92c4f48d9` | `02bcfbc2fe90` | 2026-09-19 | docs(cmem): tooling rules — Deno-only scripts, and NO HEREDOCS |
| `c974964afb14` | `fef159c464c7` | 2026-09-19 | docs(cmem): coordinate — contract v11→v20, and `--dir .:/` DOES NOT WORK |
| `5933d4f429e9` | `c626d80f9a78` | 2026-09-19 | fix(cli): H8 — `--features` written after the module path was SILENTLY IGNORED |
| `612522c7749d` | `4c1111a25944` | 2026-08-19 | docs(cmem): H4's speed baseline was TOY-SCALE — Track O's first item is now defined |
| `3f59404183be` | `990e41186f83` | 2026-08-19 | fix(cli): H7 — a misplaced wazmrt flag no longer applies SILENTLY |
| `6cc89ce5f831` | `9acdcb4e549a` | 2026-08-19 | feat(hardening): Track H — v1.0.1. THE SHIPPED CONFIG HAD NEVER BEEN TESTED |
| `413ac2b9ff4b` | `447189e791b2` | 2026-08-18 | docs(cmem): audit after Track A + a STATE AT PAUSE summary at the top of the index |
| `2f50a38e2522` | `897ac806a990` | 2026-08-18 | feat(sexpr): Track A — custom-annotations. THE BASELINE IS EMPTY AND EVERY FILE RUNS CLEAN |
| `6a69f90da6fb` | `ee1fcb72284c` | 2026-08-18 | docs(cmem): the bake-off is a COMPARE task, not a fix task — reclassified out of the work queue |
| `3e91b05632e9` | `b41a0659e0a6` | 2026-08-18 | docs(cmem): audit after Track L, and scope the last entry — `annotations.wast` does not PARSE |
| `af5e121e93f3` | `c7f3d19df95f` | 2026-08-18 | feat(wat,validate,interp): Track L — legacy `delegate`. THE CORPUS IS NOW AT ZERO SKIPS AND ZERO FAILURES |
| `dbcd37570dc7` | `62051168ae74` | 2026-08-18 | docs(cmem): audit the memory after Track F + the skip work — and SD-3's reopen condition was ALREADY MET |
| `d80387cdd774` | `a1832e381289` | 2026-08-18 | feat(opcode,interp,features): wide-arithmetic — a whole proposal for ~3 KB, and 109 of the 134 skips |
| `fb643e0ed5ea` | `176539c19773` | 2026-08-18 | fix(opcode,wat,wast): close 10 of the 144 skips — and two of the four were rejecting VALID modules |
| `29108257b612` | `1fd25bd9136d` | 2026-08-18 | feat(features,validate,main): Track F — feature ENFORCEMENT is COMPLETE, and two of its four items were holes nobody had scoped |
| `0b8aba697b9d` | `7be560e14e80` | 2026-08-17 | docs(cmem,README): fold the revisions into the project memory — Track F handoff ready |
| `1d6f14409068` | `280b3a34639e` | 2026-08-17 | fix(wat,wast,Module): close the last two conformance defects — the corpus is at ZERO |
| `85b41e3ad4cf` | `264f660f9234` | 2026-08-17 | docs(cmem): update the project memory for Tracks D2–D4 — audit, not just append |
| `b9aeaa5f90f0` | `1f9a1e27a65f` | 2026-08-17 | docs(cmem): name the three STANDING DELTAS — and correct a list that outlived its truth |
| `8265db555269` | `895573edbc88` | 2026-08-17 | feat(gc): Track D4 — the descriptor casts, and custom-descriptors is COMPLETE |
| `05de2e97f25d` | `228035ca7149` | 2026-08-17 | feat(gc): Track D3 (+D5) — `struct.new_desc` / `ref.get_desc`, descriptors as VALUES |
| `ba5a34c683ca` | `1e99d1841603` | 2026-08-17 | feat(gc): Track D2 — `(descriptor $d)` / `(describes $s)`, in all three type-identity keys |
| `d25a9bc4849f` | `bf9fde4ed92b` | 2026-08-17 | docs(cmem,README): update the project memory for Track P, D1 and the encoding fix — handoff state |
| `ee0ae645400a` | `c69bd1cb6334` | 2026-08-17 | feat(gc): Track D1 — the `(exact $t)` reference-type former, with subtyping enforced |
| `373c2be8c571` | `9dd6202e707d` | 2026-08-17 | fix(wat): stop emitting INVALID binaries — a non-null abstract ref is `0x64 heaptype` |
| `9d0ed7014142` | `7ef0b705a564` | 2026-08-17 | feat(memory): implement custom-page-sizes (Track P) — 2 failures and 69 skips closed |
| `584bfad5ec92` | `e2337ed5d582` | 2026-08-17 | docs(cmem,README): update the project memory — audit for stale live claims, not just edited files |
| `0785509e6579` | `73a645b3b70f` | 2026-08-17 | docs(cmem): extract nine method rules from this session — and CORRECT two that stated wrong causes |
| `b57077fa6037` | `f8fd31702c02` | 2026-08-17 | fix(wat,opcode): tell "your input is bad" from "we are incomplete" — 292 skips become passes |
| `1149a2b37bc8` | `017361f0e656` | 2026-08-17 | feat(features,wast): close the last 8 conformance failures — F3 multi_table + F4 era policy |
| `a20f19429be8` | `1d8676b12bae` | 2026-08-17 | docs(cmem): the D: build blocker was misdiagnosed a FOURTH time — the cause is the cache LOCATION |
| `c367f2f2f97d` | `1aaa75cfb34a` | 2026-08-17 | docs(cmem): audit the memory for stale LIVE claims — six were still standing, including the headline score |
| `a445becd63a8` | `285a853216ec` | 2026-08-17 | docs(cmem): CORRECT the D: build blocker — damaged exFAT filesystem, not hardware and not antivirus |
| `46a0bdb1eccf` | `c66ad49a69a9` | 2026-08-17 | docs(cmem): flag the D: build blocker at the top of INDEX, where a new session reads it first |
| `458bc9615c92` | `38a6991291c5` | 2026-08-17 | docs(roadmap): scope the last 89 as Tracks F/P/D — and separate the security argument from the count |
| `ed05905a9c44` | `e9d9ce6fc5e5` | 2026-08-17 | Merge branch 'fix/t1-accept-invalid' — spec conformance to zero deviations |
| `e507d1cb44b5` | `f3496faf98d3` | 2026-08-17 | feat(wat): refuse `anyfunc` — wazmrt now has ZERO deliberate spec deviations |
| `4bd70da5d371` | `0b2d51aa7241` | 2026-08-17 | fix(wast): score a module-build gap as a SKIP, not a defect — 104 failures were 90 |
| `1e0771c82623` | `64adc208f745` | 2026-08-17 | feat(phases): Track 3 complete — engine pipeline is 20-55x, and the CLI hid it |
| `b14d36d06258` | `70cb01cd16ac` | 2026-08-14 | docs: the spawn floor reframes Track 3; scope the in-process breakdown; correct wrong advice |
| `d63942875b73` | `1ba365646610` | 2026-08-14 | feat(bakeoff): start mode, a 210x size ladder, wasmrt + wazero — and a refuted prediction |
| `48d985e45a16` | `a010c3a66d27` | 2026-08-14 | feat(capi): references cross the ABI as HANDLES — the last hole in the value-handle model |
| `8ac79a639731` | `55ca39d38ef7` | 2026-08-14 | feat(interp): store-wide TypeRegistry — cross-module concrete casts answer correctly |
| `737beccc6932` | `5cea68c9ab14` | 2026-08-14 | fix(interp): a GC reference names an ENTITY, not an index — R2's model for the `any` hierarchy |
| `97ced77794e4` | `f52993df6ea4` | 2026-08-14 | docs(cmem): externref research + a NEW related finding — cross-instance GC refs |
| `d755e6e0d017` | `07a1743c47d9` | 2026-08-14 | feat(tools,build): Track 3 first cut — bake-off harness; 5.3x on end-to-end invocation |
| `455bfb7cf504` | `5c7a0945dccb` | 2026-08-14 | feat(build,root,capi): Track 2c — comptime feature gating; DLL 862 KB -> 269 KB |
| `3aaccf6d2805` | `e554f7cb1cd4` | 2026-08-14 | docs(cmem): every core spec file is at zero — the conformance list is a record now |
| `22a5f33503e3` | `a9ba281c60dd` | 2026-08-14 | fix(types,Module,validate,wat,opcode): bottom-type lattice — every core spec file at zero |
| `a04a5e59432b` | `0676a254c8b9` | 2026-08-14 | docs(cmem): the R-list is closed — 106 left, 102 by design, and one OPEN C-ABI hole |
| `8e49eb8377f1` | `5bbfcc2fbc67` | 2026-08-14 | fix(interp,validate,wat,wast): the singleton batch — 22 failures, six causes |
| `b64d174c9ab5` | `d67c7ff44598` | 2026-08-14 | docs(cmem): record R7 — the R-list is empty, and "by design" now means two things |
| `cc45ba8c975d` | `4b41bc6ad3d0` | 2026-08-14 | fix(wat,wast): R7 — close all 7 real threads failures; none was a threads defect |
| `76df73b5a3e4` | `b65d6059b8fb` | 2026-08-14 | docs(cmem): record R9 — the first OVER-counted item, and three new traps |
| `03606e3b372f` | `1f77c584267c` | 2026-08-14 | fix(wat,sexpr): R9 — close 70 of 71 text-front-end accept-invalids |
| `6a9dc9b22d41` | `1ff280a720c3` | 2026-08-13 | docs(cmem): record R10 — 416 unblocked, and two rules we had invented |
| `5c46fd0a0a76` | `6c9ac770af3f` | 2026-08-13 | fix(validate,opcode,wat): R10 — unblock 416 assertions behind six blockers |
| `a9b0f73c0448` | `528de5ce9d6c` | 2026-08-13 | docs(cmem): itemise the remaining R-list — open R10 and R9, with live counts |
| `259dccbadc1c` | `2d795dfda8e2` | 2026-08-13 | docs(cmem): record R5 — a 50x undercount, R8 closed, and R4's claim corrected |
| `00cd9470cc62` | `623f24026d2e` | 2026-08-13 | feat(wast,wat): R5 — implement (module quote …), unblocking 978 assertions |
| `dd87e7196d1f` | `17cfea7e2c8e` | 2026-08-13 | docs(cmem): record R4 — five causes, a three-way agreement, eight method rules |
| `6da4e17d957a` | `250efe65ce73` | 2026-08-13 | fix(validate,wat,interp): R4 — core accept-invalid is now zero, in five causes |
| `4ca863e72f4b` | `714540911d10` | 2026-08-13 | docs(cmem): record R3 — six ops, 225 unblocked assertions, five method rules |
| `e55f94fe097c` | `1992ee71a85b` | 2026-08-13 | fix(gc,opcode): R3 — the six array bulk ops, and a raw-tag byte that executed |
| `6291038c2b82` | `b9f972ea9b90` | 2026-08-13 | docs(cmem): finish the R2 memory pass — the six files the first commit missed |
| `2fe756887218` | `99de12fd5c3e` | 2026-08-13 | docs(cmem): record R2 — five causes, the live numbers, and two method rules |
| `b1f9a452cb6f` | `388ad0752cdb` | 2026-08-13 | build(size): raise the ceilings — and record that most of the overshoot predates R2 |
| `b2093b2809c5` | `61536738d911` | 2026-08-13 | fix(wast,interp): module definition/instance, and tag IDENTITY across a link |
| `9980b5964799` | `8a1cc2630893` | 2026-08-13 | fix(decode): the typed-table form, and elem/table types by SUBTYPING |
| `b3eeedd7e11c` | `066d181bd2fe` | 2026-08-13 | fix(interp): element segments run before data, and a failed instance stays alive |
| `279e08d5d9e9` | `4ae904a73946` | 2026-08-13 | fix(interp): an imported global is a shared CELL, not a copied value |
| `10f752020da5` | `d6e1f83186c6` | 2026-08-13 | fix(interp): a funcref names its instance, not an index in the reader's module |
| `3dd41a0a298e` | `87474f1e59d5` | 2026-08-12 | docs(cmem): add best-practices.md — the method rules, extracted and cited |
| `e29d91c0d595` | `1cf3e4d16fe1` | 2026-08-12 | docs(cmem): record R1 as done, refresh the R-list and the README numbers |
| `cbc5ed523959` | `9b320fd827c3` | 2026-08-12 | fix(capi): route define_instance import matching through typematch |
| `9faec5723adc` | `a1231a84da80` | 2026-08-12 | fix(types): scope implicit function types, type-check tag imports |
| `2aa6d61ebe97` | `3fdfb4c72129` | 2026-08-12 | fix(gc): subtype-check call_indirect, stop dropping element-segment types |
| `0686add4d9cc` | `57b41fa25819` | 2026-08-12 | fix(types): compare types structurally across module boundaries |
| `0dd59544766b` | `4e5aaf21c61b` | 2026-08-12 | docs(cmem): close the T-list unambiguously, add the revised 275-failure list |
| `f8d25fcb436c` | `0f735a8e323e` | 2026-08-12 | feat(tail-call): implement return_call/return_call_indirect as real tail calls |
| `53c6f5b02ab6` | `2efeb823af89` | 2026-08-12 | feat(table64): implement 64-bit tables — memory64's missing half |
| `8d69b72a9092` | `659c14d2e301` | 2026-08-12 | fix(gc): validate declared subtypes, track finality, canonicalise rec groups |
| `b14e55a350a7` | `cede9922e861` | 2026-08-12 | fix(wast): report every failure, fix a UAF in the messages, support (either …) |
| `86c945cec6f8` | `1e172da01dc6` | 2026-08-12 | fix(eh): legacy rethrow — remove a stale label pop, validate the label |
| `dfde20852eeb` | `e6d848310501` | 2026-08-12 | fix(decode)!: close the accept-invalid class — section order, size, data-count |
| `41dace315733` | `9e464a36966f` | 2026-08-11 | docs(cmem): record the full corpus run + surface the fix list in the roadmap |
| `3ca21780dd31` | `7e774cee8c80` | 2026-08-11 | docs(cmem): triage the 164 proposal-dir failures into 62 defects + a fix list |
| `30bda986c6ee` | `1fbd4890decb` | 2026-08-11 | docs(cmem): record the ABI-2 invariants and the bugs the build produced |
| `f63f5aa10706` | `9ed7b7b0a33f` | 2026-08-11 | docs(cmem): sync the memory to the ABI-2 reality (step 7 — series complete) |
| `3554ab09c543` | `6b4b4d8c53e9` | 2026-08-11 | feat!: delete the wasm-c-api surface — wazmrt is now 100% self-owned (step 6) |
| `a8cc487a3f2f` | `cc7786002473` | 2026-08-11 | feat!: flip the default to ABI-2 + trap-frame names (steps 4.5 and 5) |
| `2d52ac2a6b8b` | `a47996c7e74c` | 2026-08-11 | feat: per-proposal gating — a disabled proposal makes a module invalid (2e-b, part 2) |
| `840da917d183` | `d5c55dd7eba9` | 2026-08-11 | feat(interp): three backstops become per-instance ceilings (step 2e-b, part 1) |
| `c9c9b28178f2` | `ade225583b1c` | 2026-08-11 | feat(capi): Deno FFI demo on ABI-2 — the wasmtk-facing proof (step 4) |
| `93611ced2985` | `65cf7f9eab4b` | 2026-08-11 | test(capi): link-time symbol gate + C smoke, and the 4 gaps it found (step 3) |
| `80f4f0356c55` | `0a154babbbb4` | 2026-08-11 | feat(capi): config — enforce what we can, REFUSE what we cannot (step 2e-a) |
| `cf340d31b758` | `7eee09848458` | 2026-08-11 | feat(capi): WASI preview 1 behind the linker (step 2d) |
| `9a0c7484c308` | `630592e76ee6` | 2026-08-11 | feat(capi): host functions with a caller handle (step 2c) |
| `213d1885bfdd` | `e657224df423` | 2026-08-11 | docs(cmem): quote NTFS test numbers — a skip count is filesystem evidence |
| `79c74a8601e7` | `a30452235607` | 2026-08-11 | feat(capi): instantiate, call, memory, globals (step 2b) |
| `c848470258f4` | `8de6bf4c9d89` | 2026-08-11 | feat(capi): src/capi.zig — engine, store, module, error, trap (step 2a) |
| `3ffa90340851` | `ef70423f785b` | 2026-08-11 | feat(capi): wazmrt.h v2 — the ABI-2 surface, header only |
| `be77f78cec7b` | `f477175b5654` | 2026-08-11 | build: add `zig build size` — a size gate that fails, before anything can grow |
| `bdec599a163b` | `97b79e422ba0` | 2026-08-11 | docs(cmem): record the agreed Track 1 change series + five owner decisions |
| `a99356ef33bc` | `d1eead1def1d` | 2026-08-11 | docs(cmem): owner overrules the perf deprioritisation — nothing is descoped |
| `7540e4aa2fe7` | `cddcae5d958d` | 2026-08-11 | docs(cmem): record the size/self-ownership program — and read every consumer first |
| `e13d30f51d00` | `31f266becfc1` | 2026-08-11 | docs(cmem): finish the sync the last two commits left half-done |
| `83ee9e0d6281` | `4ad206c3a3a9` | 2026-08-10 | docs: the wasm-c-api payoff was falsified — record where the intent slipped |
| `ea3f7366d5b5` | `af9e5932833f` | 2026-08-10 | Ship the wasm-c-api licence WITH the artifact, not just in the repo |
| `619d32405f48` | `7a90cad3281d` | 2026-08-10 | docs(cmem): record the distribution manifest |
| `a032b6ce4347` | `0372a80de7de` | 2026-08-10 | docs(cmem): record the symlink-creation policy in wazmrt's memory |
| `1a88b845a4de` | `1e21516d9f39` | 2026-08-10 | Deny symlink CREATION by default; `--allow-symlink` opts in |
| `4a6d745dc08e` | `d51d60e1ff32` | 2026-08-10 | security: `--ro-dir` did not prevent symlink creation |
| `c64b059959f6` | `31ecc6342993` | 2026-08-10 | Correct the skip diagnosis: exFAT, not privilege — and 493/493 on NTFS |
| `3e404d2a09f3` | `dbb95ede4b3f` | 2026-08-10 | Add `zig build test-security`: a gate where a SKIP is a FAILURE |
| `5878da513679` | `492be7105698` | 2026-08-10 | docs: a SKIP is not a PASS — head off the natural misreading |
| `1507f489d2da` | `4a1251453dc1` | 2026-08-10 | docs(cmem): sync wazmrt's project memory to the validation + diagnostic work |
| `6b7795ad2612` | `6ec183d46dc6` | 2026-08-10 | Match wasmtime's invalid-module diagnostic, byte-for-byte on the offset |
| `baf0a3801880` | `07c608a962e0` | 2026-08-10 | fix: the paths that EXECUTE were the two that never validated |
| `dadc72724e20` | `d0deab4961e4` | 2026-07-27 | docs(cmem): resolve dync out-of-scope contradiction in the ledger/roadmap |
| `d557aab4027e` | `5bd49783109c` | 2026-07-27 | docs(cmem): dync tests now pass — wazmrt runs the whole wasmtk WASI suite |
| `f4d3a8b6205a` | `776e7cfcefae` | 2026-07-27 | docs(cmem): final consistency sweep — current test count + corpus result |
| `41926841a7da` | `3e82b336cd63` | 2026-07-27 | docs(cmem): record the legacy-EH corpus fix + re-measured WASI corpus |
| `d51c004325ad` | `7b27485a0eb5` | 2026-07-27 | fix(interp): legacy try/catch — a throw inside a catch handler must go outward |
| `fc1a0c953edc` | `d2ef640fceb4` | 2026-07-27 | docs(cmem): full memory sync — current state + correct stale deferred notes |
| `196e3f6a54b2` | `0a817b7ae956` | 2026-07-27 | docs(cmem): record the noted-LOW-fix audit (fixes verified clean + s33 sweep) |
| `937739c68e01` | `c8c8bdff1ef5` | 2026-07-27 | fix(decode): use readVarS33 for the 3 remaining s33 heap-type reads |
| `a43c46f82658` | `873f5d46cbeb` | 2026-07-27 | docs(cmem): sync current state — test count, table budget, stale-clause fixes |
| `dfb18ba8f430` | `bd2a54536f22` | 2026-07-27 | docs: record the 4 noted-LOW fixes; document --max-table-elems |
| `bc39e8916079` | `f21c63ab2aba` | 2026-07-27 | fix(audit): close the 4 noted-LOW items from the assembler audit |
| `e33956feb226` | `535db25f02e8` | 2026-07-27 | docs(cmem): record the 2026-07-27 assembler audit (3 fixed + 4 noted LOW) |
| `436196e1d757` | `858c984a9446` | 2026-07-27 | fix(audit): assembler — flat-form SIMD memory ops + 2 ordering/laxness bugs |
| `517178338779` | `3df0d47c18b2` | 2026-07-27 | docs(cmem): tag imports done — the WAT assembler has no remaining gaps |
| `49e528470320` | `1474219e32a6` | 2026-07-27 | feat(wat): tag imports — the last assembler gap is closed |
| `fff192423bd7` | `177a050cc45c` | 2026-07-27 | docs(cmem): roadmap status — record the audit + deferred-item cleanup |
| `c31d81145968` | `690faaebf405` | 2026-07-27 | docs(cmem): the audit's deferred list is closed (multi-memory SIMD text +3) |
| `e276d095051a` | `09d6bae8804d` | 2026-07-27 | feat(wat): clear the deferred assembler gaps — multi-memory SIMD text +3 |
| `30cc8013d5cb` | `98014150ee55` | 2026-07-27 | docs(cmem): record the post-memory64 audit pass (4 fixed + 4 deferred) |
| `f478f7991e93` | `85275c24c3fd` | 2026-07-27 | fix(audit): memory64 memarg-offset width + SIMD address type; 2 minor |
| `c3ba5dba0215` | `42af0354f239` | 2026-07-27 | docs(cmem): finish the memory64 sync — clear the last stale "remaining" notes |
| `b44cff4fd450` | `9d3944a81c09` | 2026-07-27 | docs(cmem): record memory64 completion — every targeted proposal now built |
| `1991daa37a27` | `b18b7b5ca7f3` | 2026-07-27 | feat(memory64): i64 memory addresses — the last unimplemented proposal |
| `43d9ddc4f29c` | `38043dddc8f2` | 2026-07-27 | docs(cmem): sync memory to the open-items-1–7 batch (multi-memory text, atomics, GC const-exprs) |
| `3554e381a796` | `e43c7d616ba2` | 2026-07-27 | feat(threads): atomics (0xFE) — the whole family, end to end |
| `baefac25beaa` | `5fcd36b8aadb` | 2026-07-27 | feat(wat): multi-memory text assembly (the runtime already supported it) |
| `363e764611c6` | `a9238c19129f` | 2026-07-22 | feat(gc): constant GC instructions in const-exprs (struct.new/array.new*/ref.i31) |
| `86477844c503` | `d99b9bba247f` | 2026-07-22 | fix(validate+interp): refuse legacy `delegate` uniformly instead of mis-routing |
| `6273069fbc41` | `5d39728b408f` | 2026-07-22 | fix(wat): preserve import declaration order in the emitted binary |
| `073092151502` | `1e9772d881fa` | 2026-07-22 | docs(cmem): sync overview/roadmap/text-toolchain/testing to current state |
| `d6dcad23aa5d` | `3b9acd92e892` | 2026-07-22 | docs(cmem): record named-field fix; narrow "open issues" to an honest set |
| `358a9dbbd06b` | `65dd7cefae0c` | 2026-07-22 | fix(wat): resolve struct fields by name (struct.get/set $T $field) |
| `169ae45cfa48` | `144f5711b382` | 2026-07-21 | docs(cmem): record the assembler-gap batch + legacy try/catch closeout |
| `f503cb56f223` | `e1b3b7e83ead` | 2026-07-21 | fix(wat): accept `anyfunc` as the pre-standard spelling of funcref |
| `25e3eb4e1f56` | `f0a5154751ab` | 2026-07-21 | feat(wat+validate): legacy folded try/catch — assemble AND validate it |
| `a80e7d37307f` | `2ff32785c94d` | 2026-07-21 | fix(wat): close six assembler index-space gaps found by the 13th pass |
| `3baebb7442e5` | `44d788674fce` | 2026-07-21 | docs(cmem): record the 13th pass — running the spec testsuite for the first time |
| `7cbb2e4bfbf0` | `e4df842280de` | 2026-07-21 | fix(security+correctness): element-segment confinement break, v128 slot/index conflation, resource caps, CLI flags |
| `0c34574225fe` | `34a072e05cf5` | 2026-07-21 | fix(spec+correctness): hex-float rounding, v128 in the .wast runner and const-exprs, nearest sNaN, OOM swallow |
| `73be6a5f227d` | `7d5938fe6a7d` | 2026-07-21 | fix(spec): 13th pass — guest-controlled stack overflow + missing UTF-8 name validation |
| `1bee76e3e59e` | `f92cecb3135b` | 2026-07-21 | fix(spec+security): close the 12th pass's deferred list — all 8 items |
| `43fb2468d4ad` | `87b84109e444` | 2026-07-21 | docs(cmem): record the 12th pass — four new lenses, ~25 faults, and three siblings of my own fixes |
| `6399c5d49623` | `2596fbb60f87` | 2026-07-21 | fix(validate): table.init/copy subtyping and the §3.2.5 limits rules |
| `529644a84f4f` | `deaa37a3bf6b` | 2026-07-21 | fix(validate): reject-valid null-narrowing and call_indirect, plus tag/duplicate-export checks |
| `6188fd96ed20` | `d3a1f5b38312` | 2026-07-21 | fix: reentrancy state, C-ABI start function, and the internSig assembler bug |
| `365cfec5bbea` | `a17a1efc25e4` | 2026-07-21 | fix(validate): unsound GC/call_ref typing, a validator panic on valid input, exnref confusion |
| `c1a7447b3abe` | `499ef8d39fd9` | 2026-07-21 | fix: pass 12 error-path batch — two reproduced crashes, both siblings of earlier fixes |
| `f7f3d3fb73f6` | `05ce1a76daf7` | 2026-07-21 | fix(c-abi): wasm_module_validate never validated, plus four generated-family faults |
| `c2c8ac789d06` | `7d558476bdc4` | 2026-07-21 | docs(cmem): record the cleared backlog (batches A-E) and two new invariants |
| `37c95df8d6c8` | `7360a7bf2bac` | 2026-07-21 | fix(cli): batch E — exit non-zero on failure, and pass the guest's exit code through |
| `eb1860af34f0` | `4facb3f83c03` | 2026-07-21 | fix(c-abi): batch D — tag exports, silent mis-linking, ignored table init, v128 valkind |
| `1fbf0f600136` | `2e11a2da5b8b` | 2026-07-21 | fix(wasi): batch C — stop answering the wrong question with ESUCCESS |
| `bd549076a306` | `181f081f1835` | 2026-07-21 | fix(wat): batch B — the assembler no longer silently drops what it doesn't understand |
| `b0c0c33ed2d0` | `1bb4e98350aa` | 2026-07-21 | fix: backlog batch A — missing imported global, nofunc/noextern bottoms, undefined heap type + SIMD sub, shuffle lanes |
| `62321ea79439` | `1054927f0370` | 2026-07-21 | fix(wast): assert_invalid/malformed no longer counts OUR OWN limitations as passes |
| `8a394e3229fe` | `98b0942f4f3e` | 2026-07-21 | docs(cmem): record the 11th pass — new lenses, the SIMD min/max wrong-answer bug, and the SIMD conformance gap |
| `4da726b9db7f` | `519526541af6` | 2026-07-21 | fix: 11th audit pass — SIMD min/max NaN, cross-allocator guest memory, errdefer slice, ref-null inversion |
| `69323c6777cb` | `3c84278b0382` | 2026-07-21 | docs: record the closeout in security-model/testing, and fix two badly stale module headers |
| `944564bf5256` | `4f46aebf5545` | 2026-07-21 | fix(hardening): items 4-6 — u64 guest offsets, trap frames retain their instance, Wasi.init propagates OOM |
| `754f7a90bcdc` | `ecc06f6f5293` | 2026-07-21 | fix(validate): correctness batch — br_on_non_null reject-valid, missing memory checks, masked type index |
| `f656ce13b5e6` | `7267835a66a9` | 2026-07-21 | fix(strictness): cleanup batch — reject raw internal-tag opcodes, dedupe align helper, saturate offsets |
| `e8fb8d5169b5` | `e44d02335d07` | 2026-07-21 | docs(cmem): record the deferred-list closeout in design-decisions + security-model |
| `3bac8fb70a3f` | `27cd7fc0ac32` | 2026-07-20 | fix(security): close the 10th pass's deferred list — resource caps, gate fixes, real conformance/fuzz oracles |
| `25895702fd3a` | `5ddce4fbad9b` | 2026-07-20 | fix(security): 10th audit pass — 13 fixes incl. two segfaults and a 12-byte hang |
| `db9e39e1306f` | `88066a661046` | 2026-07-20 | docs(cmem): byte-copy-primitive census (9th pass) — clean, no new issues |
| `b5cd4e570b76` | `739fb6aaf206` | 2026-07-20 | docs(cmem): record the 8th audit pass — latent-class census, no new issues |
| `d1d92d1277f1` | `bdb85e3bb260` | 2026-07-20 | fix(security): reject out-of-range @intCast of parsed lane / catch label |
| `73df86a52920` | `4b74c94a6c4b` | 2026-07-20 | fix(security): checked narrowing of 64-bit byte counts (integer-overflow UB) |
| `2537a65e3d73` | `5bf01b1d8dd3` | 2026-07-20 | docs(cmem): record the 5th-pass audit (wast/c-abi/pin) + deferred LOWs |
| `c0abfd5546bf` | `8aa0ab011c7e` | 2026-07-20 | fix(security): pin DB — a malformed '# mode:' fails closed, not open |
| `c6ff764e1659` | `9dd9139c065e` | 2026-07-20 | fix(c-abi): retain imported externs + safe table_get + null-vec/leak guards |
| `93b01c17fdc7` | `7df7649f35e9` | 2026-07-20 | fix(security): harden the .wast runner against malformed scripts |
| `b177f4effda2` | `d9430972e493` | 2026-07-20 | fix(security): close sibling holes the hardening refactor left behind |
| `8a4c27b05580` | `9fe5daf3d787` | 2026-07-19 | docs(cmem): fold in the 2026-07-19 hardening passes + CLI help/version |
| `c7ffa065b580` | `fdf49ee175e5` | 2026-07-19 | feat(cli): add -h/--help and -v/--version with full option descriptions |
| `367e117c0867` | `0e290b5b167a` | 2026-07-19 | fix(security): harden the WAT assembler + decoder against malformed input |
| `d568b7885d13` | `be3fa5365550` | 2026-07-19 | fix(security): close the stack-height wild-base class on the run path |
| `d3033d3a47c0` | `8f6558c04a2e` | 2026-07-19 | fix(security): harden the interpreter run path against unvalidated modules |
| `6a0ccf31b7c7` | `157b9152fdcd` | 2026-07-19 | fix(decode): guard s33 index @intCast and reject cyclic supertypes |
| `49a92ea6af70` | `5fb4de8f7c94` | 2026-07-19 | docs: clean up stale known-issues ledger + test count (185/360) |
| `bfe663e10d39` | `3e3fa9272403` | 2026-07-19 | fix(validate,decode): close LOW strictness gaps #2f and #6 |
| `ee4b9d6f0a2b` | `667da7627775` | 2026-07-19 | fix(security): #24 — a runtime flag can no longer weaken a root enforce |
| `4128f15ee1c7` | `7bf8f37021f8` | 2026-07-19 | docs: record the 2026-07-19 code audit (test count + known-issues ledger) |
| `d0dddc5e8cdb` | `6f55ff25d4eb` | 2026-07-19 | fix(simd,sign,wat): eight issues from the code audit |
| `68f8ebeb53f3` | `a0b9ed2cee49` | 2026-07-19 | docs: memory sweep — banner reflects feature-complete + keystore shelved |
| `6d6414931067` | `3128e1330efc` | 2026-07-19 | feat(pin): wazmrt pin <dir> — recursively pin a whole bundle |
| `bb4e4ea5876f` | `d0cf337714a4` | 2026-07-19 | docs(security): single-publisher model chosen — keystore shelved, path complete |
| `3b424453ec43` | `9342fcaf2ded` | 2026-07-19 | docs(security): package-manager verification survey + keys-store tiering |
| `14c8620dfe14` | `62edfb1feea3` | 2026-07-19 | docs(security): authority scales with capabilities; authenticity is constant |
| `75f8ed31ea6e` | `004b9f03827a` | 2026-07-18 | docs: memory consistency sweep after the keystore decisions |
| `d33b501773b5` | `d3b3ccac6be8` | 2026-07-18 | docs: decide the trusted-keys database (companion keystore project) |
| `22af7b1b52b3` | `d500bcd67862` | 2026-07-18 | feat(security): deny unsigned by default when verification is armed |
| `95968026aabf` | `41dc8dbb2282` | 2026-07-18 | feat(security): -Droot-key build option — embed the signature trust anchor |
| `74a3cdf79c74` | `d9254cc98ef9` | 2026-07-18 | feat(security): publisher signing CLI — wazmrt keygen + wazmrt sign |
| `5570875035fc` | `8515b77d81cc` | 2026-07-18 | docs: memory consistency sweep after SIMD-complete + signature-verify |
| `cc5346fab261` | `8662bb7be612` | 2026-07-18 | feat(security): authenticity — Ed25519 module signature verification |
| `c49c2fa2d08f` | `2ac79f77f0f4` | 2026-07-18 | feat(simd): v128 global init from an imported v128 global (last v128 gap) |
| `39ecfd5efa52` | `5ca48018dc6e` | 2026-07-18 | feat(simd): Phase 8 COMPLETE — relaxed SIMD + v128 GC-field guard |
| `7896551d38ac` | `18fa1703a05b` | 2026-07-18 | feat(simd): Phase 8 — rare v128 ops (extmul/dot/pairwise/q15/lane load-store) |
| `488b0c023fc5` | `09f913fb803c` | 2026-07-18 | feat(wat): Phase 8 — v128 SIMD text assembler (author SIMD in .wat/.wast) |
| `057f02fc8294` | `4e029dc836fc` | 2026-07-18 | feat(simd): v128 globals (parallel high-64 array) |
| `b9df24e5f450` | `178b0b3c5f82` | 2026-07-18 | feat(simd): exotic ops — saturating add/sub, avgr, extend/narrow, conversions |
| `9ab65a1bfd0c` | `95a0b36ea46e` | 2026-07-18 | feat(simd): close the drop/select-v128 width gap via validator annotation |
| `31bf8a81089d` | `c15a323643ec` | 2026-07-18 | feat(interp): SIMD op fill-in — ~100 v128 ops (splat/lanes/cmp/arith/bitwise) |
| `17de95e9ed1a` | `dc6f01a69260` | 2026-07-18 | feat(interp): Phase 8 — SIMD (v128) foundation: two-slot value model + op subset |
| `af4a8778b40e` | `757b1c44aef0` | 2026-07-18 | feat(interp): Phase 7 — multi-memory (load/store/memory.* select by index) |
| `95e143611a7e` | `368e5da08e57` | 2026-07-18 | feat(interp): Phase 6.3 — legacy exception handling (try/catch/rethrow) |
| `540c3c781dc1` | `67b558e7b7a8` | 2026-07-17 | feat(module): Phase 6.2 — tag imports (extern kind 0x04) |
| `22e39d7ff05a` | `8ac212feff46` | 2026-07-17 | docs: memory consistency sweep after Phase 6/6.1 |
| `22e98c7a34b0` | `686c4a37fcfb` | 2026-07-17 | feat(wat): Phase 6.1 — assemble + run exception handling from text (.wat/.wast) |
| `528415463984` | `774c0d3d35c3` | 2026-07-17 | feat(interp): Phase 6 — exception handling (exnref) core: decode/validate/execute |
| `0f02f587dd7f` | `6b129b07c25c` | 2026-07-17 | feat(security): Phase 5 — pin verification (SHA-256 allow-list, TOCTOU-safe) |
| `4c2d1f2a6dda` | `3f501e08626b` | 2026-07-17 | docs: Phase 5 — interactive consent for unverified modules (owner refinement) |
| `ce2367e724f1` | `2755d93f8ecb` | 2026-07-17 | docs: Phase 5 — add --no-verify skip flag (owner req) with precedence rule |
| `9847dc83cf4c` | `f417766622d0` | 2026-07-17 | docs: sequence Phase 5 (secure-base pin verification) as the next build |
| `aebeea206b1c` | `f24806daca64` | 2026-07-17 | docs: plan Phase 5.1 (exception handling); scope EH in, clarify C is done |
| `41212299ddf4` | `2fac80860624` | 2026-07-17 | docs: sync project memory after 4.4 (--ro-dir, --env, wasi-gate) |
| `df657f50240f` | `3dcbd5f5cdcc` | 2026-07-17 | feat(wasi): 4.4 — CLI ergonomics + compiled-program conformance gate |
| `accbcc848e91` | `5ea8efbd001f` | 2026-07-17 | docs: sync project memory after 4.3 (full traversal) — kill stale refs |
| `aa4786718e82` | `57703cdf2c14` | 2026-07-17 | feat(wasi): 4.3 — secure full symlink traversal (owner: wasmtime parity) |
| `f28cbfac9faa` | `68e38b0d9584` | 2026-07-17 | feat(wasi): 4.3 safe items — set_times, allocate, hard link, poll fix |
| `2714a18db6ff` | `7ab501b61268` | 2026-07-17 | docs: resume 4.3; propagate the cold-start correction to vision/testing |
| `c3ff0fc1daf2` | `9d21fe38983f` | 2026-07-17 | bench: measure verification cold-start cost — it's a non-issue |
| `30e7525a9b57` | `b6296f5dd00c` | 2026-07-17 | docs(security-model): record 3 rejected mechanisms and the invariant behind them |
| `5ec998b17653` | `3babb1d1f4aa` | 2026-07-17 | docs: record the security model; PAUSE 4.3 pending the owner's decision |
| `a91cc24fc915` | `32996de5a5e5` | 2026-07-16 | docs: mark #18 as the blocker for closing #17's TOCTOU residual |
| `7656bd4865ed` | `15da9ed1ee87` | 2026-07-16 | feat(wasi): #17 — enforce symlink containment, not just lexical |
| `170cd45c2b61` | `7b0c053b44cd` | 2026-07-16 | feat(cabi): #22 lifecycle fuzz — and the 2 more bugs it found |
| `2bab7f302597` | `0273805e612b` | 2026-07-16 | update |
| `152a04634ded` | `e5ea153e09f0` | 2026-07-15 | docs: end-of-day memory pass; #22 (C ABI lifecycle fuzz) is first tomorrow |
| `3f3bc3478b9b` | `399f9b26c516` | 2026-07-15 | fix(cabi): four memory-safety bugs, and the reason none were catchable |
| `3a000f0bfeb0` | `e7d2824dfe4f` | 2026-07-15 | feat(cabi): implement every function wasm.h declares (180 -> 0), gated |
| `b19e5af66d73` | `b63d9c4dc27f` | 2026-07-15 | fix(cabi): define the trap backtrace API the header promises |
| `7364c686ea9d` | `ff3127798c9d` | 2026-07-15 | feat(interp): phase 4.1 — traps report where they happened |
| `b9a0aad1e4d2` | `6d1283f41f87` | 2026-07-15 | docs: schedule Phase 4 as 4.1 #19 -> 4.2 #17 -> 4.3 leftovers -> 4.4 items |
| `a37eb564a233` | `1837fa3c279f` | 2026-07-15 | docs: track the three Phase 3 follow-ups; none block Phase 4 |
| `8797eff8fa34` | `88df1109ccd4` | 2026-07-15 | feat(wasi): phase 3 — the sandboxed filesystem |
| `0d2053d79eac` | `224b88a286bd` | 2026-07-15 | feat(wasi): phase 2 — clocks, poll_oneoff sleep, real stdin |
| `e44f2561c18a` | `095333f162aa` | 2026-07-15 | feat(interp): complete the 0xFC prefix — a real compiled WASI program now runs |
| `f1a1a3671242` | `434fb18d083a` | 2026-07-14 | docs: record ReleaseSmall vs ReleaseFast — ship distributed artifacts as ReleaseSmall |
| `6fba477d316c` | `1ac3f5bb99c2` | 2026-07-14 | docs: record the "run a fully compiled WASI program" phased plan |
| `023627aedc02` | `06c480df9914` | 2026-07-14 | feat(wasi): WASI preview 1 core — command modules run + print + exit |
| `b763490dc1cb` | `59b59af096cd` | 2026-07-14 | feat(bench): interpreter microbenchmark + first Deno/V8 performance measurement |
| `00e006deec7b` | `2baffe614585` | 2026-07-14 | feat(c-abi): shared library + Deno FFI integration — native runtime loads from a host |
| `5ff5825182a6` | `15e6c031102d` | 2026-07-14 | feat(c-abi): global / memory / table runtime objects |
| `d586a60b274f` | `1b36c964e87e` | 2026-07-14 | feat(c-abi): host-function imports — supply a C callback for a module's import |
| `69e5aa8076e7` | `8bd183db7284` | 2026-07-14 | feat(c-abi): instantiate + call from C — wasm_instance/func/val/trap |
| `fb2365789c60` | `4688fe23f239` | 2026-07-14 | feat(gc): concrete (ref $t) value types — resolve the collapse limitation |
| `fc1dfe1f1cee` | `9734bee1f68c` | 2026-07-14 | feat(gc): WAT assembler emits (sub $super …) — declared subtyping round-trips |
| `ce988ebd2f2e` | `7209a83eed29` | 2026-07-14 | feat(gc): P3 br_on_cast / br_on_cast_fail — WasmGC ops complete |
| `7e7b4b112fdc` | `bc4461c21076` | 2026-07-14 | feat(gc): P3 ref.test / ref.cast — runtime type identity (full GC) |
| `c5dcba3657f6` | `778d3a688a0d` | 2026-07-14 | feat(gc): P3 struct/array heap objects + ref.eq (full GC, 2b) |
| `bec0cf7d020f` | `7b7f7d2727b5` | 2026-07-14 | refactor(gc): type space becomes a composite-type table; decode GC struct/array/rec types (P3 2a) |
| `7cba25f5f175` | `c76eb98c99cc` | 2026-07-14 | fix(interp): a nullable-ref local defaults to null, not 0 |
| `0f1e0c20f060` | `7363b51fd4c3` | 2026-07-14 | feat(gc): P3 i31 references — first tested slice of full GC (WasmGC) |
| `b2caddc2302e` | `05178944006a` | 2026-07-13 | docs: reprioritize — full GC (P3) is next, before the C-ABI/benchmark work |
| `d576793a2705` | `7e3ad95f4e16` | 2026-07-13 | docs: function-references proposal (P1/P2/P2.5) + proposal-scope decision |
| `446b61b7ea7f` | `b33cb2a5b389` | 2026-07-13 | feat(refs): P2.5 non-null reference types + local-init tracking |
| `7ebfd1eb6d6e` | `879e4ee21094` | 2026-07-13 | feat(refs): P2 function-references execution (call_ref, ref.as_non_null, ...) |
| `87ac6a7c43e4` | `99203b4f8daf` | 2026-07-13 | feat(refs): P1 typed/GC-reference value-type acceptance |
| `802669d5ffb3` | `34fdb4ea9086` | 2026-07-13 | docs: invoke-by-module-name landed (linking 29 -> 100) |
| `9745ecb7d411` | `70f2dd7ac8b5` | 2026-07-13 | feat(wast): invoke/get by module name + register $id |
| `e719d5c6cd19` | `3b96279e7d94` | 2026-07-13 | docs: #11 resolved — 2026-07-09 audit ledger fully cleared |
| `ff3de4afd909` | `8664d2866666` | 2026-07-13 | feat(wat): inline (export …) on a defined table (#11 — last ledger item) |
| `9ab696d408c0` | `a6655cb2dc00` | 2026-07-13 | docs: #8 resolved — audit ledger down to just #11 |
| `00bceb47a88d` | `bfdf552acf64` | 2026-07-13 | fix(wat): reject non-power-of-two align= in memarg (#8) |
| `bae927dfb479` | `214c78279183` | 2026-07-13 | docs: audit ledger closeout — #9/#10/#12/#13 resolved |
| `78647f624847` | `c18f07b88739` | 2026-07-13 | refactor: remove funcType duplication + redundant export re-resolution (#13) |
| `e500a5172443` | `acf2d62b3fe9` | 2026-07-13 | refactor(wat): pre-encode const-expr sections before the type section (#12) |
| `3a50f7500441` | `62379e9c0f44` | 2026-07-13 | fix(wat): reject import-after-definition instead of mis-indexing (#10) |
| `994ee23fad38` | `3bdd9d706c46` | 2026-07-13 | fix(refs): box host externrefs so no payload collides with null (#9) |
| `a5c1d8bbf7f7` | `757d009a6acc` | 2026-07-13 | docs: start function (#3) done + #11 partial; refresh snapshot |
| `07dd244d0d7e` | `5bfe4e21881b` | 2026-07-13 | feat(start): start function + inline memory-data & table/memory imports (#3) |
| `d71d79770c41` | `4d28711d2eae` | 2026-07-13 | docs: host imports #1 complete (stages 1-3) + #4 resolved |
| `1d6d9f2b30b3` | `ce3f3a43cd08` | 2026-07-13 | feat(link): assert_unlinkable + import type-checking (#1 stage 3) |
| `78c6b2b30356` | `c62bc675735b` | 2026-07-13 | feat(imports): imported tables & memories via shared objects (#1 stage 2) |
| `35e7a7f2cdf7` | `d7f2f9fa344a` | 2026-07-13 | docs: #15 closed — bulk table ops + table-init exprs + const-expr data offsets |
| `c0c7de26f28d` | `857cb9cb0295` | 2026-07-13 | feat(data): const-expr data offsets + passive/memory-prefix forms (#15) |
| `6087eace0c6d` | `1f4e44528f3b` | 2026-07-13 | feat(wat): inline const-expr table elems + table initializer expressions (#15) |
| `b256a86e9b0e` | `76f4fec696b0` | 2026-07-13 | feat(bulk-table): table.init/table.copy/elem.drop + passive elements (#15) |
| `c419606d1ee2` | `cd2cb59c5b7e` | 2026-07-13 | docs: sweep project memory current (element init exprs + host imports stage 1) |
| `d1f72a9f0637` | `52f0c5e62c59` | 2026-07-13 | docs(cmem): #1 stage 1 done (imported funcs + register); tables/memories remain |
| `bcf3a11d6b17` | `dc9db5274034` | 2026-07-13 | feat: imported functions + register / module linking (#1, stage 1) |
| `82bccdf062f5` | `295088d82e0f` | 2026-07-13 | docs(cmem): #15 mostly done (elem 3->38); passive/table.init + data offsets remain |
| `4ffa2e8923b3` | `ee07b3a8c487` | 2026-07-13 | feat(elem): const-expr offsets for element segments (#15) |
| `82d0213dcac9` | `9d094a71cb40` | 2026-07-13 | feat(elem): element-expression form + all 8 segment flag variants (#15) |
| `0c59b69804e7` | `ef60c7e17409` | 2026-07-10 | docs: sweep project memory current (validator/decoder strictness + #16) |
| `ff1d7a495d0a` | `ab52da65bbd0` | 2026-07-10 | docs(cmem): #16 part 2 done (custom-name + data-count); over-acceptance ~zero |
| `33219213a4fa` | `4d6708d03ab8` | 2026-07-10 | fix(decode): validate custom-section names + data-count consistency (#16, part 2) |
| `f40496d173df` | `291030ea4315` | 2026-07-10 | docs(cmem): #16 LEB part done (binary-leb128 36/25->56/3), rest niche |
| `10aca3b5c2bd` | `d30e86d54729` | 2026-07-10 | fix(reader): spec-correct LEB128 bounds (#16, part 1) |
| `e38278982486` | `1332f1f828ac` | 2026-07-10 | docs(cmem): mark #2e/#6 done, #2f not-a-bug (commit 0d8ca0a) |
| `c535de07bee3` | `0d8ca0a9a63b` | 2026-07-10 | fix(validate): ref.is_null requires a reference; reject bad valtype bytes |
| `f8ec7d9bd22e` | `4c467296e0b2` | 2026-07-10 | docs(cmem): mark #14 (type-ref local indexing) resolved |
| `0409f3794b3a` | `61e7070d02c8` | 2026-07-10 | fix(wat): type-reference functions mis-indexed their locals (#14) |
| `49586bc7d08a` | `29c3ec1732e3` | 2026-07-10 | docs(cmem): record assert_invalid/validator work + new findings |
| `645874c2d8ef` | `e6e8d5723fc0` | 2026-07-10 | feat(wast+validate): assert_invalid/malformed support + validator strictness |
| `8de9f1f543c2` | `c518a1821f4c` | 2026-07-09 | docs(cmem): record deferred audit findings in known-issues.md |
| `d1fae1378df8` | `67eb427b1ae5` | 2026-07-09 | fix(audit): correct table-export index + plug instantiation leaks |
| `599475fc00c6` | `7c320d005718` | 2026-07-09 | docs(cmem): add "look for code issues" binding trigger |
| `91c26df8c0af` | `b8c6c3cf9dad` | 2026-07-09 | docs(cmem): sweep INDEX/overview/architecture current |
| `8da9e200828c` | `5a4ca57accdb` | 2026-07-09 | Add table.size / table.grow / table.fill (0xFC prefix) |
| `0b3e22bc6672` | `98e2a366dc9a` | 2026-07-09 | Add table.get / table.set + externref tables |
| `2a48996642d6` | `173e5bc56e6e` | 2026-07-09 | Add imported globals + extended-const init expressions |
| `66d769e75611` | `ac76706ff17d` | 2026-07-09 | Add multi-table dispatch + NaN-payload float literals |
| `541cce48c0ac` | `8e5776bc4f6c` | 2026-07-09 | Add reference types (ref.null / ref.is_null / ref.func + funcref/externref) |
| `30b27556650f` | `3d42858e32a7` | 2026-07-09 | Add call_indirect + tables + globals + type-ref block types |
| `089978ebaa48` | `506370640676` | 2026-07-09 | Add multi-value block types + typed select across the pipeline |
| `8af648f5994b` | `7aa852457e7a` | 2026-07-08 | docs(cmem): sweep INDEX/overview/architecture current (wast.zig + strategy notes) |
| `92a6556084bf` | `535150bf4ebd` | 2026-07-08 | docs(design): record optimization-tier ladder (partial-eval/superinstructions) |
| `c3950cb52f04` | `029653766b19` | 2026-07-08 | docs(vision): record wazmrt as candidate universalWasmLoader native backend |
| `0ea09497f81d` | `ac496473ad09` | 2026-07-08 | docs(vision): record wasmtk integration goal (native FFI, not wasm-on-V8) |
| `3e63f98f7c81` | `661cea141f84` | 2026-07-08 | docs(vision): record the real performance target — beat wasmtk's Deno/V8 |
| `dfdb3f48d7de` | `47f6acb93e39` | 2026-07-08 | Add WAST script runner (wast.zig) — runs the official spec testsuite |
| `47641212bd9c` | `48951f21f9ec` | 2026-07-02 | docs(cmem): consistency sweep across memory files after the text-toolchain work |
| `5999ab9db492` | `13c3583df259` | 2026-07-02 | WAT assembler breadth: control flow + memarg + memory/data sections |
| `bb6036613cba` | `d0bc7ce84026` | 2026-07-02 | Add WAT text -> wasm binary assembler (MVP) |
| `5d7941fa81b7` | `fe149e9f85e4` | 2026-07-02 | Start the text toolchain: S-expression parser for .wat/.wast |
| `012d80639a1b` | `6656e5bc9599` | 2026-07-02 | Add linear memory execution + a CLI runner; runs the real wasm_mod corpus |
| `57d45ebd664d` | `45826a569789` | 2026-07-02 | Add float execution (f32/f64) to the interpreter |
| `7d01d8ad4279` | `3b1c41df6157` | 2026-07-02 | docs(testing): record reorganized test corpora (module/ + wasi/, incl. spec testsuite) |
| `1782009a1557` | `0fe46a43e701` | 2026-07-02 | Add the switch interpreter: first execution slice runs integer functions |
| `0d9875b0c0eb` | `0b2f9d12fa39` | 2026-07-02 | docs(testing): flag wasm_mod/wasm_wasi corpus paths as under reorganization |
| `a61964806b33` | `0159d0defd42` | 2026-07-02 | Add the type-checking validator (validate.zig) |
| `b60665c154e5` | `2256528085ab` | 2026-07-02 | Wire IR decode into the CLI; document the wasm_mod/wasm_wasi corpora |
| `08bdc62d2e62` | `e9f5b9305ecb` | 2026-07-02 | Add shared opcode table and byte-code -> IR decoder (opcode.zig) |
| `cc3def3b5647` | `1dc5901d9487` | 2026-07-02 | Record interpreter architecture decision (Option A: switch over IR) |
| `64420302e5ba` | `a7be8894da45` | 2026-07-02 | Decode the code section (locals + function bodies) |
| `0062633c23c9` | `d4313715e6bf` | 2026-07-02 | Expose imports/exports over C via the wasm-c-api type-object system |
| `1c0dd4ff12ab` | `661dd26b70ca` | 2026-07-02 | Decode type/function/import/export sections into owned structures |
| `9ffd869f8310` | `d1cbe5d0341d` | 2026-07-02 | Implement wasm-c-api first slice: engine/store/module decode |
| `47b0515a8796` | `146fea54ef1c` | 2026-07-02 | Adopt wasm-c-api standard as the C ABI; vendor wasm.h (first ledger entry) |
| `cbfc7831a610` | `d71028d85dca` | 2026-07-02 | Add cmem/ portable project memory |
| `bde4e75cb04a` | `a0f7ad4ca34f` | 2026-07-02 | Scaffold Zig 0.16 runtime: decoder core, C ABI, and wasm target |
| `888b87ec15c6` | `252db4044b0a` | 2026-07-02 | Adopt MIT OR Apache-2.0 dual license and compliance scaffold |
| `e4777dfb4e32` | `a8ffe6bc7bb6` | 2026-07-02 | Initial commit |
