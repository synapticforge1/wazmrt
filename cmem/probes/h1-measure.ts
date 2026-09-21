// H1 (workspace letter) — measure what wazmrt's CLI ACTUALLY does today, so the
// letter is closed against behaviour rather than against the memory files.
//
// Covers the two rows H1 asks to close:
//   §5 #10 — the `--dir` drive-letter heuristic (the letter says it is RETIRED)
//   §5 #12 — zH7-as-error vs §2.4a "guest positions are never examined"
//
// Run: deno run -A h1-measure.ts <path-to-wazmrt.exe> <module.wat>

const exe = Deno.args[0];
const mod = Deno.args[1];

type Case = { id: string; why: string; argv: string[] };

const cases: Case[] = [
  // --- §5 #10: the --dir heuristic -------------------------------------
  { id: "dir .:/", why: "the form wazmrt's own --help prints", argv: [mod, "--dir", ".:/"] },
  { id: "dir ./:/", why: "the unambiguous relative spelling", argv: [mod, "--dir", "./:/"] },
  { id: "dir x:/", why: "ONE-LETTER relative host path — the heuristic's wrong answer", argv: [mod, "--dir", "x:/"] },
  { id: "dir x::/", why: "the :: escape for the same path", argv: [mod, "--dir", "x::/"] },
  { id: "dir C:\\tmp", why: "a real drive letter, must NOT split", argv: [mod, "--dir", "C:\\tmp"] },
  { id: "dir .", why: "no separator at all", argv: [mod, "--dir", "."] },
  // --- §5 #12: guest positions -----------------------------------------
  { id: "guest: install --yes", why: "§2.4 says this must reach the guest; #11 made it error", argv: [mod, "install", "--yes"] },
  { id: "guest: install -- --yes", why: "the exact escape hatch", argv: [mod, "install", "--", "--yes"] },
  { id: "guest: -- --dir src", why: "host flag name after --", argv: [mod, "--", "--dir", "src"] },
  { id: "guest: prog --verify", why: "a FAIL-OPEN host flag in a guest position (#12 option b)", argv: [mod, "run", "--verify"] },
  // --- v14: no 'looks like' --------------------------------------------
  { id: "unknown --bogus", why: "v14: exact-match or reject, and the MESSAGE must not send you to the fs", argv: ["--bogus", mod] },
  { id: "abbrev --verb", why: "v14 forbids prefix abbreviation", argv: [mod, "--verb", "enforce"] },
];

const rows: string[] = [];
for (const c of cases) {
  const out = await new Deno.Command(exe, {
    args: c.argv,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = (new TextDecoder().decode(out.stdout) + new TextDecoder().decode(out.stderr))
    .trim().split("\n")[0]?.slice(0, 150) ?? "";
  rows.push(`| \`${c.id}\` | ${out.code} | ${text || "(no output)"} | ${c.why} |`);
}

console.log("| case | rc | first line of output | why it is here |");
console.log("| --- | --- | --- | --- |");
for (const r of rows) console.log(r);
