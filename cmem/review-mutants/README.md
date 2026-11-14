# review-mutants — the mutant lists behind every "caught" in the 2026-11-13 review

Each `*.json` is a list of `[name, from, to]` for `bun tools/mutants.ts <file> <tests> <list>`
(run from the repo root; `cmem/testing.md`). They are kept so every "N mutants, all caught" in
`cmem/known-issues.md` § REVIEW 2026-11-13 can be checked from a clone — the owner's portability
rule (`cmem/working-rules.md`): written in a session scratchpad, moved here 2026-11-13.

**A list applies to the code AS IT WAS when it was written** (its `from` texts must occur exactly
once). **`manifest.json` says, for each list, the file it mutates, the tests to run, and the
commit where it applies** — found by matching every list against every commit since `80fc179`.
Two lists (`mutants-gate.json`, `mutants-k11.json`) match no committed code: they targeted
intermediate states that were never committed, and cannot be re-run. Note: from round 6 on
(`29412ea`), a mutant of the WORKFLOW file is caught by the pin test (`RELEASE_YML_SHA256`)
whatever it changes — at those commits a workflow list proves the pin, not each rule.

Which round each file belongs to (the file names drifted from the round numbers):

| files | review round (`known-issues.md`) |
| --- | --- |
| `mutants-github.json`, `-gate.json`, `-push.json`, `-bump.json`, `-wf.json`, `-wf-helper.json`, `-gate-g2.json`, `-push-b2.json` | rounds 1–3 (first written in round 1, extended after) |
| `mutants-r2a/b/c.json`, `-gate2.json` | round 2 |
| `mutants-r3.json`, `-r3c.json`, `-k11.json`, `-gate3.json` | round 3 |
| `mutants-r4a.json`, `-r4a2.json`, `-wf4.json`, `-gate4.json` | round 4 |
| `mutants-r5-*.json` | round 5 |
| `mutants-r6-*.json` | round 6 |
| `mutants-r7-*.json` | round 6's three left items |
| `mutants-r8-*.json` | round 7 |
| `mutants-r9-*.json` | round 7's last two items |
| `mutants-r10-*.json` | round 8 |
| `mutants-r11-*.json` | round 9 |
| `mutants-r12-*.json` | round 10 |
| `mutants-r13-*.json` | round 11 |
| `mutants-r14-c.json`, `mutants-r14-c-*.json` | round 12, class C (the runner's own verdicts; the tests class C added) |

⚠️ **Until round 12, the runner counted ANY failing exit as "caught"** — a mutant that only broke a
module's syntax would have read as caught. Every result line also printed bun's failing-test
count; in the run outputs seen from round 5 on, each "caught" line shows failing tests, except
round 5's `R5K2` (checked by hand: a stale Ctrl-C handler ended the run with exit 130). The
outputs of rounds 1–4 were not kept, so their "caught" rests on that older rule. From round 12 the
runner reads bun's summary: a load error is `ERROR`, never `CAUGHT`.
