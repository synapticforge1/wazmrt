// The SEPARATOR half of --dir, run with no shell in the path.
//
// ⚠️ Git Bash mangles these arguments (MSYS path-list conversion turns
// `./data:/m` into `.\data;M`), so every --dir measurement MUST go through
// Deno.Command or a native shell — never through bash. That is a measurement
// hazard, not a wazmrt defect.
//
// Run from a directory containing ./data and ./q:
//   deno run -A sep-forms.ts <wazmrt.exe> <abs module.wat>

const exe = Deno.args[0];
const mod = Deno.args[1];

const specs: Array<[string, string]> = [
  ["./data:/m", "./ host, single colon — must split"],
  ["./q:/m", "one-letter dir BEHIND ./ — must split, no ambiguity"],
  ["q:/m", "one-letter dir BARE — reads as drive Q:, which does not exist here"],
  ["q::/m", "the :: escape for the same directory"],
  ["data:/m", "bare multi-letter relative, single colon"],
  ["C:/Users:/m", "drive-qualified host WITH a guest path — splits on the LAST colon"],
  ["C:\\Users:/m", "same, backslashes"],
  [".:/", "the form --help prints"],
  ["./data", "no separator — mounts at itself"],
];

console.log("| --dir spec | rc | first line | what it tests |");
console.log("| --- | --- | --- | --- |");
for (const [s, why] of specs) {
  const out = await new Deno.Command(exe, {
    args: [mod, "--dir", s],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const txt = (new TextDecoder().decode(out.stdout) +
    new TextDecoder().decode(out.stderr)).trim().split("\n")[0] ?? "";
  console.log(`| \`${s}\` | ${out.code} | ${txt.slice(0, 60)} | ${why} |`);
}
