# cmem/probes — measurement scripts kept WITH the memory, not on a machine

🔒 **Owner, 2026-09-21: "scratch pad items should be in the cmem by design and not stored on this
machine."** A session's scratchpad is local to one machine and one session, and it vanishes. A
probe that produced a recorded number belongs next to the number, so the next session (or the next
machine) can re-derive it. **Save probes here as you write them, not afterwards.** Build outputs and
fixture directories are regenerated and are not kept.

All scripts are Deno (`INDEX.md` → TOOLING) or Zig. **Run `--dir` probes through `Deno.Command` or a
native shell, never Git Bash**: MSYS rewrites `./data:/m` into `.\data;M:\` before the program sees it.

| file | what it measures | how to run |
| --- | --- | --- |
| `argv-echo.ts` | prints its own argv as JSON, so you measure the SHELL, not wazmrt | `deno run -A argv-echo.ts <args…>` from each shell |
| `bash-argv.ts` | hands a typed line to a real `bash` and reports what arrived | `deno run -A bash-argv.ts <abs path to argv-echo.ts>` |
| `h1-measure.ts` | the workspace-letter-H1 CLI sweep: `--dir` forms, guest-position flags, unknown/abbreviated flags | `deno run -A h1-measure.ts <wazmrt> <module.wat>` |
| `dir-forms.ts` | which HOST spellings `--dir` accepts (guest half pinned with `::`) | from a dir containing `./data`, `./q` and a sibling `../probe2/data` |
| `sep-forms.ts` | the `:` / `::` split, no shell in the path | same cwd as above |
| `posix-forms.ts` | the `--dir` grammar on a POSIX host; creates `a:b` and `back\slash` itself | `deno run -A posix-forms.ts <wazmrt> <abs module.wat>` |
| `guest_names.zig` | a `wasm32-wasi` guest that opens names whose CONTENTS say which file they are | `zig build-exe guest_names.zig -target wasm32-wasi -O ReleaseSmall "-femit-bin=guest_names.wasm"` |
| `guest-fixtures.ts` | the fixtures for it: `x\y`, `x/y`, `a:b`, `c:`, `b`, two symlinks | `deno run -A guest-fixtures.ts <dir>`, then `wazmrt guest_names.wasm --dir <dir>::/` |
| `rename-track-h.ts` | ✅ applied one-off: `H1`–`H8` → `zH1`–`zH8` | ⚠️ **never `--apply` again**: a bare `H<n>` now means a workspace letter. Dry run = a census to READ (3 intended hits, 2026-09-21) |

## Recorded results (re-derive before quoting — a number is a claim with a date)

**2026-09-21, Windows (PowerShell 5.1, cmd, Git Bash) and WSL2 Ubuntu 26.04 / ext4 / bash 5.3.9,
Zig 0.16.0, Deno 2.9.7:**

- **Shells.** PowerShell and cmd pass `--dir` specs verbatim. Git Bash rewrites any spec it reads
  as a POSIX PATH list (`./data:/m`, `.:/`, `/etc:/m`); **`::` is never rewritten**, and neither is
  `MSYS_NO_PATHCONV=1` / `MSYS2_ARG_CONV_EXCL='*'`. Linux bash passes all 7 verbatim. PowerShell 5.1
  has two corruptions of its own: embedded double quotes are stripped, and an unquoted `-x=a.b` is
  split at the `.`.
- **`--dir` grammar** (`interop.md` v27): the 19-row POSIX matrix and the Windows matrix match the
  agreed table with 0 mismatches.
- **The guest on Linux, BEFORE the resolver fix:** `x\y` opened `x/y`, a symlink to `x\y` opened
  `x/y`, and a symlink to `a:b` opened `b` (all SUCCESS, all the wrong file). `a:b` and `c:` were
  `NOTCAPABLE`. **AFTER:** each opens itself, `../../../../etc/passwd` is `NOTCAPABLE`, and its
  backslash spelling is `NOENT`. On Windows the same guest is unchanged by the fix.

## ⬜ Open: the macOS pass

`INDEX.md` → STATE → "Still open" has the exact checklist. Everything it needs is in this folder.
⚠️ APFS is case-insensitive by default, so no fixture pair here may differ only by case (none does).
